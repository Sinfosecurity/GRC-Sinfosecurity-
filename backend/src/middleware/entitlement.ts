import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { ApiError } from './errorHandler';
import { prisma } from '../config/database';
import { billingStatus } from '../billing/stripeBillingService';
import { Entitlements, assertEntitlement } from '../billing/plans';

/**
 * Backend subscription state is authoritative.
 * When Stripe is not configured, feature gates no-op so local/dev tests remain usable.
 * When Stripe test mode is CONNECTED, writes require a standing subscription and plan entitlements.
 */
export async function enforceSubscriptionWrites(req: AuthRequest, res: Response, next: NextFunction) {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        return next();
    }
    if (billingStatus() !== 'CONNECTED') {
        return next();
    }
    if (!req.user?.organizationId) {
        return next();
    }
    try {
        const organization = await prisma.organization.findUnique({
            where: { id: req.user.organizationId },
            select: { status: true, isDemo: true },
        });
        if (!organization) {
            return next(new ApiError(404, 'Organization not found'));
        }
        if (organizationHasEvaluationAccess(organization)) {
            return next();
        }
        if (organization.status === 'PAST_DUE' || organization.status === 'CANCELLED' || organization.status === 'SUSPENDED') {
            return next(new ApiError(403, 'Organization billing is not in good standing'));
        }
        return next();
    } catch (error) {
        return next(error);
    }
}

/** Product features a designated testing organization may use without a paid plan. */
export const EVALUATION_FEATURES: Array<keyof Entitlements> = [
    'assessments',
    'continuousMonitoring',
    'advancedReporting',
];

export function organizationHasEvaluationAccess(organization?: { isDemo?: boolean | null } | null): boolean {
    return Boolean(organization?.isDemo);
}

export function privateBetaUnlocks(feature: keyof Entitlements): boolean {
    return EVALUATION_FEATURES.includes(feature);
}

export function organizationHasProductFeature(
    organization: { plan?: string | null; isDemo?: boolean | null } | null | undefined,
    feature: keyof Entitlements
): boolean {
    if (organizationHasEvaluationAccess(organization) && privateBetaUnlocks(feature)) {
        return true;
    }
    return assertEntitlement(organization?.plan, feature);
}

export const SUBSCRIPTION_FEATURE_DENIED =
    'This capability is not included in the current subscription. Contact your organization administrator if you expected access.';

export function requireEntitlement(feature: keyof Entitlements) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (billingStatus() !== 'CONNECTED') {
            return next();
        }
        if (!req.user?.organizationId) {
            return next(new ApiError(401, 'Authentication required'));
        }
        try {
            const organization = await prisma.organization.findUnique({
                where: { id: req.user.organizationId },
                select: { plan: true, isDemo: true },
            });
            if (organizationHasProductFeature(organization, feature)) {
                return next();
            }
            return next(new ApiError(403, SUBSCRIPTION_FEATURE_DENIED));
        } catch (error) {
            return next(error);
        }
    };
}

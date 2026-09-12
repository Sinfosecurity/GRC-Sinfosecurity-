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
            select: { status: true },
        });
        if (!organization) {
            return next(new ApiError(404, 'Organization not found'));
        }
        if (organization.status === 'PAST_DUE' || organization.status === 'CANCELLED' || organization.status === 'SUSPENDED') {
            return next(new ApiError(403, 'Organization billing is not in good standing'));
        }
        return next();
    } catch (error) {
        return next(error);
    }
}

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
                select: { plan: true },
            });
            if (!assertEntitlement(organization?.plan, feature)) {
                return next(new ApiError(403, `Plan does not include ${feature}`));
            }
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

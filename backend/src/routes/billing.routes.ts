import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { stripeBillingService } from '../billing/stripeBillingService';
import { entitlementsFor } from '../billing/plans';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { rejectClientTenantOverride } from '../security/tenant';
import { billingLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const signature = req.headers['stripe-signature'];
            if (!signature || typeof signature !== 'string') {
                throw new ApiError(400, 'Missing Stripe signature');
            }
            const raw = (req as any).rawBody || req.body;
            const payload = Buffer.isBuffer(raw) ? raw : Buffer.from(typeof raw === 'string' ? raw : JSON.stringify(raw));
            const result = await stripeBillingService.handleWebhook(payload, signature);
            res.json({ received: true, ...result });
        } catch (error) {
            next(error);
        }
    }
);

router.get('/status', authenticate, requirePermission(PERMISSIONS['billing.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const org = await prisma.organization.findUnique({ where: { id: req.user!.organizationId } });
        res.json({
            success: true,
            data: {
                provider: stripeBillingService.status(),
                plan: org?.plan,
                billingInterval: org?.billingInterval,
                subscriptionStatus: org?.subscriptionStatus,
                organizationStatus: org?.status,
                billingCustomerId: org?.billingCustomerId,
                billingSubscriptionId: org?.billingSubscriptionId,
                cancelAtPeriodEnd: org?.cancelAtPeriodEnd === true,
                entitlements: entitlementsFor(org?.plan),
            },
        });
    } catch (error) {
        next(error);
    }
});

router.post('/checkout', authenticate, requirePermission(PERMISSIONS['billing.manage']), billingLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = rejectClientTenantOverride(req.user!.organizationId, req.body?.organizationId);
        const result = await stripeBillingService.createCheckout(
            organizationId,
            req.user!.id,
            req.body?.plan || 'PROFESSIONAL',
            req.body?.successUrl || `${process.env.FRONTEND_URL}/billing?status=success`,
            req.body?.cancelUrl || `${process.env.FRONTEND_URL}/billing?status=cancelled`,
            req.body?.interval
        );
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

router.post('/portal', authenticate, requirePermission(PERMISSIONS['billing.manage']), billingLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = rejectClientTenantOverride(req.user!.organizationId, req.body?.organizationId);
        const result = await stripeBillingService.createPortal(
            organizationId,
            req.body?.returnUrl || `${process.env.FRONTEND_URL}/billing`
        );
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

export default router;

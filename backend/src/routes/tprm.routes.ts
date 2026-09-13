import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { ApiError } from '../middleware/errorHandler';
import { attentionService } from '../services/attentionService';
import { explainableRiskService } from '../services/explainableRiskService';
import { riskDecisionBriefService } from '../services/riskDecisionBriefService';
import { objectStorageService } from '../services/objectStorageService';
import { prisma } from '../config/database';
import { tenantWhere } from '../security/tenant';
import { monitoringCredentialsConfigured, resolveMonitoringProviderStatus } from '../services/monitoringProviderStatus';
import tprmOperationsRoutes from './tprm.operations.routes';
import { notifyUser } from '../services/notificationDeliveryService';
import { enforceSubscriptionWrites } from '../middleware/entitlement';
import { vendorOffboardService } from '../services/vendorOffboardService';

const router = Router();
router.use(authenticate);
router.use(enforceSubscriptionWrites);

router.get('/attention', requirePermission(PERMISSIONS['vendor.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await attentionService.whatNeedsAttentionToday(req.user!.organizationId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.get('/vendors/:vendorId/risk-explanation', requirePermission(PERMISSIONS['risk.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await explainableRiskService.latest(req.user!.organizationId, req.params.vendorId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.get('/vendors/:vendorId/score-history', requirePermission(PERMISSIONS['risk.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await explainableRiskService.history(req.user!.organizationId, req.params.vendorId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/vendors/:vendorId/recalculate-risk', requirePermission(PERMISSIONS['risk.update']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await explainableRiskService.recalculate(req.user!.organizationId, req.params.vendorId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.get('/decision-briefs', requirePermission(PERMISSIONS['approval.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const vendorId = typeof req.query.vendorId === 'string' ? req.query.vendorId : undefined;
        const data = await riskDecisionBriefService.list(req.user!.organizationId, vendorId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/vendors/:vendorId/decision-briefs', requirePermission(PERMISSIONS['approval.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await riskDecisionBriefService.generate(
            req.user!.organizationId,
            req.params.vendorId,
            req.user!.id
        );
        await notifyUser({
            organizationId: req.user!.organizationId,
            userId: req.user!.id,
            eventType: 'approval.requested',
            title: 'Approval requested',
            body: 'A Decision Brief is ready for a human decision.',
            resourceType: 'RiskDecisionBrief',
            resourceId: data.id,
        });
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.get('/decision-briefs/:briefId', requirePermission(PERMISSIONS['approval.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await riskDecisionBriefService.get(req.user!.organizationId, req.params.briefId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/decision-briefs/:briefId/decide', requirePermission(PERMISSIONS['approval.decide']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { decision, conditions, reviewerAnalysis, nextReviewDate } = req.body || {};
        if (!decision) {
            throw new ApiError(400, 'Decision is required');
        }
        const data = await riskDecisionBriefService.decide(req.user!.organizationId, req.params.briefId, {
            decision,
            conditions,
            reviewerAnalysis,
            nextReviewDate,
            actorUserId: req.user!.id,
        });
        await notifyUser({
            organizationId: req.user!.organizationId,
            userId: req.user!.id,
            eventType: 'approval.decision',
            title: 'Decision recorded',
            body:
                decision === 'APPROVE_WITH_CONDITIONS'
                    ? `Decision recorded with conditions requiring action: ${conditions || 'see brief'}.`
                    : `Human decision recorded: ${decision}.`,
            resourceType: 'RiskDecisionBrief',
            resourceId: data.id,
        });
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.get('/evidence', requirePermission(PERMISSIONS['evidence.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const storage = objectStorageService.status();
        const vendorId = typeof req.query.vendorId === 'string' ? req.query.vendorId : undefined;
        const items = await prisma.storedObject.findMany({
            where: tenantWhere(req.user!.organizationId, {
                deletedAt: null,
                ...(vendorId ? { ownerType: 'vendor', ownerId: vendorId } : {}),
            }),
            orderBy: { uploadedAt: 'desc' },
            take: 200,
        });
        res.json({
            success: true,
            data: {
                storage,
                items,
            },
        });
    } catch (error) {
        next(error);
    }
});

router.get('/vendors/:vendorId/offboard', requirePermission(PERMISSIONS['vendor.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await vendorOffboardService.preview(req.user!.organizationId, req.params.vendorId),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/vendors/:vendorId/offboard', requirePermission(PERMISSIONS['vendor.update']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await vendorOffboardService.offboard({
                organizationId: req.user!.organizationId,
                vendorId: req.params.vendorId,
                actorUserId: req.user!.id,
                exitNotes: req.body?.exitNotes ? String(req.body.exitNotes) : undefined,
                acknowledgeOutstanding: Boolean(req.body?.acknowledgeOutstanding),
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/monitoring/signals', requirePermission(PERMISSIONS['monitoring.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const [signals, connection] = await Promise.all([
            prisma.vendorMonitoring.findMany({
                where: { organizationId: req.user!.organizationId },
                include: { vendor: { select: { id: true, name: true, tier: true } } },
                orderBy: { detectedAt: 'desc' },
                take: 100,
            }),
            prisma.integrationConnection.findFirst({
                where: {
                    organizationId: req.user!.organizationId,
                    provider: { in: ['siem', 'monitoring'] },
                },
            }),
        ]);
        const providerStatus = resolveMonitoringProviderStatus({
            credentialsConfigured: monitoringCredentialsConfigured(),
            dbStatus: connection?.status,
            lastError: connection?.lastError,
        });
        res.json({
            success: true,
            data: {
                providerStatus,
                signalCount: signals.length,
                signals,
            },
        });
    } catch (error) {
        next(error);
    }
});

router.use(tprmOperationsRoutes);

export default router;

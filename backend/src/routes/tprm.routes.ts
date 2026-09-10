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

const router = Router();
router.use(authenticate);

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

router.get('/monitoring/signals', requirePermission(PERMISSIONS['monitoring.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const signals = await prisma.vendorMonitoring.findMany({
            where: { organizationId: req.user!.organizationId },
            include: { vendor: { select: { id: true, name: true, tier: true } } },
            orderBy: { detectedAt: 'desc' },
            take: 100,
        });
        res.json({
            success: true,
            data: {
                providerStatus: signals.length === 0 ? 'NOT_CONFIGURED' : 'CONNECTED',
                signals,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;

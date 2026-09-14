import { Router, Response, NextFunction } from 'express';
import { VendorTier } from '@prisma/client';
import { AuthRequest, authorize } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import {
    confirmPlan,
    confirmTier,
    createOnboardingRequest,
    findDuplicateVendors,
    getOnboarding,
    listOnboardings,
    listOwnerDirectory,
    saveIntake,
} from '../services/vendorOnboardingService';

const router = Router();

const REQUEST_ROLES = ['ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN', 'SUPERADMIN', 'COMPLIANCE_OFFICER', 'RISK_MANAGER', 'BUSINESS_OWNER', 'ASSESSOR'];
const REVIEW_ROLES = ['ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN', 'SUPERADMIN', 'COMPLIANCE_OFFICER', 'RISK_MANAGER', 'ASSESSOR'];

function actor(req: AuthRequest) {
    return { id: req.user!.id, role: req.user!.role, name: req.user!.name };
}

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await listOnboardings(req.user!.organizationId) });
    } catch (error) {
        next(error);
    }
});

router.get('/owners', authorize(...REQUEST_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await listOwnerDirectory(req.user!.organizationId) });
    } catch (error) {
        next(error);
    }
});

router.post('/duplicates', authorize(...REQUEST_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await findDuplicateVendors(req.user!.organizationId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/', authorize(...REQUEST_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await createOnboardingRequest(req.user!.organizationId, actor(req), req.body || {});
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getOnboarding(req.user!.organizationId, req.params.id, actor(req)) });
    } catch (error) {
        next(error);
    }
});

router.patch('/:id/intake', authorize(...REQUEST_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
        res.json({ success: true, data: await saveIntake(req.user!.organizationId, req.params.id, actor(req), answers, false) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/intake/complete', authorize(...REQUEST_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
        if (!req.body?.attested) throw new ApiError(400, 'The business owner must attest that the intake is accurate.');
        res.json({ success: true, data: await saveIntake(req.user!.organizationId, req.params.id, actor(req), answers, true) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/tier/confirm', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await confirmTier(req.user!.organizationId, req.params.id, actor(req), {
                confirm: true,
                overrideTier: req.body?.overrideTier as VendorTier | undefined,
                reason: req.body?.reason,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/plan/confirm', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await confirmPlan(req.user!.organizationId, req.params.id, actor(req)) });
    } catch (error) {
        next(error);
    }
});

export default router;

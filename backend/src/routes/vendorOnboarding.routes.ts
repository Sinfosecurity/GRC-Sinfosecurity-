import { Router, Response, NextFunction } from 'express';
import { VendorTier } from '@prisma/client';
import { AuthRequest, authorize } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import {
    confirmPlan,
    confirmTier,
    createOnboardingRequest,
    findDuplicateVendors,
    listOnboardings,
    listOwnerDirectory,
    saveIntake,
} from '../services/vendorOnboardingService';
import {
    activationLink,
    requestClarification,
    resendInvitation,
    reviewFinding,
    sendDueDiligence,
    upsertAssessmentContact,
} from '../services/vendorDueDiligenceService';
import {
    acceptFindingRisk,
    activateVendor,
    attestContract,
    closeFinding,
    decideApproval,
    planRemediation,
    presentLifecycle,
    recommendReassessment,
    startOffboarding,
    startReassessment,
    validateFinding,
} from '../services/vendorLifecycleClosureService';
import { IssueSeverity } from '@prisma/client';

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
        res.json({ success: true, data: await presentLifecycle(req.user!.organizationId, req.params.id, actor(req)) });
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

router.post('/:id/contact', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await upsertAssessmentContact(req.user!.organizationId, req.params.id, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/send', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await sendDueDiligence(req.user!.organizationId, req.params.id, actor(req), req.body || {});
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/invitation/resend', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await resendInvitation(req.user!.organizationId, req.params.id, actor(req)) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/invitation/link', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await activationLink(req.user!.organizationId, req.params.id, actor(req)) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/findings/:findingId/review', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await reviewFinding(req.user!.organizationId, req.params.id, actor(req), req.params.findingId, {
                action: req.body?.action,
                severity: req.body?.severity as IssueSeverity | undefined,
                reason: req.body?.reason,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/findings/:findingId/remediate', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await planRemediation(req.user!.organizationId, req.params.id, actor(req), req.params.findingId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/findings/:findingId/validate', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await validateFinding(req.user!.organizationId, req.params.id, actor(req), req.params.findingId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/findings/:findingId/close', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await closeFinding(req.user!.organizationId, req.params.id, actor(req), req.params.findingId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/findings/:findingId/accept-risk', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await acceptFindingRisk(req.user!.organizationId, req.params.id, actor(req), req.params.findingId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/contract/attest', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await attestContract(req.user!.organizationId, req.params.id, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/approval', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await decideApproval(req.user!.organizationId, req.params.id, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/activate', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await activateVendor(req.user!.organizationId, req.params.id, actor(req)) });
    } catch (error) {
        next(error);
    }
});

router.get('/:id/reassessment', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await recommendReassessment(req.user!.organizationId, req.params.id, actor(req)) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/reassessment', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await startReassessment(req.user!.organizationId, req.params.id, actor(req)) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/offboard', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await startOffboarding(req.user!.organizationId, req.params.id, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/clarification', authorize(...REVIEW_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await requestClarification(req.user!.organizationId, req.params.id, actor(req), {
                assessmentId: String(req.body?.assessmentId || ''),
                questionKeys: Array.isArray(req.body?.questionKeys) ? req.body.questionKeys : [],
            }),
        });
    } catch (error) {
        next(error);
    }
});

export default router;

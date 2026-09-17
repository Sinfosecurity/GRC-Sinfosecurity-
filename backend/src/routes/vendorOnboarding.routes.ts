import { Router, Response, NextFunction } from 'express';
import { VendorTier } from '@prisma/client';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
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
    markInvitationShared,
    requestClarification,
    resendInvitation,
    reviewFinding,
    sendDueDiligence,
    upsertAssessmentContact,
} from '../services/vendorDueDiligenceService';
import {
    acceptFindingRisk,
    approveFindingRisk,
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

router.get('/owners', requirePermission(PERMISSIONS['vendor.create'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await listOwnerDirectory(req.user!.organizationId) });
    } catch (error) {
        next(error);
    }
});

router.post('/duplicates', requirePermission(PERMISSIONS['vendor.create'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await findDuplicateVendors(req.user!.organizationId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/', requirePermission(PERMISSIONS['vendor.create'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
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

router.patch('/:id/intake', requirePermission(PERMISSIONS['vendor.create'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
        res.json({ success: true, data: await saveIntake(req.user!.organizationId, req.params.id, actor(req), answers, false) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/intake/complete', requirePermission(PERMISSIONS['vendor.create'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
        if (!req.body?.attested) throw new ApiError(400, 'The business owner must attest that the intake is accurate.');
        res.json({ success: true, data: await saveIntake(req.user!.organizationId, req.params.id, actor(req), answers, true) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/tier/confirm', requirePermission(PERMISSIONS['vendor.update'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
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

router.post('/:id/plan/confirm', requirePermission(PERMISSIONS['vendor.update'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await confirmPlan(req.user!.organizationId, req.params.id, actor(req), {
                includeKeys: Array.isArray(req.body?.includeKeys) ? req.body.includeKeys : undefined,
                excludeKeys: Array.isArray(req.body?.excludeKeys) ? req.body.excludeKeys : undefined,
                packDecisions: Array.isArray(req.body?.packDecisions) ? req.body.packDecisions : undefined,
                reason: req.body?.reason,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/contact', requirePermission(PERMISSIONS['vendor.update'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await upsertAssessmentContact(req.user!.organizationId, req.params.id, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/send', requirePermission(PERMISSIONS['vendor.update'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await sendDueDiligence(req.user!.organizationId, req.params.id, actor(req), req.body || {});
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/invitation/resend', requirePermission(PERMISSIONS['vendor.update'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await resendInvitation(req.user!.organizationId, req.params.id, actor(req)) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/invitation/link', requirePermission(PERMISSIONS['vendor.update'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await activationLink(req.user!.organizationId, req.params.id, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/invitation/shared', requirePermission(PERMISSIONS['vendor.update'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await markInvitationShared(req.user!.organizationId, req.params.id, actor(req)) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/findings/:findingId/review', requirePermission(PERMISSIONS['finding.update']), async (req: AuthRequest, res: Response, next: NextFunction) => {
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

router.post('/:id/findings/:findingId/remediate', requirePermission(PERMISSIONS['finding.update']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await planRemediation(req.user!.organizationId, req.params.id, actor(req), req.params.findingId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/findings/:findingId/validate', requirePermission(PERMISSIONS['finding.update']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await validateFinding(req.user!.organizationId, req.params.id, actor(req), req.params.findingId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/findings/:findingId/close', requirePermission(PERMISSIONS['finding.close']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await closeFinding(req.user!.organizationId, req.params.id, actor(req), req.params.findingId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/findings/:findingId/accept-risk', requirePermission(PERMISSIONS['finding.update'], PERMISSIONS['risk.accept']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await acceptFindingRisk(req.user!.organizationId, req.params.id, actor(req), req.params.findingId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/findings/:findingId/accept-risk/approve', requirePermission(PERMISSIONS['risk.accept']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await approveFindingRisk(req.user!.organizationId, req.params.id, actor(req), req.params.findingId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/contract/attest', requirePermission(PERMISSIONS['vendor.update'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await attestContract(req.user!.organizationId, req.params.id, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/approval', requirePermission(PERMISSIONS['approval.decide']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await decideApproval(req.user!.organizationId, req.params.id, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/activate', requirePermission(PERMISSIONS['vendor.update'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
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

router.post('/:id/reassessment', requirePermission(PERMISSIONS['vendor.update'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await startReassessment(req.user!.organizationId, req.params.id, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/offboard', requirePermission(PERMISSIONS['vendor.update'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await startOffboarding(req.user!.organizationId, req.params.id, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/clarification', requirePermission(PERMISSIONS['vendor.update'], PERMISSIONS['assessment.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
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

import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { AuthRequest, requirePermission, requirePractitionerPersona, requireRequesterPersona } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimiter';
import { PERMISSIONS } from '../security/rbac';
import {
    assignIntake,
    closeIntake,
    confirmThirdPartyMatch,
    createEngagementFromIntake,
    createIntakeRequest,
    createRequesterIntake,
    createThirdPartyFromIntake,
    getEngagement,
    getIntakeRequest,
    getRequesterIntake,
    listEngagements,
    listIntakeRequests,
    resolveLegacyOnboard,
    listMyTprmWork,
    listRequesterActions,
    listRequesterColleagues,
    listRequesterIntakes,
    requestIntakeInformation,
    requesterHome,
    respondIntakeInformation,
    respondRequesterInformation,
    uploadRequesterInformationAttachment,
    downloadIntakeInformationAttachment,
    searchThirdParties,
    startTriage,
    workload,
} from '../services/intakeEngagementService';
import {
    confirmEngagementTier,
    getRequesterIra,
    getTierReview,
    overrideEngagementTier,
    requestIraClarification,
    submitRequesterClarification,
    submitRequesterIra,
} from '../services/engagementIraService';
import {
    completeSpecialistReview,
    confirmDueDiligencePlan,
    copyEngagementActivationLink,
    getAssessmentReview,
    getDueDiligencePlan,
    listEngagementAssessments,
    markEngagementInvitationShared,
    modifyDueDiligencePlan,
    requestVendorClarification,
    sendEngagementQuestionnaire,
    setAssessmentContact,
} from '../services/engagementDueDiligenceService';
import {
    calculateResidual,
    confirmFinding,
    confirmResidual,
    dismissCandidate,
    getEngagementRisk,
    listVendorEngagementRisk,
    recordCompensatingControl,
    recordControlEffectiveness,
    seedFindingCandidates,
    createFindingCandidate,
} from '../services/engagementRiskService';
import {
    activateEngagement,
    createContractRequirement,
    decideAcceptance,
    decideApproval,
    decideContractException,
    evaluateGate,
    generateDecisionBrief,
    getDecisionBrief,
    getDecisionWorkspace,
    requestAcceptance,
    requestContractException,
    selectTreatment,
    updateContractRequirement,
} from '../services/engagementTreatmentService';
import {
    assignSignal,
    closeSignal,
    createFindingFromSignal,
    createManualSignal,
    escalateSignal,
    getMonitoringWorkspace,
    getSignalDetail,
    ingestProviderObservation,
    listSignals,
    portfolioMonitoring,
    recommendReassessment,
    setImpact,
    triageSignal,
    upsertProfile,
} from '../services/engagementMonitoringService';
import {
    advanceStage,
    calculateCycleResidual,
    confirmDeltaPlan,
    confirmTierReview,
    decideReassessment,
    getReassessmentWorkspace,
    recordRequesterDelta,
    refreshIra,
    requestVendorRefresh,
    returnToMonitoring,
    reviewItem,
    startReassessment,
    updateScope,
} from '../services/engagementReassessmentService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

function actor(req: AuthRequest) {
    return {
        id: req.user!.id,
        name: req.user!.name,
        email: req.user!.email,
        role: req.user!.role,
    };
}

const requesterPerms = [
    PERMISSIONS['intake.create_own'],
    PERMISSIONS['intake.read_own'],
    PERMISSIONS['intake.respond_own'],
    PERMISSIONS['ira.complete_own'],
    PERMISSIONS['ira.clarify_own'],
] as const;

router.get('/requester/home', requireRequesterPersona, requirePermission(...requesterPerms), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await requesterHome(req.user!.organizationId, actor(req)) });
    } catch (error) {
        next(error);
    }
});

router.get('/requester/intakes', requireRequesterPersona, requirePermission(...requesterPerms), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await listRequesterIntakes(req.user!.organizationId, actor(req)) });
    } catch (error) {
        next(error);
    }
});

router.get('/requester/actions', requireRequesterPersona, requirePermission(...requesterPerms), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await listRequesterActions(req.user!.organizationId, actor(req)) });
    } catch (error) {
        next(error);
    }
});

router.get('/requester/colleagues', requireRequesterPersona, requirePermission(...requesterPerms), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await listRequesterColleagues(req.user!.organizationId, actor(req)) });
    } catch (error) {
        next(error);
    }
});

router.post('/requester/intakes', requireRequesterPersona, requirePermission(PERMISSIONS['intake.create_own']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await createRequesterIntake(req.user!.organizationId, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.get('/requester/intakes/:id', requireRequesterPersona, requirePermission(...requesterPerms), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getRequesterIntake(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.post('/requester/intakes/:id/information-response', requireRequesterPersona, requirePermission(PERMISSIONS['intake.respond_own'], PERMISSIONS['intake.create_own']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await respondRequesterInformation(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/requester/intakes/:id/information-attachments', requireRequesterPersona, requirePermission(PERMISSIONS['intake.respond_own'], PERMISSIONS['intake.create_own']), uploadLimiter, upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.file) throw new Error('Choose a supporting document.');
        res.status(201).json({
            success: true,
            data: await uploadRequesterInformationAttachment(req.user!.organizationId, actor(req), req.params.id, {
                informationRequestId: String(req.body?.informationRequestId || ''),
                filename: req.file.originalname,
                contentType: req.file.mimetype,
                buffer: req.file.buffer,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/requester/intakes/:id/information-attachments/:storedObjectId', requireRequesterPersona, requirePermission(...requesterPerms), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { stored, buffer } = await downloadIntakeInformationAttachment(req.user!.organizationId, actor(req), req.params.id, req.params.storedObjectId);
        res.setHeader('Content-Type', stored.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${stored.filename}"`);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
});

router.get('/intakes/:id/information-attachments/:storedObjectId', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { stored, buffer } = await downloadIntakeInformationAttachment(req.user!.organizationId, actor(req), req.params.id, req.params.storedObjectId);
        res.setHeader('Content-Type', stored.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${stored.filename}"`);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
});

router.post('/intakes', requireRequesterPersona, requirePermission(PERMISSIONS['intake.create_own']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await createIntakeRequest(req.user!.organizationId, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.get('/intakes', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['intake.assign'], PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await listIntakeRequests(req.user!.organizationId, actor(req), {
                filter: typeof req.query.filter === 'string' ? req.query.filter : undefined,
                q: typeof req.query.q === 'string' ? req.query.q : undefined,
                page: req.query.page ? Number(req.query.page) : undefined,
                pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
                sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/intakes/my-work', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage'], PERMISSIONS['intake.assign'], PERMISSIONS['intake.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await listMyTprmWork(req.user!.organizationId, actor(req)) });
    } catch (error) {
        next(error);
    }
});

router.get('/intakes/workload', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.assign']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await workload(req.user!.organizationId) });
    } catch (error) {
        next(error);
    }
});

router.get('/intakes/:id', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['intake.assign'], PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getIntakeRequest(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.post('/intakes/:id/assign', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.assign']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await assignIntake(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/intakes/:id/start-review', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await startTriage(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.post('/intakes/:id/request-information', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await requestIntakeInformation(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/intakes/:id/information-response', requireRequesterPersona, requirePermission(PERMISSIONS['intake.respond_own'], PERMISSIONS['intake.create_own']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await respondIntakeInformation(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.get('/intakes/:id/third-parties', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await searchThirdParties(req.user!.organizationId, actor(req), {
                q: typeof req.query.q === 'string' ? req.query.q : undefined,
                website: typeof req.query.website === 'string' ? req.query.website : undefined,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/third-parties/search', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await searchThirdParties(req.user!.organizationId, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/intakes/:id/match', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await confirmThirdPartyMatch(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/intakes/:id/third-party', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await createThirdPartyFromIntake(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/intakes/:id/engagement', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await createEngagementFromIntake(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/intakes/:id/close', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.assign'], PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await closeIntake(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.get('/legacy-onboard/:id', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['vendor.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await resolveLegacyOnboard(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.get('/engagements', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['vendor.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await listEngagements(req.user!.organizationId, actor(req), {
                vendorId: typeof req.query.vendorId === 'string' ? req.query.vendorId : undefined,
                page: req.query.page ? Number(req.query.page) : undefined,
                pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/engagements/:id', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['vendor.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getEngagement(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.get('/requester/iras/:id', requireRequesterPersona, requirePermission(PERMISSIONS['ira.complete_own'], PERMISSIONS['ira.clarify_own']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getRequesterIra(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.post('/requester/iras/:id/submit', requireRequesterPersona, requirePermission(PERMISSIONS['ira.complete_own']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await submitRequesterIra(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/requester/iras/:id/clarification', requireRequesterPersona, requirePermission(PERMISSIONS['ira.clarify_own']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await submitRequesterClarification(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.get('/engagements/:id/tier-review', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getTierReview(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/tier-review/confirm', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await confirmEngagementTier(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/tier-review/override', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await overrideEngagementTier(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/tier-review/clarification', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await requestIraClarification(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.get('/assessments/engagements', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['vendor.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await listEngagementAssessments(req.user!.organizationId, actor(req)) });
    } catch (error) {
        next(error);
    }
});

router.get('/engagements/:id/due-diligence', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getDueDiligencePlan(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/due-diligence/modify', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await modifyDueDiligencePlan(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/due-diligence/confirm', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await confirmDueDiligencePlan(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/due-diligence/contact', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await setAssessmentContact(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/due-diligence/send', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await sendEngagementQuestionnaire(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/due-diligence/link', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await copyEngagementActivationLink(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/due-diligence/shared', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await markEngagementInvitationShared(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.get('/engagements/:id/assessment-review', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getAssessmentReview(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/assessment-review/clarification', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await requestVendorClarification(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/assessment-review/complete', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await completeSpecialistReview(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.get('/engagements/:id/risk', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['finding.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getEngagementRisk(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/finding-candidates/seed', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage'], PERMISSIONS['finding.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await seedFindingCandidates(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/finding-candidates', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage'], PERMISSIONS['finding.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await createFindingCandidate(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/findings/:issueId/confirm', requirePractitionerPersona, requirePermission(PERMISSIONS['finding.update'], PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await confirmFinding(req.user!.organizationId, actor(req), req.params.issueId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/findings/:issueId/dismiss', requirePractitionerPersona, requirePermission(PERMISSIONS['finding.update'], PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await dismissCandidate(req.user!.organizationId, actor(req), req.params.issueId, req.body?.reason || req.body?.dismissReason) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/control-effectiveness', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage'], PERMISSIONS['finding.update']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await recordControlEffectiveness(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/compensating-controls', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage'], PERMISSIONS['finding.update']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const idempotencyKey = req.body?.idempotencyKey || req.header('Idempotency-Key');
        res.status(201).json({ success: true, data: await recordCompensatingControl(req.user!.organizationId, actor(req), req.params.id, { ...(req.body || {}), idempotencyKey }) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/residual-risk/calculate', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await calculateResidual(req.user!.organizationId, actor(req), req.params.id, req.body?.reason || 'manual.calculate') });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/residual-risk/confirm', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await confirmResidual(req.user!.organizationId, actor(req), req.params.id, req.body?.note) });
    } catch (error) {
        next(error);
    }
});

router.get('/engagements/:id/decisions', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['risk.read'], PERMISSIONS['approval.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getDecisionWorkspace(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/treatment', requirePractitionerPersona, requirePermission(PERMISSIONS['risk.treat'], PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await selectTreatment(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/acceptance', requirePractitionerPersona, requirePermission(PERMISSIONS['risk.treat'], PERMISSIONS['risk.accept']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await requestAcceptance(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/acceptance/decide', requirePractitionerPersona, requirePermission(PERMISSIONS['risk.accept'], PERMISSIONS['approval.decide']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await decideAcceptance(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.get('/engagements/:id/approvals', requirePractitionerPersona, requirePermission(PERMISSIONS['approval.read'], PERMISSIONS['risk.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const workspace = await getDecisionWorkspace(req.user!.organizationId, actor(req), req.params.id);
        res.json({ success: true, data: workspace.approvals });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/approvals', requirePractitionerPersona, requirePermission(PERMISSIONS['approval.decide'], PERMISSIONS['risk.accept']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await decideApproval(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/contract-requirements', requirePractitionerPersona, requirePermission(PERMISSIONS['risk.treat'], PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await createContractRequirement(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.patch('/engagements/:id/contract-requirements/:requirementId', requirePractitionerPersona, requirePermission(PERMISSIONS['risk.treat'], PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await updateContractRequirement(req.user!.organizationId, actor(req), req.params.id, req.params.requirementId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/contract-exceptions', requirePractitionerPersona, requirePermission(PERMISSIONS['exception.create'], PERMISSIONS['risk.treat']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await requestContractException(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/contract-exceptions/decide', requirePractitionerPersona, requirePermission(PERMISSIONS['exception.approve'], PERMISSIONS['approval.decide']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await decideContractException(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.get('/engagements/:id/gate', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['risk.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const workspace = await getDecisionWorkspace(req.user!.organizationId, actor(req), req.params.id);
        res.json({ success: true, data: workspace.gate });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/gate/evaluate', requirePractitionerPersona, requirePermission(PERMISSIONS['risk.treat'], PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await evaluateGate(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/activate', requirePractitionerPersona, requirePermission(PERMISSIONS['engagement.activate']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await activateEngagement(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.get('/engagements/:id/decision-briefs', requirePractitionerPersona, requirePermission(PERMISSIONS['risk.read'], PERMISSIONS['intake.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const workspace = await getDecisionWorkspace(req.user!.organizationId, actor(req), req.params.id);
        res.json({ success: true, data: workspace.decisionBriefs });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/decision-briefs', requirePractitionerPersona, requirePermission(PERMISSIONS['risk.read'], PERMISSIONS['intake.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await generateDecisionBrief(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.get('/engagements/:id/decision-briefs/:briefId', requirePractitionerPersona, requirePermission(PERMISSIONS['risk.read'], PERMISSIONS['intake.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getDecisionBrief(req.user!.organizationId, actor(req), req.params.id, req.params.briefId) });
    } catch (error) {
        next(error);
    }
});

router.get('/vendors/:vendorId/engagement-risk', requirePractitionerPersona, requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['finding.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await listVendorEngagementRisk(req.user!.organizationId, actor(req), req.params.vendorId) });
    } catch (error) {
        next(error);
    }
});

router.get('/engagements/:id/monitoring', requirePractitionerPersona, requirePermission(PERMISSIONS['monitoring.read'], PERMISSIONS['intake.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getMonitoringWorkspace(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/monitoring/profile', requirePractitionerPersona, requirePermission(PERMISSIONS['monitoring.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await upsertProfile(req.user!.organizationId, actor(req), req.params.id, req.body || {}, Boolean(req.body?.activate)) });
    } catch (error) {
        next(error);
    }
});

router.patch('/engagements/:id/monitoring/profile', requirePractitionerPersona, requirePermission(PERMISSIONS['monitoring.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await upsertProfile(req.user!.organizationId, actor(req), req.params.id, req.body || {}, req.body?.status === 'ACTIVE') });
    } catch (error) {
        next(error);
    }
});

router.get('/monitoring/signals', requirePractitionerPersona, requirePermission(PERMISSIONS['monitoring.read'], PERMISSIONS['intake.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await listSignals(req.user!.organizationId, actor(req), req.query) });
    } catch (error) {
        next(error);
    }
});

router.get('/monitoring/portfolio', requirePractitionerPersona, requirePermission(PERMISSIONS['monitoring.read'], PERMISSIONS['intake.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await portfolioMonitoring(req.user!.organizationId, actor(req)) });
    } catch (error) {
        next(error);
    }
});

router.get('/monitoring/signals/:signalId', requirePractitionerPersona, requirePermission(PERMISSIONS['monitoring.read'], PERMISSIONS['intake.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getSignalDetail(req.user!.organizationId, actor(req), req.params.signalId) });
    } catch (error) {
        next(error);
    }
});

router.post('/monitoring/signals/manual', requirePractitionerPersona, requirePermission(PERMISSIONS['monitoring.triage'], PERMISSIONS['monitoring.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await createManualSignal(req.user!.organizationId, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/monitoring/signals/provider', requirePractitionerPersona, requirePermission(PERMISSIONS['monitoring.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await ingestProviderObservation(req.user!.organizationId, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/monitoring/signals/:signalId/assign', requirePractitionerPersona, requirePermission(PERMISSIONS['monitoring.triage'], PERMISSIONS['monitoring.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await assignSignal(req.user!.organizationId, actor(req), req.params.signalId, req.body?.ownerUserId) });
    } catch (error) {
        next(error);
    }
});

router.post('/monitoring/signals/:signalId/impact', requirePractitionerPersona, requirePermission(PERMISSIONS['monitoring.triage'], PERMISSIONS['monitoring.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await setImpact(req.user!.organizationId, actor(req), req.params.signalId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/monitoring/signals/:signalId/triage', requirePractitionerPersona, requirePermission(PERMISSIONS['monitoring.triage'], PERMISSIONS['monitoring.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await triageSignal(req.user!.organizationId, actor(req), req.params.signalId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/monitoring/signals/:signalId/escalate', requirePractitionerPersona, requirePermission(PERMISSIONS['monitoring.escalate'], PERMISSIONS['monitoring.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await escalateSignal(req.user!.organizationId, actor(req), req.params.signalId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/monitoring/signals/:signalId/close', requirePractitionerPersona, requirePermission(PERMISSIONS['monitoring.triage'], PERMISSIONS['monitoring.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await closeSignal(req.user!.organizationId, actor(req), req.params.signalId, req.body?.rationale || req.body?.reason) });
    } catch (error) {
        next(error);
    }
});

router.post('/monitoring/signals/:signalId/finding', requirePractitionerPersona, requirePermission(PERMISSIONS['finding.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await createFindingFromSignal(req.user!.organizationId, actor(req), req.params.signalId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/monitoring/signals/:signalId/recommend-reassessment', requirePractitionerPersona, requirePermission(PERMISSIONS['monitoring.triage'], PERMISSIONS['monitoring.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await recommendReassessment(req.user!.organizationId, actor(req), req.params.signalId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.get('/engagements/:id/reassessment', requirePermission(PERMISSIONS['reassessment.read'], PERMISSIONS['intake.read'], PERMISSIONS['intake.create_own']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getReassessmentWorkspace(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/reassessment/start', requirePractitionerPersona, requirePermission(PERMISSIONS['reassessment.initiate'], PERMISSIONS['reassessment.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await startReassessment(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/reassessment/scope', requirePractitionerPersona, requirePermission(PERMISSIONS['reassessment.initiate'], PERMISSIONS['reassessment.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await updateScope(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/reassessment/requester-delta', requirePermission(PERMISSIONS['reassessment.initiate'], PERMISSIONS['reassessment.manage'], PERMISSIONS['intake.create_own']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await recordRequesterDelta(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/reassessment/ira', requirePractitionerPersona, requirePermission(PERMISSIONS['reassessment.initiate'], PERMISSIONS['reassessment.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await refreshIra(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/reassessment/tier-review', requirePractitionerPersona, requirePermission(PERMISSIONS['reassessment.initiate'], PERMISSIONS['reassessment.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await confirmTierReview(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/reassessment/delta-plan', requirePractitionerPersona, requirePermission(PERMISSIONS['reassessment.initiate'], PERMISSIONS['reassessment.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await confirmDeltaPlan(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/reassessment/vendor-refresh', requirePractitionerPersona, requirePermission(PERMISSIONS['reassessment.initiate'], PERMISSIONS['reassessment.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await requestVendorRefresh(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/reassessment/items/:itemId', requirePractitionerPersona, requirePermission(PERMISSIONS['reassessment.initiate'], PERMISSIONS['reassessment.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await reviewItem(req.user!.organizationId, actor(req), req.params.id, req.params.itemId, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/reassessment/advance', requirePractitionerPersona, requirePermission(PERMISSIONS['reassessment.initiate'], PERMISSIONS['reassessment.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await advanceStage(req.user!.organizationId, actor(req), req.params.id, req.body?.status, req.body?.cycleId) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/reassessment/residual', requirePractitionerPersona, requirePermission(PERMISSIONS['reassessment.manage'], PERMISSIONS['risk.score']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await calculateCycleResidual(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/reassessment/decide', requirePractitionerPersona, requirePermission(PERMISSIONS['reassessment.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await decideReassessment(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/engagements/:id/reassessment/return-to-monitoring', requirePractitionerPersona, requirePermission(PERMISSIONS['reassessment.initiate'], PERMISSIONS['reassessment.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await returnToMonitoring(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

export default router;

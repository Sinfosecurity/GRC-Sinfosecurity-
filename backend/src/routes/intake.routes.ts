import { Router, Response, NextFunction } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import {
    assignIntake,
    closeIntake,
    confirmThirdPartyMatch,
    createEngagementFromIntake,
    createIntakeRequest,
    createThirdPartyFromIntake,
    getEngagement,
    getIntakeRequest,
    listEngagements,
    listIntakeRequests,
    listMyTprmWork,
    requestIntakeInformation,
    respondIntakeInformation,
    searchThirdParties,
    startTriage,
    workload,
} from '../services/intakeEngagementService';

const router = Router();

function actor(req: AuthRequest) {
    return {
        id: req.user!.id,
        name: req.user!.name,
        email: req.user!.email,
        role: req.user!.role,
    };
}

router.post('/intakes', requirePermission(PERMISSIONS['intake.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await createIntakeRequest(req.user!.organizationId, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.get('/intakes', requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['intake.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
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

router.get('/intakes/my-work', requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['intake.create'], PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await listMyTprmWork(req.user!.organizationId, actor(req)) });
    } catch (error) {
        next(error);
    }
});

router.get('/intakes/workload', requirePermission(PERMISSIONS['intake.assign']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await workload(req.user!.organizationId) });
    } catch (error) {
        next(error);
    }
});

router.get('/intakes/:id', requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['intake.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getIntakeRequest(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.post('/intakes/:id/assign', requirePermission(PERMISSIONS['intake.assign']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await assignIntake(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/intakes/:id/start-review', requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await startTriage(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.post('/intakes/:id/request-information', requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await requestIntakeInformation(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/intakes/:id/information-response', requirePermission(PERMISSIONS['intake.create'], PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await respondIntakeInformation(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.get('/intakes/:id/third-parties', requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
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

router.post('/third-parties/search', requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await searchThirdParties(req.user!.organizationId, actor(req), req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/intakes/:id/match', requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await confirmThirdPartyMatch(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/intakes/:id/third-party', requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await createThirdPartyFromIntake(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/intakes/:id/engagement', requirePermission(PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await createEngagementFromIntake(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.post('/intakes/:id/close', requirePermission(PERMISSIONS['intake.assign'], PERMISSIONS['intake.triage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await closeIntake(req.user!.organizationId, actor(req), req.params.id, req.body || {}) });
    } catch (error) {
        next(error);
    }
});

router.get('/engagements', requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['vendor.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
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

router.get('/engagements/:id', requirePermission(PERMISSIONS['intake.read'], PERMISSIONS['vendor.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getEngagement(req.user!.organizationId, actor(req), req.params.id) });
    } catch (error) {
        next(error);
    }
});

export default router;

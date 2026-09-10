import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { auditEventService } from '../services/auditEventService';

const router = Router();
router.use(authenticate);
router.use(requirePermission(PERMISSIONS['audit.read']));

router.get('/logs', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const logs = await auditEventService.list(req.user!.organizationId, {
            action: req.query.action as string | undefined,
            resourceType: req.query.resourceType as string | undefined,
            limit: req.query.limit ? Number(req.query.limit) : 100,
        });
        res.json({ success: true, count: logs.length, data: logs });
    } catch (error) {
        next(error);
    }
});

router.get('/recent', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const logs = await auditEventService.list(req.user!.organizationId, { limit: 25 });
        res.json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
});

export default router;

import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { auditEventService } from '../services/auditEventService';

const router = Router();
router.use(authenticate);
router.use(requirePermission(PERMISSIONS['audit.read']));

router.get('/logs', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await auditEventService.list(req.user!.organizationId, {
            action: req.query.action as string | undefined,
            resourceType: req.query.resourceType as string | undefined,
            result: req.query.result as string | undefined,
            q: req.query.q as string | undefined,
            limit: req.query.limit ? Number(req.query.limit) : undefined,
            page: req.query.page ? Number(req.query.page) : undefined,
            pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        });
        res.json({ success: true, count: result.items.length, ...result, data: result.items });
    } catch (error) {
        next(error);
    }
});

router.get('/recent', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await auditEventService.list(req.user!.organizationId, { pageSize: 25 });
        res.json({ success: true, data: result.items });
    } catch (error) {
        next(error);
    }
});

export default router;

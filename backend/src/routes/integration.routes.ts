import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { tenantIntegrationService } from '../publicApi/integrationCatalog';

const router = Router();
router.use(authenticate);
router.use(requirePermission(PERMISSIONS['integration.manage']));

router.get('/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const rows = await tenantIntegrationService.list(req.user!.organizationId);
        res.json({
            success: true,
            data: Object.fromEntries(rows.map((row) => [row.id, row.status.label])),
        });
    } catch (error) { next(error); }
});

router.post('/:provider/test', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await tenantIntegrationService.test(req.user!.organizationId, req.params.provider, req.user!.id);
        res.json({ success: true, data: result });
    } catch (error) { next(error); }
});

export default router;

import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { listTemplates } from '../services/questionnaireService';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS['assessment.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const templates = await listTemplates(req.user!.organizationId);
        res.json({ success: true, data: templates });
    } catch (error) {
        next(error);
    }
});

export default router;

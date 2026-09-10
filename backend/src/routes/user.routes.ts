import { Router, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { identityUserService } from '../services/identityUserService';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS['user.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const users = await identityUserService.list(req.user!.organizationId);
        res.json({ success: true, count: users.length, data: users });
    } catch (error) {
        next(error);
    }
});

router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await identityUserService.getById(req.user!.id, req.user!.organizationId);
        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
});

router.get('/:id', requirePermission(PERMISSIONS['user.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await identityUserService.getById(req.params.id, req.user!.organizationId);
        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
});

router.patch('/:id/role', requirePermission(PERMISSIONS['user.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const role = req.body?.role as Role;
        if (!role || !Object.values(Role).includes(role)) {
            throw new ApiError(400, 'Valid role is required');
        }
        const user = await identityUserService.updateRole(req.params.id, req.user!.organizationId, role, req.user!.id);
        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
});

router.patch('/:id/status', requirePermission(PERMISSIONS['user.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const disabled = req.body?.status === 'DISABLED' || req.body?.disabled === true;
        const user = await identityUserService.setDisabled(req.params.id, req.user!.organizationId, disabled, req.user!.id);
        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
});

router.post('/invite', requirePermission(PERMISSIONS['user.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { email, role } = req.body || {};
        if (!email) {
            throw new ApiError(400, 'Email is required');
        }
        const result = await identityUserService.invite(
            req.user!.organizationId,
            req.user!.id,
            email,
            (role as Role) || Role.VIEWER
        );
        res.status(201).json({
            success: true,
            data: {
                invitation: result.invitation,
                ...(result.token ? { token: result.token } : {}),
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;

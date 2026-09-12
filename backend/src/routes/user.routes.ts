import { Router, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { identityUserService } from '../services/identityUserService';
import { ApiError } from '../middleware/errorHandler';
import { adminLimiter } from '../middleware/rateLimiter';

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

router.get('/invitations', requirePermission(PERMISSIONS['user.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const invitations = await identityUserService.listInvitations(req.user!.organizationId);
        res.json({ success: true, data: invitations });
    } catch (error) {
        next(error);
    }
});

router.post('/invitations/:id/revoke', requirePermission(PERMISSIONS['user.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const invitation = await identityUserService.revokeInvitation(
            req.user!.organizationId,
            req.params.id,
            req.user!.id,
            req.user!.role as Role
        );
        res.json({ success: true, data: invitation });
    } catch (error) {
        next(error);
    }
});

router.post('/invitations/:id/resend', requirePermission(PERMISSIONS['user.manage']), adminLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await identityUserService.resendInvitation(
            req.user!.organizationId,
            req.params.id,
            req.user!.id,
            req.user!.role as Role
        );
        res.json({ success: true, data: result });
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
        const user = await identityUserService.updateRole(
            req.params.id,
            req.user!.organizationId,
            role,
            req.user!.id,
            req.user!.role as Role
        );
        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
});

router.patch('/:id/status', requirePermission(PERMISSIONS['user.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const disabled = req.body?.status === 'DISABLED' || req.body?.disabled === true;
        const user = await identityUserService.setDisabled(
            req.params.id,
            req.user!.organizationId,
            disabled,
            req.user!.id,
            req.user!.role as Role
        );
        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
});

router.post('/invite', requirePermission(PERMISSIONS['user.manage']), adminLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { email, role } = req.body || {};
        if (!email) {
            throw new ApiError(400, 'Email is required');
        }
        const result = await identityUserService.invite(
            req.user!.organizationId,
            req.user!.id,
            email,
            (role as Role) || Role.VIEWER,
            req.user!.role as Role
        );
        res.status(201).json({
            success: true,
            data: {
                invitation: result.invitation,
                emailStatus: result.emailStatus,
                ...(result.token ? { token: result.token } : {}),
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;

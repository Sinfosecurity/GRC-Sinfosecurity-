import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

function meta(req: Request) {
    return {
        ip: req.ip,
        userAgent: req.get('user-agent') || undefined,
        requestId: (req as any).id || (req.headers['x-request-id'] as string | undefined),
    };
}

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, firstName, lastName, organizationName, country } = req.body || {};
        if (!email || !password || !firstName || !lastName || !organizationName) {
            throw new ApiError(400, 'Email, password, name, and organization name are required');
        }
        const result = await authService.signup({
            email,
            password,
            firstName,
            lastName,
            organizationName,
            country,
        });
        res.cookie('token', result.token, authService.cookieOptions());
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, firstName, lastName, organizationName, country } = req.body || {};
        if (!email || !password || !firstName || !lastName || !organizationName) {
            throw new ApiError(400, 'Email, password, name, and organization name are required');
        }
        const result = await authService.signup({
            email,
            password,
            firstName,
            lastName,
            organizationName,
            country,
        });
        res.cookie('token', result.token, authService.cookieOptions());
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            throw new ApiError(400, 'Email and password are required');
        }
        const result = await authService.login(email, password, meta(req));
        res.cookie('token', result.token, authService.cookieOptions());
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
        if (!refreshToken) {
            throw new ApiError(400, 'Refresh token is required');
        }
        const result = await authService.refresh(refreshToken);
        res.cookie('token', result.token, authService.cookieOptions());
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await authService.logout(req.body?.refreshToken, req.user?.id);
        res.clearCookie('token', authService.cookieOptions());
        res.json({ success: true, data: { message: 'Logged out successfully' } });
    } catch (error) {
        next(error);
    }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await authService.me(req.user!.id);
        res.json({ success: true, data: { user } });
    } catch (error) {
        next(error);
    }
});

router.post('/change-password', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) {
            throw new ApiError(400, 'Current and new passwords are required');
        }
        await authService.changePassword(req.user!.id, currentPassword, newPassword);
        res.json({ success: true, data: { message: 'Password updated' } });
    } catch (error) {
        next(error);
    }
});

router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body || {};
        if (!email) {
            throw new ApiError(400, 'Email is required');
        }
        const result = await authService.requestPasswordReset(email);
        res.json({
            success: true,
            data: {
                message: 'If an account exists, a reset email will be sent.',
                ...(result.resetToken ? { resetToken: result.resetToken } : {}),
            },
        });
    } catch (error) {
        next(error);
    }
});

router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, password } = req.body || {};
        if (!token || !password) {
            throw new ApiError(400, 'Token and password are required');
        }
        await authService.resetPassword(token, password);
        res.json({ success: true, data: { message: 'Password has been reset' } });
    } catch (error) {
        next(error);
    }
});

router.post('/activate', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, password, firstName, lastName } = req.body || {};
        if (!token || !password || !firstName || !lastName) {
            throw new ApiError(400, 'Invitation token, password, and name are required');
        }
        const result = await authService.acceptInvitation(token, { password, firstName, lastName });
        res.cookie('token', result.token, authService.cookieOptions());
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

export default router;

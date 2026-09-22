import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import {
    activationRateLimiter,
    authRateLimiter,
    loginIpLimiter,
    mfaLimiter,
    passwordResetIpLimiter,
    passwordResetLimiter,
    signupRateLimiter,
} from '../middleware/rateLimiter';
import { requestedPlane } from '../security/sessionPlane';
import { totpMfaService } from '../services/totpMfaService';
import { privilegeElevationService } from '../services/privilegeElevationService';
import { requirePlatformStaff } from '../security/platform';
import {
    assertRefreshCsrf,
    clearRefreshCookie,
    readRefreshToken,
    sessionRefreshTtlMs,
    setRefreshCookie,
    shouldExposeRefreshTokenInBody,
} from '../security/refreshCookie';

const router = Router();

function meta(req: Request) {
    return {
        ip: req.ip,
        userAgent: req.get('user-agent') || undefined,
        requestId: (req as any).id || (req.headers['x-request-id'] as string | undefined),
    };
}

function sessionBody(result: { token?: string; refreshToken?: string; [key: string]: unknown }) {
    if (!('refreshToken' in result) || !result.refreshToken) return result;
    const { refreshToken, ...rest } = result;
    return {
        ...rest,
        refreshTokenStorage: 'cookie',
        ...(shouldExposeRefreshTokenInBody() ? { refreshToken } : {}),
    };
}

function attachRefresh(res: Response, result: { refreshToken?: string } | Record<string, unknown>) {
    const token = 'refreshToken' in result && typeof result.refreshToken === 'string' ? result.refreshToken : undefined;
    if (token) {
        setRefreshCookie(res, token, sessionRefreshTtlMs());
    }
}

router.post('/register', signupRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, firstName, lastName, organizationName, country } = req.body || {};
        if (!email || !password || !firstName || !lastName || !organizationName) {
            throw new ApiError(400, 'Email, password, name, and organization name are required');
        }
        if (req.body?.organizationId) {
            throw new ApiError(400, 'You cannot join an existing organization from public registration.');
        }
        const result = await authService.signup({
            email,
            password,
            firstName,
            lastName,
            organizationName,
            country,
        });
        attachRefresh(res, result);
        res.status(201).json({ success: true, data: sessionBody(result) });
    } catch (error) {
        next(error);
    }
});

router.post('/signup', signupRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, firstName, lastName, organizationName, country } = req.body || {};
        if (!email || !password || !firstName || !lastName || !organizationName) {
            throw new ApiError(400, 'Email, password, name, and organization name are required');
        }
        if (req.body?.organizationId) {
            throw new ApiError(400, 'You cannot join an existing organization from public registration.');
        }
        const result = await authService.signup({
            email,
            password,
            firstName,
            lastName,
            organizationName,
            country,
        });
        attachRefresh(res, result);
        res.status(201).json({ success: true, data: sessionBody(result) });
    } catch (error) {
        next(error);
    }
});

router.post('/login', loginIpLimiter, authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            throw new ApiError(400, 'Email and password are required');
        }
        const result = await authService.login(email, password, { ...meta(req), plane: requestedPlane(req.body) });
        attachRefresh(res, result);
        res.json({ success: true, data: sessionBody(result) });
    } catch (error) {
        next(error);
    }
});

router.post('/refresh', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const presented = readRefreshToken(req);
        if (!presented.token) {
            throw new ApiError(400, 'Refresh token is required');
        }
        assertRefreshCsrf(req, presented.fromCookie);
        const result = await authService.refresh(presented.token);
        attachRefresh(res, result);
        res.json({ success: true, data: sessionBody(result) });
    } catch (error) {
        next(error);
    }
});

router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const presented = readRefreshToken(req);
        await authService.logout(presented.token || req.body?.refreshToken, req.user?.id);
        clearRefreshCookie(res);
        res.json({ success: true, data: { message: 'Logged out successfully' } });
    } catch (error) {
        next(error);
    }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await authService.me(req.user!.id, {
            plane: req.user!.plane,
            mfaSatisfied: req.user!.mfaSatisfied,
            enrollOnly: req.user!.enrollOnly,
        });
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

router.post('/forgot-password', passwordResetIpLimiter, passwordResetLimiter, async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/reset-password', passwordResetIpLimiter, passwordResetLimiter, async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/activate', activationRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, password, firstName, lastName } = req.body || {};
        if (!token || !password || !firstName || !lastName) {
            throw new ApiError(400, 'Invitation token, password, and name are required');
        }
        const result = await authService.acceptInvitation(token, { password, firstName, lastName });
        attachRefresh(res, result);
        res.json({ success: true, data: sessionBody(result) });
    } catch (error) {
        next(error);
    }
});

router.post('/mfa/enroll/start', authenticate, mfaLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.enrollOnly) {
            throw new ApiError(403, 'MFA enrollment is required');
        }
        const data = await totpMfaService.startEnrollment(req.user!.id, req.user!.email, { requestId: meta(req).requestId });
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/mfa/enroll/confirm', authenticate, mfaLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.enrollOnly) {
            throw new ApiError(403, 'MFA enrollment is required');
        }
        const result = await authService.completePlatformEnrollment(req.user!.id, String(req.body?.code || ''), {
            requestId: meta(req).requestId,
        });
        attachRefresh(res, result);
        res.json({ success: true, data: sessionBody(result) });
    } catch (error) {
        next(error);
    }
});

router.post('/mfa/verify', mfaLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await authService.completePlatformMfa(
            String(req.body?.challengeToken || ''),
            String(req.body?.code || ''),
            meta(req)
        );
        attachRefresh(res, result);
        res.json({ success: true, data: sessionBody(result) });
    } catch (error) {
        next(error);
    }
});

router.post('/step-up', authenticate, requirePlatformStaff, mfaLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await privilegeElevationService.stepUp(req.user!.id, String(req.body?.code || ''), {
            requestId: meta(req).requestId,
        });
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

export default router;

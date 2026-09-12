import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import {
    Permission,
    hasPermission,
    isPlatformStaffRole,
    isPlatformOwnerRole,
} from './rbac';

export function requirePlatformStaff(req: AuthRequest, _res: Response, next: NextFunction) {
    if (!req.user) {
        return next(new ApiError(401, 'Authentication required'));
    }
    if (!isPlatformStaffRole(req.user.role)) {
        return next(new ApiError(403, 'Platform access denied'));
    }
    next();
}

export function requirePlatformPermission(...permissions: Permission[]) {
    return (req: AuthRequest, _res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError(401, 'Authentication required'));
        }
        if (!isPlatformStaffRole(req.user.role)) {
            return next(new ApiError(403, 'Platform access denied'));
        }
        if (permissions.length && !permissions.some((permission) => hasPermission(req.user!.role, permission))) {
            return next(new ApiError(403, 'Platform access denied'));
        }
        next();
    };
}

export function requirePlatformOwner(req: AuthRequest, _res: Response, next: NextFunction) {
    if (!req.user) {
        return next(new ApiError(401, 'Authentication required'));
    }
    if (!isPlatformOwnerRole(req.user.role)) {
        return next(new ApiError(403, 'Platform owner access required'));
    }
    next();
}

export function requestIdOf(req: Request): string | null {
    const header = req.headers['x-request-id'];
    if (typeof header === 'string' && header.trim()) return header.trim();
    return null;
}

export function actorMeta(req: AuthRequest) {
    return {
        actorUserId: req.user?.id,
        requestId: requestIdOf(req),
        ipAddress: typeof req.ip === 'string' ? req.ip : null,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
    };
}

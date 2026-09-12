import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import {
    Permission,
    hasPermission,
    isPlatformStaffRole,
    isPlatformOwnerRole,
} from './rbac';
import { PLATFORM_PLANE } from './sessionPlane';
import { privilegeElevationService } from '../services/privilegeElevationService';

function assertPlatformSession(req: AuthRequest): string | null {
    if (!req.user) {
        return 'Authentication required';
    }
    if (!isPlatformStaffRole(req.user.role)) {
        return 'Platform access denied';
    }
    if (req.user.enrollOnly) {
        return 'MFA enrollment is required';
    }
    if (req.user.plane !== PLATFORM_PLANE || !req.user.mfaSatisfied) {
        return 'Platform MFA is required';
    }
    return null;
}

export function requirePlatformStaff(req: AuthRequest, _res: Response, next: NextFunction) {
    const denied = assertPlatformSession(req);
    if (denied === 'Authentication required') {
        return next(new ApiError(401, denied));
    }
    if (denied) {
        return next(new ApiError(403, denied));
    }
    next();
}

export function requirePlatformPermission(...permissions: Permission[]) {
    return (req: AuthRequest, _res: Response, next: NextFunction) => {
        const denied = assertPlatformSession(req);
        if (denied === 'Authentication required') {
            return next(new ApiError(401, denied));
        }
        if (denied) {
            return next(new ApiError(403, denied));
        }
        if (permissions.length && !permissions.some((permission) => hasPermission(req.user!.role, permission))) {
            return next(new ApiError(403, 'Platform access denied'));
        }
        next();
    };
}

export function requirePlatformOwner(req: AuthRequest, _res: Response, next: NextFunction) {
    const denied = assertPlatformSession(req);
    if (denied === 'Authentication required') {
        return next(new ApiError(401, denied));
    }
    if (denied) {
        return next(new ApiError(403, denied));
    }
    if (!isPlatformOwnerRole(req.user!.role)) {
        return next(new ApiError(403, 'Platform owner access required'));
    }
    next();
}

export function requireStepUp(req: AuthRequest, _res: Response, next: NextFunction) {
    if (!req.user) {
        return next(new ApiError(401, 'Authentication required'));
    }
    privilegeElevationService.requireActive(req.user.id).then(() => next()).catch(next);
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

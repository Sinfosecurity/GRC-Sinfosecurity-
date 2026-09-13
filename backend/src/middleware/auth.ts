import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserAccountStatus } from '@prisma/client';
import { ApiError } from './errorHandler';
import { prisma } from '../config/database';
import { getEnv } from '../config/env';
import { Permission, hasAnyPermission, permissionsForRole, roleMatches } from '../security/rbac';
import { LegacyPermission } from '../security/rbac';
import { AuthPlane, CUSTOMER_PLANE, PLATFORM_PLANE, parsePlane } from '../security/sessionPlane';

export interface AuthUser {
    id: string;
    userId: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationId: string;
    permissions: string[];
    plane: AuthPlane;
    mfaSatisfied: boolean;
    enrollOnly: boolean;
}

export interface AuthRequest extends Request {
    user?: AuthUser;
}

function attachUser(req: AuthRequest, user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationId: string;
    status: UserAccountStatus;
}, claims: { plane: AuthPlane; mfaSatisfied: boolean; enrollOnly: boolean }) {
    if (user.status !== UserAccountStatus.ACTIVE) {
        throw new ApiError(401, 'Invalid or expired token');
    }
    req.user = {
        id: user.id,
        userId: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        permissions: permissionsForRole(user.role),
        plane: claims.plane,
        mfaSatisfied: claims.mfaSatisfied,
        enrollOnly: claims.enrollOnly,
    };
}

export async function authenticate(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        let token = req.cookies?.token;
        if (!token) {
            token = req.headers.authorization?.replace('Bearer ', '');
        }
        if (!token) {
            throw new ApiError(401, 'Authentication token required');
        }

        const env = getEnv();
        const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }) as {
            id?: string;
            userId?: string;
            email: string;
            role: string;
            organizationId?: string;
            plane?: string;
            mfa?: boolean;
            enroll?: boolean;
            iat?: number;
        };

        const userId = decoded.userId || decoded.id;
        if (!userId) {
            throw new ApiError(401, 'Invalid or expired token');
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { organization: true },
        });

        if (!user) {
            throw new ApiError(401, 'Invalid or expired token');
        }

        if (user.organization.status === 'SUSPENDED' || user.organization.status === 'CANCELLED') {
            throw new ApiError(403, 'Organization is not active');
        }

        if (user.passwordChangedAt && typeof decoded.iat === 'number') {
            const changedAtSec = Math.floor(user.passwordChangedAt.getTime() / 1000);
            if (decoded.iat < changedAtSec) {
                throw new ApiError(401, 'Invalid or expired token');
            }
        }

        const plane = parsePlane(decoded.plane);
        const enrollOnly = decoded.enroll === true;
        if (plane === PLATFORM_PLANE && !enrollOnly) {
            if (!user.mfaEnabled) {
                throw new ApiError(401, 'Invalid or expired token');
            }
            const enrolledAtSec = user.mfaEnrolledAt
                ? Math.floor(user.mfaEnrolledAt.getTime() / 1000)
                : 0;
            if (enrolledAtSec && typeof decoded.iat === 'number' && decoded.iat < enrolledAtSec) {
                throw new ApiError(401, 'Invalid or expired token');
            }
        }

        attachUser(req, user, {
            plane,
            mfaSatisfied: decoded.mfa === true,
            enrollOnly,
        });
        next();
    } catch (error) {
        if (error instanceof ApiError) {
            return next(error);
        }
        next(new ApiError(401, 'Invalid or expired token'));
    }
}

export function authorize(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError(401, 'Authentication required'));
        }
        if (roles.length && !roleMatches(req.user.role, roles)) {
            return next(new ApiError(403, 'Insufficient permissions'));
        }
        next();
    };
}

export const requireRole = authorize;

export function requirePermission(...permissions: Array<Permission | LegacyPermission | string>) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError(401, 'Authentication required'));
        }
        const needed = permissions.map((p) => String(p)) as Permission[];
        if (!hasAnyPermission(req.user.role, needed)) {
            return next(new ApiError(403, 'Forbidden: Insufficient permissions'));
        }
        next();
    };
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const header = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    if (!header) {
        return next();
    }
    authenticate(req, res, (err?: unknown) => {
        if (err) {
            return next();
        }
        next();
    });
}

export { Permission, LegacyPermission };

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';
import userService, { Permission } from '../services/userService';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
}

export async function authenticate(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        // Try JWT token first
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as {
                id: string;
                email: string;
                role: string;
            };

            const user = userService.getUserById(decoded.id);

            if (!user || user.status !== 'active') {
                throw new ApiError(401, 'Invalid or inactive user');
            }

            req.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            };

            // Update last login
            userService.updateLastLogin(user.id);
        } else {
            // For development, use x-user-id header or default to admin
            const userId = req.headers['x-user-id'] as string || 'user_1';
            const user = userService.getUserById(userId);

            if (!user || user.status !== 'active') {
                throw new ApiError(401, 'Invalid or inactive user');
            }

            req.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            };

            // Update last login
            userService.updateLastLogin(user.id);
        }

        next();
    } catch (error) {
        next(new ApiError(401, 'Invalid or expired token'));
    }
}

export function authorize(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError(401, 'Authentication required'));
        }

        if (roles.length && !roles.includes(req.user.role)) {
            return next(new ApiError(403, 'Insufficient permissions'));
        }

        next();
    };
}

// Alias for backward compatibility
export const requireRole = authorize;

/**
 * Check if user has required permission
 */
export function requirePermission(...permissions: Permission[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError(401, 'Authentication required'));
        }

        const hasPermission = permissions.some(permission =>
            userService.hasPermission(req.user!.id, permission)
        );

        if (!hasPermission) {
            return next(new ApiError(403, 'Forbidden: Insufficient permissions'));
        }

        next();
    };
}

/**
 * Optional authentication - attaches user if available but doesn't require it
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const userId = req.headers['x-user-id'] as string;

    if (userId) {
        const user = userService.getUserById(userId);

        if (user && user.status === 'active') {
            req.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            };
        }
    }

    next();
}

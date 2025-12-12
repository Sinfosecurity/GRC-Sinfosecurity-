import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

export async function authenticate(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            throw new ApiError(401, 'Authentication required');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            id: string;
            email: string;
            role: string;
        };

        req.user = decoded;
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

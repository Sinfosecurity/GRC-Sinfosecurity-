import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { ApiError } from './errorHandler';
import prisma from '../config/database';
import { Permission } from '../services/userService';

export interface JwtClaims {
    id: string;
    email: string;
    role: Role;
    organizationId: string;
}

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        name: string;
        role: Role;
        organizationId: string;
    };
}

const readToken = (req: Request): string | undefined => {
    const cookieToken = req.cookies?.token;
    if (cookieToken) return cookieToken;

    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) return undefined;
    return authorization.slice('Bearer '.length).trim();
};

const permissionRoles: Partial<Record<Permission, Role[]>> = {
    [Permission.MANAGE_USERS]: [Role.SUPERADMIN, Role.ADMIN],
    [Permission.INVITE_USERS]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER],
    [Permission.VIEW_USERS]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.AUDITOR],
    [Permission.CREATE_RISK]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.RISK_MANAGER],
    [Permission.EDIT_RISK]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.RISK_MANAGER],
    [Permission.DELETE_RISK]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.RISK_MANAGER],
    [Permission.VIEW_RISK]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.RISK_MANAGER, Role.AUDITOR, Role.USER],
    [Permission.CREATE_COMPLIANCE]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER],
    [Permission.EDIT_COMPLIANCE]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER],
    [Permission.DELETE_COMPLIANCE]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER],
    [Permission.VIEW_COMPLIANCE]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.AUDITOR, Role.USER],
    [Permission.CREATE_POLICY]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER],
    [Permission.EDIT_POLICY]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER],
    [Permission.DELETE_POLICY]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER],
    [Permission.VIEW_POLICY]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.AUDITOR, Role.USER],
    [Permission.APPROVE_POLICY]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER],
    [Permission.CREATE_INCIDENT]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.RISK_MANAGER],
    [Permission.EDIT_INCIDENT]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.RISK_MANAGER],
    [Permission.DELETE_INCIDENT]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER],
    [Permission.VIEW_INCIDENT]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.RISK_MANAGER, Role.AUDITOR],
    [Permission.CREATE_CONTROL]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.RISK_MANAGER],
    [Permission.EDIT_CONTROL]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.RISK_MANAGER],
    [Permission.DELETE_CONTROL]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER],
    [Permission.VIEW_CONTROL]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.RISK_MANAGER, Role.AUDITOR],
    [Permission.UPLOAD_DOCUMENT]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.RISK_MANAGER],
    [Permission.DELETE_DOCUMENT]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER],
    [Permission.VIEW_DOCUMENT]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.RISK_MANAGER, Role.AUDITOR],
    [Permission.VIEW_REPORTS]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.RISK_MANAGER, Role.AUDITOR, Role.USER],
    [Permission.CREATE_REPORTS]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.RISK_MANAGER],
    [Permission.EXPORT_DATA]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.RISK_MANAGER, Role.AUDITOR],
    [Permission.MANAGE_SETTINGS]: [Role.SUPERADMIN, Role.ADMIN],
    [Permission.VIEW_AUDIT_LOGS]: [Role.SUPERADMIN, Role.ADMIN, Role.COMPLIANCE_OFFICER, Role.AUDITOR],
};

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
    try {
        const token = readToken(req);
        if (!token) throw new ApiError(401, 'Authentication token required');

        const secret = process.env.JWT_SECRET;
        if (!secret) return next(new ApiError(500, 'JWT_SECRET not configured'));

        const decoded = jwt.verify(token, secret) as JwtClaims;
        if (!decoded.id || !decoded.organizationId) {
            throw new ApiError(401, 'Invalid token claims');
        }

        const user = await prisma.user.findFirst({
            where: {
                id: decoded.id,
                organizationId: decoded.organizationId,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                organizationId: true,
            },
        });

        if (!user) throw new ApiError(401, 'Invalid user or organization membership');

        // Never trust mutable identity attributes from the token. The database is authoritative.
        req.user = {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim(),
            role: user.role,
            organizationId: user.organizationId,
        };

        next();
    } catch (error) {
        if (error instanceof ApiError) return next(error);
        next(new ApiError(401, 'Invalid or expired token'));
    }
}

export function authorize(...roles: string[]) {
    return (req: AuthRequest, _res: Response, next: NextFunction) => {
        if (!req.user) return next(new ApiError(401, 'Authentication required'));
        if (roles.length && !roles.includes(req.user.role)) {
            return next(new ApiError(403, 'Insufficient permissions'));
        }
        next();
    };
}

export const requireRole = authorize;

export function requirePermission(...permissions: Permission[]) {
    return (req: AuthRequest, _res: Response, next: NextFunction) => {
        if (!req.user) return next(new ApiError(401, 'Authentication required'));

        const allowed = permissions.some(permission =>
            (permissionRoles[permission] || []).includes(req.user!.role)
        );

        if (!allowed) return next(new ApiError(403, 'Forbidden: Insufficient permissions'));
        next();
    };
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
    const token = readToken(req);
    if (!token) return next();

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) return next();
        const decoded = jwt.verify(token, secret) as JwtClaims;
        if (!decoded.id || !decoded.organizationId) return next();

        const user = await prisma.user.findFirst({
            where: { id: decoded.id, organizationId: decoded.organizationId },
            select: { id: true, email: true, firstName: true, lastName: true, role: true, organizationId: true },
        });

        if (user) {
            req.user = {
                id: user.id,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`.trim(),
                role: user.role,
                organizationId: user.organizationId,
            };
        }
    } catch {
        // Optional authentication deliberately ignores invalid credentials.
    }

    next();
}

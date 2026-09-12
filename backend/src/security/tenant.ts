/**
 * Tenant isolation utilities.
 * Tenant identity is derived from authenticated membership, never from the browser.
 */

import { NextFunction, Response } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { isPlatformStaffRole } from './rbac';

export type TenantContext = {
    userId: string;
    organizationId: string;
    role: string;
    permissions: string[];
};

export function rejectPlatformTenantContent(req: AuthRequest, _res: Response, next: NextFunction) {
    if (isPlatformStaffRole(req.user?.role)) {
        return next(new ApiError(403, 'Customer tenant access denied'));
    }
    next();
}

export function requireTenant(user?: { organizationId?: string; id?: string; role?: string } | null): string {
    if (!user?.organizationId) {
        throw new ApiError(403, 'Tenant context is missing');
    }
    if (isPlatformStaffRole(user.role)) {
        throw new ApiError(403, 'Customer tenant access denied');
    }
    return user.organizationId;
}

export function tenantWhere<T extends Record<string, unknown>>(
    organizationId: string,
    extra: T = {} as T
): T & { organizationId: string } {
    return { ...extra, organizationId };
}

export function tenantById(id: string, organizationId: string): { id: string; organizationId: string } {
    return { id, organizationId };
}

export function assertSameTenant(left: string, right: string): void {
    if (left !== right) {
        throw new ApiError(404, 'Resource not found');
    }
}

export function rejectClientTenantOverride(
    authenticatedOrgId: string,
    requestedOrgId?: string | null
): string {
    if (requestedOrgId && requestedOrgId !== authenticatedOrgId) {
        throw new ApiError(403, 'Cannot act on another organization');
    }
    return authenticatedOrgId;
}

export type AuthPlane = 'CUSTOMER' | 'PLATFORM' | 'VENDOR';

export const CUSTOMER_PLANE: AuthPlane = 'CUSTOMER';
export const PLATFORM_PLANE: AuthPlane = 'PLATFORM';
export const VENDOR_PLANE: AuthPlane = 'VENDOR';

export const MFA_REQUIRED_ROLES = new Set([
    'PLATFORM_OWNER',
    'PLATFORM_ADMIN',
    'SUPERADMIN',
    'SECURITY_ADMIN',
    'SUPPORT_ADMIN',
    'SUPPORT_ANALYST',
    'BILLING_SUPPORT',
]);

export function parsePlane(value: unknown): AuthPlane {
    if (value === PLATFORM_PLANE) return PLATFORM_PLANE;
    if (value === VENDOR_PLANE) return VENDOR_PLANE;
    return CUSTOMER_PLANE;
}

export function requestedPlane(body: { plane?: unknown; portal?: unknown } | undefined): AuthPlane {
    const raw = String(body?.plane || body?.portal || '').toUpperCase();
    if (raw === 'PLATFORM' || raw === 'ADMIN' || raw === 'INTERNAL') {
        return PLATFORM_PLANE;
    }
    return CUSTOMER_PLANE;
}

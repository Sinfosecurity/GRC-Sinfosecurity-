export type AuthPlane = 'CUSTOMER' | 'PLATFORM';

export const CUSTOMER_PLANE: AuthPlane = 'CUSTOMER';
export const PLATFORM_PLANE: AuthPlane = 'PLATFORM';

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
    return value === PLATFORM_PLANE ? PLATFORM_PLANE : CUSTOMER_PLANE;
}

export function requestedPlane(body: { plane?: unknown; portal?: unknown } | undefined): AuthPlane {
    const raw = String(body?.plane || body?.portal || '').toUpperCase();
    if (raw === 'PLATFORM' || raw === 'ADMIN' || raw === 'INTERNAL') {
        return PLATFORM_PLANE;
    }
    return CUSTOMER_PLANE;
}

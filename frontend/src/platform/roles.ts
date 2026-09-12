export const PLATFORM_STAFF_ROLES = [
    'PLATFORM_OWNER',
    'PLATFORM_ADMIN',
    'SUPERADMIN',
    'SUPPORT_ADMIN',
    'SUPPORT_ANALYST',
    'BILLING_SUPPORT',
    'SECURITY_ADMIN',
] as const;

export function isPlatformStaff(role?: string | null): boolean {
    return !!role && (PLATFORM_STAFF_ROLES as readonly string[]).includes(role);
}

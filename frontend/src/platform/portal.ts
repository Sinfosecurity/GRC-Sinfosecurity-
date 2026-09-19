const ADMIN_HOSTS = new Set(['admin.supremerisk.com']);
const CUSTOMER_HOSTS = new Set(['app.supremerisk.com']);

export type Portal = 'customer' | 'admin';

export function detectPortal(hostname = window.location.hostname, pathname = window.location.pathname): Portal {
    if (ADMIN_HOSTS.has(hostname) || pathname.startsWith('/admin')) {
        return 'admin';
    }
    if (CUSTOMER_HOSTS.has(hostname)) {
        return 'customer';
    }
    return pathname.startsWith('/admin') ? 'admin' : 'customer';
}

export function portalLoginPath(portal: Portal = detectPortal()) {
    return portal === 'admin' ? '/admin/login' : '/login';
}

export function postLoginPath(user?: { role?: string; nextPath?: string; plane?: string; enrollOnly?: boolean; mfaEnabled?: boolean; permissions?: string[] } | null) {
    if (user?.enrollOnly) return '/admin/mfa/enroll';
    if (user?.plane === 'PLATFORM') return '/platform';
    if (user?.role === 'BUSINESS_OWNER' || user?.role === 'DEPARTMENT_MANAGER') return '/request';
    if (user?.nextPath) return user.nextPath;
    return '/dashboard';
}

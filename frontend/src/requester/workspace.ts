const REQUESTER_PERMS = ['intake.create_own', 'intake.read_own', 'intake.respond_own', 'intake.create'];
const PRACTITIONER_PERMS = [
    'vendor.read',
    'intake.read',
    'intake.assign',
    'intake.triage',
    'assessment.read',
    'finding.read',
    'approval.read',
    'risk.read',
    'compliance.read',
    'intelligence.read',
    'automation.read',
    'organization.manage',
    'user.manage',
    'identity.manage',
];

export function hasRequesterWorkspace(permissions: string[] = [], role?: string) {
    return REQUESTER_PERMS.some((permission) => permissions.includes(permission))
        || role === 'BUSINESS_OWNER'
        || role === 'DEPARTMENT_MANAGER';
}

export function hasPractitionerWorkspace(permissions: string[] = []) {
    return PRACTITIONER_PERMS.some((permission) => permissions.includes(permission));
}

export function customerLandingPath(user?: { permissions?: string[]; role?: string; nextPath?: string; plane?: string } | null) {
    if (user?.nextPath) return user.nextPath;
    if (user?.plane === 'PLATFORM') return '/platform';
    const requester = hasRequesterWorkspace(user?.permissions, user?.role);
    const practitioner = hasPractitionerWorkspace(user?.permissions);
    if (requester && !practitioner) return '/request';
    return '/dashboard';
}

const WORKSPACE_KEY = 'supreme.workspace';

export function rememberedWorkspace(): 'requester' | 'grc' | null {
    const value = localStorage.getItem(WORKSPACE_KEY);
    return value === 'requester' || value === 'grc' ? value : null;
}

export function rememberWorkspace(workspace: 'requester' | 'grc') {
    localStorage.setItem(WORKSPACE_KEY, workspace);
}

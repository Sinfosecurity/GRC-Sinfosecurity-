import { canonicalizeRole } from './rbac';

export type ReportKind = 'operational' | 'board';

const OPERATIONAL_ROLES = new Set([
    'ORGANIZATION_ADMIN',
    'RISK_MANAGER',
    'APPROVER',
    'ASSESSOR',
    'AUDITOR',
    'PLATFORM_OWNER',
    'PLATFORM_ADMIN',
]);

const BOARD_ROLES = new Set([
    'ORGANIZATION_ADMIN',
    'RISK_MANAGER',
    'APPROVER',
    'AUDITOR',
    'PLATFORM_OWNER',
    'PLATFORM_ADMIN',
]);

export function canExportReport(role: string | undefined | null, kind: ReportKind): boolean {
    const canonical = canonicalizeRole(role);
    if (kind === 'board') return BOARD_ROLES.has(canonical);
    return OPERATIONAL_ROLES.has(canonical);
}

export function reportDenialReason(role: string | undefined | null, kind: ReportKind): string | null {
    if (canExportReport(role, kind)) return null;
    if (kind === 'board') {
        return 'Board packs can be downloaded by an organization admin, risk manager, or approver.';
    }
    return 'Your role can view reports but cannot download them. An organization admin, risk manager, assessor, or approver can export.';
}

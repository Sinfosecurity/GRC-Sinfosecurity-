export const ENGAGEMENT_TABS = [
    { id: 'overview', label: 'Overview', path: '' },
    { id: 'inherent-risk', label: 'Inherent Risk', path: '/inherent-risk' },
    { id: 'due-diligence', label: 'Due Diligence', path: '/due-diligence' },
    { id: 'evidence', label: 'Evidence', path: '/evidence' },
    { id: 'findings', label: 'Findings', path: '/findings' },
    { id: 'controls', label: 'Controls', path: '/controls' },
    { id: 'residual-risk', label: 'Residual Risk', path: '/residual-risk' },
    { id: 'decisions', label: 'Decisions', path: '/decisions' },
    { id: 'monitoring', label: 'Monitoring', path: '/monitoring' },
    { id: 'reassessment', label: 'Reassessment', path: '/reassessment' },
    { id: 'offboarding', label: 'Offboarding', path: '/offboarding' },
    { id: 'history', label: 'History', path: '/history' },
] as const;

export function engagementHref(id: string, tab = '') {
    return `/engagements/${id}${tab}`;
}

export function legacyEngagementRedirect(pathname: string) {
    const match = pathname.match(/^\/third-parties\/engagements\/([^/]+)(?:\/(.*))?$/);
    if (!match) return null;
    const id = match[1];
    const rest = match[2] || '';
    if (rest === 'tier-review') return engagementHref(id, '/inherent-risk');
    if (rest === 'assessment-review') return engagementHref(id, '/evidence');
    if (rest === 'risk') return engagementHref(id, '/residual-risk');
    if (rest) return engagementHref(id, `/${rest}`);
    return engagementHref(id);
}

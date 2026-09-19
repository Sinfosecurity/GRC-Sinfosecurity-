import { authoritativeIraState } from '../tprm/iraState';

describe('authoritative Golden Journey IRA state', () => {
    it('uses EngagementIra when present instead of a legacy task-link label', () => {
        const state = authoritativeIraState({
            engagementIra: { status: 'REQUIRED' },
            legacy: { status: 'IRA_NOT_SENT', sent: false, submitted: false },
            requesterHasWorkspace: true,
        });
        expect(state.source).toBe('ENGAGEMENT_IRA');
        expect(state.status).toBe('NOT_SENT');
        expect(state.statusLabel).toBe('Waiting on requester');
        expect(state.primaryAction).toBe('Open requester workspace status');
        expect(state.submitted).toBe(false);
    });

    it('does not report sent when the legacy task link is the only empty source', () => {
        const state = authoritativeIraState({
            legacy: { status: 'IRA_NOT_SENT', sent: false, submitted: false },
        });
        expect(state.source).toBe('LEGACY_TASK_LINK');
        expect(state.status).toBe('NOT_SENT');
        expect(state.primaryAction).toBe('Send assessment');
        expect(state.secondaryAction).toBe('Copy secure link');
    });
});

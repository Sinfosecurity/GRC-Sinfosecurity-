import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import AutomationHome from '../AutomationHome';

vi.mock('../../services/api', () => ({
    automationAPI: { workspace: vi.fn() },
}));

describe('Supreme Automation home', () => {
    beforeEach(async () => {
        const { automationAPI } = await import('../../services/api');
        (automationAPI.workspace as any).mockResolvedValue({
            data: {
                data: {
                    honesty: 'Supreme Intelligence tells you what matters. Supreme Automation coordinates what happens next. Humans remain accountable for material decisions.',
                    noAiAgents: 'Deterministic workflow automation. No AI agents are running.',
                    timezone: 'America/New_York',
                    queue: { status: 'NOT_CONFIGURED', message: 'Scheduled queue is not configured.' },
                    active: [{ publicId: 'AUT-00001', name: 'High finding follow-up', status: 'ACTIVE', when: 'finding.overdue', humanBoundary: { label: 'Required before the finding is closed' }, href: '/automation/AUT-00001' }],
                    needsAttention: [],
                    recentRuns: [],
                    failedRuns: [],
                    templates: [{ key: 'high-finding-remediation-follow-up', name: 'High finding remediation follow-up', description: 'Create review work.', when: 'Finding overdue', actions: ['Create review request'], humanDecision: 'Required before the finding is closed' }],
                    recommendations: [],
                },
            },
        });
    });

    it('states the human boundary and does not claim AI agents', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/automation']}>
                <AutomationHome />
            </MemoryRouter>,
        );
        expect(await screen.findByText('Supreme Automation')).toBeInTheDocument();
        expect(screen.getByText(/Humans remain accountable/i)).toBeInTheDocument();
        expect(screen.getByText(/No AI agents are running/i)).toBeInTheDocument();
        expect(screen.getByText(/High finding follow-up/i)).toBeInTheDocument();
        expect(screen.queryByText(/auto approve vendor/i)).not.toBeInTheDocument();
    });
});

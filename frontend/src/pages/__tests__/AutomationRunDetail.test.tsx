import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import AutomationRunDetail from '../AutomationRunDetail';

vi.mock('../../services/api', () => ({
    automationAPI: { execution: vi.fn() },
}));

describe('Supreme Automation run detail', () => {
    beforeEach(async () => {
        const { automationAPI } = await import('../../services/api');
        (automationAPI.execution as any).mockResolvedValue({
            data: {
                data: {
                    publicId: 'RUN-00010',
                    automationName: 'Intelligence Critical Attention',
                    automationPublicId: 'AUT-00004',
                    version: 1,
                    status: 'SUCCEEDED',
                    preview: false,
                    whatTriggered: 'intelligence.critical_attention',
                    sourceModel: 'IntelligenceItem',
                    conditions: [{ field: 'intelligence.priority', matched: true, reason: 'Equals CRITICAL_ATTENTION.' }],
                    whatSupremeDid: ['CREATE_REVIEW_REQUEST', 'NOTIFY_OWNER'],
                    whatSupremeDidNotDo: ['Accept risk', 'Close finding', 'Approve AI'],
                    whoNeedsToAct: 'Required on the authoritative Risk, Control, or Finding record',
                    whatFailed: [],
                    willRetry: false,
                    timezoneUsed: 'America/New_York',
                },
            },
        });
    });

    it('answers the customer execution questions without raw queue payloads', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/automation/runs/RUN-00010']}>
                <Routes>
                    <Route path="/automation/runs/:publicId" element={<AutomationRunDetail />} />
                </Routes>
            </MemoryRouter>,
        );
        expect(await screen.findByText('What triggered this?')).toBeInTheDocument();
        expect(screen.getByText(/What did Supreme do/i)).toBeInTheDocument();
        expect(screen.getByText(/What did Supreme NOT do/i)).toBeInTheDocument();
        expect(screen.getByText(/Who needs to act next/i)).toBeInTheDocument();
        expect(screen.getByText(/Close finding/i)).toBeInTheDocument();
        expect(screen.getByText(/Timezone used: America\/New_York/i)).toBeInTheDocument();
        expect(screen.queryByText(/redis|bull|payload/i)).not.toBeInTheDocument();
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import PrivacyDashboard from '../PrivacyDashboard';

vi.mock('../../services/api', () => ({
    privacyAPI: { dashboard: vi.fn(), downloadReport: vi.fn(), downloadBoardPptx: vi.fn() },
}));

describe('Supreme Privacy dashboard', () => {
    beforeEach(async () => {
        const { privacyAPI } = await import('../../services/api');
        (privacyAPI.dashboard as any).mockResolvedValue({
            data: {
                data: {
                    honesty: 'A recorded legal basis is not a finding that processing is lawful.',
                    consentCollector: { status: 'Not configured / manual' },
                    totals: {
                        activeActivities: 1,
                        highRiskProcessing: 0,
                        dpiasDue: 0,
                        transfersRequiringReview: 1,
                        openRightsRequests: 2,
                        overdueRightsRequests: 1,
                        retentionActionsDue: 0,
                        openGaps: 0,
                        processorsWithIssues: 1,
                        evidenceRefresh: 0,
                    },
                    attention: [{ type: 'Overdue rights request', why: 'DSR-00001 passed its configured deadline. This is not legal advice.', related: 'Access', owner: 'Report Proof', dueAt: '2026-09-01T00:00:00.000Z', severity: 'High', href: '/privacy-ops/rights', publicId: 'DSR-00001' }],
                    changed: [{ title: 'Processing activity created', change: null, summary: 'PA-00001 Claims servicing was recorded.', actor: 'Report Proof', createdAt: '2026-09-13T12:00:00.000Z' }],
                },
            },
        });
    });

    it('shows honesty language and a live attention queue', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/privacy-ops']}>
                <PrivacyDashboard />
            </MemoryRouter>
        );
        expect(await screen.findByText('Supreme Privacy')).toBeInTheDocument();
        expect(screen.getAllByText(/not a finding that processing is lawful/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Not configured \/ manual/)).toBeInTheDocument();
        expect(screen.getByText(/Overdue rights request/)).toBeInTheDocument();
        expect(screen.getByText(/DSR-00001 passed its configured deadline/)).toBeInTheDocument();
        expect(screen.queryByText(/this processing is GDPR compliant/i)).not.toBeInTheDocument();
    });
});

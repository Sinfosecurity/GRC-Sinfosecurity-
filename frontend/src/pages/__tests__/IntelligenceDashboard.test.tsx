import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import IntelligenceDashboard from '../IntelligenceDashboard';

vi.mock('../../services/api', () => ({
    intelligenceAPI: { workspace: vi.fn(), downloadReport: vi.fn() },
}));

describe('Supreme Intelligence dashboard', () => {
    beforeEach(async () => {
        const { intelligenceAPI } = await import('../../services/api');
        (intelligenceAPI.workspace as any).mockResolvedValue({
            data: {
                data: {
                    honesty: 'Supreme Intelligence interprets recorded Supreme facts. It does not approve, reject, score, close, or legally determine anything.',
                    externalIntelligence: { status: 'NOT_CONFIGURED', message: 'External intelligence not configured' },
                    period: { label: 'Trend not yet established' },
                    criticalAttention: [{ publicId: 'INT-00001', title: 'Critical finding is open', whyItMatters: 'Severity: Critical.', href: '/intelligence/INT-00001', priorityLabel: 'Critical attention' }],
                    whatChanged: [],
                    crossPlatform: [],
                    decisionsToWatch: [],
                    positiveMovement: [],
                    evidenceAndControl: [],
                },
            },
        });
    });

    it('shows honesty language and live intelligence, not a simulated feed', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/intelligence']}>
                <IntelligenceDashboard />
            </MemoryRouter>
        );
        expect(await screen.findByText('Supreme Intelligence')).toBeInTheDocument();
        expect(screen.getByText(/interprets recorded Supreme facts/i)).toBeInTheDocument();
        expect(screen.getByText(/External intelligence not configured/i)).toBeInTheDocument();
        expect(screen.getByText(/Critical finding is open/i)).toBeInTheDocument();
        expect(screen.queryByText(/93\.7%/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/this vendor is safe/i)).not.toBeInTheDocument();
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import RiskDashboard from '../RiskDashboard';

vi.mock('../../services/api', () => ({
    ermAPI: { dashboard: vi.fn(), downloadReport: vi.fn(), downloadBoardPptx: vi.fn(), setAppetite: vi.fn() },
}));

describe('Supreme Risk dashboard', () => {
    beforeEach(async () => {
        const { ermAPI } = await import('../../services/api');
        (ermAPI.dashboard as any).mockResolvedValue({
            data: {
                data: {
                    honesty: 'Counts are live tenant records. Ordinal scores are not summed into an enterprise risk number.',
                    totals: {
                        active: 2, critical: 1, high: 1, outsideAppetite: 1, overdueReviews: 0,
                        overdueTreatments: 0, worsening: 0, improving: 1, withoutOwners: 0, withoutTestedControls: 1,
                    },
                    heatmap: Array.from({ length: 5 }, (_, impact) => Array.from({ length: 5 }, (__, likelihood) => ({
                        likelihood: likelihood + 1, impact: impact + 1, count: likelihood === 4 && impact === 4 ? 1 : 0,
                    }))),
                    byCategory: [],
                    byBusinessUnit: [{ name: 'Unassigned', count: 2, critical: 1 }],
                    appetite: [],
                    topRisks: [{ publicId: 'RISK-00001', title: 'Privileged access failure', residualRating: 'CRITICAL', appetiteStatus: 'OUTSIDE_APPETITE' }],
                    attention: [{ publicId: 'RISK-00001', title: 'Privileged access failure', residualRating: 'CRITICAL', appetiteStatus: 'OUTSIDE_APPETITE' }],
                },
            },
        });
    });

    it('shows live counts and does not invent an enterprise score', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/risks']}>
                <RiskDashboard />
            </MemoryRouter>
        );
        expect(await screen.findByText('Supreme Risk')).toBeInTheDocument();
        expect(screen.getByText(/Ordinal scores are not summed/)).toBeInTheDocument();
        expect(screen.getAllByText('RISK-00001 · Privileged access failure').length).toBeGreaterThan(0);
        expect(screen.queryByText(/INITIAL_DUE_DILIGENCE/)).not.toBeInTheDocument();
    });
});

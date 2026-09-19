import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import VendorManagement from '../VendorManagement';

vi.mock('../../components/EntityRelationships', () => ({ default: () => null }));

vi.mock('../../services/api', () => ({
    vendorAPI: {
        getAll: vi.fn().mockResolvedValue({
            data: {
                vendors: [{
                    id: 'v1',
                    name: 'Unrated Vendor',
                    category: 'TECHNOLOGY',
                    tier: null,
                    status: 'PROPOSED',
                    residualRiskScore: 40,
                    inherentRiskScore: 40,
                }],
            },
        }),
        getStatistics: vi.fn().mockResolvedValue({ data: {} }),
        create: vi.fn(),
    },
    tprmAPI: { riskExplanation: vi.fn(), offboardPreview: vi.fn(), offboard: vi.fn() },
    aiGovernanceAPI: { vendorLinks: vi.fn() },
    intakeAPI: { listEngagements: vi.fn().mockResolvedValue({ data: { data: { items: [] } } }) },
}));

describe('VendorManagement honesty', () => {
    it('shows Not rated and does not invent a compliance percentage', async () => {
        render(
            <MemoryRouter future={routerFuture}>
                <VendorManagement />
            </MemoryRouter>
        );
        expect(await screen.findByText('Unrated Vendor')).toBeInTheDocument();
        expect(screen.getAllByText('Not rated').length).toBeGreaterThan(0);
        expect(screen.queryByText('%')).not.toBeInTheDocument();
        expect(screen.queryByText('60')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Open requester form' })).not.toBeInTheDocument();
    });
});

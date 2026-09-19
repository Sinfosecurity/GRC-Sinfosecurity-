import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import VendorAssessmentPortal from '../VendorAssessmentPortal';

vi.mock('../../services/api', () => ({
    vendorPortalAPI: {
        workspace: vi.fn(),
    },
}));

describe('Vendor assessment portal', () => {
    beforeEach(async () => {
        localStorage.setItem('vendorToken', 'test');
        const { vendorPortalAPI } = await import('../../services/api');
        (vendorPortalAPI.workspace as any).mockResolvedValue({
            data: {
                data: {
                    organizationName: 'Elite Claims',
                    vendorName: 'Microsoft Corporation',
                    serviceName: 'Azure Hosting',
                    dueDate: '2026-09-30',
                    progress: 42,
                    assessments: [{ id: 'a1', name: 'Information Security', status: 'In progress', answered: 18, total: 30 }],
                },
            },
        });
    });

    it('shows the requesting organization and assigned assessments only', async () => {
        render(
            <MemoryRouter future={routerFuture}>
                <VendorAssessmentPortal />
            </MemoryRouter>,
        );
        expect(await screen.findByText(/Elite Claims is requesting this/)).toBeInTheDocument();
        expect(screen.getByText(/Microsoft Corporation · Azure Hosting/)).toBeInTheDocument();
        expect(screen.getByText(/Information Security/)).toBeInTheDocument();
        expect(screen.queryByText(/Dashboard/)).not.toBeInTheDocument();
        expect(screen.queryByText(/^Engagements$/)).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Product navigation')).not.toBeInTheDocument();
        expect(screen.queryByText(/recommendedTier|Tier Review|Don't know/i)).not.toBeInTheDocument();
        expect(screen.getByRole('progressbar', { name: /18 of 30 answered/i })).toBeInTheDocument();
    });
});

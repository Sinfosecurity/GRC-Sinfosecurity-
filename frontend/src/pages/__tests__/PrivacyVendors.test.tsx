import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import PrivacyVendors from '../PrivacyVendors';

vi.mock('../../services/api', () => ({
    privacyAPI: { vendors: vi.fn() },
}));

describe('Supreme Privacy vendor workspace', () => {
    beforeEach(async () => {
        const { privacyAPI } = await import('../../services/api');
        (privacyAPI.vendors as any).mockResolvedValue({
            data: {
                data: [{ vendorId: 'v1', name: 'Supreme Investigation', roles: ['Processor'], activities: ['PA-00002'], residualRisk: 13 }],
            },
        });
    });

    it('reuses Third Party vendors with human privacy roles', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/privacy-ops/vendors']}>
                <PrivacyVendors />
            </MemoryRouter>
        );
        expect(await screen.findByText('Supreme Investigation')).toBeInTheDocument();
        expect(screen.getByText('Processor')).toBeInTheDocument();
        expect(screen.getByText(/not a second vendor database/i)).toBeInTheDocument();
        expect(screen.queryByText('SERVICE_PROVIDER')).not.toBeInTheDocument();
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import PrivacyRights from '../PrivacyRights';

vi.mock('../../services/api', () => ({
    privacyAPI: { rights: vi.fn(), rightsDetail: vi.fn(), createRights: vi.fn(), updateRights: vi.fn(), addRightsTask: vi.fn() },
}));

describe('Supreme Privacy rights requests', () => {
    beforeEach(async () => {
        const { privacyAPI } = await import('../../services/api');
        (privacyAPI.rights as any).mockResolvedValue({
            data: {
                data: [{
                    publicId: 'DSR-00001',
                    requestType: 'Access',
                    status: 'Received',
                    requester: 'j•••@example.com',
                    dueAt: '2026-10-01T00:00:00.000Z',
                }],
            },
        });
    });

    it('does not print raw requester identity in the list', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/privacy-ops/rights']}>
                <PrivacyRights />
            </MemoryRouter>
        );
        expect(await screen.findByText('DSR-00001')).toBeInTheDocument();
        expect(screen.getByText('j•••@example.com')).toBeInTheDocument();
        expect(screen.queryByText('jane.doe@example.com')).not.toBeInTheDocument();
        expect(screen.getByText(/configured, not legal advice/i)).toBeInTheDocument();
    });
});

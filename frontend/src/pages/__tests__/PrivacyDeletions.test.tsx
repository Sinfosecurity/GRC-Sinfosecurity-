import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import PrivacyDeletions from '../PrivacyDeletions';

vi.mock('../../services/api', () => ({
    privacyAPI: { deletions: vi.fn(), createDeletion: vi.fn(), updateDeletion: vi.fn() },
}));

describe('Supreme Privacy deletion workspace', () => {
    beforeEach(async () => {
        const { privacyAPI } = await import('../../services/api');
        (privacyAPI.deletions as any).mockResolvedValue({
            data: {
                data: [{
                    publicId: 'DEL-00001',
                    activity: 'PA-00002 Claims servicing',
                    status: 'Closed',
                    statusKey: 'CLOSED',
                    honesty: 'Deletion task completed. Deletion verified by attestation or evidence. This is not proof that external-system data is deleted.',
                    dataCategory: 'Financial',
                    system: 'Claims platform',
                }],
            },
        });
    });

    it('does not claim external-system data was deleted', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/privacy-ops/deletions']}>
                <PrivacyDeletions />
            </MemoryRouter>
        );
        expect(await screen.findByText('DEL-00001')).toBeInTheDocument();
        expect(screen.getAllByText(/not proof that external-system data is deleted/i).length).toBeGreaterThan(0);
        expect(screen.queryByText(/data was deleted from the vendor/i)).not.toBeInTheDocument();
    });
});

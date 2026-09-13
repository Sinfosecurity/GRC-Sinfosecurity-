import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import PrivacyDeletions from '../PrivacyDeletions';

vi.mock('../../services/api', () => ({
    privacyAPI: { deletions: vi.fn(), createDeletion: vi.fn(), updateDeletion: vi.fn() },
}));

describe('Supreme Privacy deletion workspace', () => {
    const matchMedia = window.matchMedia;
    afterEach(() => {
        window.matchMedia = matchMedia;
    });

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
        expect(screen.getByText('Deletion ID')).toBeInTheDocument();
        expect(document.body.textContent || '').not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
    });

    it('keeps primary deletion fields on compact cards', async () => {
        window.matchMedia = ((query: string) => ({
            matches: String(query).includes('max-width'),
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        })) as any;
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/privacy-ops/deletions']}>
                <PrivacyDeletions />
            </MemoryRouter>
        );
        expect(await screen.findByText('DEL-00001')).toBeInTheDocument();
        expect(screen.getByTestId('record-card')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();
        expect(screen.getByText('Deletion ID')).toBeInTheDocument();
        expect(screen.getByText('System / vendor')).toBeInTheDocument();
    });
});

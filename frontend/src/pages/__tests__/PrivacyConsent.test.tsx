import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import PrivacyConsent from '../PrivacyConsent';

vi.mock('../../services/api', () => ({
    privacyAPI: { consents: vi.fn(), createConsent: vi.fn(), withdrawConsent: vi.fn() },
}));

describe('Supreme Privacy consent workspace', () => {
    beforeEach(async () => {
        const { privacyAPI } = await import('../../services/api');
        (privacyAPI.consents as any).mockResolvedValue({
            data: {
                data: {
                    providerStatus: 'Not configured / manual',
                    honesty: 'Collector is not configured. Imported or manual records are not synchronized.',
                    rows: [{ publicId: 'CNS-00001', subjectRef: 'Manual-ref-1', purpose: 'Service delivery', choice: 'Given', providerStatus: 'Not configured / manual', status: 'Given' }],
                },
            },
        });
    });

    it('shows a truthful not-configured collector and no cookie-platform claim', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/privacy-ops/consent']}>
                <PrivacyConsent />
            </MemoryRouter>
        );
        expect((await screen.findAllByText(/not configured \/ manual/i)).length).toBeGreaterThan(0);
        expect(screen.getByText(/not a cookie-consent platform/i)).toBeInTheDocument();
        expect(screen.queryByText(/live collector sync is active/i)).not.toBeInTheDocument();
    });
});

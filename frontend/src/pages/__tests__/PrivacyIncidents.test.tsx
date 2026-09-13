import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import PrivacyIncidents from '../PrivacyIncidents';

vi.mock('../../services/api', () => ({
    privacyAPI: { incidents: vi.fn(), createIncident: vi.fn(), decideIncident: vi.fn() },
}));

describe('Supreme Privacy incident workspace', () => {
    beforeEach(async () => {
        const { privacyAPI } = await import('../../services/api');
        (privacyAPI.incidents as any).mockResolvedValue({
            data: {
                data: [{
                    publicId: 'PIN-00001',
                    title: 'Claims privacy incident assessment',
                    notificationStatus: 'Review Required',
                    privacyRisk: 'RISK-00001',
                    activities: ['PA-00002 Claims servicing'],
                    dataCategories: ['Financial'],
                }],
            },
        });
    });

    it('keeps notification language human-authoritative', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/privacy-ops/incidents']}>
                <PrivacyIncidents />
            </MemoryRouter>
        );
        expect(await screen.findByText('PIN-00001')).toBeInTheDocument();
        expect(screen.getByText(/not an automatic duty to notify/i)).toBeInTheDocument();
        expect(screen.queryByText(/you must notify/i)).not.toBeInTheDocument();
    });
});

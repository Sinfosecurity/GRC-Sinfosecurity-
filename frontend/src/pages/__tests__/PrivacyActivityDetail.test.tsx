import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import PrivacyActivityDetail from '../PrivacyActivityDetail';

vi.mock('../../services/api', () => ({
    privacyAPI: {
        activity: vi.fn().mockResolvedValue({
            data: {
                data: {
                    publicId: 'PA-00001',
                    name: 'HR onboarding',
                    honesty: 'A recorded legal basis is not a finding that processing is lawful.',
                    status: 'DRAFT',
                    controllerRole: 'CONTROLLER',
                    owner: 'Unassigned',
                    riskLevel: 'Not recorded',
                    purposes: [],
                    dataCategories: [],
                    dataSubjects: [],
                    systems: [],
                    vendors: [],
                    transfers: [],
                    dpias: [],
                    retentionRules: [],
                    rightsRequests: [],
                    history: [],
                    flow: {},
                    affected: {},
                },
            },
        }),
        catalog: vi.fn().mockResolvedValue({ data: { data: { regimes: [{ key: 'NOT_DETERMINED', name: 'Not determined' }, { key: 'NDPA', name: 'Nigeria NDPA' }] } } }),
        addPurpose: vi.fn(),
        addBasis: vi.fn(),
    },
    vendorAPI: { getAll: vi.fn().mockResolvedValue({ data: { vendors: [] } }) },
}));

describe('PrivacyActivityDetail honesty', () => {
    it('does not hard-code GDPR or an insurance purpose', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/privacy-ops/activities/PA-00001']}>
                <Routes>
                    <Route path="/privacy-ops/activities/:publicId" element={<PrivacyActivityDetail />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText(/PA-00001 HR onboarding/)).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Purpose & Basis' }));
        const purpose = await screen.findByPlaceholderText('Describe the processing purpose');
        expect((purpose as HTMLInputElement).value).toBe('');
        expect(screen.queryByDisplayValue('Claims servicing')).not.toBeInTheDocument();
        expect(screen.getAllByText('Privacy regime').length).toBeGreaterThan(0);
        expect(screen.getByText('Supreme does not assign GDPR automatically.')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('GDPR')).not.toBeInTheDocument();
    });
});

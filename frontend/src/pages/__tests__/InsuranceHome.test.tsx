import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import InsuranceHome from '../InsuranceHome';

vi.mock('../../services/api', () => ({
    insuranceAPI: {
        catalog: vi.fn(),
        overview: vi.fn(),
        configuration: vi.fn(),
        recommend: vi.fn(),
        activate: vi.fn(),
        entities: vi.fn(),
        createEntity: vi.fn(),
        licenses: vi.fn(),
        createLicense: vi.fn(),
        updateLicense: vi.fn(),
        vendors: vi.fn(),
        classifyVendor: vi.fn(),
        risks: vi.fn(),
        graph: vi.fn(),
        aiContexts: vi.fn(),
    },
}));

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ user: { role: 'ORGANIZATION_ADMIN', permissions: ['organization.manage', 'insurance.read'] } }),
}));

describe('Insurance Edition workspace', () => {
    beforeEach(async () => {
        const { insuranceAPI } = await import('../../services/api');
        (insuranceAPI.overview as any).mockResolvedValue({
            data: { data: { activated: false, honesty: 'Recommended regulation is not applicable regulation.', history: [], metrics: { entities: { value: 0, basis: 'Insurance entity register' } } } },
        });
        (insuranceAPI.catalog as any).mockResolvedValue({
            data: { data: { honesty: 'Recommended regulation is not applicable regulation.', organizationTypes: [{ key: 'INSURER', label: 'Insurer' }], countries: [{ key: 'NG', label: 'Nigeria' }], packs: [], controlExtensions: [] } },
        });
        (insuranceAPI.entities as any).mockResolvedValue({ data: { data: [] } });
        (insuranceAPI.licenses as any).mockResolvedValue({ data: { data: [] } });
        (insuranceAPI.risks as any).mockResolvedValue({ data: { data: { categories: [] } } });
        (insuranceAPI.graph as any).mockResolvedValue({ data: { data: [] } });
        (insuranceAPI.vendors as any).mockResolvedValue({ data: { data: [] } });
    });

    it('shows the activation wizard and honest empty language', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/insurance']}>
                <InsuranceHome />
            </MemoryRouter>,
        );
        expect(await screen.findByRole('heading', { name: 'Insurance Edition' })).toBeInTheDocument();
        expect(screen.getByText(/Recommended regulation is not applicable regulation/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
        expect(screen.queryByText('100%')).not.toBeInTheDocument();
    });

    it('keeps contextual tabs and does not invent a second risk register', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/insurance/risk']}>
                <Routes>
                    <Route path="/insurance/risk" element={<InsuranceHome />} />
                </Routes>
            </MemoryRouter>,
        );
        expect(await screen.findByText(/not a second register/i)).toBeInTheDocument();
    });
});

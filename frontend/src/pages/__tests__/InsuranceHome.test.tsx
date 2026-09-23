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
        attachLicenseEvidence: vi.fn(),
        vendors: vi.fn(),
        classifyVendor: vi.fn(),
        risks: vi.fn(),
        graph: vi.fn(),
        aiContexts: vi.fn(),
        upsertAiContext: vi.fn(),
        regulatory: vi.fn(),
        reviewApplicability: vi.fn(),
        claims: vi.fn(),
        underwriting: vi.fn(),
        reinsurance: vi.fn(),
        createDelegatedAuthority: vi.fn(),
        createCounterparty: vi.fn(),
        concentration: vi.fn(),
        licenseAttention: vi.fn(),
        signals: vi.fn(),
        reports: vi.fn(),
        complaints: vi.fn(),
    },
    vendorAPI: { getAll: vi.fn() },
    aiGovernanceAPI: { systems: vi.fn() },
    sccAPI: { evidence: vi.fn() },
    tprmAPI: { uploadEvidence: vi.fn() },
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
        (insuranceAPI.aiContexts as any).mockResolvedValue({ data: { data: [] } });
        (insuranceAPI.regulatory as any).mockResolvedValue({
            data: {
                data: {
                    honesty: 'Recommended is not applicable.',
                    packs: [{
                        key: 'ng-insurer-core',
                        label: 'Nigeria insurer',
                        jurisdiction: 'NG',
                        regulator: 'NAICOM',
                        version: '2025.1',
                        applicabilityState: 'APPLICABLE',
                        lastDecidedBy: 'Ada Ins',
                        lastDecidedAt: '2026-09-23T12:00:00.000Z',
                        lastReason: 'Nigerian insurer domicile recorded.',
                        recommendationVsDecision: 'Human applicability decision. Distinct from the system recommendation.',
                        whyRecommended: 'Recommended based on Nigerian insurer/reinsurer configuration.',
                        mappedControls: ['INS-LIC-01'],
                        evidenceCategories: ['insurance-license'],
                        sourceUrl: 'https://naicom.gov.ng',
                        requirements: [],
                    }],
                },
            },
        });
        (insuranceAPI.claims as any).mockResolvedValue({ data: { data: { honesty: 'Claims governance only.', entities: [], vendors: [], delegatedAuthority: [], models: [] } } });
        (insuranceAPI.underwriting as any).mockResolvedValue({ data: { data: { honesty: 'Not a quoting or rating engine.', entities: [], vendors: [], delegatedAuthority: [], models: [] } } });
        (insuranceAPI.reinsurance as any).mockResolvedValue({ data: { data: { honesty: 'Not placement.', counterparties: [{ publicId: 'rei_1', name: 'Treaty partner', vendorId: 'v1', vendorName: 'Existing Reinsurer', relationshipType: 'TREATY', jurisdictionCode: 'NG' }] } } });
        (insuranceAPI.licenseAttention as any).mockResolvedValue({ data: { data: [] } });
        (insuranceAPI.signals as any).mockResolvedValue({ data: { data: [] } });
        (insuranceAPI.reports as any).mockResolvedValue({
            data: {
                data: {
                    honesty: 'Live tenant records only. No fabricated compliance percentage.',
                    reports: [
                        { key: 'executive', title: 'Insurance Executive Risk Overview', data: { metrics: { entities: { value: 1, basis: 'Insurance entity register' } }, attention: [] } },
                        { key: 'third-parties', title: 'Insurance Third-Party Oversight', data: [] },
                        { key: 'licenses', title: 'License & Authorization Register', data: [] },
                        { key: 'regulatory', title: 'Regulatory Readiness', data: { packs: [] } },
                        { key: 'models', title: 'Insurance AI / Model Inventory', data: [] },
                        { key: 'concentration', title: 'Critical Service / Concentration', data: { reinsurers: 0, modelsInfluencingUwOrClaims: 0, vendorCategories: [] } },
                    ],
                },
            },
        });
        (insuranceAPI.concentration as any).mockResolvedValue({ data: { data: { honesty: 'Counts of recorded relationships.', vendorCategories: [] } } });
        const { vendorAPI, aiGovernanceAPI, sccAPI } = await import('../../services/api');
        (vendorAPI.getAll as any).mockResolvedValue({ data: { vendors: [{ id: 'v1', name: 'Existing Reinsurer' }] } });
        (aiGovernanceAPI.systems as any).mockResolvedValue({ data: { data: [] } });
        (sccAPI.evidence as any).mockResolvedValue({ data: { data: [] } });
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

    it('shows claims governance honesty and not a processing system', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/insurance/claims']}>
                <Routes>
                    <Route path="/insurance/claims" element={<InsuranceHome />} />
                </Routes>
            </MemoryRouter>,
        );
        expect(await screen.findByText(/Claims governance only/i)).toBeInTheDocument();
        expect(screen.queryByText('100%')).not.toBeInTheDocument();
    });

    it('renders live report bodies instead of titles only', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/insurance/reports']}>
                <Routes>
                    <Route path="/insurance/reports" element={<InsuranceHome />} />
                </Routes>
            </MemoryRouter>,
        );
        expect(await screen.findByText('Insurance Executive Risk Overview')).toBeInTheDocument();
        expect(screen.getByText(/Insurance entity register/)).toBeInTheDocument();
        expect(screen.getByText(/No classified insurance vendors/i)).toBeInTheDocument();
        expect(screen.queryByText('100%')).not.toBeInTheDocument();
    });

    it('surfaces applicability who, when, and reason', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/insurance/regulatory']}>
                <Routes>
                    <Route path="/insurance/regulatory" element={<InsuranceHome />} />
                </Routes>
            </MemoryRouter>,
        );
        expect(await screen.findByText('Ada Ins')).toBeInTheDocument();
        expect(screen.getByText('Nigerian insurer domicile recorded.')).toBeInTheDocument();
        expect(screen.getByText(/Human applicability decision/)).toBeInTheDocument();
    });

    it('shows linked reinsurance Third Party without creating a vendor', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/insurance/reinsurance']}>
                <Routes>
                    <Route path="/insurance/reinsurance" element={<InsuranceHome />} />
                </Routes>
            </MemoryRouter>,
        );
        expect(await screen.findByText('Existing Reinsurer')).toBeInTheDocument();
        expect(screen.getByText(/Not placement/)).toBeInTheDocument();
    });
});

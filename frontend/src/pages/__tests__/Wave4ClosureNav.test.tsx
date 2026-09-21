import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import Layout from '../../components/Layout';
import EngagementWorkspace from '../EngagementWorkspace';
import EngagementOverview from '../EngagementOverview';
import LegacyOnboardRedirect from '../LegacyOnboardRedirect';
import RequesterLayout from '../../requester/RequesterLayout';
import { legacyEngagementRedirect } from '../../engagement/engagementPaths';

const auth = vi.hoisted(() => ({
    user: {
        id: '1',
        email: 'lead@example.test',
        firstName: 'Lead',
        lastName: 'User',
        role: 'RISK_MANAGER',
        organizationId: 'org1',
    },
    logout: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => auth,
}));

vi.mock('../VendorOnboardingWorkspace', () => ({
    default: () => <p>Legacy onboarding workspace</p>,
}));

vi.mock('../../services/api', () => ({
    healthCheck: vi.fn().mockResolvedValue({}),
    organizationAPI: { getCurrent: vi.fn().mockResolvedValue({ data: { data: { name: 'Supreme GRC QA' } } }) },
    intakeAPI: {
        getEngagement: vi.fn().mockResolvedValue({
            data: {
                data: {
                    id: 'e1',
                    publicId: 'ENG-2026-0001',
                    serviceName: 'Azure Hosting QA',
                    statusLabel: 'Vendor submitted',
                    nextAction: 'Complete Specialist Review',
                    primaryAction: { label: 'Complete Specialist Review', href: '/engagements/e1/evidence', owner: 'Assigned specialist / TPRM analyst' },
                    thirdParty: { name: 'Microsoft Corporation QA' },
                    confirmedInherentTier: 'CRITICAL',
                    residual: 'MEDIUM',
                    history: [],
                },
            },
        }),
        resolveLegacyOnboard: vi.fn().mockResolvedValue({
            data: { data: { mode: 'redirect', engagement: { id: 'e1', publicId: 'ENG-2026-0001' }, compatibility: 'Deep link resolved to the Golden Journey Engagement.' } },
        }),
    },
}));

function renderLayout(role: string, path = '/dashboard') {
    auth.user = { ...auth.user, role, firstName: role, email: `${role.toLowerCase()}@example.test` };
    return render(
        <MemoryRouter future={routerFuture} initialEntries={[path]}>
            <Layout />
        </MemoryRouter>
    );
}

describe('Wave 4 closure navigation', () => {
    beforeEach(() => {
        auth.user.role = 'RISK_MANAGER';
    });

    it('shows Engagements and hides Onboard for TPRM Lead', () => {
        renderLayout('RISK_MANAGER');
        expect(screen.getAllByText(/^Engagements$/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/^Intake$/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/^My Work$/).length).toBeGreaterThan(0);
        expect(screen.queryByText(/^Onboard$/)).not.toBeInTheDocument();
    });

    it('exposes a mobile navigation drawer control', () => {
        renderLayout('RISK_MANAGER');
        expect(screen.getByLabelText('Open navigation')).toBeInTheDocument();
    });

    it('shows GRC work navigation for TPRM Analyst', () => {
        renderLayout('ASSESSOR', '/engagements');
        expect(screen.getAllByText(/^Engagements$/).length).toBeGreaterThan(0);
        expect(screen.getAllByLabelText('Engagements')[0]).toHaveAttribute('aria-current', 'page');
    });

    it('does not give a requester GRC left navigation', () => {
        auth.user = { ...auth.user, role: 'BUSINESS_OWNER', firstName: 'Pat', email: 'pat@example.test' };
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/request']}>
                <RequesterLayout />
            </MemoryRouter>
        );
        expect(screen.getByLabelText('Requester')).toBeInTheDocument();
        expect(screen.queryByText(/^Onboard$/)).not.toBeInTheDocument();
        expect(screen.queryByText(/^Engagements$/)).not.toBeInTheDocument();
        expect(screen.queryByText(/^Third Parties$/)).not.toBeInTheDocument();
    });

    it('renders Engagement workspace tabs and one primary next action', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/engagements/e1']}>
                <Routes>
                    <Route path="/engagements/:id" element={<EngagementWorkspace />}>
                        <Route index element={<EngagementOverview />} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );
        expect((await screen.findAllByText(/ENG-2026-0001 · Azure Hosting QA/)).length).toBeGreaterThan(0);
        expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('tab', { name: 'Inherent Risk' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Residual Risk' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Monitoring' })).toBeInTheDocument();
        expect(screen.getAllByText('Complete Specialist Review').length).toBeGreaterThan(0);
    });

    it('redirects a legacy Onboard deep link to the Engagement workspace', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/vendor-onboarding/VND-2026-0001']}>
                <Routes>
                    <Route path="/vendor-onboarding/:id" element={<LegacyOnboardRedirect />} />
                    <Route path="/engagements/:id" element={<p>Engagement workspace</p>} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText('Engagement workspace')).toBeInTheDocument();
    });

    it('maps legacy engagement paths to the Engagement workspace', () => {
        expect(legacyEngagementRedirect('/third-parties/engagements/e1/tier-review')).toBe('/engagements/e1/inherent-risk');
        expect(legacyEngagementRedirect('/third-parties/engagements/e1/assessment-review')).toBe('/engagements/e1/evidence');
        expect(legacyEngagementRedirect('/third-parties/engagements/e1/risk')).toBe('/engagements/e1/residual-risk');
    });
});

describe('legacy record without Engagement', () => {
    it('keeps a read-compatible legacy view and does not manufacture an Engagement', async () => {
        const { intakeAPI } = await import('../../services/api');
        vi.mocked(intakeAPI.resolveLegacyOnboard).mockResolvedValueOnce({
            data: {
                data: {
                    mode: 'legacy',
                    vendor: { id: 'v-legacy', name: 'Historical Vendor' },
                    compatibility: 'No Golden Journey Engagement exists. This remains a read-compatible legacy onboarding record. An Engagement was not manufactured.',
                },
            },
        } as any);
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/vendor-onboarding/VND-LEGACY']}>
                <Routes>
                    <Route path="/vendor-onboarding/:id" element={<LegacyOnboardRedirect />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText(/No Golden Journey Engagement exists/)).toBeInTheDocument();
        expect(screen.queryByText('Engagement workspace')).not.toBeInTheDocument();
    });
});

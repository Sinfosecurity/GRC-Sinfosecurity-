import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import Dashboard from '../Dashboard';

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ user: { firstName: 'Ava', role: 'ASSESSOR' } }),
}));

vi.mock('../../services/api', () => ({
    tprmAPI: { attention: vi.fn() },
    vendorAPI: { getStatistics: vi.fn() },
    intelligenceAPI: { teaser: vi.fn() },
}));

function pending() {
    return new Promise(() => undefined);
}

const liveAttention = {
    data: {
        data: {
            items: [{
                id: 'onboarding-v1',
                severity: 'HIGH',
                action: 'REVIEW SUBMISSION',
                title: 'Acme Payroll · submitted',
                detail: 'VND-2026-0001 · due 2026-09-18 · overdue.',
                vendorName: 'Acme Payroll',
                href: '/vendor-onboarding/VND-2026-0001',
            }],
            work: { dueAssessments: 8, overdueFindings: 0, pendingDecisions: 1 },
        },
    },
};

const liveStats = {
    data: {
        summary: { totalVendors: 38, highRiskVendors: 4, overdueReviews: 1, criticalVendors: 16 },
        tierCounts: { CRITICAL: 16, HIGH: 3, MEDIUM: 5, LOW: 2 },
    },
};

describe('Home command center', () => {
    beforeEach(async () => {
        const { tprmAPI, vendorAPI, intelligenceAPI } = await import('../../services/api');
        (tprmAPI.attention as any).mockResolvedValue(liveAttention);
        (vendorAPI.getStatistics as any).mockResolvedValue(liveStats);
        (intelligenceAPI.teaser as any).mockResolvedValue({ data: { data: { items: [] } } });
    });

    it('does not render all-clear or authoritative zeros while requests are pending', async () => {
        const { tprmAPI, vendorAPI, intelligenceAPI } = await import('../../services/api');
        (tprmAPI.attention as any).mockReturnValue(pending());
        (vendorAPI.getStatistics as any).mockReturnValue(pending());
        (intelligenceAPI.teaser as any).mockReturnValue(pending());
        render(
            <MemoryRouter future={routerFuture}>
                <Dashboard />
            </MemoryRouter>
        );
        expect(screen.getByText(/Checking what needs your attention/)).toBeInTheDocument();
        expect(screen.getByText(/Checking recorded work/)).toBeInTheDocument();
        expect(screen.getByLabelText('Critical vendors: checking')).toBeInTheDocument();
        expect(screen.getByLabelText('Decisions waiting: checking')).toBeInTheDocument();
        expect(screen.getByLabelText('Overdue findings: checking')).toBeInTheDocument();
        expect(screen.getByLabelText('Assessments due: checking')).toBeInTheDocument();
        expect(screen.queryByText('Nothing needs your attention')).not.toBeInTheDocument();
        expect(screen.queryByText(/0 need your attention/)).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Decisions waiting: 0')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Overdue findings: 0')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Assessments due: 0')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Critical vendors: 0')).not.toBeInTheDocument();
    });

    it('renders true zero only after a successful empty attention response', async () => {
        const { tprmAPI, vendorAPI } = await import('../../services/api');
        (tprmAPI.attention as any).mockResolvedValue({
            data: { data: { items: [], work: { dueAssessments: 0, overdueFindings: 0, pendingDecisions: 0 } } },
        });
        (vendorAPI.getStatistics as any).mockResolvedValue({
            data: { summary: { totalVendors: 4, highRiskVendors: 0, overdueReviews: 0, criticalVendors: 0 }, tierCounts: { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 1 } },
        });
        render(
            <MemoryRouter future={routerFuture}>
                <Dashboard />
            </MemoryRouter>
        );
        expect(await screen.findByText('Nothing needs your attention')).toBeInTheDocument();
        expect(screen.getByText('0 need your attention')).toBeInTheDocument();
        expect(screen.getByLabelText('Decisions waiting: 0')).toBeInTheDocument();
        expect(screen.getByLabelText('Critical vendors: 0')).toBeInTheDocument();
    });

    it('renders live non-zero values after successful responses', async () => {
        render(
            <MemoryRouter future={routerFuture}>
                <Dashboard />
            </MemoryRouter>
        );
        expect(await screen.findByText('1 need your attention')).toBeInTheDocument();
        expect(screen.getAllByText('Acme Payroll · submitted').length).toBeGreaterThan(0);
        expect(screen.getByLabelText('Critical vendors: 16')).toBeInTheDocument();
        expect(screen.getByLabelText('Decisions waiting: 1')).toBeInTheDocument();
        expect(screen.getByLabelText('Assessments due: 8')).toBeInTheDocument();
        expect(screen.getByText(/Critical 16 · High 3 · Medium 5 · Low 2/)).toBeInTheDocument();
        expect(screen.queryByText('Total vendors')).not.toBeInTheDocument();
    });

    it('does not treat an attention failure as all-clear', async () => {
        const { tprmAPI } = await import('../../services/api');
        (tprmAPI.attention as any).mockRejectedValue({ message: 'Attention request failed' });
        render(
            <MemoryRouter future={routerFuture}>
                <Dashboard />
            </MemoryRouter>
        );
        expect(await screen.findByText('Attention could not be loaded')).toBeInTheDocument();
        expect(screen.getAllByText(/This is not an all-clear/).length).toBeGreaterThan(0);
        expect(screen.queryByText('Nothing needs your attention')).not.toBeInTheDocument();
        expect(screen.queryByText(/0 need your attention/)).not.toBeInTheDocument();
        expect(await screen.findByLabelText('Critical vendors: 16')).toBeInTheDocument();
        expect(screen.getByLabelText('Decisions waiting: unavailable')).toBeInTheDocument();
    });

    it('keeps attention usable when statistics fail', async () => {
        const { vendorAPI } = await import('../../services/api');
        (vendorAPI.getStatistics as any).mockRejectedValue({ message: 'Statistics request failed' });
        render(
            <MemoryRouter future={routerFuture}>
                <Dashboard />
            </MemoryRouter>
        );
        expect(await screen.findByText('1 need your attention')).toBeInTheDocument();
        expect(screen.getAllByText('Acme Payroll · submitted').length).toBeGreaterThan(0);
        expect(screen.getByLabelText('Critical vendors: unavailable')).toBeInTheDocument();
        expect(screen.getByText(/Portfolio statistics are unavailable|Statistics request failed/)).toBeInTheDocument();
        expect(screen.getByLabelText('Decisions waiting: 1')).toBeInTheDocument();
    });

    it('does not fail Home when intelligence fails', async () => {
        const { intelligenceAPI } = await import('../../services/api');
        (intelligenceAPI.teaser as any).mockRejectedValue({ message: 'Teaser failed' });
        render(
            <MemoryRouter future={routerFuture}>
                <Dashboard />
            </MemoryRouter>
        );
        expect(await screen.findByText('1 need your attention')).toBeInTheDocument();
        expect(screen.getByLabelText('Critical vendors: 16')).toBeInTheDocument();
        expect(screen.queryByText('What changed')).not.toBeInTheDocument();
    });

    it('initial render cannot produce a false zero before requests settle', async () => {
        const { tprmAPI, vendorAPI, intelligenceAPI } = await import('../../services/api');
        let release!: (value: unknown) => void;
        (tprmAPI.attention as any).mockReturnValue(new Promise((resolve) => { release = resolve; }));
        (vendorAPI.getStatistics as any).mockReturnValue(pending());
        (intelligenceAPI.teaser as any).mockReturnValue(pending());
        const view = render(
            <MemoryRouter future={routerFuture}>
                <Dashboard />
            </MemoryRouter>
        );
        expect(view.container.textContent).not.toMatch(/Nothing needs your attention/);
        expect(view.container.textContent).not.toMatch(/0 need your attention/);
        expect(screen.queryByLabelText(/: 0$/)).not.toBeInTheDocument();
        release(liveAttention);
        await waitFor(() => expect(screen.getByText('1 need your attention')).toBeInTheDocument());
    });
});

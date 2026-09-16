import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('Home command center', () => {
    beforeEach(async () => {
        const { tprmAPI, vendorAPI, intelligenceAPI } = await import('../../services/api');
        (tprmAPI.attention as any).mockResolvedValue({
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
                    work: { dueAssessments: 1, overdueFindings: 2, pendingDecisions: 3 },
                },
            },
        });
        (vendorAPI.getStatistics as any).mockResolvedValue({
            data: {
                summary: { totalVendors: 12, highRiskVendors: 4, overdueReviews: 1, criticalVendors: 2 },
                tierCounts: { CRITICAL: 2, HIGH: 3, MEDIUM: 5, LOW: 2 },
            },
        });
        (intelligenceAPI.teaser as any).mockResolvedValue({ data: { data: { items: [] } } });
    });

    it('leads with live attention instead of an equal metric strip', async () => {
        render(
            <MemoryRouter future={routerFuture}>
                <Dashboard />
            </MemoryRouter>
        );
        expect(await screen.findByText('1 need your attention')).toBeInTheDocument();
        expect(screen.getAllByText('Acme Payroll · submitted').length).toBeGreaterThan(0);
        expect(screen.getByLabelText('Critical vendors: 2')).toBeInTheDocument();
        expect(screen.getByLabelText('Decisions waiting: 3')).toBeInTheDocument();
        expect(screen.getByText(/Critical 2 · High 3 · Medium 5 · Low 2/)).toBeInTheDocument();
        expect(screen.queryByText('Total vendors')).not.toBeInTheDocument();
    });
});

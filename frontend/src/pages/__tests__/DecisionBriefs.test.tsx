import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import DecisionBriefs from '../DecisionBriefs';

vi.mock('../../services/api', () => ({
    vendorAPI: { getAll: vi.fn() },
    tprmAPI: { listBriefs: vi.fn(), generateBrief: vi.fn(), decideBrief: vi.fn(), downloadBriefPdf: vi.fn() },
}));

vi.mock('../../components/EntityRelationships', () => ({ default: () => null }));

const brief = {
    id: 'brief-1',
    vendorId: 'v1',
    inherentRisk: 83,
    residualRisk: 79,
    riskBand: 'HIGH',
    evidenceConfidence: 'HIGH',
    openFindingsCount: 2,
    monitoringAlertCount: 0,
    aiSummaryStatus: 'UNAVAILABLE',
    status: 'DRAFT',
    immutableSnapshot: {
        vendor: { name: 'Northwind Claims' },
        score: { factors: [{ label: 'Data access', points: 12, rationale: 'Production data is in scope.' }] },
    },
};

describe('Decision briefs workspace', () => {
    beforeEach(async () => {
        const { vendorAPI, tprmAPI } = await import('../../services/api');
        (vendorAPI.getAll as any).mockResolvedValue({ data: { vendors: [{ id: 'v1', name: 'Northwind Claims' }] } });
        (tprmAPI.listBriefs as any).mockResolvedValue({ data: { data: [brief] } });
    });

    it('keeps authoritative scores and does not invent confidence or AI ownership', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/decision-briefs']}>
                <DecisionBriefs />
            </MemoryRouter>
        );
        expect(await screen.findByRole('heading', { name: 'Decisions' })).toBeInTheDocument();
        expect(screen.getByText('Decision history')).toBeInTheDocument();
        expect(screen.getAllByText('Northwind Claims').length).toBeGreaterThan(0);
        expect(screen.getByText('83')).toBeInTheDocument();
        expect(screen.getByText('79')).toBeInTheDocument();
        expect(screen.getByText('Inherent 83')).toBeInTheDocument();
        expect(screen.getAllByText(/HIGH|High/).length).toBeGreaterThan(0);
        expect(screen.getByText('Data access')).toBeInTheDocument();
        expect(screen.getByText('Production data is in scope.')).toBeInTheDocument();
        expect(screen.getByText(/AI does not own this score/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Generate brief' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Record decision' })).toBeInTheDocument();
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import DecisionBriefs, { resolveSelectedBrief, type Brief } from '../DecisionBriefs';
import { riskDelta } from '../../components/design/DecisionSummary';

vi.mock('../../services/api', () => ({
    vendorAPI: { getAll: vi.fn() },
    tprmAPI: { listBriefs: vi.fn(), generateBrief: vi.fn(), decideBrief: vi.fn(), downloadBriefPdf: vi.fn() },
}));

vi.mock('../../components/EntityRelationships', () => ({
    default: ({ sourceId }: { sourceId: string }) => <div>Related connections {sourceId}</div>,
}));

const draft: Brief = {
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
    createdAt: '2026-09-16T12:00:00.000Z',
    immutableSnapshot: {
        vendor: { name: 'Northwind Claims' },
        score: { factors: [{ label: 'Data access', points: 12, rationale: 'Production data is in scope.' }] },
    },
};

const decided: Brief = {
    ...draft,
    id: 'brief-2',
    residualRisk: 79,
    status: 'DECIDED',
    humanDecision: 'APPROVE_WITH_CONDITIONS',
    conditions: 'Complete the inventory before reassessment.',
    reviewerAnalysis: 'Findings are time-bounded.',
    decidedAt: '2026-09-17T12:00:00.000Z',
    immutableSnapshot: {
        vendor: { name: 'Northwind Claims' },
        score: { factors: [{ label: 'Control effectiveness', points: -4, rationale: 'Documented compensating control.' }] },
    },
};

const aiReady: Brief = {
    ...draft,
    id: 'brief-3',
    aiSummaryStatus: 'SUCCESS',
    aiSummary: 'Residual remains high because privileged access is still open.',
    immutableSnapshot: { vendor: { name: 'Long Vendor Name That Should Not Overflow The Rail' } },
};

async function api() {
    return import('../../services/api');
}

function renderPage() {
    return render(
        <MemoryRouter future={routerFuture} initialEntries={['/decision-briefs']}>
            <DecisionBriefs />
        </MemoryRouter>
    );
}

describe('resolveSelectedBrief', () => {
    it('replaces a stale selected object from freshly loaded rows', () => {
        const stale = { ...draft, residualRisk: 87 };
        const fresh = { ...draft, residualRisk: 79 };
        expect(resolveSelectedBrief([fresh, decided], stale.id)?.residualRisk).toBe(79);
        expect(resolveSelectedBrief([decided], 'missing')?.id).toBe('brief-2');
        expect(resolveSelectedBrief([], 'brief-1')).toBeNull();
    });
});

describe('risk movement', () => {
    it('uses residual minus inherent and does not invent another formula', () => {
        expect(riskDelta(83, 79)).toBe(-4);
        expect(riskDelta(80, 80)).toBe(0);
    });
});

describe('Decision briefs workspace', () => {
    beforeEach(async () => {
        const { vendorAPI, tprmAPI } = await api();
        (vendorAPI.getAll as any).mockResolvedValue({ data: { vendors: [{ id: 'v1', name: 'Northwind Claims' }] } });
        (tprmAPI.listBriefs as any).mockResolvedValue({ data: { data: [draft] } });
        (tprmAPI.generateBrief as any).mockReset();
        (tprmAPI.decideBrief as any).mockReset();
        (tprmAPI.downloadBriefPdf as any).mockReset();
    });

    it('keeps authoritative scores and does not invent confidence or AI ownership', async () => {
        renderPage();
        expect(await screen.findByRole('heading', { name: 'Decisions' })).toBeInTheDocument();
        expect(screen.getByText('Decision history')).toBeInTheDocument();
        expect(screen.getAllByText('Northwind Claims').length).toBeGreaterThan(0);
        expect(screen.getByText(/Inherent 83/)).toBeInTheDocument();
        expect(screen.getByText('79')).toBeInTheDocument();
        expect(screen.getByText(/Change -4/)).toBeInTheDocument();
        expect(screen.getAllByText(/HIGH|High/).length).toBeGreaterThan(0);
        expect(screen.getByText('Data access')).toBeInTheDocument();
        expect(screen.getByText('Production data is in scope.')).toBeInTheDocument();
        expect(screen.getByText(/AI does not own this score/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Generate brief' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Download decision brief PDF' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Record decision' })).toBeInTheDocument();
        expect(screen.getByText('Related connections brief-1')).toBeInTheDocument();
    });

    it('shows an empty workspace when no briefs exist', async () => {
        const { tprmAPI } = await api();
        (tprmAPI.listBriefs as any).mockResolvedValue({ data: { data: [] } });
        renderPage();
        expect(await screen.findByText('No decisions yet')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Record decision' })).not.toBeInTheDocument();
    });

    it('switches the selected brief from the history rail', async () => {
        const { tprmAPI } = await api();
        (tprmAPI.listBriefs as any).mockResolvedValue({ data: { data: [draft, decided] } });
        renderPage();
        expect(await screen.findByRole('button', { name: 'Record decision' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /residual 79, Decided/i }));
        expect(await screen.findByText(/Complete the inventory/)).toBeInTheDocument();
        expect(screen.getAllByText('Approve With Conditions').length).toBeGreaterThan(0);
        expect(screen.queryByRole('button', { name: 'Record decision' })).not.toBeInTheDocument();
        expect(screen.getByText('Historical briefs are immutable. The form is closed.')).toBeInTheDocument();
    });

    it('refreshes the selected brief after generate instead of keeping a stale object', async () => {
        const { tprmAPI } = await api();
        const created = { ...draft, id: 'brief-new', residualRisk: 70, inherentRisk: 83 };
        let rows: Brief[] = [draft];
        (tprmAPI.listBriefs as any).mockImplementation(() => Promise.resolve({ data: { data: rows } }));
        (tprmAPI.generateBrief as any).mockImplementation(async () => {
            rows = [created, draft];
            return { data: { data: created } };
        });
        renderPage();
        expect(await screen.findByText('79')).toBeInTheDocument();
        const vendor = screen.getByLabelText('Vendor');
        await userEvent.click(vendor);
        await userEvent.click(await screen.findByRole('option', { name: 'Northwind Claims' }));
        await userEvent.click(screen.getByRole('button', { name: 'Generate brief' }));
        await waitFor(() => expect(tprmAPI.generateBrief).toHaveBeenCalledWith('v1'));
        expect(await screen.findByText('70')).toBeInTheDocument();
    });

    it('records each existing decision value and refreshes the immutable row', async () => {
        const { tprmAPI } = await api();
        const finalized = { ...draft, status: 'DECIDED', humanDecision: 'REJECT', residualRisk: 79 };
        let rows: Brief[] = [draft];
        (tprmAPI.listBriefs as any).mockImplementation(() => Promise.resolve({ data: { data: rows } }));
        (tprmAPI.decideBrief as any).mockImplementation(async () => {
            rows = [finalized];
            return { data: { data: finalized } };
        });
        renderPage();
        await screen.findByRole('button', { name: 'Record decision' });
        await userEvent.click(screen.getByLabelText('Decision'));
        await userEvent.click(await screen.findByRole('option', { name: 'Reject' }));
        await userEvent.click(screen.getByRole('button', { name: 'Record decision' }));
        await waitFor(() => expect(tprmAPI.decideBrief).toHaveBeenCalledWith('brief-1', {
            decision: 'REJECT',
            conditions: '',
            reviewerAnalysis: '',
        }));
        expect(await screen.findByText(/Historical briefs are immutable/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Record decision' })).not.toBeInTheDocument();
    });

    it('shows a restrained AI summary only when the model succeeded', async () => {
        const { tprmAPI } = await api();
        (tprmAPI.listBriefs as any).mockResolvedValue({ data: { data: [aiReady] } });
        renderPage();
        expect(await screen.findByText('Residual remains high because privileged access is still open.')).toBeInTheDocument();
        expect(screen.getByText('AI-assisted summary')).toBeInTheDocument();
        expect(screen.getByText(/AI does not own this score/)).toBeInTheDocument();
    });

    it('surfaces generate errors without changing scores', async () => {
        const { tprmAPI } = await api();
        (tprmAPI.generateBrief as any).mockRejectedValue(new Error('Vendor has no persisted score'));
        renderPage();
        await screen.findByText('79');
        await userEvent.click(screen.getByLabelText('Vendor'));
        await userEvent.click(await screen.findByRole('option', { name: 'Northwind Claims' }));
        await userEvent.click(screen.getByRole('button', { name: 'Generate brief' }));
        expect(await screen.findByText('Vendor has no persisted score')).toBeInTheDocument();
        expect(screen.getByText('79')).toBeInTheDocument();
    });

    it('keeps download PDF secondary and EntityRelationships mounted', async () => {
        renderPage();
        await screen.findByRole('heading', { name: 'Decisions' });
        expect(screen.getByRole('button', { name: 'Download decision brief PDF' })).toBeInTheDocument();
        expect(screen.getByText('Related connections brief-1')).toBeInTheDocument();
        expect(within(screen.getByRole('navigation', { name: 'Decision history' })).getByText(/Residual 79/)).toBeInTheDocument();
    });
});

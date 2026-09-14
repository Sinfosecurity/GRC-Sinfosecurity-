import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import GovernanceGraphExplorer from '../GovernanceGraphExplorer';

const node = {
    id: 'n1',
    nodeType: 'VENDOR',
    displayLabel: 'Harbor Cloud',
    status: 'ACTIVE',
    sourceModel: 'Vendor',
    sourceId: 'v1',
    recordHref: '/vendor-management?vendorId=v1',
};
const related = { id: 'n2', nodeType: 'RISK', displayLabel: 'Residual 72', status: 'ACTIVE' };
const relationship = {
    id: 'e1',
    relationshipType: 'HAS_RISK',
    provenance: 'SYSTEM',
    authority: 'AUTHORITATIVE',
    fromNode: node,
    toNode: related,
};

vi.mock('../../services/api', () => ({
    governanceAPI: {
        backfill: vi.fn(),
        summary: vi.fn(),
        search: vi.fn(),
        node: vi.fn(),
        relationships: vi.fn(),
        impact: vi.fn(),
        lineage: vi.fn(),
    },
}));

function renderExplorer(path = '/governance-graph') {
    return render(
        <MemoryRouter future={routerFuture} initialEntries={[path]}>
            <GovernanceGraphExplorer />
        </MemoryRouter>
    );
}

describe('Governance Graph Explorer', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const { governanceAPI } = await import('../../services/api');
        (governanceAPI.summary as any).mockResolvedValue({
            data: {
                data: {
                    nodeCount: 2,
                    relationshipCount: 1,
                    activeRelationshipCount: 1,
                    nodeCounts: { VENDOR: 1 },
                    relationshipCounts: { HAS_RISK: 1 },
                    orphanNodes: [],
                    recentChanges: [relationship],
                },
            },
        });
        (governanceAPI.search as any).mockResolvedValue({ data: { data: { nodes: [node] } } });
        (governanceAPI.node as any).mockResolvedValue({ data: { data: node } });
        (governanceAPI.relationships as any).mockResolvedValue({ data: { data: { relationships: [relationship] } } });
        (governanceAPI.impact as any).mockResolvedValue({ data: { data: { nodes: [node, related] } } });
        (governanceAPI.lineage as any).mockResolvedValue({
            data: { data: { hops: [{ depth: 1, node: related, edge: relationship }] } },
        });
    });

    it('loads summary and search only, without backfill or auto-select', async () => {
        const { governanceAPI } = await import('../../services/api');
        renderExplorer();
        expect(await screen.findByRole('heading', { name: 'Governance Graph' })).toBeInTheDocument();
        expect(await screen.findByText('Select an object')).toBeInTheDocument();
        expect(screen.getByText('Recent relationship changes')).toBeInTheDocument();
        expect(screen.getByLabelText('Search')).toBeInTheDocument();
        await waitFor(() => expect(governanceAPI.summary).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(governanceAPI.search).toHaveBeenCalledTimes(1));
        expect(governanceAPI.backfill).not.toHaveBeenCalled();
        expect(governanceAPI.relationships).not.toHaveBeenCalled();
        expect(governanceAPI.impact).not.toHaveBeenCalled();
        expect(governanceAPI.lineage).not.toHaveBeenCalled();
        expect(screen.queryByRole('tab', { name: 'Impact' })).not.toBeInTheDocument();
    });

    it('loads relationships once on select and defers impact and lineage', async () => {
        const { governanceAPI } = await import('../../services/api');
        renderExplorer();
        await screen.findByText('Select an object');
        await userEvent.click(screen.getAllByRole('button', { name: /Harbor Cloud/i })[0]);
        expect(await screen.findByRole('heading', { level: 3, name: 'Harbor Cloud' })).toBeInTheDocument();
        expect((await screen.findAllByText('Has Risk')).length).toBeGreaterThan(0);
        expect(screen.getByRole('link', { name: /Open authoritative record/i })).toBeInTheDocument();
        await waitFor(() => expect(governanceAPI.relationships).toHaveBeenCalledTimes(1));
        expect(governanceAPI.summary).toHaveBeenCalledTimes(1);
        expect(governanceAPI.impact).not.toHaveBeenCalled();
        expect(governanceAPI.lineage).not.toHaveBeenCalled();

        await userEvent.click(screen.getByRole('tab', { name: 'Impact' }));
        expect(await screen.findByText('Residual 72')).toBeInTheDocument();
        expect(governanceAPI.impact).toHaveBeenCalledTimes(1);

        await userEvent.click(screen.getByRole('tab', { name: 'Lineage' }));
        expect(await screen.findByText(/How this object is connected/i)).toBeInTheDocument();
        expect(governanceAPI.lineage).toHaveBeenCalledTimes(1);
        expect(governanceAPI.backfill).not.toHaveBeenCalled();
    });

    it('does not refetch relationships when relationship filters change', async () => {
        const { governanceAPI } = await import('../../services/api');
        renderExplorer();
        await userEvent.click((await screen.findAllByRole('button', { name: /Harbor Cloud/i }))[0]);
        await screen.findByRole('heading', { level: 3, name: 'Harbor Cloud' });
        expect((await screen.findAllByText('Has Risk')).length).toBeGreaterThan(0);
        await userEvent.click(screen.getByLabelText('Relationship'));
        await userEvent.click(await screen.findByRole('option', { name: 'Has Risk' }));
        expect((await screen.findAllByText('Has Risk')).length).toBeGreaterThan(0);
        expect(governanceAPI.relationships).toHaveBeenCalledTimes(1);
        expect(governanceAPI.search).toHaveBeenCalledTimes(1);
    });

    it('shows empty state when search returns nothing', async () => {
        const { governanceAPI } = await import('../../services/api');
        (governanceAPI.search as any).mockResolvedValue({ data: { data: { nodes: [] } } });
        renderExplorer();
        expect(await screen.findByText('No graph records match')).toBeInTheDocument();
    });

    it('shows error state', async () => {
        const { governanceAPI } = await import('../../services/api');
        (governanceAPI.summary as any).mockRejectedValueOnce(new Error('graph unavailable'));
        renderExplorer();
        expect(await screen.findByText(/graph unavailable/i)).toBeInTheDocument();
    });

    it('shows a single professional rate-limit message', async () => {
        const { governanceAPI } = await import('../../services/api');
        (governanceAPI.summary as any).mockRejectedValueOnce(new Error('Too many requests were made in a short period. Please wait a moment and try again.'));
        renderExplorer();
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Too many requests were made in a short period. Please wait a moment and try again.');
        expect(alert).not.toHaveTextContent(/too many attempts/i);
        expect(alert.textContent?.match(/Too many requests/g)?.length).toBe(1);
    });
});

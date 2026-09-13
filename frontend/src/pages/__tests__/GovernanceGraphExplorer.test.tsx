import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import GovernanceGraphExplorer from '../GovernanceGraphExplorer';

vi.mock('../../services/api', () => {
    const node = {
        id: 'n1',
        nodeType: 'VENDOR',
        displayLabel: 'Harbor Cloud',
        status: 'ACTIVE',
        sourceModel: 'Vendor',
        sourceId: 'v1',
        recordHref: '/vendor-management?vendorId=v1',
    };
    return {
        governanceAPI: {
            backfill: vi.fn().mockResolvedValue({ data: { data: { nodesCreated: 1, nodesReused: 0, edgesCreated: 1, edgesReused: 0, errors: [] } } }),
            summary: vi.fn().mockResolvedValue({
                data: { data: { nodeCount: 2, relationshipCount: 1, activeRelationshipCount: 1, nodeCounts: { VENDOR: 1 }, relationshipCounts: { OWNS: 1 }, orphanNodes: [], recentChanges: [] } },
            }),
            search: vi.fn().mockResolvedValue({ data: { data: { nodes: [node] } } }),
            relationships: vi.fn().mockResolvedValue({
                data: {
                    data: {
                        relationships: [{
                            id: 'e1',
                            relationshipType: 'HAS_RISK',
                            provenance: 'SYSTEM',
                            authority: 'AUTHORITATIVE',
                            fromNode: node,
                            toNode: { id: 'n2', nodeType: 'RISK', displayLabel: 'Residual 72', status: 'ACTIVE' },
                        }],
                    },
                },
            }),
            impact: vi.fn().mockResolvedValue({ data: { data: { nodes: [node, { id: 'n2', nodeType: 'RISK', displayLabel: 'Residual 72', status: 'ACTIVE' }] } } }),
            lineage: vi.fn().mockResolvedValue({ data: { data: { hops: [] } } }),
        },
    };
});

function renderExplorer() {
    return render(
        <MemoryRouter future={routerFuture} initialEntries={['/governance-graph']}>
            <GovernanceGraphExplorer />
        </MemoryRouter>
    );
}

describe('Governance Graph Explorer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders search, filters, selected object, and relationships', async () => {
        renderExplorer();
        expect(await screen.findByRole('heading', { name: 'Governance Graph' })).toBeInTheDocument();
        expect(screen.getByLabelText('Search')).toBeInTheDocument();
        expect(screen.getByLabelText('Node type')).toBeInTheDocument();
        expect(screen.getByLabelText('Relationship')).toBeInTheDocument();
        expect((await screen.findAllByText('Harbor Cloud')).length).toBeGreaterThan(0);
        expect(await screen.findByText('HAS RISK')).toBeInTheDocument();
        expect(screen.getAllByText(/Residual 72/).length).toBeGreaterThan(0);
        expect(screen.getByRole('link', { name: /Open authoritative record/i })).toBeInTheDocument();
    });

    it('shows impact tab contents', async () => {
        renderExplorer();
        await screen.findAllByText('Harbor Cloud');
        await userEvent.click(screen.getByRole('tab', { name: 'Impact' }));
        expect(await screen.findAllByText('Residual 72')).not.toHaveLength(0);
    });

    it('shows empty state when search returns nothing', async () => {
        const { governanceAPI } = await import('../../services/api');
        (governanceAPI.search as any).mockResolvedValueOnce({ data: { data: { nodes: [] } } });
        renderExplorer();
        expect(await screen.findByText('No graph records yet')).toBeInTheDocument();
    });

    it('shows error state', async () => {
        const { governanceAPI } = await import('../../services/api');
        (governanceAPI.summary as any).mockRejectedValueOnce(new Error('graph unavailable'));
        renderExplorer();
        expect(await screen.findByText(/graph unavailable/i)).toBeInTheDocument();
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import EntityRelationships from '../EntityRelationships';

vi.mock('../../services/api', () => ({
    governanceAPI: {
        lookup: vi.fn(),
        relationships: vi.fn(),
    },
}));

describe('EntityRelationships workspace', () => {
    beforeEach(async () => {
        const { governanceAPI } = await import('../../services/api');
        (governanceAPI.lookup as any).mockResolvedValue({
            data: { data: { id: 'n1', displayLabel: 'AUTH-01', nodeType: 'CONTROL' } },
        });
        (governanceAPI.relationships as any).mockResolvedValue({
            data: {
                data: {
                    relationships: [
                        {
                            id: 'r1',
                            relationshipType: 'SATISFIED_BY',
                            provenance: 'SYSTEM',
                            authority: 'AUTHORITATIVE',
                            fromNode: { id: 'req1', nodeType: 'REQUIREMENT', displayLabel: 'SOC 2 CC6.1', recordHref: '/control-center' },
                            toNode: { id: 'n1', nodeType: 'CONTROL', displayLabel: 'AUTH-01' },
                        },
                        {
                            id: 'r2',
                            relationshipType: 'SUPPORTED_BY',
                            provenance: 'USER',
                            authority: 'AUTHORITATIVE',
                            fromNode: { id: 'ev1', nodeType: 'EVIDENCE', displayLabel: 'ok.zip', recordHref: '/documents' },
                            toNode: { id: 'n1', nodeType: 'CONTROL', displayLabel: 'AUTH-01' },
                        },
                    ],
                },
            },
        });
    });

    it('groups connections instead of dumping graph codes', async () => {
        render(
            <MemoryRouter future={routerFuture}>
                <EntityRelationships sourceModel="OrganizationControl" sourceId="c1" />
            </MemoryRouter>
        );
        expect(await screen.findByText('Requirements')).toBeInTheDocument();
        expect(screen.getByText('Evidence')).toBeInTheDocument();
        expect(screen.getByText('SOC 2 CC6.1')).toBeInTheDocument();
        expect(screen.getByText('ok.zip')).toBeInTheDocument();
        expect(screen.getByText(/Requirement · Satisfies/)).toBeInTheDocument();
        expect(screen.queryByText('SATISFIED_BY')).not.toBeInTheDocument();
        expect(screen.queryByText('AUTHORITATIVE')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Open graph' })).toBeInTheDocument();
    });
});

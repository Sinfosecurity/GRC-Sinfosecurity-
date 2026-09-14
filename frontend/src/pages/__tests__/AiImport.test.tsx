import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import AiImport from '../AiImport';

vi.mock('../../services/api', () => ({
    aiGovernanceAPI: { previewImport: vi.fn(), commitImport: vi.fn() },
}));

describe('Supreme AI Governance import workspace', () => {
    it('requires preview before write', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/ai-governance/import']}>
                <AiImport />
            </MemoryRouter>
        );
        expect(await screen.findByText(/preview before write/i)).toBeInTheDocument();
        expect(screen.getByText(/download template/i)).toBeInTheDocument();
        expect(screen.getByText(/upload and preview/i)).toBeInTheDocument();
        expect(screen.queryByText(/Commit valid rows/)).not.toBeInTheDocument();
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import AiRegister from '../AiRegister';

vi.mock('../../services/api', () => ({
    aiGovernanceAPI: { systems: vi.fn(), createSystem: vi.fn() },
}));

describe('Supreme AI register labels', () => {
    beforeEach(async () => {
        const { aiGovernanceAPI } = await import('../../services/api');
        (aiGovernanceAPI.systems as any).mockResolvedValue({
            data: {
                data: [{
                    publicId: 'AI-00001',
                    name: 'Claims triage assistant',
                    lifecycle: 'PROPOSED',
                    organizationClass: 'NOT_CLASSIFIED',
                    owner: 'Unassigned',
                    latestApproval: 'None',
                }],
            },
        });
    });

    it('shows public IDs and humanized classes, not raw enum codes', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/ai-governance/systems']}>
                <AiRegister />
            </MemoryRouter>
        );
        expect(await screen.findByText('AI-00001')).toBeInTheDocument();
        expect(screen.getByText('Proposed')).toBeInTheDocument();
        expect(screen.getByText('Not Classified')).toBeInTheDocument();
        expect(screen.queryByText('NOT_CLASSIFIED')).not.toBeInTheDocument();
    });
});

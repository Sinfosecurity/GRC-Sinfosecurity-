import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import AiRegulatory from '../AiRegulatory';

vi.mock('../../services/api', () => ({
    aiGovernanceAPI: { regulatory: vi.fn(), recordRegulatory: vi.fn() },
}));

describe('Supreme AI regulatory honesty', () => {
    beforeEach(async () => {
        const { aiGovernanceAPI } = await import('../../services/api');
        (aiGovernanceAPI.regulatory as any).mockResolvedValue({
            data: {
                data: [{ publicId: 'REG-00001', system: { publicId: 'AI-00001' }, regime: 'EU AI Act', status: 'NOT_REVIEWED' }],
            },
        });
    });

    it('keeps honest denial language and humanizes status', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/ai-governance/regulatory']}>
                <AiRegulatory />
            </MemoryRouter>
        );
        expect(await screen.findByText(/does not automatically claim EU AI Act High-Risk/i)).toBeInTheDocument();
        expect(screen.getByText('Not Reviewed')).toBeInTheDocument();
        expect(screen.getByText('REG-00001')).toBeInTheDocument();
        expect(screen.queryByText(/this system is EU AI Act High-Risk/i)).not.toBeInTheDocument();
        expect(screen.queryByText('NOT_REVIEWED')).not.toBeInTheDocument();
    });
});

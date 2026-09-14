import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import AiReadiness from '../AiReadiness';

vi.mock('../../services/api', () => ({
    aiGovernanceAPI: { readiness: vi.fn() },
}));

describe('Supreme AI readiness honesty', () => {
    beforeEach(async () => {
        const { aiGovernanceAPI } = await import('../../services/api');
        (aiGovernanceAPI.readiness as any).mockResolvedValue({
            data: {
                data: {
                    honesty: 'Readiness and mapping only. This is not certified, compliant, or attested.',
                    name: 'NIST AI Risk Management Framework',
                    version: '1.0-ref',
                    certified: false,
                    coverage: { mapped: 4, requirementCount: 4, implemented: 0, tested: 0, gaps: 4 },
                    areas: [
                        { key: 'GOVERN', supremeSummary: 'Supreme summary: AI roles are assigned.', mappedControls: 1, implementedControls: 0, testedControls: 0, gap: true },
                    ],
                    compliance: null,
                },
            },
        });
    });

    it('does not claim NIST certification', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/ai-governance/readiness/nist-ai-rmf']}>
                <Routes>
                    <Route path="/ai-governance/readiness/:frameworkKey" element={<AiReadiness />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText(/not a certification/i)).toBeInTheDocument();
        expect(screen.getByText(/Certified: No/)).toBeInTheDocument();
        expect(screen.getByText('GOVERN')).toBeInTheDocument();
        expect(screen.queryByText(/NIST certified/i)).not.toBeInTheDocument();
    });
});

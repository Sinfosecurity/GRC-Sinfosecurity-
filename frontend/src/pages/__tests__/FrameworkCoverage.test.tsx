import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import FrameworkCoverage from '../FrameworkCoverage';

vi.mock('../../services/api', () => ({
    sccAPI: {
        frameworks: vi.fn(),
    },
}));

describe('Framework coverage', () => {
    beforeEach(async () => {
        const { sccAPI } = await import('../../services/api');
        (sccAPI.frameworks as any).mockResolvedValue({
            data: {
                data: {
                    honesty: 'Coverage and readiness only. This is not certified, compliant, or attested.',
                    frameworks: [{
                        id: 'f1',
                        frameworkKey: 'SOC2',
                        name: 'SOC 2 Trust Services Criteria',
                        publisher: 'AICPA',
                        version: '2017-ref',
                        mapped: 1,
                        implemented: 0,
                        tested: 0,
                        gaps: 2,
                        requirementCount: 3,
                        requirements: [{
                            id: 'r1',
                            requirementKey: 'CC6',
                            supremeSummary: 'Supreme summary: logical and physical access is restricted.',
                            mappedControls: 1,
                            implementedControls: 0,
                            testedControls: 0,
                            gap: true,
                        }],
                    }],
                },
            },
        });
    });

    it('uses readiness language instead of certification claims', async () => {
        render(
            <MemoryRouter future={routerFuture}>
                <FrameworkCoverage />
            </MemoryRouter>
        );
        expect(await screen.findByRole('heading', { name: 'Framework coverage' })).toBeInTheDocument();
        expect(screen.getAllByText(/not certified, compliant, or attested/i).length).toBeGreaterThan(0);
        expect(screen.getByText('CC6')).toBeInTheDocument();
        expect(screen.getByText('Gap')).toBeInTheDocument();
        expect(screen.queryByText(/you are soc 2 compliant/i)).not.toBeInTheDocument();
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import ControlCenter from '../ControlCenter';

vi.mock('../../services/api', () => ({
    sccAPI: {
        summary: vi.fn(),
        controls: vi.fn(),
    },
}));

describe('Control Center', () => {
    beforeEach(async () => {
        const { sccAPI } = await import('../../services/api');
        (sccAPI.summary as any).mockResolvedValue({
            data: {
                data: {
                    controlCount: 33,
                    implemented: 1,
                    tested: 1,
                    ineffective: 0,
                    needsReview: 0,
                    withFindings: 0,
                    honesty: 'These counts are readiness and mapping measures. They are not a certification or compliance attestation.',
                },
            },
        });
        (sccAPI.controls as any).mockResolvedValue({
            data: {
                data: [{
                    id: 'c1',
                    controlKey: 'AUTH-01',
                    title: 'Multi-factor authentication for privileged access',
                    domain: 'AUTHENTICATION',
                    implementationStatus: 'IMPLEMENTED',
                    effectivenessStatus: 'EFFECTIVE',
                    evidenceCount: 1,
                    usableEvidenceCount: 1,
                    testedCount: 1,
                    openFindings: 0,
                    needsReview: false,
                }],
            },
        });
    });

    it('shows readiness language and live control rows', async () => {
        render(
            <MemoryRouter future={routerFuture}>
                <ControlCenter />
            </MemoryRouter>
        );
        expect(await screen.findByRole('heading', { name: 'Control Center' })).toBeInTheDocument();
        expect(await screen.findByText(/not a certification/i)).toBeInTheDocument();
        expect(screen.getByText('AUTH-01')).toBeInTheDocument();
        expect(screen.getByText('Implemented')).toBeInTheDocument();
        expect(screen.queryByText(/certified/i)).not.toBeInTheDocument();
    });
});

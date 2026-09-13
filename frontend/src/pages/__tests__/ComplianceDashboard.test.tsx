import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import ComplianceDashboard from '../ComplianceDashboard';

vi.mock('../../services/api', () => ({
    complianceAPI: { dashboard: vi.fn(), downloadReport: vi.fn(), downloadBoardPptx: vi.fn() },
}));

describe('Supreme Compliance dashboard', () => {
    beforeEach(async () => {
        const { complianceAPI } = await import('../../services/api');
        (complianceAPI.dashboard as any).mockResolvedValue({
            data: {
                data: {
                    honesty: 'Readiness and coverage are not certification, attestation, or a claim that this organization is compliant.',
                    totals: { activeFrameworks: 1, openGaps: 2, overdueAttestations: 0, expiredExceptions: 1, openPeriods: 1 },
                    frameworks: [{
                        publicId: 'ACT-00001',
                        name: 'NIST Cybersecurity Framework',
                        version: '2.0-ref',
                        status: 'Active',
                        calculable: true,
                        emptyReason: null,
                        metrics: {
                            requirementCoverage: { percent: 68, numerator: 17, denominator: 25 },
                            implementationCoverage: { percent: 54, numerator: 9, denominator: 17 },
                            testingCoverage: { percent: 40, numerator: 4, denominator: 10 },
                            evidenceCoverage: { percent: 54, numerator: 9, denominator: 17 },
                        },
                    }],
                    gaps: [],
                    exceptions: [],
                    campaigns: [],
                    attention: [{ kind: 'Expired exceptions', title: 'Temporary remote-admin path', href: '/compliance/exceptions', publicId: 'EXC-00001' }],
                    changed: [{ title: 'Framework activated', change: null, summary: 'NIST Cybersecurity Framework 2.0-ref is now in this compliance program.', actor: 'Report Proof', createdAt: '2026-09-13T12:00:00.000Z' }],
                },
            },
        });
    });

    it('shows readiness language and refuses certification claims', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/compliance']}>
                <ComplianceDashboard />
            </MemoryRouter>
        );
        expect(await screen.findByText('Supreme Compliance')).toBeInTheDocument();
        expect(screen.getAllByText(/not certification/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Requirement coverage 68%/)).toBeInTheDocument();
        expect(screen.queryByText(/you are iso 27001 certified/i)).not.toBeInTheDocument();
    });
});

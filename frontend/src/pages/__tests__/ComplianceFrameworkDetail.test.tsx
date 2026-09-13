import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import ComplianceFrameworkDetail from '../ComplianceFrameworkDetail';

vi.mock('../../services/api', () => ({
    complianceAPI: { activation: vi.fn(), createCampaign: vi.fn(), createPeriod: vi.fn(), refreshGaps: vi.fn() },
}));

describe('Framework program detail', () => {
    beforeEach(async () => {
        const { complianceAPI } = await import('../../services/api');
        (complianceAPI.activation as any).mockResolvedValue({
            data: {
                data: {
                    publicId: 'ACT-00002',
                    name: 'ISO/IEC 27001',
                    version: '2022-ref',
                    publisher: 'ISO/IEC',
                    owner: 'Report Proof',
                    status: 'Active',
                    versionStatus: 'ACTIVE',
                    honesty: 'Readiness is not certification.',
                    crumbs: [
                        { label: 'Compliance', href: '/compliance' },
                        { label: 'ISO/IEC 27001', href: '/compliance/frameworks' },
                        { label: '2022-ref' },
                    ],
                    readiness: {
                        calculable: true,
                        metrics: {
                            requirementCoverage: { display: '100%', numerator: 1, denominator: 1, formula: 'mapped / applicable' },
                            implementationCoverage: { display: '0%' },
                            testingCoverage: { display: 'No implemented mapped controls to test', emptyReason: 'No implemented mapped controls to test' },
                            evidenceCoverage: { display: '0%' },
                        },
                    },
                    existingReuse: { message: '2 common controls are already mapped. 1 CLEAN evidence item can be reused.' },
                    remainingWork: { message: 'Remaining work is not certification.' },
                    requirements: [],
                    gaps: [],
                    exceptions: [],
                    campaigns: [],
                    periods: [],
                    history: [],
                },
            },
        });
    });

    it('uses the framework name as the breadcrumb and does not print a raw program id as the crumb', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/compliance/frameworks/ACT-00002']}>
                <Routes>
                    <Route path="/compliance/frameworks/:publicId" element={<ComplianceFrameworkDetail />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText('ISO/IEC 27001 2022-ref')).toBeInTheDocument();
        expect(screen.getAllByText('2022-ref').length).toBeGreaterThan(0);
        expect(screen.getByText('Already reusable from common controls')).toBeInTheDocument();
        expect(screen.getAllByText(/No implemented mapped controls to test/).length).toBeGreaterThan(0);
        expect(screen.getByText(/Program ACT-00002/)).toBeInTheDocument();
        const crumbs = document.querySelectorAll('[aria-label="Breadcrumb"]');
        expect(crumbs.length).toBeGreaterThan(0);
        expect(crumbs[0].textContent).toMatch(/Compliance/);
        expect(crumbs[0].textContent).toMatch(/ISO\/IEC 27001/);
        expect(crumbs[0].textContent).not.toMatch(/ACT-00002/);
    });
});

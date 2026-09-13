import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import ControlDetail from '../ControlDetail';

const USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const FINDING_ID = '11111111-2222-3333-4444-555555555555';

vi.mock('../../services/api', () => ({
    sccAPI: {
        control: vi.fn(),
        evidence: vi.fn(),
        updateControl: vi.fn(),
        linkEvidence: vi.fn(),
        recordTest: vi.fn(),
    },
    governanceAPI: {
        lookup: vi.fn().mockResolvedValue({ data: { data: { id: 'n1', displayLabel: 'AUTH-01' } } }),
        relationships: vi.fn().mockResolvedValue({
            data: {
                data: {
                    relationships: [{
                        id: 'rel1',
                        relationshipType: 'SATISFIED_BY',
                        provenance: 'SYSTEM',
                        authority: 'AUTHORITATIVE',
                        fromNode: { id: 'req1', nodeType: 'REQUIREMENT', displayLabel: 'SOC 2 CC6.1', recordHref: '/control-center' },
                        toNode: { id: 'n1', nodeType: 'CONTROL', displayLabel: 'AUTH-01' },
                    }],
                },
            },
        }),
    },
}));

describe('Control Detail customer language', () => {
    beforeEach(async () => {
        const { sccAPI } = await import('../../services/api');
        (sccAPI.control as any).mockResolvedValue({
            data: {
                data: {
                    honesty: 'Mapped requirements are identifiers plus Supreme summaries. This is not a certification.',
                    control: {
                        id: 'c1',
                        controlKey: 'AUTH-01',
                        title: 'Multi-factor authentication for privileged access',
                        description: 'Privileged accounts require MFA.',
                        objective: 'Stop shared privileged passwords.',
                        domain: 'AUTHENTICATION',
                        implementationStatus: 'IMPLEMENTED',
                        effectivenessStatus: 'EFFECTIVE',
                    },
                    mappings: [],
                    evidence: [{
                        id: 'e1',
                        rationale: 'MFA policy for privileged access.',
                        relationship: 'SUPPORTS',
                        freshness: 'CURRENT',
                        usable: true,
                        linkedBy: 'Scc A',
                        reviewedByName: null,
                        createdBy: USER_ID,
                        createdAt: '2026-09-13T10:00:00.000Z',
                        storedObject: { id: 's1', filename: 'ok.zip', scanStatus: 'CLEAN' },
                    }],
                    tests: [{
                        id: 't1',
                        method: 'INSPECTION',
                        result: 'FAIL',
                        testedAt: '2026-09-13T11:00:00.000Z',
                        testerName: 'Scc A',
                        findingId: FINDING_ID,
                        finding: { id: FINDING_ID, title: 'Vendor MFA gap', status: 'OPEN', severity: 'HIGH' },
                    }],
                    findings: [{
                        id: FINDING_ID,
                        title: 'Vendor MFA gap',
                        status: 'OPEN',
                        severity: 'HIGH',
                        testId: 't1',
                        testedAt: '2026-09-13T11:00:00.000Z',
                        result: 'FAIL',
                    }],
                    linkableFindings: [{ id: FINDING_ID, title: 'Vendor MFA gap', status: 'OPEN', severity: 'HIGH' }],
                    history: [{
                        id: 'h1',
                        action: 'control.update',
                        label: 'Control updated',
                        actorName: 'Scc A',
                        createdAt: '2026-09-13T10:05:00.000Z',
                    }],
                },
            },
        });
        (sccAPI.evidence as any).mockResolvedValue({ data: { data: [] } });
    });

    function renderPage() {
        return render(
            <MemoryRouter future={routerFuture} initialEntries={['/control-center/c1']}>
                <Routes>
                    <Route path="/control-center/:controlId" element={<ControlDetail />} />
                </Routes>
            </MemoryRouter>
        );
    }

    it('shows names, finding titles, and human history instead of raw identifiers', async () => {
        renderPage();
        expect(await screen.findByRole('heading', { name: /AUTH-01 Multi-factor authentication/ })).toBeInTheDocument();

        fireEvent.click(screen.getAllByRole('button', { name: 'Evidence' })[0]);
        expect(await screen.findByText('Linked by Scc A on 2026-09-13 · not reviewed')).toBeInTheDocument();
        expect(screen.queryByText(USER_ID)).not.toBeInTheDocument();

        fireEvent.click(screen.getAllByRole('button', { name: 'Testing' })[0]);
        expect(screen.getByLabelText('Link an existing finding (optional)')).toBeInTheDocument();
        expect(screen.queryByLabelText(/Existing finding ID/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Vendor MFA gap/)).toBeInTheDocument();
        expect(screen.queryByText(FINDING_ID)).not.toBeInTheDocument();

        fireEvent.click(screen.getAllByRole('button', { name: 'Findings' })[0]);
        expect(screen.getByText('Vendor MFA gap')).toBeInTheDocument();
        expect(screen.queryByText(`Linked finding ${FINDING_ID}`)).not.toBeInTheDocument();

        fireEvent.click(screen.getAllByRole('button', { name: 'History' })[0]);
        expect(screen.getByText('Control updated')).toBeInTheDocument();
        expect(screen.queryByText('control.update')).not.toBeInTheDocument();
    });
});

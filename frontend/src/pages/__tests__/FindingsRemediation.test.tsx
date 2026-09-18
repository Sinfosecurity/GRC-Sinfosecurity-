import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import FindingsRemediation from '../FindingsRemediation';

vi.mock('../../services/api', () => ({
    tprmAPI: {
        listFindings: vi.fn(),
        findingWorkspace: vi.fn(),
        createFinding: vi.fn(),
        updateFindingCap: vi.fn(),
        validateFinding: vi.fn(),
        closeFinding: vi.fn(),
    },
    vendorAPI: {
        getAll: vi.fn(),
    },
}));

const FINDING = {
    id: 'f1',
    title: 'Response needs review: Is a personal-data breach notification process defined?',
    displayTitle: 'Privacy — Personal-data breach notification process not demonstrated',
    sourceKind: 'PRIVACY',
    sourceLabel: 'Vendor Assessment → Privacy → Question PRIV-014',
    description: 'No',
    severity: 'HIGH',
    status: 'OPEN',
    assignedTo: null,
    identifiedDate: '2026-09-18T00:00:00.000Z',
    vendor: { id: 'v1', name: 'Acme Cloud' },
};

const WORKSPACE = {
    header: { id: 'f1', title: FINDING.displayTitle, originalTitle: FINDING.title, severity: 'HIGH', status: 'OPEN', createdAt: FINDING.identifiedDate, updatedAt: FINDING.identifiedDate, ownerName: 'Unassigned' },
    source: { kind: 'PRIVACY', label: FINDING.sourceLabel, vendorName: 'Acme Cloud', assessmentType: 'INITIAL_DUE_DILIGENCE', questionId: 'PRIV-014', section: 'Privacy' },
    observed: { question: 'Is a personal-data breach notification process defined?', answer: 'No', recorded: true },
    reason: 'This response requires review because the recorded answer is not Yes.',
    control: { expected: 'No mapped control is recorded for this finding.', riskDomain: 'Privacy' },
    evidence: { requested: true, received: 0, missing: true, items: [], empty: 'No supporting evidence is currently attached.' },
    risk: { vendorTier: 'HIGH', residualScoreRecorded: 55, residualHonesty: 'Finding severity is not vendor tier.', insuranceContext: null },
    remediation: { plan: null, targetDate: null, ownerName: null, responsibilityLabel: 'Vendor remediation', status: 'OPEN' },
    verification: { notes: null, verifiedBy: null, verifiedAt: null, canMarkComplete: true },
    nextAction: { key: 'plan', label: 'Record remediation plan', detail: 'Capture the corrective action.', primary: 'plan' },
    related: [{ type: 'Vendor', label: 'Acme Cloud', href: '/vendors/v1' }],
    history: [{ at: FINDING.identifiedDate, label: 'Finding created', actor: 'Ada' }],
    honesty: {
        noResponseIsNotNo: 'No response recorded is not the same as No.',
        noEvidenceIsNotFailure: 'No supporting evidence is currently attached is not a control failure.',
    },
};

describe('Findings workspace', () => {
    beforeEach(async () => {
        const { tprmAPI, vendorAPI } = await import('../../services/api');
        (tprmAPI.listFindings as any).mockResolvedValue({ data: { data: [FINDING] } });
        (tprmAPI.findingWorkspace as any).mockResolvedValue({ data: { data: WORKSPACE } });
        (tprmAPI.updateFindingCap as any).mockResolvedValue({ data: { data: {} } });
        (vendorAPI.getAll as any).mockResolvedValue({ data: { data: [{ id: 'v1', name: 'Acme Cloud' }] } });
    });

    it('shows distinguishable list titles and a self-contained drawer', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/findings']}>
                <FindingsRemediation />
            </MemoryRouter>
        );
        expect(await screen.findByText(/Privacy — Personal-data breach notification process/)).toBeInTheDocument();
        expect(screen.queryByText(/^Response needs review:/)).not.toBeInTheDocument();
        fireEvent.click(screen.getByText(/Privacy — Personal-data breach notification process/));
        expect(await screen.findByText(/Vendor Assessment → Privacy/)).toBeInTheDocument();
        expect(screen.getByText('No')).toBeInTheDocument();
        expect(screen.getByText(/recorded answer is not Yes/)).toBeInTheDocument();
        expect(screen.getAllByText(/No supporting evidence is currently attached/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Record remediation plan/).length).toBeGreaterThan(0);
        expect(screen.queryByText(/0%/)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Record remediation plan' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Close finding' })).not.toBeInTheDocument();
    });
});

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import EngagementDecisions from '../EngagementDecisions';

vi.mock('../../services/api', () => ({
    intakeAPI: {
        getDecisions: vi.fn(),
        selectTreatment: vi.fn(),
        decideAcceptance: vi.fn(),
        createContractRequirement: vi.fn(),
        updateContractRequirement: vi.fn(),
        evaluateGate: vi.fn(),
        activateEngagement: vi.fn(),
        generateDecisionBrief: vi.fn(),
    },
}));

const { intakeAPI } = await import('../../services/api');

const DATA = {
    what: 'ENG-2026-0001 · Azure Hosting QA',
    nextAction: 'Resolve blockers',
    thirdParty: { name: 'Microsoft Corporation QA' },
    engagement: { id: 'azure', serviceName: 'Azure Hosting QA', businessPurpose: 'Host a customer-facing application.', businessOwnerName: 'Pat' },
    confirmedInherent: { confirmedTier: 'CRITICAL' },
    residual: { residualBand: 'MEDIUM', residualScore: 58, methodologyVersion: 'supreme-risk-engagement-1.0.0' },
    treatment: { type: 'ACCEPT', status: 'PENDING_APPROVAL', rationale: 'Residual is within appetite with conditions.' },
    acceptance: { status: 'PENDING', residualBandSnapshot: 'MEDIUM', residualScoreSnapshot: 58 },
    approvals: [{ id: 'a1', type: 'RISK_ACCEPTANCE', status: 'PENDING', capability: 'risk.accept' }],
    contractRequirements: [{ id: 'r1', requirement: 'Privileged access review evidence', source: 'CONFIRMED_FINDING', mandatory: true, status: 'OPEN' }],
    gate: {
        status: 'BLOCKED',
        blockers: [
            { code: 'acceptance_pending', label: 'Risk acceptance awaiting approval', href: '/engagements/azure/decisions' },
            { code: 'requirement_r1', label: 'Mandatory Privileged access review evidence requirement not recorded', href: '/engagements/azure/decisions' },
        ],
    },
    decisionBriefs: [{ id: 'b1', versionNumber: 1, riskBand: 'MEDIUM', residualRisk: 58, status: 'DECIDED' }],
    siblings: [
        { id: 'azure', serviceName: 'Azure Hosting QA', status: 'GATE_BLOCKED', current: true },
        { id: 'm365', serviceName: 'Microsoft 365 Collaboration QA', status: 'DUE_DILIGENCE_PLANNING', current: false },
    ],
    openFindings: [{ id: 'f1', title: 'Privileged access review not demonstrated', status: 'OPEN', severity: 'HIGH' }],
};

describe('Engagement decisions workspace', () => {
    it('shows residual, treatment, blockers, and one primary next action', async () => {
        vi.mocked(intakeAPI.getDecisions).mockResolvedValue({ data: { data: DATA } } as any);
        vi.mocked(intakeAPI.evaluateGate).mockResolvedValue({ data: { data: DATA } } as any);
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/engagements/azure/decisions']}>
                <Routes>
                    <Route path="/engagements/:id/decisions" element={<EngagementDecisions />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText('Primary next action')).toBeInTheDocument();
        expect(screen.getByTestId('primary-next-action')).toHaveTextContent('Resolve blockers');
        expect(screen.getByText(/Microsoft Corporation QA/)).toBeInTheDocument();
        expect(screen.getAllByText(/MEDIUM 58/).length).toBeGreaterThan(0);
        expect(screen.getByText(/Risk acceptance does not lower residual risk/)).toBeInTheDocument();
        expect(screen.getByText(/Risk acceptance awaiting approval/)).toBeInTheDocument();
        expect(screen.getByText(/Microsoft 365 Collaboration QA/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Evaluate gate' }));
        expect(intakeAPI.evaluateGate).toHaveBeenCalled();
    });

    it('shows a business-readable error when activation is denied', async () => {
        vi.mocked(intakeAPI.getDecisions).mockResolvedValue({ data: { data: DATA } } as any);
        vi.mocked(intakeAPI.activateEngagement).mockRejectedValue({
            response: { data: { error: { message: 'Activation denied. Risk acceptance awaiting approval; Mandatory Privileged access review evidence requirement not recorded' } } },
        });
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/engagements/azure/decisions']}>
                <Routes>
                    <Route path="/engagements/:id/decisions" element={<EngagementDecisions />} />
                </Routes>
            </MemoryRouter>
        );
        await screen.findByText('Primary next action');
        fireEvent.click(screen.getByRole('button', { name: 'Activate Engagement' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(/Activation denied/);
    });
});

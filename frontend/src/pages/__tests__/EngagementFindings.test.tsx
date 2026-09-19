import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import EngagementFindings from '../EngagementFindings';
import EngagementControls from '../EngagementControls';
import EngagementResidual from '../EngagementResidual';

vi.mock('../../services/api', () => ({
    intakeAPI: {
        getEngagementRisk: vi.fn(),
        createFindingCandidate: vi.fn(),
        confirmFinding: vi.fn(),
        dismissCandidate: vi.fn(),
        recordControlEffectiveness: vi.fn(),
        recordCompensatingControl: vi.fn(),
        calculateResidual: vi.fn(),
        confirmResidual: vi.fn(),
    },
}));

const { intakeAPI } = await import('../../services/api');

const DATA = {
    what: 'ENG-2026-0001 · Azure Hosting QA',
    thirdParty: { name: 'Microsoft Corporation QA' },
    reviewSignals: [{
        assessmentId: 'a1',
        questionId: 'ACC-01',
        title: 'Azure Hosting QA — Privileged access review not demonstrated',
        vendorAnswer: 'No',
        rule: 'required_control_no',
    }],
    candidates: [],
    findings: [{
        id: 'f1',
        title: 'Azure Hosting QA — Privileged access review not demonstrated',
        severity: 'MEDIUM',
        status: 'OPEN',
        controlMapping: 'VRA-001',
        owner: 'Ana',
        responsibility: 'VENDOR',
    }],
    applicableControls: [{ id: 'Access Review', title: 'Access Review', domain: 'Cybersecurity', recorded: { rating: 'PARTIALLY_EFFECTIVE' } }],
    controls: [{ controlTitle: 'Access Review', rating: 'PARTIALLY_EFFECTIVE' }],
    compensating: [{ id: 'cc1', description: 'Break-glass reviews', consideredInResidual: true }],
    confirmedInherent: { confirmedTier: 'CRITICAL', source: 'EngagementIra.confirmedTier' },
    residual: {
        residualBand: 'MEDIUM',
        residualScore: 58,
        methodologyVersion: 'supreme-risk-engagement-1.0.0',
        calculatedAt: '2026-09-19T12:00:00.000Z',
        factors: [{ code: 'confirmed_inherent_tier', label: 'Confirmed inherent CRITICAL', points: 80, rationale: 'Wave 2 confirmed EngagementIra tier' }],
    },
    methodology: { version: 'supreme-risk-engagement-1.0.0' },
    history: [{ id: 'h1', residualBand: 'MEDIUM', triggerReason: 'manual.calculate', createdAt: '2026-09-19T12:00:00.000Z' }],
    readiness: { ready: true, blockers: [] },
};

describe('Engagement contextual Wave 4 workspace', () => {
    it('preserves finding context and does not auto-create a finding from No', async () => {
        vi.mocked(intakeAPI.getEngagementRisk).mockResolvedValue({ data: { data: DATA } } as any);
        vi.mocked(intakeAPI.createFindingCandidate).mockResolvedValue({ data: { data: {} } } as any);
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/engagements/e1/findings']}>
                <Routes>
                    <Route path="/engagements/:id/findings" element={<EngagementFindings />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText(/Microsoft Corporation QA/)).toBeInTheDocument();
        expect(screen.getAllByText(/not a Finding/i).length).toBeGreaterThan(0);
        fireEvent.change(screen.getByLabelText('Why this warrants a candidate'), { target: { value: 'Specialist judged this after evidence review.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create Finding Candidate' }));
        expect(intakeAPI.createFindingCandidate).toHaveBeenCalled();
    });

    it('shows Engagement-specific control effectiveness and residual context', async () => {
        vi.mocked(intakeAPI.getEngagementRisk).mockResolvedValue({ data: { data: DATA } } as any);
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/engagements/e1/controls']}>
                <Routes>
                    <Route path="/engagements/:id/controls" element={<EngagementControls />} />
                    <Route path="/engagements/:id/residual-risk" element={<EngagementResidual />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText(/Engagement-specific/)).toBeInTheDocument();
        expect(screen.getByText(/PARTIALLY_EFFECTIVE/)).toBeInTheDocument();
    });
});

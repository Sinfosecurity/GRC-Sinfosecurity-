import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import EngagementRisk from '../EngagementRisk';

vi.mock('../../services/api', () => ({
    intakeAPI: {
        getEngagementRisk: vi.fn(),
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
    what: 'ENG-2026-0200 · Azure Hosting',
    statusLabel: 'Finding review',
    nextAction: 'Review finding candidates and record control effectiveness.',
    confirmedInherent: { confirmedTier: 'CRITICAL', source: 'EngagementIra.confirmedTier' },
    findings: [],
    candidates: [{
        id: 'c1',
        title: 'Azure Hosting — Privileged access review not demonstrated',
        recommendedSeverity: 'HIGH',
        draftRuleCode: 'required_control_no',
        engagement: { serviceName: 'Azure Hosting' },
    }],
    controls: [{ controlTitle: 'Access Review', rating: 'PARTIALLY_EFFECTIVE' }],
    applicableControls: [{ id: 'Access Review', title: 'Access Review', domain: 'Cybersecurity' }],
    compensating: [],
    residual: {
        residualBand: 'HIGH',
        residualScore: 64,
        explanation: 'Confirmed inherent CRITICAL; control effectiveness 40; 1 confirmed open findings',
        factors: [{ code: 'confirmed_inherent_tier', label: 'Confirmed inherent CRITICAL', points: 80, rationale: 'Wave 2 confirmed EngagementIra tier' }],
        inherent: { tier: 'CRITICAL', source: 'EngagementIra.confirmedTier' },
        methodologyVersion: 'supreme-risk-engagement-1.0.0',
        calculatedAt: '2026-09-19T12:00:00.000Z',
    },
    residualReady: true,
    readiness: { ready: true, blockers: [] },
    history: [{ id: 'h1', residualBand: 'HIGH', triggerReason: 'manual.calculate', createdAt: '2026-09-19T12:00:00.000Z' }],
    methodology: { version: 'supreme-risk-engagement-1.0.0' },
    thirdPartyRollup: {
        highestActiveBand: 'HIGH',
        engagements: [
            { id: 'e1', serviceName: 'Azure Hosting', residualBand: 'HIGH' },
            { id: 'e2', serviceName: 'Professional Services', residualBand: 'LOW' },
        ],
    },
    legacyVendorRisk: { label: 'Legacy Vendor residual (compatibility only)', residualRiskScore: null },
};

describe('Engagement risk workspace', () => {
    it('shows candidates, control effectiveness, residual drill-down, and multi-engagement rollup', async () => {
        vi.mocked(intakeAPI.getEngagementRisk).mockResolvedValue({ data: { data: DATA } } as any);
        vi.mocked(intakeAPI.confirmFinding).mockResolvedValue({ data: { data: DATA } } as any);
        vi.mocked(intakeAPI.calculateResidual).mockResolvedValue({ data: { data: DATA.residual } } as any);
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/third-parties/engagements/e1/risk']}>
                <Routes>
                    <Route path="/third-parties/engagements/:id/risk" element={<EngagementRisk />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText(/Engagement risk · ENG-2026-0200 · Azure Hosting/)).toBeInTheDocument();
        expect(screen.getByText(/Azure Hosting — Privileged access review not demonstrated/)).toBeInTheDocument();
        expect(screen.getByText(/Access Review · Cybersecurity/)).toBeInTheDocument();
        expect(screen.getByText(/Result:/)).toBeInTheDocument();
        expect(screen.getAllByText(/Confirmed inherent CRITICAL/).length).toBeGreaterThan(0);
        expect(screen.getByText(/Professional Services — LOW/)).toBeInTheDocument();
        expect(screen.getByText(/Wave 5 treatment, acceptance, and contracting have not started/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Confirm finding' }));
        expect(intakeAPI.confirmFinding).toHaveBeenCalled();
    });
});

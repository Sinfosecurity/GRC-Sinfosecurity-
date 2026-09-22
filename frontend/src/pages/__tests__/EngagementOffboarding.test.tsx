import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import EngagementOffboarding from '../EngagementOffboarding';

vi.mock('../../services/api', () => ({
    intakeAPI: {
        getOffboarding: vi.fn(),
        createOffboarding: vi.fn(),
        startOffboarding: vi.fn(),
        addOffboardingObligation: vi.fn(),
        evaluateOffboardingGate: vi.fn(),
        completeOffboarding: vi.fn(),
    },
}));

const { intakeAPI } = await import('../../services/api');

const EMPTY = {
    nextAction: 'Start offboarding',
    honesty: 'Offboarding belongs to this Engagement. Closing it does not close sibling Engagements. Access revocation and data deletion are tracked, not automatically performed.',
    historicalResidual: { residualBand: 'MEDIUM', residualScore: 58 },
    thirdPartyAggregate: { honesty: 'Third Party remains in use because Microsoft 365 Collaboration QA is still active.' },
    engagement: { id: 'azure', status: 'ACTIVE', serviceName: 'Azure Hosting QA' },
    active: null,
    obligations: [],
    exceptions: [],
    dispositions: [],
    gate: { ready: false, blockers: [] },
    openReassessment: null,
    monitoring: { status: 'ACTIVE' },
    findings: [],
    reassessmentHistory: [{ cycleNumber: 2 }],
    legacyVendorOffboarding: 'Vendor-level offboarding remains readable and is not authoritative for this Engagement.',
};

describe('Engagement offboarding workspace', () => {
    it('shows one primary next action, historical residual, and no fake automation', async () => {
        vi.mocked(intakeAPI.getOffboarding).mockResolvedValue({ data: { data: EMPTY } } as any);
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/engagements/azure/offboarding']}>
                <Routes>
                    <Route path="/engagements/:id/offboarding" element={<EngagementOffboarding />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText('Primary next action')).toBeInTheDocument();
        expect(screen.getByTestId('primary-next-action')).toHaveTextContent('Start offboarding');
        expect(screen.getByText(/MEDIUM 58/)).toBeInTheDocument();
        expect(screen.getByText(/Microsoft 365 Collaboration QA is still active/)).toBeInTheDocument();
        expect(screen.getByText(/Access revocation and data deletion are tracked, not automatically performed/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Start offboarding' }));
        expect(intakeAPI.createOffboarding).toHaveBeenCalled();
    });

    it('lists exact closure blockers instead of a generic cannot-close message', async () => {
        vi.mocked(intakeAPI.getOffboarding).mockResolvedValue({
            data: {
                data: {
                    ...EMPTY,
                    nextAction: 'Resolve blocker',
                    active: { id: 'case-1', publicId: 'OFF-2026-0001', status: 'IN_PROGRESS', reason: 'Service no longer needed.', startedAt: '2026-09-21T00:00:00.000Z' },
                    obligations: [
                        { id: 'ob-1', title: 'Data deletion confirmation', category: 'DATA_DELETION', status: 'PENDING', dueAt: null },
                    ],
                    gate: { ready: false, blockers: ['Cannot close Engagement because data deletion confirmation is still outstanding.'] },
                },
            },
        } as any);
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/engagements/azure/offboarding']}>
                <Routes>
                    <Route path="/engagements/:id/offboarding" element={<EngagementOffboarding />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText('Closure gate')).toBeInTheDocument();
        expect(screen.getByText('Cannot close Engagement because data deletion confirmation is still outstanding.')).toBeInTheDocument();
        expect(screen.queryByText('Cannot close.')).not.toBeInTheDocument();
        expect(screen.getAllByText(/Manual verification required/).length).toBeGreaterThan(0);
    });
});

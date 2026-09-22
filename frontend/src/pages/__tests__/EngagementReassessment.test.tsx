import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import EngagementReassessment from '../EngagementReassessment';

vi.mock('../../services/api', () => ({
    intakeAPI: {
        getReassessment: vi.fn(),
        startReassessment: vi.fn(),
        reviewReassessmentItem: vi.fn(),
    },
}));

const { intakeAPI } = await import('../../services/api');

const DATA = {
    nextAction: 'Start reassessment',
    honesty: 'Reassessment is a new versioned cycle. Historical residual remains inspectable.',
    historicalResidual: { residualBand: 'MEDIUM', residualScore: 58 },
    comparison: { previous: { residualBand: 'MEDIUM', residualScore: 58 }, current: null },
    active: null,
    items: [],
    wave8Started: false,
};

describe('Engagement reassessment workspace', () => {
    it('shows historical residual and does not start Wave 8', async () => {
        vi.mocked(intakeAPI.getReassessment).mockResolvedValue({ data: { data: DATA } } as any);
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/engagements/azure/reassessment']}>
                <Routes>
                    <Route path="/engagements/:id/reassessment" element={<EngagementReassessment />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText('Primary next action')).toBeInTheDocument();
        expect(screen.getByTestId('primary-next-action')).toHaveTextContent('Start reassessment');
        expect(screen.getByText(/MEDIUM 58/)).toBeInTheDocument();
        expect(screen.getByText(/Wave 8 started: No/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Start reassessment' }));
        expect(intakeAPI.startReassessment).toHaveBeenCalled();
    });

    it('distinguishes REUSE, REFRESH, NEW, and NOT REQUIRED', async () => {
        vi.mocked(intakeAPI.getReassessment).mockResolvedValue({
            data: {
                data: {
                    ...DATA,
                    nextAction: 'Confirm reassessment scope',
                    active: { id: 'cycle-2', status: 'SCOPED', kind: 'TARGETED' },
                    items: [
                        { id: '1', kind: 'IRA_QUESTION', title: 'Data types', previousValue: 'none', disposition: 'REFRESH', rationale: 'May have changed.' },
                        { id: '2', kind: 'EVIDENCE', title: 'SOC 2', previousValue: 'CLEAN', disposition: 'REUSE', rationale: 'Still valid.' },
                        { id: '3', kind: 'FINDING', title: 'Closed item', previousValue: 'CLOSED', disposition: 'NOT_REQUIRED', rationale: 'Not in this delta.' },
                        { id: '4', kind: 'DUE_DILIGENCE_QUESTION', title: 'New pack', previousValue: '', disposition: 'NEW', rationale: 'Required by scope change.' },
                    ],
                    comparison: { previous: { residualBand: 'MEDIUM', residualScore: 58 }, current: null },
                },
            },
        } as any);
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/engagements/azure/reassessment']}>
                <Routes>
                    <Route path="/engagements/:id/reassessment" element={<EngagementReassessment />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText('Delta items')).toBeInTheDocument();
        expect(screen.getByText(/classified REUSE, REFRESH, NEW, or NOT REQUIRED/)).toBeInTheDocument();
        expect(screen.getByText('Data types')).toBeInTheDocument();
        expect(screen.getByText('SOC 2')).toBeInTheDocument();
        expect(screen.getAllByLabelText('Disposition')).toHaveLength(4);
        expect(screen.getByText(/Cycle 1: MEDIUM 58/)).toBeInTheDocument();
    });
});

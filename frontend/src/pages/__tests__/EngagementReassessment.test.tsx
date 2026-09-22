import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import EngagementReassessment from '../EngagementReassessment';

vi.mock('../../services/api', () => ({
    intakeAPI: {
        getReassessment: vi.fn(),
        startReassessment: vi.fn(),
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
});

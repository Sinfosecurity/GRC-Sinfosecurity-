import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import EngagementMonitoring from '../EngagementMonitoring';

vi.mock('../../services/api', () => ({
    intakeAPI: {
        getMonitoring: vi.fn(),
        saveMonitoringProfile: vi.fn(),
        createManualSignal: vi.fn(),
    },
}));

const { intakeAPI } = await import('../../services/api');

const DATA = {
    nextAction: 'Configure monitoring profile',
    honesty: 'Supreme is not advertising 24/7 monitoring or live breach detection. Only configured sources are active.',
    engagement: { id: 'azure', thirdParty: { id: 'v1', name: 'Microsoft Corporation QA' } },
    profile: null,
    recommendedDomains: ['CYBERSECURITY'],
    sourceHealth: [{ label: 'BitSight', status: 'NOT_CONFIGURED', honesty: 'Coming later. No live rating feed is connected.' }],
    signals: [],
    residual: { residualBand: 'MEDIUM', residualScore: 58 },
};

describe('Engagement monitoring workspace', () => {
    it('shows profile configuration, source honesty, and one primary next action', async () => {
        vi.mocked(intakeAPI.getMonitoring).mockResolvedValue({ data: { data: DATA } } as any);
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/engagements/azure/monitoring']}>
                <Routes>
                    <Route path="/engagements/:id/monitoring" element={<EngagementMonitoring />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText('Primary next action')).toBeInTheDocument();
        expect(screen.getByTestId('primary-next-action')).toHaveTextContent('Configure monitoring profile');
        expect(screen.getByText(/BitSight/)).toBeInTheDocument();
        expect(screen.getByText(/Coming later/)).toBeInTheDocument();
        expect(screen.getByLabelText('What are we monitoring?')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Activate profile' }));
        expect(intakeAPI.saveMonitoringProfile).toHaveBeenCalled();
    });
});

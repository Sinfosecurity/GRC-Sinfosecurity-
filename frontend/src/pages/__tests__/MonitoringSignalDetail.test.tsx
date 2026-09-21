import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import MonitoringSignalDetail from '../MonitoringSignalDetail';

vi.mock('../../services/api', () => ({
    intakeAPI: {
        getMonitoringSignal: vi.fn(),
        triageMonitoringSignal: vi.fn(),
        recommendReassessment: vi.fn(),
        createFindingFromSignal: vi.fn(),
        assignMonitoringSignal: vi.fn(),
        setMonitoringImpact: vi.fn(),
        escalateMonitoringSignal: vi.fn(),
        closeMonitoringSignal: vi.fn(),
    },
}));

const { intakeAPI } = await import('../../services/api');

const DATA = {
    id: 's1',
    publicId: 'SIG-2026-0001',
    title: 'Azure privileged-access review overdue',
    what: 'Azure privileged-access review overdue',
    why: 'Source severity HIGH maps to Supreme attention HIGH. This is not residual risk.',
    source: 'Manual observation · MANUAL_OBSERVATION',
    state: 'NEEDS_REVIEW',
    owner: 'Unassigned',
    impact: 'Azure Hosting QA: AFFECTED',
    evidence: 'Not recorded',
    nextAction: 'Assign reviewer',
    attentionPriority: 'HIGH',
    sourceSeverity: 'HIGH',
    impacts: [{ id: 'i1', engagementId: 'azure', decision: 'AFFECTED', engagement: { serviceName: 'Azure Hosting QA' } }],
    relationships: { thirdParty: { name: 'Microsoft Corporation QA' }, engagements: [{ serviceName: 'Azure Hosting QA' }] },
    reviews: [],
};

describe('Monitoring signal detail', () => {
    it('shows enterprise record and does not start reassessment', async () => {
        vi.mocked(intakeAPI.getMonitoringSignal).mockResolvedValue({ data: { data: DATA } } as any);
        vi.mocked(intakeAPI.recommendReassessment).mockResolvedValue({ data: { data: { ...DATA, wave7Started: false } } } as any);
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/monitoring/signals/s1']}>
                <Routes>
                    <Route path="/monitoring/signals/:signalId" element={<MonitoringSignalDetail />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText('Enterprise record')).toBeInTheDocument();
        expect(screen.getAllByText(/This is not residual risk/).length).toBeGreaterThan(0);
        expect(screen.getByText(/Wave 7 has not started/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Recommend reassessment' }));
        expect(intakeAPI.recommendReassessment).toHaveBeenCalled();
        expect(screen.queryByText(/Reassessment started/)).not.toBeInTheDocument();
    });
});

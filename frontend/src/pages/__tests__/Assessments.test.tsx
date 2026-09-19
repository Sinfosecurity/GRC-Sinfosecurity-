import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import Assessments from '../Assessments';

vi.mock('../../services/api', () => ({
    tprmAPI: {
        questionnaires: vi.fn().mockResolvedValue({ data: { data: [] } }),
        listAssessments: vi.fn().mockResolvedValue({ data: { data: [] } }),
        assessmentWorkspace: vi.fn().mockResolvedValue({ data: { data: null } }),
    },
    intakeAPI: {
        listEngagementAssessments: vi.fn().mockResolvedValue({ data: { data: { items: [] } } }),
    },
}));

describe('Assessments', () => {
    it('starts a new assessment by requesting a third party', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/assessments']}>
                <Routes>
                    <Route path="/assessments" element={<Assessments />} />
                    <Route path="/vendor-onboarding" element={<div>Open a third-party record</div>} />
                </Routes>
            </MemoryRouter>
        );
        const start = await screen.findAllByRole('button', { name: 'Request a third party' });
        start[0].click();
        expect(await screen.findByText('Open a third-party record')).toBeInTheDocument();
        expect(screen.queryByText('New assessment')).not.toBeInTheDocument();
        expect(screen.queryByText('Resolve scope to continue')).not.toBeInTheDocument();
    });

    it('distinguishes two Microsoft engagements on the assessment center', async () => {
        const { tprmAPI, intakeAPI } = await import('../../services/api');
        vi.mocked(tprmAPI.listAssessments).mockResolvedValue({
            data: {
                data: [
                    { id: 'a1', vendorId: 'v1', status: 'IN_PROGRESS', assessmentType: 'INITIAL_DUE_DILIGENCE', vendor: { id: 'v1', name: 'Microsoft Corporation' } },
                    { id: 'a2', vendorId: 'v1', status: 'NOT_STARTED', assessmentType: 'INITIAL_DUE_DILIGENCE', vendor: { id: 'v1', name: 'Microsoft Corporation' } },
                ],
            },
        } as any);
        vi.mocked(intakeAPI.listEngagementAssessments).mockResolvedValue({
            data: {
                data: {
                    items: [
                        { id: 'a1', serviceName: 'Azure Hosting', engagementPublicId: 'ENG-2026-0100', tier: 'CRITICAL' },
                        { id: 'a2', serviceName: 'Professional Services', engagementPublicId: 'ENG-2026-0101', tier: 'MEDIUM' },
                    ],
                },
            },
        } as any);
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/assessments']}>
                <Routes>
                    <Route path="/assessments" element={<Assessments />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText(/Microsoft Corporation · Azure Hosting/)).toBeInTheDocument();
        expect(screen.getByText(/Microsoft Corporation · Professional Services/)).toBeInTheDocument();
        expect(screen.getByText(/ENG-2026-0100 · CRITICAL/)).toBeInTheDocument();
        expect(screen.getByText(/ENG-2026-0101 · MEDIUM/)).toBeInTheDocument();
    });
});

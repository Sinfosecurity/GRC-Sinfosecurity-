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
});

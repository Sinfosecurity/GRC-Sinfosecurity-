import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import Questionnaires from '../Questionnaires';
import { SUPREME_DEFAULT_WEIGHTS } from '../../lib/scoringWeights';

vi.mock('../../services/api', () => ({
    tprmAPI: {
        questionnaires: vi.fn(),
        scoringMethodology: vi.fn(),
        cloneQuestionnaire: vi.fn(),
        publishScoringMethodology: vi.fn(),
        saveScoringMethodologyDraft: vi.fn(),
        previewScoringMethodology: vi.fn(),
    },
}));

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ user: { role: 'ORGANIZATION_ADMIN', permissions: ['questionnaire.manage'] } }),
}));

describe('Assessment library scoring editor', () => {
    beforeEach(async () => {
        const { tprmAPI } = await import('../../services/api');
        (tprmAPI.questionnaires as any).mockResolvedValue({
            data: { data: [{ id: 't1', name: 'Inherent risk', version: '1', framework: 'Supreme', sections: [] }] },
        });
        (tprmAPI.scoringMethodology as any).mockResolvedValue({
            data: {
                data: {
                    engineVersion: 'supreme-risk-1.1.0',
                    active: { version: '1.0.0', name: 'Supreme Risk default', isActive: true, weights: SUPREME_DEFAULT_WEIGHTS },
                    history: [],
                },
            },
        });
    });

    it('replaces the raw JSON weights editor with the methodology workspace', async () => {
        render(
            <MemoryRouter future={routerFuture}>
                <Questionnaires />
            </MemoryRouter>
        );
        expect(await screen.findByRole('heading', { name: 'Risk Scoring Methodology' })).toBeInTheDocument();
        expect(screen.getByText(/does not change the scoring engine/i)).toBeInTheDocument();
        expect(screen.queryByText('Advanced scoring weights')).not.toBeInTheDocument();
        expect(screen.queryByRole('textbox', { name: /weights/i })).not.toBeInTheDocument();
    });
});

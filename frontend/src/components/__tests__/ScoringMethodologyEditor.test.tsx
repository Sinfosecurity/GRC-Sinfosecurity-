import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScoringMethodologyEditor from '../ScoringMethodologyEditor';
import { SUPREME_DEFAULT_WEIGHTS } from '../../lib/scoringWeights';

vi.mock('../../services/api', () => ({
    tprmAPI: {
        publishScoringMethodology: vi.fn(),
        saveScoringMethodologyDraft: vi.fn(),
        previewScoringMethodology: vi.fn(),
    },
}));

const methodology = {
    engineVersion: 'supreme-risk-1.1.0',
    active: {
        id: 'm1',
        version: '1.0.0',
        name: 'Supreme Risk default',
        isActive: true,
        weights: SUPREME_DEFAULT_WEIGHTS,
        createdAt: '2026-09-13T12:00:00.000Z',
        notes: 'Built-in formula weights.',
    },
    history: [{
        id: 'm1',
        version: '1.0.0',
        name: 'Supreme Risk default',
        isActive: true,
        weights: SUPREME_DEFAULT_WEIGHTS,
        createdAt: '2026-09-13T12:00:00.000Z',
    }],
};

describe('Risk scoring methodology editor', () => {
    beforeEach(async () => {
        const { tprmAPI } = await import('../../services/api');
        (tprmAPI.publishScoringMethodology as any).mockResolvedValue({ data: { data: { version: '1.0.1' } } });
        (tprmAPI.saveScoringMethodologyDraft as any).mockResolvedValue({ data: { data: { recorded: true } } });
        (tprmAPI.previewScoringMethodology as any).mockResolvedValue({
            data: { data: { vendorCount: 2, unchanged: 2, changes: [], residualScoresUnchanged: true } },
        });
    });

    it('shows governed fields instead of a raw JSON editor', () => {
        render(<ScoringMethodologyEditor methodology={methodology} onPublished={vi.fn()} />);
        expect(screen.getByRole('heading', { name: 'Risk Scoring Methodology' })).toBeInTheDocument();
        expect(screen.getByText('Risk rating thresholds')).toBeInTheDocument();
        expect(screen.getByText('Critical')).toBeInTheDocument();
        expect(screen.getByLabelText('Data sensitivity weighting')).toBeInTheDocument();
        expect(screen.getByLabelText('High finding weighting')).toBeInTheDocument();
        expect(screen.getByLabelText('Rationale / change reason')).toBeInTheDocument();
        expect(screen.queryByText('Advanced scoring weights')).not.toBeInTheDocument();
        expect(screen.queryByText(/"tierBase"/)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Publish new version' })).toBeDisabled();
    });

    it('creates a draft when a finding weight changes and can discard it', async () => {
        render(<ScoringMethodologyEditor methodology={methodology} onPublished={vi.fn()} />);
        const highFinding = screen.getByLabelText('High finding weighting');
        await userEvent.clear(highFinding);
        await userEvent.type(highFinding, '20');
        expect(screen.getByText('Unpublished draft')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
        expect(await screen.findByText('Matches published version')).toBeInTheDocument();
        expect(highFinding).toHaveValue(8);
    });

    it('publishes only after name, rationale, and confirmation', async () => {
        const { tprmAPI } = await import('../../services/api');
        const onPublished = vi.fn();
        render(<ScoringMethodologyEditor methodology={methodology} onPublished={onPublished} />);
        const highFinding = screen.getByLabelText('High finding weighting');
        await userEvent.clear(highFinding);
        await userEvent.type(highFinding, '20');
        await userEvent.type(screen.getByLabelText('Rationale / change reason'), 'Increase high finding weight for privileged vendors.');
        await userEvent.click(screen.getByRole('button', { name: 'Publish new version' }));
        expect(await screen.findByText('Publish new risk methodology?')).toBeInTheDocument();
        expect(screen.getByText(/Historical residual scores are not silently rewritten/i)).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
        expect(tprmAPI.publishScoringMethodology).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Supreme Risk default',
            notes: 'Increase high finding weight for privileged vendors.',
            weights: expect.objectContaining({
                findingPoints: expect.objectContaining({ HIGH: 20, CRITICAL: 12 }),
                tierBase: SUPREME_DEFAULT_WEIGHTS.tierBase,
            }),
        }));
        expect(onPublished).toHaveBeenCalled();
    });

    it('keeps viewers from publishing', () => {
        render(<ScoringMethodologyEditor methodology={methodology} onPublished={vi.fn()} canManage={false} />);
        expect(screen.getByText('Read only')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Publish new version' })).toBeDisabled();
        expect(screen.getByLabelText('High finding weighting')).toBeDisabled();
    });
});

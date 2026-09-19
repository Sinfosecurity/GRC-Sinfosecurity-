import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import TierReview from '../TierReview';

vi.mock('../../services/api', () => ({
    intakeAPI: {
        getTierReview: vi.fn(),
        confirmTier: vi.fn(),
        overrideTier: vi.fn(),
        requestIraClarification: vi.fn(),
    },
}));

const { intakeAPI } = await import('../../services/api');

describe('Tier Review', () => {
    it('shows answers, recommendation, and the three review paths', async () => {
        vi.mocked(intakeAPI.getTierReview).mockResolvedValue({
            data: {
                data: {
                    what: 'ENG-2026-0001 · Azure Hosting',
                    state: 'TIER_REVIEW',
                    stateLabel: 'Tier review required',
                    nextAction: 'Confirm the tier, override it with a rationale, or request clarification.',
                    thirdParty: { name: 'Microsoft Corporation' },
                    engagement: { publicId: 'ENG-2026-0001', serviceName: 'Azure Hosting', businessPurpose: 'Host a customer-facing application.' },
                    requester: { name: 'Pat Requester', email: 'pat@example.test' },
                    submittedAt: '2026-09-19T12:00:00.000Z',
                    scoringVersion: '3',
                    recommendedTier: 'MEDIUM',
                    explanation: 'Inherent risk 24% maps to MEDIUM after floors.',
                    unknownKeys: [],
                    questions: [{ key: 'a2', question: 'What information will the vendor see?', answerLabel: 'Personal data', dontKnow: false }],
                    floors: [{ code: 'personal-medium', label: 'Any personal data', tier: 'MEDIUM', applies: true, rationale: 'GDPR Art. 28' }],
                    packs: { packs: [{ key: 'privacy', state: 'INCLUDED', reason: 'Personal data' }] },
                    history: { clarifications: [] },
                    wave3Started: false,
                },
            },
        } as any);
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/third-parties/engagements/e1/tier-review']}>
                <Routes>
                    <Route path="/third-parties/engagements/:id/tier-review" element={<TierReview />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText(/Microsoft Corporation/)).toBeInTheDocument();
        expect(screen.getByText(/Recommended: MEDIUM/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Confirm recommended tier' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Override and record rationale' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Request clarification' })).toBeInTheDocument();
        expect(screen.getByText(/due-diligence scoping is not started/)).toBeInTheDocument();
    });
});

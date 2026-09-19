import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import AssessmentReview from '../AssessmentReview';

vi.mock('../../services/api', () => ({
    intakeAPI: {
        getAssessmentReview: vi.fn(),
        requestVendorClarification: vi.fn(),
        completeSpecialistReview: vi.fn(),
    },
}));

const { intakeAPI } = await import('../../services/api');

describe('Specialist assessment review', () => {
    it('shows engagement context, vendor answer, evidence scan state, and completes review without findings', async () => {
        vi.mocked(intakeAPI.getAssessmentReview).mockResolvedValue({
            data: {
                data: {
                    what: 'ENG-2026-0100 · Azure Hosting',
                    why: 'Confirmed inherent tier CRITICAL required this assessment.',
                    confirmedTier: 'CRITICAL',
                    state: 'SPECIALIST_REVIEW',
                    stateLabel: 'Specialist review',
                    nextAction: 'Review vendor answers and evidence, request clarification, or mark review complete.',
                    engagement: { publicId: 'ENG-2026-0100', serviceName: 'Azure Hosting' },
                    thirdParty: { name: 'Microsoft Corporation' },
                    authoritativeFindings: 0,
                    residualRiskCalculated: false,
                    items: [{
                        assessmentId: 'a1',
                        assessmentName: 'Baseline Questionnaire',
                        questionKey: 'B-01',
                        question: 'Is there a documented information security policy?',
                        vendorAnswer: 'Yes',
                        evidence: { filename: 'policy.pdf', scanLabel: 'Ready' },
                    }],
                },
            },
        } as any);
        vi.mocked(intakeAPI.requestVendorClarification).mockResolvedValue({ data: { data: { items: [] } } } as any);
        vi.mocked(intakeAPI.completeSpecialistReview).mockResolvedValue({
            data: { data: { authoritativeFindings: 0, residualRiskCalculated: false, nextAction: 'Specialist review complete. Wave 4 findings are not started.' } },
        } as any);
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/third-parties/engagements/e1/assessment-review']}>
                <Routes>
                    <Route path="/third-parties/engagements/:id/assessment-review" element={<AssessmentReview />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText(/Specialist review · ENG-2026-0100 · Azure Hosting/)).toBeInTheDocument();
        expect(screen.getByText(/Vendor answer: Yes/)).toBeInTheDocument();
        expect(screen.getByText(/policy.pdf · Ready/)).toBeInTheDocument();
        expect(screen.getByText(/Authoritative findings/)).toBeInTheDocument();
        expect(screen.getByText(/Residual risk calculated/)).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Question key'), { target: { value: 'B-01' } });
        fireEvent.click(screen.getByRole('button', { name: 'Request clarification' }));
        expect(await screen.findByText(/Vendor clarification requested/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Mark review complete' }));
        expect(await screen.findByText(/Candidates are not findings until confirmed/)).toBeInTheDocument();
    });
});

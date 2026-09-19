import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import VendorAssessmentQuestionnaire from '../VendorAssessmentQuestionnaire';

vi.mock('../../services/api', () => ({
    vendorPortalAPI: {
        assessment: vi.fn(),
        saveResponse: vi.fn(),
        uploadEvidence: vi.fn(),
        submit: vi.fn(),
    },
}));

describe('Vendor questionnaire evidence status', () => {
    beforeEach(async () => {
        localStorage.setItem('vendorToken', 'test');
        const { vendorPortalAPI } = await import('../../services/api');
        (vendorPortalAPI.assessment as any).mockResolvedValue({
            data: {
                data: {
                    name: 'Information Security',
                    dueDate: '2026-09-30',
                    lastSaved: '2026-09-14T00:00:00.000Z',
                    submitted: false,
                    attestation: 'I attest that these answers are accurate.',
                    questions: [{
                        key: 'q1',
                        visible: true,
                        section: 'Evidence',
                        question: 'Attach the current policy.',
                        guidance: null,
                        options: [],
                        response: 'See attached',
                        evidenceRequired: true,
                        evidenceStatus: 'unknown',
                        locked: false,
                    }],
                },
            },
        });
    });

    it('does not show Ready when scan status is unknown', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/vendor-assessment/a1']}>
                <Routes>
                    <Route path="/vendor-assessment/:assessmentId" element={<VendorAssessmentQuestionnaire />} />
                </Routes>
            </MemoryRouter>,
        );
        expect(await screen.findByText(/Rejected\/unusable/)).toBeInTheDocument();
        expect(screen.queryByText(/File status: Ready/)).not.toBeInTheDocument();
        expect(screen.queryByText(/CLEAN/)).not.toBeInTheDocument();
        expect(screen.getByRole('progressbar', { name: /1 of 1 answered/i })).toBeInTheDocument();
        expect(screen.getByText(/Review before you submit/)).toBeInTheDocument();
    });
});

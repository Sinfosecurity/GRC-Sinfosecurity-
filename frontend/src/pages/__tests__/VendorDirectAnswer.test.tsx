import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('Vendor direct-answer questionnaire', () => {
    beforeEach(async () => {
        localStorage.setItem('vendorToken', 'test');
        const { vendorPortalAPI } = await import('../../services/api');
        const detail = {
            name: 'Due-Diligence Assessment',
            dueDate: '2026-09-30',
            lastSaved: '2026-09-14T00:00:00.000Z',
            submitted: false,
            attestation: 'I attest that these answers are accurate.',
            questions: [
                {
                    key: 'q1',
                    visible: true,
                    required: true,
                    section: 'Access',
                    question: 'Is MFA required?',
                    options: ['Yes', 'No', 'Partial', 'N/A'],
                    response: '',
                    evidenceRequired: false,
                    evidenceOptional: true,
                    expectedEvidence: 'MFA standard',
                    locked: false,
                },
                {
                    key: 'q2',
                    visible: true,
                    required: true,
                    section: 'Access',
                    question: 'Is there a policy?',
                    options: ['Yes', 'No'],
                    response: '',
                    evidenceRequired: true,
                    locked: false,
                },
            ],
        };
        (vendorPortalAPI.assessment as any).mockResolvedValue({ data: { data: detail } });
        (vendorPortalAPI.saveResponse as any).mockImplementation(async (_id: string, body: { questionKey: string; response: string }) => {
            const next = {
                ...detail,
                questions: detail.questions.map((row) => row.key === body.questionKey ? { ...row, response: body.response } : row),
            };
            return { data: { data: next } };
        });
        (vendorPortalAPI.submit as any).mockRejectedValue(new Error('This assessment cannot be submitted yet because 1 required evidence item is missing.'));
    });

    it('saves a finite answer as a button and blocks submit until required evidence is present', async () => {
        const { vendorPortalAPI } = await import('../../services/api');
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/vendor-assessment/a1']}>
                <Routes>
                    <Route path="/vendor-assessment/:assessmentId" element={<VendorAssessmentQuestionnaire />} />
                </Routes>
            </MemoryRouter>,
        );
        fireEvent.click(await screen.findByRole('button', { name: 'Yes' }));
        await waitFor(() => expect(vendorPortalAPI.saveResponse).toHaveBeenCalled());
        expect(await screen.findByText('Saved')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Submit assessment' })).toBeDisabled();
        expect(screen.getByText(/Assessment not ready to submit/)).toBeInTheDocument();
    });
});

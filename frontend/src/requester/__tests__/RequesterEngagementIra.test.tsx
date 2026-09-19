import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import RequesterEngagementIra from '../RequesterEngagementIra';
import RequesterIraClarification from '../RequesterIraClarification';

vi.mock('../../services/api', () => ({
    requesterAPI: {
        getIra: vi.fn(),
        submitIra: vi.fn(),
        submitIraClarification: vi.fn(),
    },
}));

const { requesterAPI } = await import('../../services/api');

describe('Requester engagement IRA', () => {
    it('submits the authenticated risk assessment from requester workspace', async () => {
        vi.mocked(requesterAPI.getIra).mockResolvedValue({
            data: {
                data: {
                    id: 'ira-1',
                    status: 'IN_PROGRESS',
                    thirdPartyName: 'Microsoft Corporation',
                    serviceName: 'Azure Hosting',
                    engagementPublicId: 'ENG-2026-0001',
                    businessPurpose: 'Host a customer-facing application.',
                    why: 'Supreme needs the business context',
                    expectedKnowledge: 'Answer from how the business will use this service.',
                    form: {
                        parts: [
                            { id: 'A', title: 'What will this vendor do?', questions: [{ key: 'a7', part: 'A', question: 'Will the vendor use other companies?', options: [{ value: 'no', label: 'No' }] }] },
                            { id: 'B', title: 'How bad if it fails?', questions: [{ key: 'b3', part: 'B', question: 'Is this tied to a law?', options: [{ value: 'no', label: 'No' }] }] },
                        ],
                    },
                    answers: { a7: 'no', b3: 'no' },
                },
            },
        } as any);
        vi.mocked(requesterAPI.submitIra).mockResolvedValue({
            data: { data: { status: 'TIER_REVIEW', requesterStatus: 'Risk assessment under review' } },
        } as any);
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/request/ira/ira-1']}>
                <Routes>
                    <Route path="/request/ira/:id" element={<RequesterEngagementIra />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText('Microsoft Corporation')).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('I confirm these answers are accurate for this service.'));
        fireEvent.click(screen.getByRole('button', { name: 'Submit risk assessment' }));
        await waitFor(() => expect(requesterAPI.submitIra).toHaveBeenCalled());
    });

    it('shows previous answer and TPRM clarification only', async () => {
        vi.mocked(requesterAPI.getIra).mockResolvedValue({
            data: {
                data: {
                    id: 'ira-1',
                    status: 'NEEDS_CLARIFICATION',
                    thirdPartyName: 'Microsoft Corporation',
                    serviceName: 'Azure Hosting',
                    requesterStatus: 'Additional information required',
                    clarification: {
                        items: [{
                            id: 'c1',
                            questionKey: 'a2',
                            question: 'What information will the vendor see?',
                            previousAnswer: "Don't know",
                            previousAnswerValue: 'dont_know',
                            analystNote: 'Need the data types.',
                        }],
                    },
                },
            },
        } as any);
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/request/ira/ira-1/clarification']}>
                <Routes>
                    <Route path="/request/ira/:id/clarification" element={<RequesterIraClarification />} />
                </Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText(/Your previous answer/)).toBeInTheDocument();
        expect(screen.getByText(/Need the data types/)).toBeInTheDocument();
        expect(screen.queryByText('Recommended')).not.toBeInTheDocument();
    });
});

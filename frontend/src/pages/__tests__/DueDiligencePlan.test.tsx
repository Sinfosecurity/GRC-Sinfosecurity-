import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import DueDiligencePlan from '../DueDiligencePlan';

vi.mock('../../services/api', () => ({
    intakeAPI: {
        getDueDiligence: vi.fn(),
        modifyDueDiligence: vi.fn(),
        confirmDueDiligence: vi.fn(),
        setAssessmentContact: vi.fn(),
        sendQuestionnaire: vi.fn(),
        copyActivationLink: vi.fn(),
        markInvitationShared: vi.fn(),
    },
}));

const { intakeAPI } = await import('../../services/api');

const plan = {
    what: 'ENG-2026-0100 · Azure Hosting',
    why: 'Confirmed inherent tier CRITICAL requires engagement-scoped due diligence.',
    source: 'Confirmed Wave 2 IRA / Version 3 packs. The inherent tier was not recalculated.',
    state: 'DUE_DILIGENCE_PLANNING',
    stateLabel: 'Due-diligence planning',
    nextAction: 'Review due-diligence scope',
    confirmedTier: 'CRITICAL',
    thirdParty: { name: 'Microsoft Corporation' },
    engagement: { publicId: 'ENG-2026-0100', serviceName: 'Azure Hosting' },
    packs: [
        { key: 'baseline', name: 'Baseline', status: 'INCLUDED_REQUIRED', why: 'Required for every third party', reviewerDomain: 'Cybersecurity', evidenceExpected: 'Current policy', overridable: false },
        { key: 'cloud-hosting', name: 'Cloud Hosting', status: 'INCLUDED', why: 'Engagement connects to production infrastructure and hosts customer data.', reviewerDomain: 'Cybersecurity', evidenceExpected: 'SOC report', overridable: true },
        { key: 'ai-governance', name: 'AI Governance', status: 'EXCLUDED', why: 'IRA records no AI use.', reviewerDomain: 'AI Governance', evidenceExpected: 'Not requested for this engagement.', overridable: true },
    ],
    sendBlocked: false,
    contact: null,
    invitation: null,
};

function renderPlan(path = '/third-parties/engagements/e1/due-diligence') {
    return render(
        <MemoryRouter future={routerFuture} initialEntries={[path]}>
            <Routes>
                <Route path="/third-parties/engagements/:id/due-diligence" element={<DueDiligencePlan />} />
            </Routes>
        </MemoryRouter>
    );
}

describe('Engagement due-diligence plan', () => {
    it('shows pack reasons and confirms the recommended plan', async () => {
        vi.mocked(intakeAPI.getDueDiligence).mockResolvedValue({ data: { data: plan } } as any);
        vi.mocked(intakeAPI.confirmDueDiligence).mockResolvedValue({
            data: { data: { ...plan, state: 'READY_TO_SEND', stateLabel: 'Ready to send questionnaire', nextAction: 'Confirm vendor contact and send questionnaire' } },
        } as any);
        renderPlan();
        expect(await screen.findByText(/Microsoft Corporation/)).toBeInTheDocument();
        expect(screen.getByText(/Cloud Hosting/)).toBeInTheDocument();
        expect(screen.getByText(/Why included: Engagement connects to production infrastructure/)).toBeInTheDocument();
        expect(screen.getByText(/IRA records no AI use/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Confirm recommended plan' }));
        expect(await screen.findByText(/Plan confirmed/)).toBeInTheDocument();
    });

    it('requires a rationale when modifying scope', async () => {
        vi.mocked(intakeAPI.getDueDiligence).mockResolvedValue({ data: { data: plan } } as any);
        vi.mocked(intakeAPI.modifyDueDiligence).mockResolvedValue({
            data: { data: { ...plan, changeReason: 'Professional services do not host production.' } },
        } as any);
        renderPlan();
        expect(await screen.findByRole('button', { name: 'Apply scope change' })).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('Exclude'));
        fireEvent.change(screen.getByLabelText('Rationale for scope change'), { target: { value: 'Professional services do not host production.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Apply scope change' }));
        expect(await screen.findByText(/Plan updated/)).toBeInTheDocument();
        expect(intakeAPI.modifyDueDiligence).toHaveBeenCalledWith('e1', expect.objectContaining({
            excludeKeys: ['cloud-hosting'],
            reason: 'Professional services do not host production.',
        }));
    });

    it('sends by email, copies a link without sending, and marks shared', async () => {
        const ready = {
            ...plan,
            state: 'READY_TO_SEND',
            stateLabel: 'Ready to send questionnaire',
            contact: { name: 'Casey Contact', email: 'casey@vendor.test' },
            invitation: { copiedNotSent: true },
        };
        vi.mocked(intakeAPI.getDueDiligence).mockResolvedValue({ data: { data: ready } } as any);
        vi.mocked(intakeAPI.sendQuestionnaire).mockResolvedValue({ data: { data: { ...ready, state: 'AWAITING_VENDOR', emailStatus: 'Queued' } } } as any);
        vi.mocked(intakeAPI.copyActivationLink).mockResolvedValue({ data: { data: { ...ready, activationUrl: 'https://app.example/vendor-assessment/activate?token=abc', copiedNotSent: true } } } as any);
        vi.mocked(intakeAPI.markInvitationShared).mockResolvedValue({ data: { data: { ...ready, state: 'AWAITING_VENDOR' } } } as any);
        renderPlan();
        expect(await screen.findByRole('button', { name: 'Send questionnaire' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Copy activation link' }));
        expect(await screen.findByText(/Link copied. This is not sent/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Mark as sent' }));
        expect(await screen.findByText(/Marked as sent/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Send questionnaire' }));
        expect(await screen.findByText(/Questionnaire email queued/)).toBeInTheDocument();
    });

    it('shows loading, empty, and error states', async () => {
        vi.mocked(intakeAPI.getDueDiligence).mockRejectedValue({ response: { data: { error: { message: 'Confirm the inherent tier before opening due diligence.' } } } });
        renderPlan();
        expect(await screen.findByText(/Confirm the inherent tier/)).toBeInTheDocument();
    });
});

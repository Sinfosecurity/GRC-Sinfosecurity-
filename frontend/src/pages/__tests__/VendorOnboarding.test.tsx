import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from '../../marketing/routerFuture';
import VendorOnboarding from '../VendorOnboarding';
import VendorOnboardingWorkspace from '../VendorOnboardingWorkspace';

vi.mock('../../services/api', () => ({
    vendorOnboardingAPI: {
        list: vi.fn(),
        owners: vi.fn(),
        duplicates: vi.fn(),
        create: vi.fn(),
        get: vi.fn(),
        saveIntake: vi.fn(),
        completeIntake: vi.fn(),
        confirmTier: vi.fn(),
        confirmPlan: vi.fn(),
        saveContact: vi.fn(),
        send: vi.fn(),
        resend: vi.fn(),
        activationLink: vi.fn(),
        markInvitationShared: vi.fn(),
        reviewFinding: vi.fn(),
        sendIra: vi.fn(),
        iraLink: vi.fn(),
        markIraShared: vi.fn(),
        reassessment: vi.fn().mockResolvedValue({ data: { data: { recommendation: 'Targeted reassessment' } } }),
    },
}));

describe('Onboard Third Party workspace', () => {
    beforeEach(async () => {
        const { vendorOnboardingAPI } = await import('../../services/api');
        (vendorOnboardingAPI.list as any).mockResolvedValue({
            data: { data: [
                { id: 'v1', publicId: 'VND-2026-0001', name: 'Acme Payroll', stage: 'Intake', owner: 'Ava Owner', dueDate: '2026-09-18', nextAction: 'Complete vendor intake' },
                { id: 'v17', publicId: 'VND-2026-0017', name: 'Experience Two', stage: 'Offboarding', owner: 'Report Proof', nextAction: 'Close the relationship' },
            ] },
        });
        (vendorOnboardingAPI.owners as any).mockResolvedValue({
            data: { data: [{ id: 'u1', name: 'Ava Owner', email: 'ava@example.test' }] },
        });
        (vendorOnboardingAPI.get as any).mockResolvedValue({
            data: {
                data: {
                    id: 'v1',
                    publicId: 'VND-2026-0001',
                    name: 'Acme Payroll',
                    stage: 'Tier review',
                    stageKey: 'TIER_REVIEW',
                    owner: 'Ava Owner',
                    requester: 'Ava Owner',
                    dueDate: '2026-09-16',
                    nextAction: 'Confirm recommended tier',
                    canEditIntake: true,
                    canReviewTier: true,
                    request: { name: 'Acme Payroll', servicesProvided: 'Payroll' },
                    intake: { completed: true, sections: [{ title: 'Inherent risk', questions: [{ key: 'ir_data', question: 'What types of organization data will the vendor access, store, or process?', type: 'SINGLE_CHOICE', options: ['Personal data'], response: 'Personal data' }] }] },
                    tierReview: {
                        recommendedTier: 'High',
                        explanation: 'Supreme recommends high from the recorded intake score of 16 of 30.',
                        factors: [{ label: 'Sensitive data', rationale: 'Personal data', points: 3 }],
                        hardFloors: [],
                    },
                    plan: {
                        rationale: 'Recommended from recorded vendor tier HIGH.',
                        assessments: [{ name: 'Information Security Assessment', requirement: 'Required', rationale: 'Vendor accesses company systems', expectedEvidence: 'Current policy', reusableEvidence: [] }],
                        triggers: { privacy: true, aiGovernance: true, resilience: false },
                    },
                    invitation: {
                        status: 'Pending',
                        emailStatus: 'Queued',
                        emailTruth: 'Provider accepted or queued the message. This is not inbox delivery.',
                    },
                    lifecycle: {
                        residualRisk: 42,
                        vendorStatus: 'PROPOSED',
                        checklist: [{ key: 'dpa', label: 'Data processing agreement', required: true, rationale: 'Personal data is in scope.' }],
                        findings: [],
                        monitoring: { openFindings: 0, acceptedRisks: 0, overdueRemediation: 0, externalIntelligence: 'Only shown when a monitoring provider is connected.' },
                    },
                    history: [{ title: 'Tier recommended', detail: 'Supreme recommends High.', at: '2026-09-13' }],
                },
            },
        });
    });

    it('shows the request form and open onboarding without raw status codes', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/vendor-onboarding']}>
                <VendorOnboarding />
            </MemoryRouter>
        );
        expect(await screen.findByText('Open a third-party record')).toBeInTheDocument();
        expect(screen.getByText(/1 in progress/)).toBeInTheDocument();
        expect(screen.getByText('VND-2026-0001')).toBeInTheDocument();
        expect(screen.getByText('Complete vendor intake')).toBeInTheDocument();
        expect(screen.queryByText('Experience Two')).not.toBeInTheDocument();
        expect(screen.queryByText('INTAKE_PENDING')).not.toBeInTheDocument();
        expect(screen.getByText('Who asked for this vendor?')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create record' })).toBeDisabled();
    });

    it('asks GRC to send the inherent-risk form instead of filling in-app intake', async () => {
        const { vendorOnboardingAPI } = await import('../../services/api');
        (vendorOnboardingAPI.get as any).mockResolvedValue({
            data: {
                data: {
                    id: 'v-ira',
                    publicId: 'VND-2026-0040',
                    name: 'Requester Path Vendor',
                    stage: 'Intake',
                    stageKey: 'INTAKE',
                    owner: 'Ava Owner',
                    requesterName: 'Jordan Request',
                    requesterEmail: 'jordan@example.test',
                    canEditIntake: true,
                    request: { name: 'Requester Path Vendor', servicesProvided: 'Payroll' },
                    ira: { required: true, sent: false, submitted: false, answers: {}, questions: [] },
                    intake: { completed: false, sections: [{ title: 'Inherent risk', questions: [{ key: 'ir_04', question: 'Privileged access?', type: 'SINGLE_CHOICE', options: ['High'], response: '' }] }] },
                    history: [],
                },
            },
        });
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/vendor-onboarding/VND-2026-0040']}>
                <VendorOnboardingWorkspace />
            </MemoryRouter>
        );
        expect((await screen.findAllByText('Send the inherent-risk form')).length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: 'Email IRA link' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Copy IRA link' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Submit intake' })).not.toBeInTheDocument();
        expect(screen.getByText(/Do not fill the old in-app intake/)).toBeInTheDocument();
    });

    it('explains a controlling Unknown without blocking intake submit', async () => {
        const { vendorOnboardingAPI } = await import('../../services/api');
        (vendorOnboardingAPI.get as any).mockResolvedValue({
            data: {
                data: {
                    id: 'v2',
                    publicId: 'VND-2026-0002',
                    name: 'Unknown Access Vendor',
                    stage: 'Intake',
                    stageKey: 'INTAKE',
                    owner: 'Ava Owner',
                    requester: 'Ava Owner',
                    canEditIntake: true,
                    canReviewTier: true,
                    request: { name: 'Unknown Access Vendor', servicesProvided: 'Admin access' },
                    intake: {
                        completed: false,
                        sections: [{
                            title: 'Inherent risk',
                            questions: [{
                                key: 'ir_04',
                                question: 'Will the vendor have privileged access?',
                                type: 'SINGLE_CHOICE',
                                options: ['High', 'Moderate', 'Low', 'Unknown'],
                                response: 'Unknown',
                            }],
                        }],
                    },
                    unresolvedScope: [{
                        code: 'IR-04',
                        message: 'We still need to know whether this vendor will have privileged administrative access before Supreme can finalize the due-diligence package.',
                    }],
                    plan: { unresolved: [], assessments: [], triggers: {} },
                    history: [],
                },
            },
        });
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/vendor-onboarding/VND-2026-0002']}>
                <VendorOnboardingWorkspace />
            </MemoryRouter>
        );
        expect((await screen.findAllByText(/analyst must confirm those packs/i)).length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: 'Save and resume later' })).toBeEnabled();
        fireEvent.click(screen.getByLabelText(/I attest that this intake is accurate/i));
        expect(screen.getByRole('button', { name: 'Submit intake' })).toBeEnabled();
    });

    it('shows explainable tier, plan rationale, and governance triggers', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/vendor-onboarding/VND-2026-0001']}>
                <VendorOnboardingWorkspace />
            </MemoryRouter>
        );
        expect((await screen.findAllByRole('heading', { name: 'Acme Payroll' })).length).toBeGreaterThan(0);
        expect(screen.getAllByText('VND-2026-0001').length).toBeGreaterThan(0);
        expect(screen.getByText(/Assessment scope ready/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Supreme recommends high/i).length).toBeGreaterThan(0);
        expect(screen.getByRole('tab', { name: 'Assessment' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Findings' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Decisions' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
        expect(screen.getByText(/Inherent is intake exposure/)).toBeInTheDocument();
        expect(screen.getByRole('list', { name: 'Version 3 operating path' })).toHaveTextContent('Request');
        expect(screen.getByRole('list', { name: 'Version 3 operating path' })).toHaveTextContent('Tier review');
    });

    it('groups Review & Decide exceptions instead of listing every response', async () => {
        const { vendorOnboardingAPI } = await import('../../services/api');
        (vendorOnboardingAPI.get as any).mockResolvedValue({
            data: {
                data: {
                    id: 'v3',
                    publicId: 'VND-2026-0030',
                    name: 'High Exception Vendor',
                    stage: 'Under review',
                    stageKey: 'UNDER_REVIEW',
                    owner: 'Ava Owner',
                    request: { name: 'High Exception Vendor', servicesProvided: 'Privileged claims review' },
                    canReviewTier: true,
                    intake: { completed: true, sections: [{ questions: [{ key: 'ir_04', response: 'High' }] }] },
                    plan: { triggers: { privacy: true }, assessments: [] },
                    review: {
                        questionsAnswered: 36,
                        satisfactory: 14,
                        needClarification: 6,
                        potentialFindings: 4,
                        items: [
                            { assessmentId: 'a1', assessmentName: 'Privileged Access', questionId: 'q1', question: 'MFA required?', response: 'No', reason: 'The recorded answer does not satisfy the requirement.', findingId: 'f1', reviewState: 'DRAFT', priority: 'high' },
                            { assessmentId: 'a1', assessmentName: 'Privileged Access', questionId: 'q2', question: 'Admin logging?', response: 'No', reason: 'The recorded answer does not satisfy the requirement.', findingId: 'f2', reviewState: 'DRAFT', priority: 'high' },
                            { assessmentId: 'a2', assessmentName: 'Privacy', questionId: 'q3', question: 'DPA in place?', response: 'Not answered', reason: 'Not answered — complete or request clarification.', priority: 'high' },
                            { assessmentId: 'a3', assessmentName: 'Baseline', questionId: 'q4', question: 'Policy current?', response: 'Yes', reason: 'Required evidence is missing or not ready.', findingId: 'f3', reviewState: 'DRAFT' },
                        ],
                    },
                    vendorAssessments: [{ id: 'a1', name: 'Privileged Access', status: 'Submitted', answered: 12, total: 12 }],
                    lifecycle: { residualRisk: 42, findings: [{ id: 'f1', title: 'MFA required', severity: 'HIGH', status: 'OPEN', reviewState: 'DRAFT' }] },
                    history: [],
                },
            },
        });
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/vendor-onboarding/VND-2026-0030']}>
                <VendorOnboardingWorkspace />
            </MemoryRouter>
        );
        expect(await screen.findByRole('heading', { level: 2, name: 'Review 1 material issue' })).toBeInTheDocument();
        expect(screen.getByText(/36 responses · 14 satisfactory · 6 require clarification · 1 material issue · 1 evidence issue/)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /requirement not met/i })).toBeInTheDocument();
        expect(screen.getByText(/2 related responses/)).toBeInTheDocument();
        expect(screen.queryByText('Admin logging?')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Clarifications 1' }));
        expect(screen.getByRole('heading', { name: 'Clarification queue' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'View full assessment' }));
        expect(screen.getByRole('heading', { name: 'Full assessment' })).toBeInTheDocument();
        expect(screen.getAllByText(/Privileged access is recorded as High/).length).toBeGreaterThan(0);
    });

    it('does not show vendor-send controls during tier review', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/vendor-onboarding/VND-2026-0001']}>
                <VendorOnboardingWorkspace />
            </MemoryRouter>
        );
        expect((await screen.findAllByRole('button', { name: 'Confirm recommended tier' })).length).toBeGreaterThan(0);
        expect(screen.queryByRole('button', { name: 'Send questionnaire' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Copy activation link' })).not.toBeInTheDocument();
    });

    it('shows 4a and 4b after the case is ready to send', async () => {
        const { vendorOnboardingAPI } = await import('../../services/api');
        (vendorOnboardingAPI.get as any).mockResolvedValue({
            data: {
                data: {
                    id: 'v-ready',
                    publicId: 'VND-2026-0041',
                    name: 'Ready Vendor',
                    stage: 'Ready to send',
                    stageKey: 'READY_TO_SEND',
                    owner: 'Ava Owner',
                    canReviewTier: true,
                    requesterName: 'Jordan Request',
                    requesterEmail: 'jordan@example.test',
                    request: { name: 'Ready Vendor', servicesProvided: 'Payroll' },
                    ira: { required: true, sent: true, submitted: true, status: 'IRA_SUBMITTED' },
                    intake: { completed: true, sections: [] },
                    tierReview: { recommendedTier: 'Medium', confirmedTier: 'Medium', explanation: 'Confirmed.' },
                    invitation: null,
                    history: [],
                },
            },
        });
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/vendor-onboarding/VND-2026-0041']}>
                <VendorOnboardingWorkspace />
            </MemoryRouter>
        );
        expect((await screen.findAllByText('Send questionnaire to vendor')).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button', { name: 'Send questionnaire' }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button', { name: 'Copy activation link' }).length).toBeGreaterThan(0);
        expect(screen.queryByRole('button', { name: 'Confirm recommended tier' })).not.toBeInTheDocument();
        expect(screen.getByText(/Questionnaire ready · now/)).toBeInTheDocument();
        expect(screen.queryByText(/Vendor Review · now/)).not.toBeInTheDocument();
        expect(screen.getAllByText('Send questionnaire to vendor').length).toBeGreaterThan(0);
        const sendSection = document.getElementById('send-questionnaire-tab') || document.getElementById('send-questionnaire');
        const focus = vi.fn();
        if (sendSection) sendSection.focus = focus;
        fireEvent.click(screen.getAllByRole('button', { name: 'Send questionnaire' })[0]);
        await waitFor(() => expect(focus).toHaveBeenCalled());
        expect(screen.getAllByText('4a — Send email').length).toBeGreaterThan(0);
        expect(screen.getAllByText('4b — Copy link').length).toBeGreaterThan(0);
        expect(screen.getByText(/name and email are required/i)).toBeInTheDocument();
    });

    it('sends from the top CTA once vendor contact is present', async () => {
        const { vendorOnboardingAPI } = await import('../../services/api');
        (vendorOnboardingAPI.get as any).mockResolvedValue({
            data: {
                data: {
                    id: 'v-cta',
                    publicId: 'VND-2026-0044',
                    name: 'CTA Vendor',
                    stage: 'Ready to send',
                    stageKey: 'READY_TO_SEND',
                    canReviewTier: true,
                    contact: { name: 'Vendor Security', email: 'vendor@example.test' },
                    ira: { required: true, sent: true, submitted: true, status: 'IRA_SUBMITTED' },
                    intake: { completed: true, sections: [] },
                    history: [],
                },
            },
        });
        let resolveSend: (value?: unknown) => void = () => undefined;
        (vendorOnboardingAPI.send as any).mockImplementationOnce(() => new Promise((resolve) => {
            resolveSend = () => resolve({ data: { data: { stageKey: 'AWAITING_VENDOR' } } });
        }));
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/vendor-onboarding/VND-2026-0044']}>
                <VendorOnboardingWorkspace />
            </MemoryRouter>
        );
        expect((await screen.findAllByText('Send questionnaire to vendor')).length).toBeGreaterThan(0);
        fireEvent.click(screen.getAllByRole('button', { name: 'Send questionnaire' })[0]);
        expect(screen.getByText('Sending questionnaire…')).toBeInTheDocument();
        expect(vendorOnboardingAPI.send).toHaveBeenCalled();
        resolveSend();
        expect(await screen.findByText('Questionnaire sent successfully.')).toBeInTheDocument();
    });

    it('shows send pending, success, and error without a silent failure', async () => {
        const { vendorOnboardingAPI } = await import('../../services/api');
        (vendorOnboardingAPI.get as any).mockResolvedValue({
            data: {
                data: {
                    id: 'v-send',
                    publicId: 'VND-2026-0042',
                    name: 'Send Vendor',
                    stage: 'Ready to send',
                    stageKey: 'READY_TO_SEND',
                    canReviewTier: true,
                    contact: { name: 'Vendor Security', email: 'vendor@example.test' },
                    ira: { required: true, sent: true, submitted: true, status: 'IRA_SUBMITTED' },
                    intake: { completed: true, sections: [] },
                    history: [],
                },
            },
        });
        let finishSend: (value?: unknown) => void = () => undefined;
        (vendorOnboardingAPI.send as any).mockImplementationOnce(() => new Promise((_, reject) => {
            finishSend = () => reject(new Error('Provider rejected the message'));
        }));
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/vendor-onboarding/VND-2026-0042']}>
                <VendorOnboardingWorkspace />
            </MemoryRouter>
        );
        expect((await screen.findAllByText('Send questionnaire to vendor')).length).toBeGreaterThan(0);
        fireEvent.click(screen.getAllByRole('button', { name: 'Send questionnaire' })[1]);
        expect(screen.getByText('Sending questionnaire…')).toBeInTheDocument();
        finishSend();
        expect(await screen.findByText('Provider rejected the message')).toBeInTheDocument();
        (vendorOnboardingAPI.send as any).mockResolvedValueOnce({ data: { data: { stageKey: 'AWAITING_VENDOR' } } });
        (vendorOnboardingAPI.get as any).mockResolvedValue({
            data: {
                data: {
                    id: 'v-send',
                    publicId: 'VND-2026-0042',
                    name: 'Send Vendor',
                    stage: 'Awaiting vendor',
                    stageKey: 'AWAITING_VENDOR',
                    canReviewTier: true,
                    contact: { name: 'Vendor Security', email: 'vendor@example.test' },
                    invitation: { deliveryMethod: 'EMAIL', emailStatus: 'Queued', sentAt: '2026-09-18T15:20:00.000Z' },
                    dueDate: '2026-09-25',
                    ira: { required: true, sent: true, submitted: true, status: 'IRA_SUBMITTED' },
                    intake: { completed: true, sections: [] },
                    history: [],
                },
            },
        });
        fireEvent.click(screen.getAllByRole('button', { name: 'Send questionnaire' })[1]);
        expect(await screen.findByText('Questionnaire sent successfully.')).toBeInTheDocument();
    });

    it('keeps copy-link ready to send until mark as sent', async () => {
        const { vendorOnboardingAPI } = await import('../../services/api');
        (vendorOnboardingAPI.get as any).mockResolvedValue({
            data: {
                data: {
                    id: 'v-copy',
                    publicId: 'VND-2026-0043',
                    name: 'Copy Vendor',
                    stage: 'Ready to send',
                    stageKey: 'READY_TO_SEND',
                    canReviewTier: true,
                    contact: { name: 'Vendor Security', email: 'vendor@example.test' },
                    ira: { required: true, sent: true, submitted: true, status: 'IRA_SUBMITTED' },
                    intake: { completed: true, sections: [] },
                    history: [],
                },
            },
        });
        (vendorOnboardingAPI.activationLink as any).mockResolvedValue({
            data: { data: { activationUrl: 'https://example.test/activate?token=redacted', stageKey: 'READY_TO_SEND' } },
        });
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/vendor-onboarding/VND-2026-0043']}>
                <VendorOnboardingWorkspace />
            </MemoryRouter>
        );
        expect((await screen.findAllByText('Send questionnaire to vendor')).length).toBeGreaterThan(0);
        fireEvent.click(screen.getAllByRole('button', { name: 'Copy activation link' })[0]);
        expect(await screen.findByText('Activation link copied.')).toBeInTheDocument();
        expect(screen.getAllByText('Send questionnaire to vendor').length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button', { name: 'Mark as sent' }).length).toBeGreaterThan(0);
    });

    it('tells the operator an offboarding vendor is not a new assessment', async () => {
        const { vendorOnboardingAPI } = await import('../../services/api');
        (vendorOnboardingAPI.get as any).mockResolvedValue({
            data: {
                data: {
                    id: 'v4',
                    publicId: 'VND-2026-0017',
                    name: 'Experience Two',
                    stage: 'Offboarding',
                    stageKey: 'OFFBOARDING',
                    owner: 'Report Proof',
                    request: { name: 'Experience Two', servicesProvided: 'Hosted claims review' },
                    intake: { completed: true, sections: [] },
                    review: { potentialFindings: 18, items: [] },
                    lifecycle: { vendorStatus: 'OFFBOARDING', residualRisk: 100, findings: [], monitoring: { openFindings: 0 } },
                    history: [],
                },
            },
        });
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/vendor-onboarding/VND-2026-0017']}>
                <VendorOnboardingWorkspace />
            </MemoryRouter>
        );
        expect(await screen.findByText(/already onboarded/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Request a different third party' })).toBeInTheDocument();
        expect(screen.queryByText(/Review 18 material issues/)).not.toBeInTheDocument();
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
        reassessment: vi.fn().mockResolvedValue({ data: { data: { recommendation: 'Targeted reassessment' } } }),
    },
}));

describe('Onboard Third Party workspace', () => {
    beforeEach(async () => {
        const { vendorOnboardingAPI } = await import('../../services/api');
        (vendorOnboardingAPI.list as any).mockResolvedValue({
            data: { data: [{ id: 'v1', publicId: 'VND-2026-0001', name: 'Acme Payroll', stage: 'Intake', owner: 'Ava Owner', dueDate: '2026-09-18', nextAction: 'Complete vendor intake' }] },
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
        expect(await screen.findByText('Request a third party')).toBeInTheDocument();
        expect(screen.getByText('Assess')).toBeInTheDocument();
        expect(screen.getByText('VND-2026-0001')).toBeInTheDocument();
        expect(screen.getByText('Complete vendor intake')).toBeInTheDocument();
        expect(screen.queryByText('INTAKE_PENDING')).not.toBeInTheDocument();
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
        expect(screen.getByRole('list', { name: 'Third party stages' })).toHaveTextContent('Request');
        expect(screen.getByRole('list', { name: 'Third party stages' })).toHaveTextContent('Assess');
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
});

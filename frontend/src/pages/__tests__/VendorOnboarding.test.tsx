import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
        expect(await screen.findByText('Onboard Third Party')).toBeInTheDocument();
        expect(screen.getByText('VND-2026-0001')).toBeInTheDocument();
        expect(screen.getByText('Complete vendor intake')).toBeInTheDocument();
        expect(screen.queryByText('INTAKE_PENDING')).not.toBeInTheDocument();
    });

    it('shows explainable tier, plan rationale, and governance triggers', async () => {
        render(
            <MemoryRouter future={routerFuture} initialEntries={['/vendor-onboarding/VND-2026-0001']}>
                <VendorOnboardingWorkspace />
            </MemoryRouter>
        );
        expect(await screen.findByRole('heading', { name: /VND-2026-0001/ })).toBeInTheDocument();
        expect(screen.getByText(/Supreme recommends high/i)).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Assessment Plan' })).toBeInTheDocument();
    });
});

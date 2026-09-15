import {
    EMAIL_TEMPLATE_INVENTORY,
    approvalRequiredEmail,
    assessmentSubmittedEmail,
    automationWorkEmail,
    clarificationRequestedEmail,
    emailPreviewFixtures,
    formatCustomerDate,
    humanizeEmailTerm,
    passwordResetTransactionalEmail,
    platformFromName,
    viaSupremeFromName,
    vendorIntakeAssignedEmail,
    vendorInvitationEmail,
} from '../services/transactionalEmail';

const UUID = '9d1c2f6a-3b44-4e11-9c2a-7f8e1d0c5b21';

describe('Supreme transactional email design system', () => {
    it('maps platform-wide Supreme Risk sender names to Supreme', () => {
        expect(platformFromName({ RESEND_FROM_NAME: 'Supreme Risk' } as NodeJS.ProcessEnv)).toBe('Supreme');
        expect(platformFromName({ SMTP_FROM_NAME: '' } as NodeJS.ProcessEnv)).toBe('Supreme');
        expect(platformFromName({ RESEND_FROM_NAME: 'Supreme Trust Office' } as NodeJS.ProcessEnv)).toBe('Supreme Trust Office');
    });

    it('uses the customer organization dynamically for vendor sender identity', () => {
        expect(viaSupremeFromName('Northwind Insurance')).toBe('Northwind Insurance via Supreme');
        expect(viaSupremeFromName('')).toBe('Supreme');
        expect(viaSupremeFromName('Elite Claims')).not.toBe('Elite Claims');
        expect(viaSupremeFromName('Northwind Insurance')).not.toContain('Elite Claims');
    });

    it('formats customer dates instead of ISO calendar strings', () => {
        expect(formatCustomerDate('2026-09-22')).toBe('September 22, 2026');
        expect(formatCustomerDate('2026-09-22')).not.toBe('2026-09-22');
    });

    it('humanizes enums and drops raw UUIDs', () => {
        expect(humanizeEmailTerm('INITIAL_DUE_DILIGENCE')).toBe('Initial Due Diligence');
        expect(humanizeEmailTerm('CRITICAL_ATTENTION')).toBe('Critical Attention');
        expect(humanizeEmailTerm('IN_PROGRESS')).toBe('In Progress');
        expect(humanizeEmailTerm(UUID)).toBe('');
    });

    it('renders the internal intake assignment with public ID, role, CTA, and plain text', () => {
        const mail = vendorIntakeAssignedEmail({
            vendorName: 'Acme Cloud',
            publicId: 'VND-2026-0042',
            requesterName: 'Jordan Requester',
            dueAt: '2026-09-22',
            ctaUrl: 'https://example.test/vendor-onboarding/VND-2026-0042',
        });
        expect(mail.subject).toBe('Action required: Complete vendor intake for Acme Cloud');
        expect(mail.fromName).toBe('Supreme');
        expect(mail.text).toContain('Vendor: Acme Cloud');
        expect(mail.text).toContain('Vendor ID: VND-2026-0042');
        expect(mail.text).toContain('Assigned role: Business Owner');
        expect(mail.text).toContain('Due date: September 22, 2026');
        expect(mail.text).toContain('https://example.test/vendor-onboarding/VND-2026-0042');
        expect(mail.text).toContain('What happens next');
        expect(mail.html).toContain('Complete vendor intake');
        expect(mail.html).toContain('Supreme Governance Platform');
        expect(`${mail.subject}\n${mail.text}`).not.toMatch(/Due diligence sent/);
        expect(`${mail.subject}\n${mail.text}`).not.toContain(UUID);
        expect(`${mail.subject}\n${mail.text}`).not.toMatch(/\bINITIAL_DUE_DILIGENCE\b/);
    });

    it('renders the vendor invitation with via-Supreme branding and activation CTA', () => {
        const mail = vendorInvitationEmail({
            contactFirstName: 'Casey',
            organizationName: 'Northwind Insurance',
            vendorName: 'Acme Cloud',
            dueAt: '2026-09-22',
            activationUrl: 'https://example.test/vendor-assessment/activate?token=preview-token',
        });
        expect(mail.subject).toBe('Action required: Complete your due diligence for Northwind Insurance');
        expect(mail.fromName).toBe('Northwind Insurance via Supreme');
        expect(mail.text).toContain('Hello Casey');
        expect(mail.text).toContain('Requested by: Northwind Insurance');
        expect(mail.html).toContain('Start assessment');
        expect(mail.html).toContain('/vendor-assessment/activate?token=preview-token');
        expect(mail.html).toContain('color-scheme');
        expect(mail.text).toContain('Secure third-party assessment portal');
        expect(mail.text).not.toMatch(/\bRESEND\b|\bSMTP\b|\bSENDGRID\b/);
    });

    it('renders a reminder invitation that is not a copy of the first request', () => {
        const first = vendorInvitationEmail({
            contactFirstName: 'Casey',
            organizationName: 'Northwind Insurance',
            vendorName: 'Acme Cloud',
            dueAt: '2026-09-22',
            activationUrl: 'https://example.test/vendor-assessment/activate?token=preview-token',
        });
        const reminder = vendorInvitationEmail({
            contactFirstName: 'Casey',
            organizationName: 'Northwind Insurance',
            vendorName: 'Acme Cloud',
            dueAt: '2026-09-22',
            activationUrl: 'https://example.test/vendor-assessment/activate?token=preview-token',
            reminder: true,
        });
        expect(reminder.subject).toMatch(/^Reminder:/);
        expect(reminder.subject).not.toBe(first.subject);
        expect(reminder.html).toContain('Continue assessment');
        expect(reminder.html).toContain('Reminder');
    });

    it('renders assessment, approval, automation, and password-reset templates', () => {
        const clarification = clarificationRequestedEmail({
            contactFirstName: 'Casey',
            organizationName: 'Northwind Insurance',
            vendorName: 'Acme Cloud',
            questionCount: 2,
            ctaUrl: 'https://example.test/vendor-assessment',
        });
        expect(clarification.subject).toBe('Action required: Clarification requested by Northwind Insurance');
        expect(clarification.fromName).toBe('Northwind Insurance via Supreme');
        expect(clarification.html).toContain('/vendor-assessment');
        expect(clarification.text).not.toContain('activate?token=');

        const submitted = assessmentSubmittedEmail({
            vendorName: 'Acme Cloud',
            publicId: 'VND-2026-0042',
            assessmentName: 'Information Security Assessment',
            ctaUrl: 'https://example.test/vendor-onboarding/VND-2026-0042',
        });
        expect(submitted.subject).toBe('Review required: Acme Cloud submitted due diligence');
        expect(submitted.html).toContain('Review submission');

        const approval = approvalRequiredEmail({
            vendorName: 'Acme Cloud',
            publicId: 'VND-2026-0042',
            ctaUrl: 'https://example.test/decision-briefs',
        });
        expect(approval.subject).toBe('Decision required: Review Acme Cloud for approval');
        expect(approval.text).toContain('This email does not record a decision');

        const work = automationWorkEmail({
            title: 'Vendor finding needs review',
            why: 'Supreme identified a vendor finding that is overdue.',
            dueAt: '2026-09-22',
            ctaUrl: 'https://example.test/findings',
            source: 'Vendor finding',
        });
        expect(work.subject).toBe('Action required: Vendor finding needs review');
        expect(work.text).not.toMatch(/runId|queueId|trigger JSON|automation-run/i);

        const reset = passwordResetTransactionalEmail({
            resetUrl: 'https://example.test/reset-password?token=preview-token',
        });
        expect(reset.subject).toBe('Action required: Reset your Supreme password');
        expect(reset.html).toContain('/reset-password?token=preview-token');
    });

    it('exposes an inventory of actual templates and fixture previews without sending', () => {
        const present = EMAIL_TEMPLATE_INVENTORY.filter((row) => row.present);
        expect(present.length).toBeGreaterThanOrEqual(20);
        expect(EMAIL_TEMPLATE_INVENTORY.find((row) => row.key === 'privacy.deadline')?.present).toBe(false);
        expect(EMAIL_TEMPLATE_INVENTORY.find((row) => row.key === 'ai.approval')?.present).toBe(false);
        const fixtures = emailPreviewFixtures();
        expect(fixtures.every((item) => item.html.includes('Supreme') && item.text.includes('Supreme'))).toBe(true);
        expect(JSON.stringify(fixtures)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
    });
});

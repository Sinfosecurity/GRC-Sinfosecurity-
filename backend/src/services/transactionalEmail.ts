import { portalFrontendUrl } from './publicFrontendUrl';

export type EmailAudience = 'internal' | 'vendor' | 'security';

export type EmailContextRow = { label: string; value: string };

export type TransactionalEmailModel = {
    templateKey: string;
    audience: EmailAudience;
    kicker?: string;
    organizationName?: string;
    heading: string;
    intro: string;
    greeting?: string;
    context?: EmailContextRow[];
    priority?: string;
    dueLabel?: string;
    dueValue?: string;
    cta?: { label: string; url: string };
    nextSteps?: string[];
    securityNote?: string;
    helpNote?: string;
    footerNote?: string;
    reminder?: boolean;
};

export type RenderedTransactionalEmail = {
    subject: string;
    text: string;
    html: string;
    fromName: string;
    templateKey: string;
};

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
const RAW_ENUM = /\b(INITIAL_DUE_DILIGENCE|CRITICAL_ATTENTION|RESOLVED_BY_SOURCE|IN_PROGRESS|RISK_ACCEPTED|PENDING_REVIEW|PENDING_VALIDATION|NOT_STARTED)\b/;

export function escapeHtml(value: string) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function formatCustomerDate(value?: Date | string | null) {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
        const [year, month, day] = value.trim().split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function humanizeEmailTerm(value?: string | null) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (UUID.test(raw) && raw === raw.toLowerCase()) return '';
    return raw
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
        .replace(/\bId\b/g, 'ID');
}

export function viaSupremeFromName(organizationName?: string | null) {
    const name = String(organizationName || '').trim();
    return name ? `${name} via Supreme` : 'Supreme';
}

export function platformFromName(env: NodeJS.ProcessEnv = process.env) {
    const raw = String(env.RESEND_FROM_NAME || env.SMTP_FROM_NAME || env.SENDGRID_FROM_NAME || '').trim();
    if (!raw || /^supreme risk$/i.test(raw)) return 'Supreme';
    return raw;
}

export function customerAppUrl(path: string, env: NodeJS.ProcessEnv = process.env) {
    return `${portalFrontendUrl('CUSTOMER', env)}${path.startsWith('/') ? path : `/${path}`}`;
}

function contextLines(rows?: EmailContextRow[]) {
    return (rows || []).filter((row) => row.value && !UUID.test(row.value));
}

export function renderTransactionalText(model: TransactionalEmailModel) {
    const lines = [
        model.heading,
        '',
        model.greeting || '',
        model.intro,
        '',
        ...contextLines(model.context).map((row) => `${row.label}: ${row.value}`),
        model.dueValue ? `${model.dueLabel || 'Due'}: ${model.dueValue}` : '',
        model.priority ? `Priority: ${model.priority}` : '',
        '',
        model.cta ? `${model.cta.label}:\n${model.cta.url}` : '',
        '',
        model.nextSteps?.length ? ['What happens next', ...model.nextSteps.map((step, index) => `${index + 1}. ${step}`)].join('\n') : '',
        '',
        model.securityNote || '',
        model.helpNote || '',
        '',
        model.footerNote || 'Supreme Governance Platform',
    ];
    return lines.filter((line, index, all) => line || all[index - 1] !== '').join('\n').trim();
}

export function renderTransactionalHtml(model: TransactionalEmailModel) {
    const rows = contextLines(model.context)
        .map((row) => `<tr>
            <td style="padding:8px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8b7355;width:38%;">${escapeHtml(row.label)}</td>
            <td style="padding:8px 0;font-size:15px;color:#14202e;">${escapeHtml(row.value)}</td>
        </tr>`)
        .join('');
    const next = (model.nextSteps || [])
        .map((step, index) => `<tr><td style="padding:4px 0;color:#14202e;font-size:14px;line-height:1.5;">${index + 1}. ${escapeHtml(step)}</td></tr>`)
        .join('');
    const button = model.cta
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;"><tr>
            <td style="border-radius:4px;background:#b0893a;">
                <a href="${escapeHtml(model.cta.url)}" style="display:inline-block;padding:14px 22px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;color:#fffdf8;font-weight:700;">${escapeHtml(model.cta.label)}</a>
            </td>
        </tr></table>`
        : '';
    const reminder = model.reminder
        ? `<p style="margin:0 0 16px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#b0893a;font-weight:700;">Reminder</p>`
        : '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light dark"/>
<meta name="supported-color-schemes" content="light dark"/>
<title>${escapeHtml(model.heading)}</title>
<style>
@media (prefers-color-scheme: dark) {
  body, .supreme-wrap { background:#101820 !important; color:#f4efe6 !important; }
  .supreme-card, .supreme-box { background:#1b2430 !important; border-color:#3a4553 !important; }
  .supreme-text, .supreme-box td { color:#f4efe6 !important; }
  .supreme-muted { color:#c4b8a4 !important; }
}
@media only screen and (max-width: 480px) {
  .supreme-card { padding:22px !important; }
  .supreme-button a { display:block !important; text-align:center !important; }
}
</style>
</head>
<body class="supreme-wrap" style="margin:0;padding:24px 12px;background:#f3efe6;font-family:'Source Sans 3','Source Sans Pro',Helvetica,Arial,sans-serif;color:#14202e;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" class="supreme-card" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffcf7;border:1px solid rgba(20,32,46,0.12);border-radius:8px;padding:32px;">
<tr><td>
<p style="font-family:Newsreader,Georgia,serif;font-size:26px;margin:0 0 2px;color:#14202e;">Supreme</p>
<p class="supreme-muted" style="letter-spacing:0.16em;text-transform:uppercase;font-size:11px;font-weight:700;color:#b0893a;margin:0 0 22px;">${escapeHtml(model.kicker || model.organizationName || 'Governance Platform')}</p>
${reminder}
<h1 class="supreme-text" style="font-family:Newsreader,Georgia,serif;font-size:26px;line-height:1.25;font-weight:500;margin:0 0 14px;color:#14202e;">${escapeHtml(model.heading)}</h1>
${model.greeting ? `<p class="supreme-text" style="font-size:15px;line-height:1.6;margin:0 0 10px;color:#14202e;">${escapeHtml(model.greeting)}</p>` : ''}
<p class="supreme-text" style="font-size:15px;line-height:1.6;margin:0 0 18px;color:#14202e;">${escapeHtml(model.intro)}</p>
${rows ? `<table role="presentation" class="supreme-box" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f1e6;border:1px solid rgba(20,32,46,0.08);border-radius:6px;padding:14px 16px;margin:0 0 8px;">${rows}${model.dueValue ? `<tr><td style="padding:8px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8b7355;">${escapeHtml(model.dueLabel || 'Due date')}</td><td style="padding:8px 0;font-size:15px;color:#14202e;">${escapeHtml(model.dueValue)}</td></tr>` : ''}${model.priority ? `<tr><td style="padding:8px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8b7355;">Priority</td><td style="padding:8px 0;font-size:15px;color:#14202e;">${escapeHtml(model.priority)}</td></tr>` : ''}</table>` : ''}
${button}
${next ? `<p class="supreme-muted" style="margin:22px 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#8b7355;font-weight:700;">What happens next</p><table role="presentation" width="100%">${next}</table>` : ''}
${model.securityNote ? `<p class="supreme-muted" style="font-size:12px;line-height:1.5;color:#5a6573;margin:24px 0 0;">${escapeHtml(model.securityNote)}</p>` : ''}
${model.helpNote ? `<p class="supreme-muted" style="font-size:12px;line-height:1.5;color:#5a6573;margin:8px 0 0;">${escapeHtml(model.helpNote)}</p>` : ''}
<p class="supreme-muted" style="font-size:12px;line-height:1.5;color:#5a6573;margin:28px 0 0;">${escapeHtml(model.footerNote || 'Supreme Governance Platform')}</p>
</td></tr></table>
</td></tr></table>
</body></html>`;
}

export function renderTransactionalEmail(model: TransactionalEmailModel, subject: string, fromName?: string): RenderedTransactionalEmail {
    const html = renderTransactionalHtml(model);
    const text = renderTransactionalText(model);
    if (RAW_ENUM.test(subject + text) && !/password reset/i.test(model.templateKey)) {
        // Keep the render; tests assert callers do not pass raw enums.
    }
    return {
        subject,
        text,
        html,
        fromName: fromName || (model.audience === 'vendor' ? viaSupremeFromName(model.organizationName) : 'Supreme'),
        templateKey: model.templateKey,
    };
}

export function genericOperationalEmail(input: {
    subject: string;
    body: string;
    organizationName?: string;
    cta?: { label: string; url: string };
    audience?: EmailAudience;
}) {
    return renderTransactionalEmail({
        templateKey: 'operational.generic',
        audience: input.audience || 'internal',
        organizationName: input.organizationName,
        heading: input.subject,
        intro: input.body,
        cta: input.cta,
        securityNote: 'Provider accepted or queued is not inbox delivery.',
        footerNote: 'Supreme Governance Platform',
    }, input.subject);
}

export function vendorIntakeAssignedEmail(input: {
    vendorName: string;
    publicId: string;
    requesterName: string;
    dueAt?: Date | string | null;
    ctaUrl: string;
}) {
    const due = formatCustomerDate(input.dueAt);
    return renderTransactionalEmail({
        templateKey: 'vendor.intake_assigned',
        audience: 'internal',
        heading: 'Vendor onboarding requires your input',
        intro: `${input.requesterName} has requested onboarding. Complete the internal intake so Supreme can calculate inherent risk and recommend the due-diligence package.`,
        context: [
            { label: 'Vendor', value: input.vendorName },
            { label: 'Vendor ID', value: input.publicId },
            { label: 'Assigned role', value: 'Business Owner' },
        ],
        dueLabel: 'Due date',
        dueValue: due,
        cta: { label: 'Complete vendor intake', url: input.ctaUrl },
        nextSteps: [
            'Supreme evaluates inherent risk.',
            'Supreme recommends the vendor tier and due-diligence package.',
            'An analyst confirms the recommendation.',
            'The vendor can then be invited to complete due diligence.',
        ],
        securityNote: 'If you were not expecting this assignment, contact the requester inside Supreme.',
    }, `Action required: Complete vendor intake for ${input.vendorName}`);
}

export function vendorInvitationEmail(input: {
    contactFirstName: string;
    organizationName: string;
    vendorName: string;
    dueAt?: Date | string | null;
    activationUrl: string;
    reminder?: boolean;
}) {
    const due = formatCustomerDate(input.dueAt);
    const heading = input.reminder
        ? `Your due diligence for ${input.organizationName} is due soon`
        : `${input.organizationName} has requested your participation`;
    const subject = input.reminder
        ? `Reminder: Your due diligence for ${input.organizationName} is due ${due || 'soon'}`
        : `Action required: Complete your due diligence for ${input.organizationName}`;
    return renderTransactionalEmail({
        templateKey: input.reminder ? 'vendor.invitation_reminder' : 'vendor.invitation',
        audience: 'vendor',
        organizationName: input.organizationName,
        kicker: `${input.organizationName} via Supreme`,
        greeting: `Hello ${input.contactFirstName},`,
        heading,
        intro: `${input.organizationName} has invited your organization to complete a third-party due-diligence assessment through Supreme. Once you start, you can complete assigned questionnaires, save and resume, upload supporting evidence, and submit your response.`,
        context: [
            { label: 'Organization', value: input.vendorName },
            { label: 'Requested by', value: input.organizationName },
        ],
        dueLabel: 'Due date',
        dueValue: due,
        cta: { label: input.reminder ? 'Continue assessment' : 'Start assessment', url: input.activationUrl },
        nextSteps: input.reminder ? undefined : [
            'Open the secure invitation.',
            'Complete the assigned questionnaires and evidence.',
            'Submit your response to the requesting organization.',
        ],
        securityNote: 'This secure invitation is intended for the named recipient and can be used once. It expires if it is not used in time. If you were not expecting this request, contact your customer.',
        footerNote: 'Supreme Governance Platform · Secure third-party assessment portal',
        reminder: Boolean(input.reminder),
    }, subject, viaSupremeFromName(input.organizationName));
}

export function vendorInvitationSentInternalEmail(input: { vendorName: string; publicId: string; ctaUrl: string }) {
    return renderTransactionalEmail({
        templateKey: 'vendor.invitation_sent_internal',
        audience: 'internal',
        heading: 'Vendor invitation sent',
        intro: `Supreme sent a secure invitation for ${input.vendorName}. Queued is not proof the message reached an inbox.`,
        context: [
            { label: 'Vendor', value: input.vendorName },
            { label: 'Vendor ID', value: input.publicId },
        ],
        cta: { label: 'Open vendor workspace', url: input.ctaUrl },
        nextSteps: [
            'The vendor activates the secure invitation.',
            'They complete questionnaires and evidence.',
            'Supreme prepares the submission for analyst review.',
        ],
        securityNote: 'Copying a secure link is a separate delivery path and is not recorded as email sent.',
    }, `Vendor due diligence invitation sent — ${input.vendorName}`);
}

export function clarificationRequestedEmail(input: {
    contactFirstName: string;
    organizationName: string;
    vendorName: string;
    questionCount: number;
    ctaUrl: string;
}) {
    return renderTransactionalEmail({
        templateKey: 'vendor.clarification_requested',
        audience: 'vendor',
        organizationName: input.organizationName,
        kicker: `${input.organizationName} via Supreme`,
        greeting: `Hello ${input.contactFirstName},`,
        heading: `${input.organizationName} has asked for clarification`,
        intro: `${input.organizationName} reviewed your submission and asked for clarification on ${input.questionCount} question${input.questionCount === 1 ? '' : 's'}. Open the secure portal to update those answers. This is not a new invitation.`,
        context: [
            { label: 'Organization', value: input.vendorName },
            { label: 'Requested by', value: input.organizationName },
            { label: 'Questions', value: String(input.questionCount) },
        ],
        cta: { label: 'Continue assessment', url: input.ctaUrl },
        securityNote: 'If you were not expecting this request, contact your customer. Do not share portal access.',
        footerNote: 'Supreme Governance Platform · Secure third-party assessment portal',
    }, `Action required: Clarification requested by ${input.organizationName}`, viaSupremeFromName(input.organizationName));
}

export function assessmentSubmittedEmail(input: { vendorName: string; publicId: string; assessmentName: string; ctaUrl: string }) {
    return renderTransactionalEmail({
        templateKey: 'vendor.assessment_submitted',
        audience: 'internal',
        heading: 'A vendor submission is ready for review',
        intro: `${input.vendorName} submitted ${input.assessmentName}. Review exceptions before findings are confirmed.`,
        context: [
            { label: 'Vendor', value: input.vendorName },
            { label: 'Vendor ID', value: input.publicId },
            { label: 'Assessment', value: humanizeEmailTerm(input.assessmentName) },
        ],
        cta: { label: 'Review submission', url: input.ctaUrl },
        nextSteps: [
            'Supreme has evaluated the submitted answers.',
            'An analyst reviews exceptions and potential findings.',
            'Confirmed findings can move to remediation or risk acceptance.',
        ],
    }, `Review required: ${input.vendorName} submitted due diligence`);
}

export function assessmentOverdueEmail(input: { vendorName: string; publicId: string; ctaUrl: string; ownerRole?: string }) {
    return renderTransactionalEmail({
        templateKey: 'vendor.assessment_overdue',
        audience: 'internal',
        heading: 'Vendor assessment is overdue',
        intro: `${input.vendorName} has not submitted assigned due diligence. Follow up with the vendor contact or resend the secure invitation.`,
        context: [
            { label: 'Vendor', value: input.vendorName },
            { label: 'Vendor ID', value: input.publicId },
            { label: 'Owner', value: input.ownerRole || 'Business Owner' },
        ],
        cta: { label: 'Open vendor workspace', url: input.ctaUrl },
        reminder: true,
    }, `Action required: Vendor assessment is overdue — ${input.vendorName}`);
}

export function tierReviewEmail(input: { vendorName: string; publicId: string; recommendedTier: string; dueAt?: Date | string | null; ctaUrl: string }) {
    return renderTransactionalEmail({
        templateKey: 'vendor.tier_review',
        audience: 'internal',
        heading: 'Confirm the recommended vendor tier',
        intro: `Intake is complete. Supreme recommends ${humanizeEmailTerm(input.recommendedTier)} for ${input.vendorName}. Confirm or override with a reason.`,
        context: [
            { label: 'Vendor', value: input.vendorName },
            { label: 'Vendor ID', value: input.publicId },
            { label: 'Recommended tier', value: humanizeEmailTerm(input.recommendedTier) },
        ],
        dueValue: formatCustomerDate(input.dueAt),
        cta: { label: 'Review recommendation', url: input.ctaUrl },
    }, `Review required: Confirm tier for ${input.vendorName}`);
}

export function approvalRequiredEmail(input: { vendorName: string; publicId?: string; ctaUrl: string }) {
    return renderTransactionalEmail({
        templateKey: 'vendor.approval_required',
        audience: 'internal',
        heading: 'A decision is required',
        intro: `Review ${input.vendorName} inside Supreme. Approve, approve with conditions, or reject. This email does not record a decision.`,
        context: [
            { label: 'Vendor', value: input.vendorName },
            { label: 'Vendor ID', value: input.publicId || '' },
        ],
        cta: { label: 'Review decision', url: input.ctaUrl },
        nextSteps: [
            'Open the decision brief in Supreme.',
            'A person records Approve, Approve with conditions, or Reject.',
            'Residual risk does not change because a decision is recorded.',
        ],
    }, `Decision required: Review ${input.vendorName} for approval`);
}

export function vendorActivatedEmail(input: { vendorName: string; publicId: string; nextReview?: Date | string | null; ctaUrl: string; conditions?: string }) {
    return renderTransactionalEmail({
        templateKey: 'vendor.activated',
        audience: 'internal',
        heading: `${input.vendorName} is now active`,
        intro: input.conditions
            ? `${input.vendorName} was approved with conditions. This is not a claim that the relationship is risk-free or compliant.`
            : `${input.vendorName} is active. Monitoring and the next review date are recorded in Supreme.`,
        context: [
            { label: 'Vendor', value: input.vendorName },
            { label: 'Vendor ID', value: input.publicId },
            { label: 'Next review', value: formatCustomerDate(input.nextReview) },
            { label: 'Conditions', value: input.conditions || 'None recorded' },
        ],
        cta: { label: 'Open active workspace', url: input.ctaUrl },
    }, `${input.vendorName} has been approved`);
}

export function remediationRequestedEmail(input: { title: string; vendorName?: string; ctaUrl: string; vendorFacing?: boolean; organizationName?: string }) {
    if (input.vendorFacing) {
        return renderTransactionalEmail({
            templateKey: 'vendor.remediation_requested_vendor',
            audience: 'vendor',
            organizationName: input.organizationName,
            heading: 'Remediation has been requested',
            intro: `${input.organizationName || 'A customer'} has requested remediation for an identified issue. Upload supporting evidence in the secure portal.`,
            context: [
                { label: 'Issue', value: input.title },
                { label: 'Organization', value: input.vendorName || '' },
            ],
            cta: { label: 'Upload remediation evidence', url: input.ctaUrl },
            securityNote: 'This message does not close the finding. Closure happens only after governed validation.',
            footerNote: 'Supreme Governance Platform · Secure third-party assessment portal',
        }, `Action required: Remediation requested${input.vendorName ? ` for ${input.vendorName}` : ''}`, viaSupremeFromName(input.organizationName));
    }
    return renderTransactionalEmail({
        templateKey: 'vendor.remediation_requested_internal',
        audience: 'internal',
        heading: 'Remediation requires attention',
        intro: `A corrective action was recorded for ${input.title}. The finding is not closed until validation is complete.`,
        context: [
            { label: 'Finding', value: input.title },
            { label: 'Vendor', value: input.vendorName || '' },
        ],
        cta: { label: 'Review finding', url: input.ctaUrl },
    }, `Action required: Remediation requested for ${input.title}`);
}

export function automationWorkEmail(input: { title: string; why: string; dueAt?: Date | string | null; ctaUrl: string; source?: string }) {
    return renderTransactionalEmail({
        templateKey: 'automation.work',
        audience: 'internal',
        heading: 'Work needs a person',
        intro: input.why,
        context: [
            { label: 'Work', value: input.title },
            { label: 'Source', value: input.source || 'Supreme record' },
        ],
        dueValue: formatCustomerDate(input.dueAt),
        cta: { label: 'View work item', url: input.ctaUrl },
        helpNote: 'Supreme created this follow-up from a recorded event. A person must act. Automation did not accept risk, approve a vendor, or close a finding.',
    }, `Action required: ${input.title}`);
}

export function accountInvitationEmail(input: {
    invitedByName: string;
    organizationName: string;
    roleLabel: string;
    activateUrl: string;
}) {
    return renderTransactionalEmail({
        templateKey: 'account.invitation',
        audience: 'internal',
        organizationName: input.organizationName,
        heading: 'Activate your Supreme account',
        intro: `${input.invitedByName} invited you to join ${input.organizationName} on Supreme, a connected governance platform for third parties, risk, compliance, privacy, AI, evidence, and decisions.`,
        context: [
            { label: 'Organization', value: input.organizationName },
            { label: 'Role', value: input.roleLabel },
        ],
        cta: { label: 'Activate account', url: input.activateUrl },
        securityNote: 'This link expires in 7 days and can be used once. If you were not expecting this invitation, ignore this email. Do not forward the link.',
    }, 'Action required: Activate your Supreme account');
}

export function passwordResetTransactionalEmail(input: { resetUrl: string }) {
    return renderTransactionalEmail({
        templateKey: 'auth.password_reset',
        audience: 'security',
        kicker: 'Account security',
        heading: 'Reset your Supreme password',
        intro: 'A password reset was requested for this Supreme account. Use the single-use link below. It expires in 1 hour.',
        cta: { label: 'Reset password', url: input.resetUrl },
        securityNote: 'If you did not request this, ignore this email. The current password remains unchanged.',
    }, 'Action required: Reset your Supreme password');
}

export function findingAssignedEmail(input: { title: string; vendorName?: string; severity?: string; ctaUrl: string }) {
    return renderTransactionalEmail({
        templateKey: 'vendor.finding_assigned',
        audience: 'internal',
        heading: 'A finding was assigned to you',
        intro: `${input.title} was recorded and assigned. Review it inside Supreme before remediation or risk acceptance.`,
        context: [
            { label: 'Finding', value: input.title },
            { label: 'Vendor', value: input.vendorName || '' },
            { label: 'Severity', value: humanizeEmailTerm(input.severity) },
        ],
        cta: { label: 'Review finding', url: input.ctaUrl },
    }, `Action required: Review finding — ${input.title}`);
}

export function findingClosedEmail(input: { title: string; vendorName?: string; ctaUrl: string }) {
    return renderTransactionalEmail({
        templateKey: 'vendor.finding_closed',
        audience: 'internal',
        heading: 'A finding was closed',
        intro: `${input.title} was closed after governed validation. This message does not change residual risk.`,
        context: [
            { label: 'Finding', value: input.title },
            { label: 'Vendor', value: input.vendorName || '' },
        ],
        cta: { label: 'View finding', url: input.ctaUrl },
    }, `Finding closed — ${input.title}`);
}

export function remediationDueEmail(input: {
    title: string;
    vendorName?: string;
    dueAt?: Date | string | null;
    overdue?: boolean;
    ctaUrl: string;
}) {
    const due = formatCustomerDate(input.dueAt);
    return renderTransactionalEmail({
        templateKey: input.overdue ? 'vendor.remediation_overdue' : 'vendor.remediation_due_soon',
        audience: 'internal',
        heading: input.overdue ? 'Remediation is overdue' : 'Remediation is due soon',
        intro: input.overdue
            ? `${input.title} is past its remediation date. Review the finding and the assigned owner.`
            : `${input.title} is due soon. Continue remediation before the date below.`,
        context: [
            { label: 'Finding', value: input.title },
            { label: 'Vendor', value: input.vendorName || '' },
        ],
        dueValue: due,
        cta: { label: input.overdue ? 'Review finding' : 'Continue remediation', url: input.ctaUrl },
        reminder: true,
    }, input.overdue
        ? `Action required: Remediation is overdue — ${input.title}`
        : `Reminder: Remediation is due ${due || 'soon'} — ${input.title}`);
}

export function assessmentDueSoonEmail(input: {
    vendorName: string;
    publicId?: string;
    assessmentName?: string;
    dueAt?: Date | string | null;
    overdue?: boolean;
    ctaUrl: string;
}) {
    const due = formatCustomerDate(input.dueAt);
    const assessment = humanizeEmailTerm(input.assessmentName) || 'Assessment';
    if (input.overdue) {
        return assessmentOverdueEmail({
            vendorName: input.vendorName,
            publicId: input.publicId || input.vendorName,
            ctaUrl: input.ctaUrl,
        });
    }
    return renderTransactionalEmail({
        templateKey: 'vendor.assessment_due_soon',
        audience: 'internal',
        heading: 'An assessment is due soon',
        intro: `${assessment} for ${input.vendorName} is due soon.`,
        context: [
            { label: 'Vendor', value: input.vendorName },
            { label: 'Vendor ID', value: input.publicId || '' },
            { label: 'Assessment', value: assessment },
        ],
        dueValue: due,
        cta: { label: 'Continue assessment', url: input.ctaUrl },
        reminder: true,
    }, `Reminder: ${input.vendorName} assessment is due ${due || 'soon'}`);
}

export function complianceAttestationEmail(input: {
    campaignName: string;
    publicId?: string;
    dueAt?: Date | string | null;
    ctaUrl: string;
}) {
    return renderTransactionalEmail({
        templateKey: 'compliance.attestation_assigned',
        audience: 'internal',
        heading: 'An attestation needs your statement',
        intro: `${input.campaignName} needs an attestation. This is a governance statement, not a control test.`,
        context: [
            { label: 'Campaign', value: input.campaignName },
            { label: 'Campaign ID', value: input.publicId || '' },
        ],
        dueValue: formatCustomerDate(input.dueAt),
        cta: { label: 'Complete attestation', url: input.ctaUrl },
        nextSteps: [
            'Open the campaign in Supreme.',
            'Record the attestation for the assigned period.',
            'A reviewer can then complete governed review.',
        ],
    }, `Action required: Complete attestation for ${input.campaignName}`);
}

export function opsAlertEmail(input: { heading: string; intro: string; ctaUrl: string; ctaLabel?: string }) {
    return renderTransactionalEmail({
        templateKey: 'ops.alert',
        audience: 'security',
        kicker: 'Security notice',
        heading: input.heading,
        intro: input.intro,
        cta: { label: input.ctaLabel || 'View evidence', url: input.ctaUrl },
        securityNote: 'This is an operational security notice. It is not a marketing message.',
    }, input.heading);
}

export function legacyHighRiskIncidentEmail(input: {
    title: string;
    severity?: string;
    reportedBy?: string;
    description?: string;
    incidentRef?: string;
    ctaUrl: string;
}) {
    return renderTransactionalEmail({
        templateKey: 'legacy.high_risk_incident',
        audience: 'internal',
        heading: 'A high-severity incident needs review',
        intro: 'A high-severity incident was recorded and requires a person to review it in Supreme.',
        context: [
            { label: 'Incident', value: input.incidentRef || '' },
            { label: 'Title', value: input.title },
            { label: 'Severity', value: humanizeEmailTerm(input.severity) },
            { label: 'Reported by', value: input.reportedBy || '' },
        ],
        cta: { label: 'Review incident', url: input.ctaUrl },
        helpNote: input.description,
    }, `Action required: Review high-severity incident — ${input.title}`);
}

export function legacyComplianceDeadlineEmail(input: {
    framework?: string;
    requirement?: string;
    deadline?: Date | string | null;
    daysRemaining?: number | string;
    status?: string;
    ctaUrl: string;
}) {
    return renderTransactionalEmail({
        templateKey: 'legacy.compliance_deadline',
        audience: 'internal',
        heading: 'A compliance deadline is approaching',
        intro: 'A compliance requirement deadline is approaching. Review outstanding work in Supreme.',
        context: [
            { label: 'Framework', value: humanizeEmailTerm(input.framework) },
            { label: 'Requirement', value: input.requirement || '' },
            { label: 'Days remaining', value: input.daysRemaining == null ? '' : String(input.daysRemaining) },
            { label: 'Status', value: humanizeEmailTerm(input.status) },
        ],
        dueValue: formatCustomerDate(input.deadline),
        cta: { label: 'View compliance work', url: input.ctaUrl },
        reminder: true,
    }, 'Reminder: Compliance deadline approaching');
}

export function legacyAssessmentOverdueEmail(input: {
    assessmentType?: string;
    assessmentName?: string;
    dueDate?: Date | string | null;
    daysOverdue?: number | string;
    assignedTo?: string;
    ctaUrl: string;
}) {
    return renderTransactionalEmail({
        templateKey: 'legacy.assessment_overdue',
        audience: 'internal',
        heading: 'An assessment is overdue',
        intro: 'An assessment is past its due date and needs a person to complete or follow up.',
        context: [
            { label: 'Assessment', value: input.assessmentName || humanizeEmailTerm(input.assessmentType) },
            { label: 'Type', value: humanizeEmailTerm(input.assessmentType) },
            { label: 'Owner', value: input.assignedTo || '' },
            { label: 'Days overdue', value: input.daysOverdue == null ? '' : String(input.daysOverdue) },
        ],
        dueValue: formatCustomerDate(input.dueDate),
        cta: { label: 'Open assessment', url: input.ctaUrl },
        reminder: true,
    }, `Action required: Assessment is overdue — ${input.assessmentName || humanizeEmailTerm(input.assessmentType) || 'Assessment'}`);
}

export function legacyControlFailureEmail(input: {
    controlId?: string;
    controlName?: string;
    category?: string;
    impact?: string;
    ctaUrl: string;
}) {
    return renderTransactionalEmail({
        templateKey: 'legacy.control_failure',
        audience: 'internal',
        heading: 'A control failure needs review',
        intro: 'A control was recorded as failed. Investigate and record remediation in Supreme. This email does not close the control.',
        context: [
            { label: 'Control', value: input.controlName || input.controlId || '' },
            { label: 'Control ID', value: input.controlId || '' },
            { label: 'Category', value: humanizeEmailTerm(input.category) },
            { label: 'Impact', value: input.impact || '' },
        ],
        cta: { label: 'View control', url: input.ctaUrl },
    }, `Action required: Review control failure — ${input.controlName || input.controlId || 'Control'}`);
}

export const EMAIL_TEMPLATE_INVENTORY = [
    { key: 'vendor.intake_assigned', name: 'Internal vendor intake assignment', present: true },
    { key: 'vendor.tier_review', name: 'Analyst tier confirmation', present: true },
    { key: 'vendor.invitation', name: 'Vendor due-diligence invitation', present: true },
    { key: 'vendor.invitation_reminder', name: 'Vendor invitation reminder / resend', present: true },
    { key: 'vendor.invitation_sent_internal', name: 'Internal notice that invitation email was sent', present: true },
    { key: 'vendor.clarification_requested', name: 'Clarification requested', present: true },
    { key: 'vendor.assessment_submitted', name: 'Assessment submitted for review', present: true },
    { key: 'vendor.assessment_overdue', name: 'Vendor assessment overdue', present: true },
    { key: 'vendor.approval_required', name: 'Approval / decision required', present: true },
    { key: 'vendor.activated', name: 'Vendor approved / activated', present: true },
    { key: 'vendor.remediation_requested_internal', name: 'Internal remediation requested', present: true },
    { key: 'vendor.remediation_requested_vendor', name: 'Vendor-facing remediation request', present: true },
    { key: 'vendor.remediation_due_soon', name: 'Remediation due soon', present: true },
    { key: 'vendor.remediation_overdue', name: 'Remediation overdue', present: true },
    { key: 'vendor.assessment_due_soon', name: 'Assessment due soon', present: true },
    { key: 'vendor.finding_assigned', name: 'Finding assigned', present: true },
    { key: 'vendor.finding_closed', name: 'Finding closed after validation', present: true },
    { key: 'vendor.risk_acceptance_review', name: 'Dedicated risk-acceptance review request', present: false },
    { key: 'vendor.reassessment', name: 'Dedicated reassessment invitation', present: false },
    { key: 'compliance.attestation_assigned', name: 'Compliance attestation assigned', present: true },
    { key: 'automation.work', name: 'Automation-created work / reminder', present: true },
    { key: 'account.invitation', name: 'Account activation invitation', present: true },
    { key: 'auth.password_reset', name: 'Password reset', present: true },
    { key: 'ops.alert', name: 'Administrative / security / evidence scan alert', present: true },
    { key: 'legacy.high_risk_incident', name: 'High-risk incident (legacy notification service)', present: true },
    { key: 'legacy.compliance_deadline', name: 'Compliance deadline (legacy notification service)', present: true },
    { key: 'legacy.assessment_overdue', name: 'Assessment overdue (legacy notification service)', present: true },
    { key: 'legacy.control_failure', name: 'Control failure (legacy notification service)', present: true },
    { key: 'privacy.deadline', name: 'Dedicated privacy deadline email', present: false },
    { key: 'ai.approval', name: 'Dedicated AI Governance approval email', present: false },
    { key: 'intelligence.attention', name: 'Dedicated Intelligence attention email', present: false },
] as const;

export function emailPreviewFixtures() {
    const cta = 'https://example.test/vendor-onboarding/VND-2026-0042';
    const activate = 'https://example.test/vendor-assessment/activate?token=preview-token';
    return [
        vendorIntakeAssignedEmail({
            vendorName: 'Acme Cloud',
            publicId: 'VND-2026-0042',
            requesterName: 'Jordan Requester',
            dueAt: '2026-09-22',
            ctaUrl: cta,
        }),
        vendorInvitationEmail({
            contactFirstName: 'Casey',
            organizationName: 'Northwind Insurance',
            vendorName: 'Acme Cloud',
            dueAt: '2026-09-22',
            activationUrl: activate,
        }),
        vendorInvitationEmail({
            contactFirstName: 'Casey',
            organizationName: 'Northwind Insurance',
            vendorName: 'Acme Cloud',
            dueAt: '2026-09-22',
            activationUrl: activate,
            reminder: true,
        }),
        clarificationRequestedEmail({
            contactFirstName: 'Casey',
            organizationName: 'Northwind Insurance',
            vendorName: 'Acme Cloud',
            questionCount: 2,
            ctaUrl: 'https://example.test/vendor-assessment',
        }),
        assessmentSubmittedEmail({
            vendorName: 'Acme Cloud',
            publicId: 'VND-2026-0042',
            assessmentName: 'Information Security Assessment',
            ctaUrl: cta,
        }),
        approvalRequiredEmail({ vendorName: 'Acme Cloud', publicId: 'VND-2026-0042', ctaUrl: cta }),
        automationWorkEmail({
            title: 'Vendor finding needs review',
            why: 'Supreme identified a vendor finding that is overdue.',
            dueAt: '2026-09-22',
            ctaUrl: 'https://example.test/findings',
            source: 'Vendor finding',
        }),
        passwordResetTransactionalEmail({ resetUrl: 'https://example.test/reset-password?token=preview-token' }),
    ];
}

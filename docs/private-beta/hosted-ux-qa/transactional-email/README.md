# Supreme transactional email experience

**Item:** Premium Transactional Email Experience inside #12 Third Party lifecycle reconciliation  
**Scope:** Email templates, brand, and delivery truth only. Application pages were not redesigned.  
**#20:** no functional expansion. **#21:** not authorized.  
**Hosted proof:** not captured in this sprint. Local fixtures and `GET /api/system/email-previews` are not hosted inbox proof. Do not treat this file as hosted PASS.

## Shared design system

All transactional HTML is rendered by `backend/src/services/transactionalEmail.ts`.

Reusable parts: Supreme header, customer/organization context, heading, intro, context card, due date, priority, one primary CTA, What happens next, security/help, footer, plain-text fallback.

Preview without sending: `GET /api/system/email-previews` (organization admin). Fixture data only.

Platform identity: **Supreme** / **Supreme Governance Platform**. Vendor-facing From name: `{Organization} via Supreme`.

## Inventory (actual workflows only)

| Key | Name | Present |
|---|---|---|
| vendor.intake_assigned | Internal vendor intake assignment | yes |
| vendor.tier_review | Analyst tier confirmation | yes |
| vendor.invitation | Vendor due-diligence invitation | yes |
| vendor.invitation_reminder | Vendor invitation reminder / resend | yes |
| vendor.invitation_sent_internal | Internal notice that invitation email was sent | yes |
| vendor.clarification_requested | Clarification requested | yes |
| vendor.assessment_submitted | Assessment submitted for review | yes |
| vendor.assessment_due_soon | Assessment due soon | yes |
| vendor.assessment_overdue | Vendor assessment overdue | yes |
| vendor.approval_required | Approval / decision required | yes |
| vendor.activated | Vendor approved / activated | yes |
| vendor.remediation_requested_internal | Internal remediation requested | yes |
| vendor.remediation_requested_vendor | Vendor-facing remediation request (builder; send path only if a vendor contact is notified) | yes |
| vendor.remediation_due_soon | Remediation due soon | yes |
| vendor.remediation_overdue | Remediation overdue | yes |
| vendor.finding_assigned | Finding assigned | yes |
| vendor.finding_closed | Finding closed after validation | yes |
| compliance.attestation_assigned | Compliance attestation assigned | yes |
| automation.work | Automation-created work / reminder | yes |
| account.invitation | Account activation invitation | yes |
| auth.password_reset | Password reset | yes |
| ops.alert | Administrative / security / evidence scan alert | yes |
| legacy.high_risk_incident | High-risk incident (legacy notification service) | yes |
| legacy.compliance_deadline | Compliance deadline (legacy notification service) | yes |
| legacy.assessment_overdue | Assessment overdue (legacy notification service) | yes |
| legacy.control_failure | Control failure (legacy notification service) | yes |
| vendor.risk_acceptance_review | Dedicated risk-acceptance review request | no — acceptance is recorded in-app; decision emails cover review language |
| vendor.reassessment | Dedicated reassessment invitation | no — reassessment is started in-app; automation may create work |
| privacy.deadline | Dedicated privacy deadline email | no |
| ai.approval | Dedicated AI Governance approval email | no |
| intelligence.attention | Dedicated Intelligence attention email | no |

Present count: 26. Not present: 5. Do not invent the missing types.

Local fixture HTML/text (non-sensitive example data) is under `previews/`. Preview tokens are placeholders, not live activation secrets.

## Delivery truth

- Send email (4A) and Copy secure invitation link (4B) remain separate.
- Copy link records `vendor.secure_link_copied` / Link copied. It does not send mail or claim Email sent.
- Provider accept is Queued/Accepted, not inbox Delivered.

## CTA routes

| Email | Route |
|---|---|
| Internal intake | `/vendor-onboarding/{publicId}` |
| Vendor invitation | `/vendor-assessment/activate?token=` |
| Findings / remediation | `/findings` |
| Decision / approval | `/decision-briefs` |
| Compliance attestation | `/compliance/campaigns/{publicId}` |
| Evidence / scan alert | `/documents` |
| Automation work | source href or `/automation` |
| Account activate | `/activate?token=` |
| Password reset | `/reset-password?token=` |

## Hosted evidence index

Pending staging capture of:

1. Internal vendor-intake assignment
2. Vendor due-diligence invitation
3. Assessment / remediation / review
4. Approval / decision
5. Automation work notification if a published automation fires

Do not paste activation tokens in screenshots.

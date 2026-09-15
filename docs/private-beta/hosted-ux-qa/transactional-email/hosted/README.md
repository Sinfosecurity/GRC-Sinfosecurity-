# Hosted premium transactional email proof

**Date:** 2026-09-15  
**Item:** #12 premium transactional email closure  
**Tenant:** Elite Claims (`report-proof-20260913@staging.supremerisk.test`)  
**Environment:** https://supreme-risk-staging.onrender.com  
**API:** https://supreme-risk-staging-api.onrender.com  
**Production:** NO  
**Inbox clients:** Gmail / Outlook / Apple Mail **NOT TESTED**  
**#12 PASS:** NOT DECLARED  
**#20:** PAUSED — automation work email is an existing template preview only. No Automation feature was added.  
**#21:** NOT AUTHORIZED

Hosted preview endpoint `GET /api/v1/system/email-previews` returned `sent=false`. These captures are fixture renders from the hosted API, not inbox delivery.

## SHAs

| | SHA |
|---|---|
| Hosted API | `e250493c7dba98d882701acd83907f8cfaff1886` |
| Hosted frontend | `980f717d19d527acc9567eb330c03a540841e4b4` |
| Email implementation | `e6fd30c794058767e6a7698ff3b47766ef7c8156` |

Frontend SHA differs because `e250493` changed Jest ignore + a copy-link assertion only. Not silently treated as the same SHA.

Staging health email check was **DEGRADED**. Provider accepted/queued on the lifecycle send path (`VND-2026-0014`). Provider delivered: UNKNOWN. Real inbox: NOT TESTED.

## Representative templates

| Key | Subject | Display sender | Recipient role | Context | Due | CTA | Delivery |
|---|---|---|---|---|---|---|---|
| `vendor.intake_assigned` | Action required: Complete vendor intake for Acme Cloud | Supreme | Internal business owner | Vendor Acme Cloud / VND-2026-0042 | September 22, 2026 | Complete vendor intake | Preview only / not sent |
| `vendor.invitation` | Action required: Complete your due diligence for Northwind Insurance | Northwind Insurance via Supreme | Vendor contact | Organization Acme Cloud / Requested by Northwind Insurance | September 22, 2026 | Start assessment | Preview only / not sent |
| `vendor.invitation_reminder` | Reminder: Your due diligence for Northwind Insurance is due September 22, 2026 | Northwind Insurance via Supreme | Vendor contact | Same as invitation | September 22, 2026 | Continue assessment | Preview only / not sent |
| `vendor.clarification_requested` | Action required: Clarification requested by Northwind Insurance | Northwind Insurance via Supreme | Vendor contact | 2 questions | None on template | Continue assessment | Preview only / not sent |
| `vendor.assessment_submitted` | Review required: Acme Cloud submitted due diligence | Supreme | Internal analyst | Assessment submitted | Immediate review | Review submission | Preview only / not sent |
| `vendor.approval_required` | Decision required: Review Acme Cloud for approval | Supreme | Internal approver | Decision required | Immediate decision | Review decision | Preview only / not sent |
| `automation.work` | Action required: Vendor finding needs review | Supreme | Internal operator | Existing send-path template | September 22, 2026 | View work item | Preview only; #20 not exercised |
| `auth.password_reset` | Action required: Reset your Supreme password | Supreme | Account holder | Security | Link expiry in copy | Reset password | Forgot-password API 200; no raw token returned |

## Quality check

| Template | Who | Why | What | Do | Due | Click | Next |
|---|---|---|---|---|---|---|---|
| Internal intake | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| Vendor invitation | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| Reminder | PASS | PASS | PASS | PASS | PASS | PASS | PARTIAL — no “What happens next” block |
| Clarification | PASS | PASS | PASS | PASS | PARTIAL — no due date on this template | PASS | PARTIAL — no “What happens next” block |
| Submitted / approval | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| Automation work | PASS | PASS | PASS | PASS | PASS | PASS | PARTIAL — help note present, no “What happens next” heading |
| Password reset | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

Copy-only defects were recorded, not silently patched after the hosted SHA was already certified. No new send path was added.

## Rendering

- Desktop 1440 and mobile 375 HTML captures: no horizontal overflow.
- Semantic `h1`, one primary CTA, plain-text fallback: present.
- Dark-mode CSS (`prefers-color-scheme`) is in the HTML. Inbox dark-mode: NOT TESTED.
- Axe on the isolated HTML preview: serious `color-contrast` on label/kicker gold (`#8b7355` / `#b0893a`) against the cream card. Inbox-client contrast: NOT TESTED.
- Gmail / Outlook / Apple Mail placement: NOT TESTED.

## Security regression on this hosted SHA

- Forgot-password unknown vs known email: both 200, same customer message, no `resetToken`.
- Invitation single-use / resend invalidation / revoke: proved on the lifecycle walk (`VND-2026-0013` / `VND-2026-0014`).
- Password-reset hashing and 1-hour expiry remain in `authService` / CI on `e250493`.
- Preview tokens in this folder are placeholders; HTML captures use `token=REDACTED`.

## Screenshot index

Desktop/mobile HTML renders:

- `vendor-intake_assigned-desktop.png` / `-mobile.png`
- `vendor-invitation-desktop.png` / `-mobile.png`
- `vendor-invitation_reminder-desktop.png` / `-mobile.png`
- `vendor-clarification_requested-desktop.png` / `-mobile.png`
- `vendor-assessment_submitted-desktop.png` / `-mobile.png`
- `vendor-approval_required-desktop.png` / `-mobile.png`
- `automation-work-desktop.png` / `-mobile.png`
- `auth-password_reset-desktop.png` / `-mobile.png`

#13–#19 / Premium smoke (page loaded, not a new product walk):

- `regression-lifecycle.png`
- `regression-graph.png`
- `regression-shared-controls.png`
- `regression-risk.png`
- `regression-compliance.png`
- `regression-privacy.png`
- `regression-ai.png`
- `regression-intelligence.png`
- `regression-evidence.png`
- `regression-premium-home.png`

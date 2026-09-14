# ADR — TPRM vendor assessment access plane

**ADR ID:** ADR-TPRM-VENDOR-ACCESS  
**Status:** ACCEPTED for #12 Automation Closure Phase B  
**Date:** 2026-09-13  
**Starting SHA:** `e889bd5167bc1598854a65cfc935026615b1cef4`  
**Production-ready claim:** NO  
**#12 overall:** PARTIAL / OPEN  
**Phase C / #19 / #20:** NOT AUTHORIZED

## Context

Phase A ends at a confirmed due-diligence plan (`READY_TO_SEND`). Phase B must let a named vendor contact complete assigned questionnaires and upload evidence without becoming a customer-organization user.

`docs/ADR-IDENTITY-ADMIN-SUPPORT-ARCHITECTURE.md` remains controlling for customer and platform identity. It defines one identity plane and two security planes (`CUSTOMER`, `PLATFORM`). A vendor respondent is neither.

This ADR extends that decision. It does not replace it.

## Decision

Supreme adds a **bounded third access plane**: `VENDOR`.

```
                 SUPREME ACCESS PLANES
        CUSTOMER          PLATFORM          VENDOR
     tenant employees   Supreme operators   assessment contacts
     User + RBAC        User + platform     VendorContact + session
```

1. **VendorContact is the identity.** Do not create a `User` row for the vendor respondent. Do not add the contact to the customer organization.
2. **Invitation is not a session.** A cryptographically strong activation token is hashed at rest (`SHA-256`), single-use, expiring, revocable, and rotated on resend. The raw token appears only in the activation URL and is never stored.
3. **After activation, issue a bounded session JWT.** Claims: `plane=VENDOR`, `kind=vendor_session`, `sessionId`, `contactId`, `vendorId`, `organizationId`. Session lifetime is hours, not weeks. The activation token is consumed and cannot be reused.
4. **Long-lived secrets never remain in URLs** after activation. The browser stores a session token separately from the customer `token`.
5. **Authorization is vendor + organization + assigned assessment.** Email match alone never grants cross-tenant or cross-vendor access.
6. **Customer `authenticate()` rejects `plane=VENDOR`.** Vendor routes use `authenticateVendor()`. Frontend hiding is not authorization.
7. **Vendor may see only:** their vendor name, requesting organization name, assigned vendor-facing assessments, their responses, their uploads, submission state, and later clarification items. They must not see dashboards, other vendors, residual scores, analyst notes, unpublished findings, billing, platform admin, Governance Graph, or internal reports.
8. **MFA is not required** for private-beta vendor respondents. Lowest-friction secure activation is accepted. Future vendor SSO is an extension point, not this sprint.
9. **Reuse existing email, evidence, questionnaire, finding, audit, attention, and malware architecture.** No second TPRM product.
10. **Phase B stops at analyst-confirmed draft findings.** Remediation, risk acceptance, contract review, approval, activation, monitoring, and offboarding orchestration are Phase C.

## Invitation lifecycle

| Invitation status | Meaning |
|---|---|
| Pending | Token issued, not activated |
| Activated | Contact opened a session |
| Expired | Past `expiresAt` without activation |
| Revoked | Analyst revoked or resend rotated the token |
| Completed | Assigned assessments submitted |

| Email delivery status | Meaning |
|---|---|
| Queued / Accepted | Provider accepted the message |
| Sent | Provider reported send |
| Delivered | Provider reported delivery |
| Bounced / Delivery problem | Provider reported failure |
| Unknown | No provider event yet |

Provider accepted is not human inbox receipt.

## Alternatives rejected

| Alternative | Why rejected |
|---|---|
| Add vendor as an organization `User` | Violates tenant RBAC and leaks customer surfaces |
| Reuse `AccountInvitation` + customer activate | Would mint a normal tenant member |
| Magic-link session in the URL for the whole assessment | Long-lived secret in logs, referrers, and history |
| Separate vendor SaaS database | Second TPRM product |

## Consequences

- Additive tables: `VendorAssessmentInvitation`, `VendorPortalSession`, plus fields on `VendorContact`, `VendorOnboarding`, `VendorAssessment`, and `VendorIssue`.
- Recovery manifest must include the new authoritative tables.
- Rate limits for activation reuse the existing activation bucket. Questionnaire writes stay on the general API bucket. Evidence uploads reuse the upload bucket. Do not reuse the report bucket.
- Clarification is a bounded reopen of selected questions. It is not Phase C remediation.

# #12 Supreme Third Party private-testing certification

**Classification:** PRIVATE TESTING RELEASE CANDIDATE — not commercial production  
**Production deployed:** NO  
**Main merged:** NO  
**Production DNS changed:** NO  
**Live Stripe enabled:** NO  
**External pentest / SOC 2 / ISO 27001:** NOT performed and NOT required for #12  
**#13 started:** NO  

This document is internal certification evidence. It is **not** an independent security audit.

## Program position

Product Leadership authorized #12 as a **controlled private-testing release**, not a commercial GO. #11 remains **NO-GO** for paid production.

| Field | Value |
|---|---|
| Item | #12 Supreme Third Party Production v1 / Private Testing Release |
| Starting SHA | `0e52e203459b1d3a8130ad063a5284e33898144c` |
| Accepted #11 RC SHA | `5912ccafee28b87898548da9721adf79c5bbacb6` (ancestor) |
| Branch | `supreme-risk-transformation` |
| Implementation SHA | recorded after commit in `docs/SUPREME-PROGRAM-STATE.md` |
| Hosted CI | recorded after the quality workflow on the implementation SHA |

## What #12 is

A tester invited by Platform Owner / Support Admin should complete the principal TPRM path without developer intervention:

Account → Organization → Vendor → Inherent risk → Tiering → Assessment → Questionnaire → Evidence → Findings → Remediation → Residual risk → Decision/Approval → Monitoring → Reassessment → Reporting → Offboarding

## Environment model

`APP_ENVIRONMENT` / `VITE_ENVIRONMENT` classes: `production`, `staging`, `private-beta`, `test`, `development`.

Private-beta aliases: `private-beta`, `private_beta`, `privatebeta`, `beta`.

| Rule | Evidence |
|---|---|
| Internal label PRIVATE BETA / TEST | `backend/src/services/privateBetaEnvironment.ts`, `DevPreviewBanner` |
| Never masquerades as production | `productionClaim` is false; banner copy forbids production claims |
| Synthetic data only | Tester docs and banner |
| Auth / MFA / tenant / malware / audit remain real | No fail-open changes in #12 |
| Stripe test mode only if billing is exercised | Live Stripe not enabled |
| Secrets not committed | `.env.example` comments only |
| No fake security success | Monitoring still shows provider status independently of signal count |

Hosted staging remains `APP_ENVIRONMENT=staging`. A dedicated private-testing host should set `private-beta`. Do not set either value on commercial production.

## Tester account management

| Requirement | Implementation |
|---|---|
| No shared username/password | `privateTesterService.provision` returns `sharedPassword: false` and a one-time activation token |
| Unique identity | Email uniqueness + pending-invite conflict → 409 |
| Isolated organization | New `isDemo` organization per tester |
| Least-privilege roles | ORGANIZATION_ADMIN, ASSESSOR, APPROVER, VIEWER |
| Auditable | `private_beta.tester_provisioned` / `private_beta.tester_disabled` |
| Revocable | Disable users, revoke refresh tokens, revoke pending invites, suspend org |
| Customer cannot provision testers | `platform.testers.manage` only on PLATFORM_OWNER (via ALL) and SUPPORT_ADMIN |

Automated evidence: `backend/src/__tests__/private-tester.test.ts` — provision, activate, create vendor, cross-tenant 403/404, offboard retains records, disable blocks login, reuse email 409.

## TPRM lifecycle audit

| Stage | Customer path | Result |
|---|---|---|
| Account / activation | Unique invite → `/activate` | PASS |
| Organization | Isolated tester org created by platform | PASS |
| Vendor | Vendors → add vendor; required fields in UI | PASS |
| Inherent risk / tiering | Tier chosen; scores from explainable engine after assessment | PASS |
| Assessment / questionnaire | Vendor → Start Assessment; `?vendorId=` preselected | PASS |
| Evidence | Vendor → Evidence; upload linked to vendor; CLEAN-only download | PASS |
| Findings / remediation | Vendor → Findings; CAP, due date, visibility on Home | PASS |
| Residual risk | Vendor detail shows methodology version and factors | PASS |
| Decision | Vendor → Decision brief; explicit decision states | PASS |
| Monitoring | Honest empty / provider status; no invented signals | PASS |
| Reassessment | New assessment on same vendor; prior record retained | PASS |
| Reporting | Vendor → Reports with `?vendorId=`; empty states truthful | PASS |
| Offboarding | Two-step OFFBOARDING → TERMINATED; records retained; outstanding acknowledgement | PASS |

Discoverability gap closed in #12: vendor detail now exposes Evidence, Findings, Decision brief, Monitoring, Reports, and Offboard. Destination pages read `vendorId` from the query string.

## Assessments & questionnaires

Existing TPRM assessment APIs and UI remain the customer path. Completion still feeds residual-risk recalculation. Overdue assessments appear on Home when present. No new fake completion states were added.

## Evidence / malware

#3 remains PASS. #12 did not relax CLEAN-only download, fail-closed scanner policy, or support-cannot-mark-CLEAN. Feedback attachments must already be same-tenant CLEAN objects.

## Findings / remediation

Findings remain a first-class page. Overdue / unresolved items continue to feed the attention queue. Risk acceptance remains a disposition.

## Decision workspace

Decision Briefs still present inherent risk, residual risk, evidence confidence, open findings, monitoring alert count, rationale, and an explicit human decision. Acceptance does not rewrite the calculated snapshot.

## Reporting

Certified report catalog unchanged. Reports tests now run inside a router so vendor-scoped navigation does not break generation. Empty states remain truthful.

## Monitoring

Provider status and signal count remain independent chips. Empty copy does not claim successful monitoring.

## Offboarding

Customer path: `GET/POST /tprm/vendors/:vendorId/offboard`. Preview shows open findings, open assessments, evidence count, and audit count. Termination writes `OFFBOARDING_REVIEW` and does not delete records. `PROPOSED → OFFBOARDING` is now a legal lifecycle transition.

The older `POST /vendors/:id/offboard` ADMIN path remains for compatibility and still blocks open issues.

## Human tester feedback

Help & Support captures kind (Bug, UX, Feature, Security, Performance, Documentation), page/workflow, tester-perceived severity, timestamp, identity/tenant, optional CLEAN evidence object ID. Platform Support queue shows kind and a feedback diagnostics panel.

## Security testing (internal)

#12 re-ran local regression of previously certified suites, including tenant isolation, RBAC, entitlements, vendor lifecycle, and the full backend Jest suite. This is **internal testing**, not an independent pentest.

No #12 change weakened malware, MFA, rate limits, JWT, or tenant middleware.

## UX / browser / responsive

Customer forms use stacked layouts on narrow viewports. Application chrome sets `overflowX: hidden`. A full 8-width live-browser matrix (320–1920) was **not** executed in this sprint. No known P0/P1 clipping was introduced by the #12 UI. Result: **PARTIAL** (not an exit-criteria blocker).

## Performance baseline (private-beta, not scale)

| Measurement | Environment | Result |
|---|---|---|
| Backend Jest | Local developer machine, 2026-09-13 | 252 passed in 44.3s |
| Frontend Vitest | Local developer machine, 2026-09-13 | 114 passed in 8.0s |
| Hosted page smoke (#10) | Staging rehearsal | HOME 292 ms, customer login 250 ms, `/health` 223 ms |

This is **not** an enterprise-scale certification.

## Product truth

| Product | Status shown |
|---|---|
| Supreme Third Party | Private beta |
| Supreme Risk | Preview |
| Supreme Compliance | Preview |
| Supreme Privacy | Roadmap |
| Supreme AI Governance | Roadmap |
| Supreme Intelligence | Roadmap |
| Supreme Automation | Roadmap |

Landing no longer says “available now.”

## #1–#11 regression (without paid external services or production infra)

| Gate | #12 treatment |
|---|---|
| #1 TPRM foundation | Exercised by lifecycle + tests |
| #2 Stripe | Remains PARTIAL / CONDITIONALLY CLEARED. Live Stripe not enabled. |
| #3 Malware | Policy unchanged; suite included in full backend run |
| #4 Rate limits | Unchanged |
| #5 Backup / DR | Unchanged; not re-hosted |
| #6 Hosted CI | Must PASS on exact implementation SHA |
| #7 Platform console | Tester management added; existing console preserved |
| #8 Identity | Unique tester identities; MFA still required for platform |
| #9 Security review | No weakening; internal only |
| #10 Cutover rehearsal | Not re-run; production still not deployed |
| #11 Release checklist | Historical NO-GO preserved |

## Defects

| Severity | Open |
|---|---|
| P0 | 0 known |
| P1 | 0 known |
| P2 | Invitation email/in-app notify may fail when the inviter is not a member of the new tester org; the one-time activation URL is still shown to Platform Owner |
| P3 | HelpSupport unit test `act(...)` warning; dedicated private-beta host is not the current Render staging label |

## Exit criteria

| Criterion | Result |
|---|---|
| Principal TPRM lifecycle usable end-to-end | PASS |
| Individual private tester control | PASS |
| Tenant isolation | PASS (automated) |
| No known P0/P1 | PASS |
| Evidence security | PASS |
| Reports | PASS |
| Previous security controls regress | PASS locally; hosted CI required |
| Tester feedback workflow | PASS |
| Private-beta documentation | PASS |
| Hosted CI on exact implementation SHA | recorded after push |
| No fake production/certification claims | PASS |
| External pentest / SOC 2 / ISO | Not required |
| Paid production infrastructure | Not required for private testing |

## Customer readiness

| Question | Answer |
|---|---|
| Ready for controlled private testing with synthetic data | YES after hosted CI PASS on the implementation SHA |
| Ready for paid commercial production | NO |

## Do not

Do not merge `main`. Do not deploy commercial production. Do not change production DNS. Do not enable live Stripe. Do not create fake certifications. Do not create shared tester credentials. Do not put real customer-sensitive data into beta. Do not start #13.

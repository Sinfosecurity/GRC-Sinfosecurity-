# Sprint 2 — Authorization and Separation of Duties

**Findings:** H-2 (broken legacy RBAC / unauthorized approvals), H-7 (missing maker-checker)  
**Branch:** `supreme-risk-transformation`  
**Starting SHA:** `7dac1ba30f3cddfa51ab7080cda03a94b10b62af`  
**Implementation SHA:** `fdd0b9d713cc9bc155bb56f799e8bb8aeada7232`  
**Documentation / hosted SHA:** `7717b5cefbdc4cae70e46e51a0ab9e42f0519e2a`  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35084379243 PASS (452 backend / 187 frontend)  
**Scope:** Customer-plane authorization and material decision SoD only. H-4, H-5, H-6, and #21 were not started.

H-2 and H-7 are **CLOSED** on implementation + CI + hosted two-user proof. This file is engineering evidence. It is not commercial production acceptance and does not declare #12 PASS.

---

## Original findings

### H-2 — Broken legacy RBAC / unauthorized approvals

`canonicalizeRole` mapped unknown names (`EXECUTIVE`, `BOARD_MEMBER`, `CFO`) to `VIEWER`. `authorize('ADMIN','RISK_MANAGER','EXECUTIVE')` therefore admitted every viewer. `COMPLIANCE_OFFICER` aliased to `ASSESSOR`, so assessors reached vendor approve/onboard/close routes. Approval workflow steps had only `authenticate`. Decision-brief generation used `approval.read` (held by VIEWER). Risk-appetite PUT spread the raw body, including client-supplied `approvedBy`.

### H-7 — Missing maker-checker

The same actor could generate and decide a Decision Brief, request and accept residual risk, attest a contract and approve the vendor, create and decide a compliance exception, attest and review an attestation, and supply `decisionMaker` from the request body on AI approvals.

---

## Root cause

Supreme already had one permission map in `backend/src/security/rbac.ts`. Legacy routes compared role-name allowlists through `roleMatches`, and unknown allowed names canonicalized to VIEWER. Domain services then re-checked role lists (`REVIEW_ROLES`, `APPROVAL_AUTHORITY`) that included ASSESSOR on material decisions. Prepare and decide were often the same call.

---

## Legacy RBAC inventory

| Surface | Legacy construct | Disposition |
|---|---|---|
| `vendorOnboarding.routes.ts` `REQUEST_ROLES` / `REVIEW_ROLES` | Role allowlists including PLATFORM_* and COMPLIANCE_OFFICER | Replaced with `requirePermission` |
| `vendor.routes.ts` `authorize('ADMIN','COMPLIANCE_OFFICER',…)` | ASSESSOR reached approve/close | Replaced with canonical permissions |
| `approval.routes.ts` create/approve | Authenticate only on decide | `approval.decide` + assigned-step and current-step checks |
| `risk-appetite.routes.ts` `EXECUTIVE` / `BOARD_MEMBER` | VIEWER bypass | `risk.appetite.manage` / `risk.read`; `approvedBy` from session |
| `risk-history.routes.ts` `EXECUTIVE` | VIEWER bypass | `risk.read` / `risk.manage` |
| `concentration.routes.ts` `EXECUTIVE` / `CFO` / `BOARD_MEMBER` | VIEWER bypass | `risk.read` / `risk.manage` / `report.read` |
| `tprm.routes.ts` generate brief | `approval.read` | `finding.update` or `approval.decide` |
| `vendorLifecycleClosureService` `canReview` / `APPROVAL_AUTHORITY.LOW` includes ASSESSOR | Service-level bypass | Permission + tier authority; ASSESSOR cannot decide |

No second authorization system was added. `authorize()` remains fail-closed for any leftover caller.

---

## Canonical roles

Customer plane: `ORGANIZATION_ADMIN`, `RISK_MANAGER`, `ASSESSOR`, `APPROVER`, `BUSINESS_OWNER`, `AUDITOR`, `VIEWER`.

Platform plane (unchanged, blocked from tenant content by `rejectPlatformTenantContent`): `PLATFORM_OWNER`, `PLATFORM_ADMIN`, `SUPPORT_ADMIN`, `SUPPORT_ANALYST`, `BILLING_SUPPORT`, `SECURITY_ADMIN`.

### Aliases (kept)

| Stored / historical name | Canonical |
|---|---|
| `ADMIN`, `ORG_ADMIN`, `ORG_OWNER` | `ORGANIZATION_ADMIN` |
| `MANAGER` | `RISK_MANAGER` |
| `COMPLIANCE_OFFICER`, `COMPLIANCE_MANAGER`, `CONTRIBUTOR` | `ASSESSOR` |
| `DEPARTMENT_MANAGER` | `BUSINESS_OWNER` |
| `USER` | `VIEWER` |
| `SUPERADMIN` | `PLATFORM_ADMIN` |

### Obsolete / unknown (fail closed)

`EXECUTIVE`, `BOARD_MEMBER`, `CFO`, empty role, and any other unknown string → `null`. No permissions. `roleMatches` does not treat an unknown allowed name as VIEWER.

Unknown role never gains privilege.

---

## Canonical permissions reused

Existing vocabulary in `PERMISSIONS` was reused. No parallel `vendor.view` / `decision.prepare` dictionary was invented.

Material decide permissions: `approval.decide`, `risk.accept`, `finding.close`, `exception.approve`, `attestation.review`, `ai.approve`, `dpia.approve`, `risk.appetite.manage`.

Prepare permissions already held by assessors: `finding.update`, `assessment.create`, `exception.create`, `requirement.attest`, `ai.assess`.

---

## Maker-checker policy

Shared helper: `backend/src/security/separationOfDuties.ts`.

Self-approval returns **403** with: `Another authorized reviewer must approve this decision.`

Identity, tenant, and actor fields come from the authenticated session. Body `approvedBy`, `organizationId`, `decisionMaker`, and `createdBy` are ignored for attribution.

| Decision | Prepare | Approve | Self-approve |
|---|---|---|---|
| TPRM risk acceptance | `POST .../accept-risk` | `POST .../accept-risk/approve` | Denied |
| Vendor final approval | Contract attest records `approvalPreparedBy` | `POST .../approval` | Denied |
| Decision Brief | `generate` records `preparedByUserId` | `decide` | Denied |
| Compliance exception | Create binds owner to actor | `/exceptions/:id/decision` | Denied |
| Compliance attestation | Attest binds attestor | `/attestations/:id/review` | Denied |
| AI governance | Latest assessment preparer | `POST /ai-governance/approvals` (decisionMaker from session) | Denied when an assessment exists |
| Enterprise risk | Creator / owner | `/erm/risks/:id/decisions` | Denied |
| Privacy DPIA | Owner / first history actor | DPIA decision | Denied |
| Workflow step | Initiator | Step approve; assigned user and current step required | Denied |

### Intentionally excluded

Drafts, questionnaire answers, evidence upload, comments, assignment, routine monitoring, navigation, ordinary record edits, intake save, pack confirmation, send/resend, and vendor activation after an independent approval.

Risk acceptance still must not change residual score (C-1 unchanged).

---

## Actor binding

- Session `req.user.id` / `req.user.organizationId` only.
- `rejectClientTenantOverride` remains on modern routes.
- Platform staff cannot call customer-plane decision routes without leaving the platform plane (`rejectPlatformTenantContent`).
- Support roles do not receive `approval.decide` or `risk.accept`.

Schema added for provenance: `RiskDecisionBrief.preparedByUserId`, `VendorOnboarding.approvalPreparedBy` / `approvalPreparedAt` / recommendation fields, `VendorIssue.acceptanceRequestedBy` / `acceptanceRequestedAt`. Migration `20260916120000_maker_checker_provenance`.

---

## Tests

### Negative

- Unknown role fail-closed (`rbac.test.ts`, H-2/H-7 suite)
- VIEWER cannot approve risk acceptance
- ASSESSOR cannot approve vendor, close findings, or use legacy `/vendors/:id/approve` or `/issues/:id/close`
- Preparer cannot approve own risk acceptance, vendor decision, Decision Brief, compliance exception, or attestation
- `approvedBy` / `organizationId` spoof ignored
- Cross-tenant approver denied
- Platform / support tokens do not become customer decision-makers

### Positive

- Authorized preparer can request acceptance
- Independent same-tenant approver can accept residual (score unchanged) and approve a vendor
- Audit fields record preparer and actual approver
- Phase C lifecycle still completes with two actors

---

## Hosted two-user proof

Staging only. API `/health` and frontend `version.json` both `7717b5cefbdc4cae70e46e51a0ab9e42f0519e2a`. Tenant Elite Claims `05d7821b-cab1-44af-9f5c-1f528a2d0a0e`. Vendor `VND-2026-0024`.

| Actor | Account | Role |
|---|---|---|
| User A (preparer) | `report-proof-20260913@staging.supremerisk.test` | `ORGANIZATION_ADMIN` `e5fe1b60-a942-4127-b994-7206ea3cedbb` |
| User B (approver) | `sales@eliteadjustersny.com` | `ORGANIZATION_ADMIN` `9efdbc83-8b3a-48e4-8ba1-f993c0741c22` |
| Unauthorized | User B patched to `VIEWER`, then restored | 403 Insufficient permissions |
| Cross-tenant | Fresh signup `sprint2-cross-*@staging.supremerisk.test` | 404 on A's vendor |
| Platform admin | `admin@sinfosecurity.com` | 404 on customer onboarding |

Observed:

1. A prepared risk acceptance. A self-approve → **403** `Another authorized reviewer must approve this decision.` B approved → **200**. `acceptanceRequestedBy=A`, `acceptanceAuthority=B`. Residual **79** before approve and after approve. The earlier **87** reading was taken before finding close, not before acceptance.
2. A attested the contract (`readyForIndependentApproval=true`). A self-approve vendor → **403** same message. B approved `APPROVE_WITH_CONDITIONS`. `approvalPreparedBy=A`. Vendor became **ACTIVE**.
3. Viewer approve denied. Cross-tenant approve denied. Platform admin did not become a customer decision-maker.
4. Body `approvedBy` / `organizationId` did not bind the recorded actor or tenant (`Cannot act on another organization` on spoofed create).
5. Cross-module: A created `EXC-00002`. A decide → **403** SoD message. B decide → **200** `ownerUserId=A` `approverUserId=B`.
6. Authenticated Home and Active workspace: no overflow at 375/768/1024/1440/1920. axe serious=0 critical=0. Keyboard focus moved. Product CSP was not changed; Playwright `bypass_csp` was used only to run axe.

Machine log: `docs/private-beta/hosted-ux-qa/sprint-2-authorization/results.json`.

---

## Remaining limitations

- H-4 Phase C finding-closure evidence bypass was not remediated (authorization only).
- H-5 and H-6 remain open.
- AUD-1 immutable audit was not implemented.
- `#12` remains PARTIAL. H-4, H-5, and H-6 are still open. Product Leadership independently reviews this sprint. Commercial production remains NO-GO.
- A generated route × role matrix test was not added; explicit negative/positive cases cover the H-2/H-7 claims.
- `COMPLIANCE_OFFICER` remains an ASSESSOR alias. Approval routes no longer use that alias as an allowlist.
- Intelligence narrative `ERROR` vs `NOT_CONFIGURED` can flake when the AI provider is unavailable; that path was not changed.

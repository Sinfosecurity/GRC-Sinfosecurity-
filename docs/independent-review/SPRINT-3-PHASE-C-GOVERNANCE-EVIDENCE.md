# Sprint 3 — Phase C Governance and Evidence Integrity

**Finding:** H-4  
**Branch:** `supreme-risk-transformation`  
**Starting SHA:** `7717b5cefbdc4cae70e46e51a0ab9e42f0519e2a`  
**Authoritative product implementation beneath baseline:** `fdd0b9d713cc9bc155bb56f799e8bb8aeada7232`  
**Implementation SHA:** `f78580555bc9a39f1f843fe03a68f971ec36678c`  
**Proof-script SHA:** `473d1c56fd4abcbddad87daa09669c24ebede75f`  
**Documentation SHA:** recorded after hosted proof  
**Scope:** Phase C lifecycle and evidence integrity only. H-5, H-6, and #21 were not started.

This file is engineering evidence. Cursor does **not** declare H-4 CLOSED, #12 PASS, private beta ready, commercial GO, production ready, or #21 authorized.

---

## Original H-4 finding

`CLAUDE-INDEPENDENT-CODE-REVIEW.md` H-4 (HIGH, CONFIRMED): Phase C governance and evidence controls were bypassable, and evidence that should not count still counted.

Confirmed bypasses:

- Legacy `POST /tprm/findings/:id/close` and `POST /vendors/issues/:id/close` called `vendorIssueService.closeIssue` with no scan gate, no confirmed-state check, and no audit.
- Legacy `POST /vendors/:id/approve` and `/onboard` set APPROVED / ACTIVE by status only.
- Soft-deleted evidence still satisfied `usableEvidenceWhere` and `closeFinding`.
- Rejected evidence still counted.
- `hasEvidence` was set regardless of scan status.
- Risk acceptance dropped residual on the next recalculation because `RISK_ACCEPTED` was omitted from scoring statuses (already mitigated in Sprint 2 C-1; reproved here).

---

## Write-path inventory

Traced from mounted routers in `backend/src/server.ts`. Route names were not treated as safety.

### Canonical Phase C routes

Mounted at `/api/v1/vendors/onboarding` (`vendorOnboarding.routes.ts`):

| Method | Path | Service | Guard |
|---|---|---|---|
| POST | `/:id/findings/:findingId/review` | `reviewFinding` | Draft dismiss only. Confirmed findings cannot be dismissed to CLOSED. |
| POST | `/:id/findings/:findingId/remediate` | `planRemediation` | Sets IN_PROGRESS. Does not close. |
| POST | `/:id/findings/:findingId/validate` | `validateFinding` | Sets RESOLVED / IN_PROGRESS. Does not close. RESOLVED remains an open governance status. |
| POST | `/:id/findings/:findingId/close` | `closeFinding` → `assertFindingMayClose` → `closeIssue` | Confirmed + validated + tenant/vendor CLEAN evidence. |
| POST | `/:id/findings/:findingId/accept-risk` | `acceptFindingRisk` | Prepare only. Residual unchanged. |
| POST | `/:id/findings/:findingId/accept-risk/approve` | `approveFindingRisk` | H-7 independent reviewer. Residual unchanged. |
| POST | `/:id/contract/attest` | `attestContract` | Server-side required clauses. Sets `contractAttestedAt`. |
| POST | `/:id/approval` | `decideApproval` → `requireVendorApprovalEligibility` | Tenant, RBAC, maker-checker, contract, no open confirmed findings. |
| POST | `/:id/activate` | `activateVendor` → `requireActivatableVendor` | Human approval already recorded. |
| GET/POST | `/:id/reassessment` | `recommendReassessment` / `startReassessment` | History preserved. |
| POST | `/:id/offboard` | `startOffboarding` | History preserved. |

Vendor-portal writes (`/api/v1/vendor-portal`) submit answers and evidence. They set questionnaire `hasEvidence` only for CLEAN objects and never close findings or activate the vendor register status.

### Legacy / compatibility routes

Mounted and delegated to the same services:

| Method | Path | Disposition |
|---|---|---|
| POST | `/api/v1/tprm/findings/:issueId/close` | COMPATIBILITY → `closeFinding` |
| POST | `/api/v1/vendors/issues/:issueId/close` | COMPATIBILITY → `closeFinding`; preserves 409 status |
| POST | `/api/v1/vendors/issues/:issueId/accept-risk` | COMPATIBILITY → `acceptFindingRisk` or `approveFindingRisk` if already prepared by another actor |
| POST | `/api/v1/vendors/:id/approve` | COMPATIBILITY → `decideApproval` |
| POST | `/api/v1/vendors/:id/onboard` | COMPATIBILITY → `activateVendor` |
| POST | `/api/v1/vendors/issues/:issueId/remediation` | COMPATIBILITY → `submitRemediation` (PENDING_VALIDATION only) |
| POST | `/api/v1/vendors/issues/:issueId/validate` | COMPATIBILITY → `validateRemediation` (not closure) |
| POST | `/api/v1/contracts/:contractId/approve` | COMPATIBILITY commercial-contract record. Does **not** set `contractAttestedAt` or vendor ACTIVE. |

### Generic update routes

| Method | Path | Governed fields |
|---|---|---|
| PUT | `/api/v1/vendors/:id` | `UpdateVendorSchema` has no status/scores. `updateVendor` still strips `status`, `residualRiskScore`, `inherentRiskScore`. Tier still goes through hard-floor rules (H-3). |
| PUT | `/api/v1/vendors/issues/:issueId` | **UNMOUNTED**. 404. Cannot set CLOSED. |
| PUT | `/api/v1/vendors/issues/:issueId/cap` | CAP text only. |
| PUT | `/api/v1/vendors/contracts/:contractId` | Commercial fields. Does not set onboarding `contractAttestedAt`. |
| PATCH onboarding stage/status | none mounted | Dead. Stage changes only through lifecycle services. |

### Service-level guards

`backend/src/services/phaseCGovernance.ts` — one engine, reused by canonical routes, compatibility routes, and `closeIssue`:

- `requireClosableFinding`
- `requireValidClosureEvidence`
- `assertFindingMayClose`
- `openConfirmedFindings` (OPEN, IN_PROGRESS, PENDING_VENDOR, PENDING_VALIDATION, REMEDIATED, RESOLVED, ESCALATED)
- `requireVendorApprovalEligibility`
- `requireActivatableVendor`
- `GOVERNED_VENDOR_FIELDS`

`vendorIssueService.closeIssue` and `acceptRisk` now enforce the same gates, so a future route or job cannot status-write around the routes.

### Unmounted / dead

- `UpdateVendorIssueSchema` / `IssueStatusSchema` — validator only, no mounted generic issue update.
- `PROPOSED → ACTIVE` was removed from `vendorLifecycle.ts` generic transitions. Activation still performs the internal APPROVED → ACTIVE step after gates.

---

## Canonical governance path

FINDINGS → REMEDIATION → EVIDENCE VALIDATION → RISK ACCEPTANCE where applicable → CONTRACT REVIEW → INDEPENDENT HUMAN APPROVAL → ACTIVE → MONITORING → REASSESSMENT / OFFBOARDING.

ACTIVE is an outcome of `activateVendor`. It is not a client-writable vendor field.

---

## Finding closure rules

A finding closes only through `assertFindingMayClose`:

1. Finding exists in the actor tenant.
2. `reviewState = CONFIRMED`. Draft dismiss is a separate review action and cannot be used on confirmed findings.
3. `validatedAt` is set (analyst validation).
4. Evidence exists.
5. Evidence `organizationId` matches.
6. Evidence `ownerId` is this vendor.
7. `scanStatus = CLEAN`. PENDING / FAILED / INFECTED / NOT_CONFIGURED / unknown are blocked.
8. `deletedAt` is null.
9. Evidence is linked to this finding, already named on the finding, or named in the close request. Evidence already linked to a **different** finding is unrelated.
10. No current REJECTED `EvidenceGovernanceLink`.

Customer 409 copy: `This finding cannot be closed yet. …`

Malware fail-closed was not weakened.

---

## Remediation rules

Vendor or analyst "fixed" / remediation submit → `PENDING_VALIDATION` or `IN_PROGRESS`.  
Validation → `RESOLVED`.  
`RESOLVED` still blocks approval and activation.  
Only `closeFinding` or independent risk acceptance removes the finding from `openConfirmedFindings`.

---

## Risk acceptance relationship

Internal disposition. Prepare then independent approve (H-7). Residual score is compared before/after approve and `RISK_ACCEPTED` remains in `SCORING_FINDING_STATUSES`, so recalculation does not lower residual. Acceptance does not close evidence requirements on other findings and does not activate the vendor.

---

## Contract, approval, activation gates

- Approval requires `contractAttestedAt` written by `attestContract` after required clauses. Body `contractComplete` is not trusted.
- Approval requires no open confirmed findings.
- Approval is a human decision with maker-checker.
- REJECT skips prerequisite gates.
- Activation requires APPROVE or APPROVE_WITH_CONDITIONS and no open confirmed findings.
- Generic PUT cannot set ACTIVE or APPROVED.

---

## Evidence integrity

- `objectStorageService.remove` sets `deletedAt` and end-dates `EvidenceGovernanceLink.validTo`.
- `usableEvidenceWhere` filters `deletedAt: null` and `reviewStatus != REJECTED`.
- `evidenceLinkageService` sets questionnaire `hasEvidence` only when `scanStatus = CLEAN`.
- `malwareScanService` updates `hasEvidence` from the scan result.
- Reuse remains the existing CLEAN reuse path. No second evidence repository.

---

## Tests

`backend/src/__tests__/independent-review-h4.phase-c.test.ts` plus existing Phase C, C-1, H-2/H-7, and vendor-lifecycle suites.

### Negative

1. Close without evidence → 409  
2. Pending scan → 409  
3. Failed scan → 409  
4. CLEAN but unvalidated → 409  
5. Foreign-tenant evidence → 409  
6. Other-vendor evidence → 409  
7. Evidence linked to another finding → 409  
8. Legacy `/vendors/issues/:id/close` and `/tprm/findings/:id/close` same gate  
9. Generic issue PUT cannot set CLOSED  
10. Confirmed finding cannot be dismissed  
11. Vendor remediation does not close  
12. Risk acceptance does not change residual after recalc  
13. Preparer self-approval 403  
14. Generic vendor PUT cannot set ACTIVE  
15. Approval before contract 409  
16. Approval while unresolved confirmed findings exist 409  
17. Activation before approval 409  
18. Body status spoof ignored  
19. Cross-tenant close 403/404  
20. Viewer close 403  

### Positive

1. CLEAN validated linked/named evidence closes  
2. Independent risk acceptance  
3. Contract attest  
4. Independent APPROVE_WITH_CONDITIONS  
5. Governed activation  
6. Monitoring payload present  
7. Reassessment endpoint 200  

---

## Hosted bypass proof

Staging only. Scripts: `scripts/hosted-sprint-3-phase-c-proof.py` and `scripts/hosted-sprint-3-phase-c-followup.py`.  
Evidence folder: `docs/private-beta/hosted-ux-qa/sprint-3-phase-c-integrity/`.  
Historical QA folders were not overwritten. Production was not deployed.

**Fresh vendor:** `VND-2026-0025` on Elite Claims `05d7821b-cab1-44af-9f5c-1f528a2d0a0e`.  
**Hosted API SHA:** `f78580555bc9a39f1f843fe03a68f971ec36678c`  
**Hosted frontend SHA:** `473d1c56fd4abcbddad87daa09669c24ebede75f`

| Check | Result |
|---|---|
| Request → Intake → Tier → Packs → Send → Vendor portal → Questionnaire → Evidence → Submit → Review → Finding | PASS |
| Invalid close without evidence | DENIED 409 `This finding cannot be closed yet. An analyst must validate remediation.` |
| Legacy `/vendors/issues/:id/close` | DENIED 409 same copy |
| TPRM `/tprm/findings/:id/close` | DENIED 409 same copy |
| Generic PUT issue CLOSED | 404, status unchanged |
| Generic PUT vendor ACTIVE | ignored; vendor stayed PROPOSED |
| Approval before contract | DENIED 409 |
| Premature activation | DENIED 409 |
| Vendor remediation | IN_PROGRESS, not CLOSED |
| Valid CLEAN close | PASS 200 |
| Risk acceptance residual | 79 before additional acceptance, 79 after. The earlier 87→79 drop was finding close, not acceptance. |
| Preparer self-approve | DENIED 403 |
| Contract attest | PASS on retry after a transient 520 |
| Independent APPROVE_WITH_CONDITIONS | PASS |
| ACTIVE + monitoring + reassessment | PASS |
| Home / workspace 375–1920 overflow | none |
| axe serious + critical | 0 |
| Keyboard Tab | PASS |
| CSP weakened | NO |

Blocked-state copy on the Active workspace was PARTIAL in the first Playwright pass because the journey had already moved past the 409 close; the API returned customer-safe copy on every denied close.

---

## Remaining limitations

- H-4 remains OPEN for Product Leadership closure. This sprint reports engineering implemented plus hosted proof, not program CLOSE.
- H-5 and H-6 remain open and were not started.
- Compatibility routes remain mounted for documented customers/tests. They now share the canonical guards.
- `POST /contracts/:id/approve` still marks a commercial `VendorContract` ACTIVE. It does not satisfy Phase C contract attestation.
- AUD-1 immutable audit was not implemented.
- #12 remains PARTIAL. Commercial production remains NO-GO. #21 remains PAUSED.

# #12 Manual-walk remediation + Wave 4 review enablement

**Date:** 2026-09-19  
**Authority:** Product Leadership hosted walk, 2026-09-19  
**Starting SHA:** `f19bcea3119e928001447995244c7fc19ff6758b`  
**Implementation SHA:** `63c2c39b228d3e2daeaa013235002b3591ff53e0`  
**Hosted frontend/API:** `63c2c39b228d3e2daeaa013235002b3591ff53e0`  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35457961925 PASS  
**Commercial production:** NO-GO  
**Wave 5:** Not started  
**#12:** Not PASS  
**Wave 4:** Implemented — Product Leadership review evidence updated. Not accepted.

This package corrects Waves 1–3 defects found on the hosted Golden Journey walk, then continues the same Microsoft QA case into Wave 4 through the product. It does not redesign the approved journey.

## Architecture lock preserved

- Third Party ≠ Engagement
- Vendor remains VendorContact → VendorAssessmentInvitation → activation → VendorPortalSession
- No Vendor User
- V3 IRA weights, floors, and tier rules unchanged
- Shared Evidence / StoredObject / malware fail-closed reused for requester attachments
- Findings, control effectiveness, and residual risk remain Engagement-specific
- Missing evidence ≠ Finding
- Negative answer ≠ Finding until a reviewer confirms a candidate

## 409 root cause

**Endpoint:** `POST /api/v1/vendor-portal/assessments/:id/submit`

**Observed:** 45/45 answered, 0 unanswered, 44 evidence outstanding, attestation checked, UI showed `Request failed with status code 409`.

**Server-side condition:** `submissionChecklist()` counted every question with `expectedEvidence` text as `evidenceRequired`. Submit then:

- if `vendorAssessment.engagementId` was **absent**, blocked when `unanswered + evidenceMissing > 0`
- if `engagementId` was **present**, Wave 3 previously allowed missing evidence and only blocked unanswered required questions

The hosted 44-evidence conflict matches the complete-check that treats expected-evidence guidance as mandatory. The user-visible string was axios default because `vendorApi` had **no response interceptor**, so the API business message never reached the screen.

**Correction:** workbook `expectedEvidence` with `evidenceId: null` is **OPTIONAL**. Only an explicit required evidence binding is **REQUIRED**. Required unanswered questions and required unusable evidence block submit on every path. Optional evidence is preserved for specialist review. The vendor client now maps 409 to the server message.

**Hosted result:** Azure Hosting QA Baseline (45 questions) submitted HTTP 200 with `evidenceRequiredCount: 0` and optional evidence left open. Answers locked afterward (409).

## Evidence requirement rule

| Template signal | Expectation | Submit |
| --- | --- | --- |
| `evidenceId` + catalog `required: Yes` | REQUIRED | Block if missing or unusable |
| `expectedEvidence` text and `evidenceId: null` | OPTIONAL | Do not block |
| neither | NOT REQUIRED | Do not block |

`CLEAN` is never invented. Non-clean files remain unusable.

## Assessment completeness rule

Questionnaire questions are required unless the template sets `required: false`. UI and backend now both block unanswered required questions. Optional unanswered questions are not created by the current workbook.

## IRA jurisdiction model

Requester captures actual ISO countries for:

- data storage countries
- data processing / access countries
- Don't know / Not yet confirmed

IR-09 still uses the approved mapping only:

- all selected countries = organization country → `country` → 0
- all selected countries in the same UN M49 region → `region` → 1
- any selected country outside that region → `outside` → 2
- Don't know → blocks rating

No new weights. If the organization country is not in the catalog, scoring stops and reports `ORG_COUNTRY_UNMAPPED`.

**Hosted persistence (ENG-2026-0002):** storage `US`, processing `US|IE`, derived `a6=outside`, recommended **LOW 3.6%**. Organization country is `US`. Ireland is outside Northern America, so outside is deterministic.

## IRA state source of truth

Golden Journey authority is **EngagementIra**. Legacy VendorOnboarding / RequesterTaskLink is used only when no Engagement IRA exists.

Hosted Azure labels after remediation: `TIER_REVIEW` / `Vendor in progress` / `Residual risk ready` — one status, one next action. The competing `IRA sent` + `IRA NOT SENT` pair is gone.

## Requester attachment architecture

Clarification / RFI responses accept written text plus optional Shared Evidence:

`StoredObject` + `EvidenceLink.intakeRequestId` + `EvidenceLink.intakeInformationRequestId`

**Hosted:** INT-2026-0003 RFI “There are missing documents here” → requester text + `data-processing-overview.pdf` scan **Clean** / usable. Analyst sees the response and filename together. Not a Finding.

## Vendor question UX

Finite answer sets render as the template’s exact vocabulary buttons. Save happens before advance. Failed save stays on the question and surfaces the business message (`A comment is required for Partial, No, or N/A.`). Previous / Next / Next unanswered remain.

## Hosted Golden Journey continuation

Same QA tenant. No database seed into Wave 4.

| Case | Third Party | Engagement | Inherent | Findings | Residual |
| --- | --- | --- | --- | --- | --- |
| INT-2026-0001 | Microsoft Corporation QA | ENG-2026-0001 Azure Hosting QA | Confirmed CRITICAL (V3 54) | 1 confirmed OPEN MEDIUM; 1 dismissed | MEDIUM 58 · `supreme-risk-engagement-1.0.0` |
| INT-2026-0003 | Microsoft Corporation QA | ENG-2026-0002 Microsoft 365 Collaboration QA | Confirmed LOW (3.6%) | 0 | Not calculated |

Vendor session: copy secure link → activate once → reuse 410. No User row.

Specialist review used approved conclusion `Review complete`. Candidates are DRAFT until confirm/dismiss. Control effectiveness on Azure: **PARTIALLY_EFFECTIVE** (Governance / VRA-001). Compensating control recorded; it did not erase the Finding.

Wave 5 accept-risk route 404.

## Known limitations

- `seedFindingCandidates` still opens a DRAFT candidate for each negative vendor answer. That is not an authoritative Finding. Missing optional evidence did not create required-evidence candidates.
- IRA clarification follow-up page still uses a written updated answer. Country multi-select is on the initial risk-assessment form.
- Residual was first calculated before vendor submit during the walk; history is append-only and the later calculation includes the confirmed Finding. Do not treat the first residual as Wave 3-complete evidence.
- A second compensating-control row was recorded on the retry. Existence still does not erase the Finding.

## Screenshots

`screenshots/` — requester attachment, guided Engagement, specialist review, residual explanation, M365 isolation, requester denials, 375/768/1024/1440/1920. No passwords, invitation tokens, or session JWTs.

## Confirmations

#12 NOT PASS. Waves 1–3 remain accepted for the current stage + manual-walk remediation verified. Wave 4 implemented only. Wave 5 not started. Third Party ≠ Engagement. Vendor remains invitation-only. No Vendor User. No auth bypass. No scoring methodology invented. No automatic Finding from a negative answer. No automatic Finding from missing evidence. Residual risk is Engagement-authoritative. `main` not merged. Production untouched. Commercial GO not declared.

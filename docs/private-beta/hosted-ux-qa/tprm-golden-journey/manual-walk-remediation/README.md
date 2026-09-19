# #12 Manual-walk remediation + Wave 4 review enablement

**Date:** 2026-09-19  
**Authority:** Product Leadership hosted walk, 2026-09-19  
**Starting SHA:** `f19bcea3119e928001447995244c7fc19ff6758b`  
**Commercial production:** NO-GO  
**Wave 5:** Not started  
**#12:** Not PASS

This package corrects Waves 1–3 defects found on the hosted Golden Journey walk, then enables a natural Wave 4 review. It does not redesign the approved journey.

## Architecture lock preserved

- Third Party ≠ Engagement
- Vendor remains VendorContact → VendorAssessmentInvitation → activation → VendorPortalSession
- No Vendor User
- V3 IRA weights, floors, and tier rules unchanged
- Shared Evidence / StoredObject / malware fail-closed reused for requester attachments
- Findings, control effectiveness, and residual risk remain Engagement-specific
- Missing evidence ≠ Finding
- Negative answer ≠ Finding

## 409 root cause

**Endpoint:** `POST /api/v1/vendor-portal/assessments/:id/submit`

**Observed:** 45/45 answered, 0 unanswered, 44 evidence outstanding, attestation checked, UI showed `Request failed with status code 409`.

**Server-side condition:** `submissionChecklist()` counted every question with `expectedEvidence` text as `evidenceRequired`. Submit then:

- if `vendorAssessment.engagementId` was **absent**, blocked when `unanswered + evidenceMissing > 0`
- if `engagementId` was **present**, Wave 3 previously allowed missing evidence and only blocked unanswered required questions

The hosted 44-evidence conflict matches the complete-check that treats expected-evidence guidance as mandatory. The user-visible string was axios default because `vendorApi` had **no response interceptor**, so the API business message never reached the screen.

**Correction:** workbook `expectedEvidence` with `evidenceId: null` is **OPTIONAL**. Only an explicit required evidence binding is **REQUIRED**. Required unanswered questions and required unusable evidence block submit on every path. Optional evidence is preserved for specialist review. The vendor client now maps 409 to the server message.

## Evidence requirement rule

From the authoritative workbook catalog:

| Template signal | Expectation | Submit |
| --- | --- | --- |
| `evidenceId` + catalog `required: Yes` | REQUIRED | Block if missing or unusable |
| `expectedEvidence` text and `evidenceId: null` | OPTIONAL | Do not block |
| neither | NOT REQUIRED | Do not block |

`CLEAN` is never invented. Non-clean files remain unusable.

## Assessment completeness rule

Questionnaire questions are required unless the template sets `required: false`. The UI previously warned but still offered Submit. Backend Wave 3 already blocked unanswered required questions. UI and backend now agree: unanswered required questions block submit. Optional unanswered questions are not created by the current workbook.

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

No new weights. If the organization country is not in the catalog, scoring stops and reports `ORG_COUNTRY_UNMAPPED`. Selected countries are persisted for later Privacy / Compliance use.

## IRA state source of truth

Golden Journey authority is **EngagementIra**. Legacy VendorOnboarding / RequesterTaskLink is used only when no Engagement IRA exists.

The ribbon no longer labels the current incomplete step “IRA sent”. Guided GRC copy is:

- CURRENT STAGE
- STATUS
- OWNER
- NEXT
- one primary action
- optional secondary “Copy secure link”

## Requester attachment architecture

Clarification / RFI responses accept written text plus optional Shared Evidence:

`StoredObject` + `EvidenceLink.intakeRequestId` + `EvidenceLink.intakeInformationRequestId`

Tenant isolation, malware scan, download authorization, and audit are reused. Attachments are not Findings.

## Vendor question UX

Finite answer sets render as the template’s exact vocabulary buttons. Save happens before advance. Failed save stays on the question. Previous / Next / Next unanswered remain. Evidence requirement appears after the selected answer.

## Hosted walk

Hosted Product Leadership re-walk is performed on staging after this SHA deploys. Do not seed Wave 4. Stop before Wave 5.

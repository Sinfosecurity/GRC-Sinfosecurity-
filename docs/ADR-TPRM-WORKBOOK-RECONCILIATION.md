# ADR — Supreme Third Party workbook / lifecycle reconciliation

**Status:** Proposed for Product Leadership review. Not a second TPRM product.  
**Item:** #12 Supreme Third Party — Workbook / Lifecycle Reconciliation  
**Workbook:** Vendor Risk Assessment Workbook 1.0 — September 2026  
**Does not replace:** ADR-0001 residual engine, ADR-TPRM-VENDOR-ACCESS, ADR-TPRM-PHASE-C-LIFECYCLE  
**#20:** paused. This ADR does not add Automation features.

## Decision

Keep one Third Party product. Reconcile the live customer workflow to the approved workbook and the Product Leadership target lifecycle. Reuse Phase C remediation, risk acceptance, contract review, approval, Active, monitoring, and reassessment. Connect them. Do not rebuild them.

## 1. Inherent-risk mapping

| Workbook | Current Supreme (before this correction) | Status |
|---|---|---|
| IR-01 Service criticality | `ir_availability` | PARTIAL → now `ir_01` |
| IR-02 Sensitive data | `ir_data` | PARTIAL → now `ir_02` |
| IR-03 Data volume | `ir_volume` | PARTIAL → now `ir_03` |
| IR-04 Privileged access | `ir_access` (combined with system access) | PARTIAL → now `ir_04` |
| IR-05 System integration | `ir_access` | PARTIAL → now `ir_05` |
| IR-06 Customer-facing | `ir_1` / `ir_regulated` | PARTIAL → now `ir_06` |
| IR-07 Financial impact | missing | MISSING → now `ir_07` |
| IR-08 Regulatory impact | `ir_regulated` | PARTIAL → now `ir_08` |
| IR-09 Geographic exposure | `ir_geo` | PARTIAL → now `ir_09` |
| IR-10 Subcontracting | `ir_fourth` | PARTIAL → now `ir_10` |
| IR-11 Concentration | missing | MISSING → now `ir_11` |
| IR-12 Operational dependency | `ir_availability` (same as IR-01) | EXISTS DIFFERENTLY → now `ir_12` |
| IR-13 Artificial intelligence | `ir_ai` | PARTIAL → now `ir_13` |
| IR-14 Public exposure | missing | MISSING → now `ir_14` |
| IR-15 Brand impact | missing | MISSING → now `ir_15` |
| Estimated spend | `ir_spend` scored (weight 4) | EXISTS DIFFERENTLY → context only, not scored |

Canonical intake is Inherent Risk Questionnaire **v3.0.0**. One questionnaire. Historical v2 answers remain readable through aliases for scoring only.

## 2. Pack mapping

Eighth pack is **Baseline** (all vendors). Do not invent an eighth mapping.

| Workbook pack | Q | Supreme template | Supreme Q | Action |
|---|---|---|---|---|
| Baseline | 45 | Information Security (+ incident when recommended) | 10 | Reuse accepted baseline. Do not import 45. |
| Personal and Sensitive Data | 13 | Privacy | 7 | Reuse. |
| Software and API | 7 | Software and API (new) | 5 | Thin extension. No current dedicated pack. |
| Cloud Hosting | 13 | Cloud / SaaS | 6 | Reuse. |
| Privileged and Network Access | 6 | Identity | 5 | Reuse. |
| Critical Operations | 6 | BCDR | 5 | Reuse. |
| Regulated Service | 6 | Regulatory | 4 | Reuse. |
| Physical Delivery | 6 | Physical Delivery (new) | 4 | Thin extension from workbook physical trigger. |

Workbook question count: **102**. Supreme 8-pack canonical count: **46**. Library total including intake and optional framework templates: **17 templates / 109 questions**. Reuse-first. Do not import 102 questions to match the count.

### Question coverage (required for #12 reconciliation)

Counts: Baseline 10 + Privacy 7 + Software/API 5 + Cloud 6 + Identity 5 + BCDR 5 + Regulatory 4 + Physical 4 = **46**.

| Workbook pack | Workbook Q | Supreme template | Supreme Q | Covered concepts | Merged / combined | Intentional omissions | Material missing | Status |
|---|---|---|---|---|---|---|---|---|
| Baseline | 45 | Information Security (`information-security`) | 10 | Security policy, named owner, MFA, privileged review, least privilege, encryption, vulnerability management, logging, patching, independent assurance | Awareness, malware, network, backup, and incident detail are covered by Identity, BCDR, Physical, Incident (recommended), or optional NIST/ISO/SOC templates rather than 45 Baseline rows | Duplicate ISO/NIST control restatements already in optional framework templates | No material Baseline *control family* is left without a Supreme question or an explicit consolidation below | INTENTIONALLY CONSOLIDATED |
| Personal and Sensitive Data | 13 | Privacy (`privacy`) | 7 | Processing in scope, data subjects, storage location, DPA, cross-border mechanism, subprocessors, breach notification | Data-subject rights, retention, and DPIA treated as DPA / processing evidence rather than separate scored rows | Duplicate privacy-law citation questions | Dedicated data-subject-rights SLA row is PARTIAL (DPA evidence) | PARTIAL |
| Software and API | 7 | Software and API (`software-api`) | 5 | SDLC, OSS/component inventory, change review, API auth/rate-limit, API data minimization | SAST/DAST folded into SDLC evidence | Duplicate encryption/logging already in Baseline | Dedicated application pentest row is PARTIAL (`is_10` independent assurance) | PARTIAL |
| Cloud Hosting | 13 | Cloud / SaaS (`cloud-saas`) | 6 | Cloud/SaaS hosting, model, tenant isolation, region choice, secure baselines, customer-managed keys | Shared-responsibility and cloud-admin logging folded into Baseline logging + Cloud isolation | Duplicate encryption already in Baseline | Cloud backup residency is PARTIAL (BCDR backups + region choice) | PARTIAL |
| Privileged and Network Access | 6 | Identity (`identity`) | 5 | SSO/federation, admin MFA, no shared admin, joiner-mover-leaver, privileged reviews | Network/production connectivity is an intake trigger (IR-04/IR-05), not a sixth Identity question | Duplicate MFA already in Baseline | Dedicated network-segmentation questionnaire row is PARTIAL (IR-05 + Identity) | PARTIAL |
| Critical Operations | 6 | BCDR (`bcdr`) | 5 | BCP, test evidence, recovery-time commitment, backups, offsite/restore | RPO folded into backup/restore | Duplicate incident comms (Incident template when recommended) | None material | COVERED |
| Regulated Service | 6 | Regulatory (`regulatory`) | 4 | Relevant regimes, compliance owner, material findings disclosure, audit/assurance rights | License/supervisory specifics folded into regime + findings | Duplicate SOC/ISO certificate rows (optional SOC 2 / ISO templates) | Supervisory-exam detail is PARTIAL | PARTIAL |
| Physical Delivery | 6 | Physical Delivery (`physical-delivery`) | 4 | Facility access control, visitor/escort, media protection, secure destruction | CCTV/environmental folded into facility access-control evidence | Duplicate physical questions on optional ISO template | None material | COVERED |

**Concept groups (workbook → Supreme):**

| Concept group | Status |
|---|---|
| IR-01–IR-15 governed intake | COVERED |
| Estimated spend as commercial context only | COVERED (not scored) |
| Baseline always required | COVERED |
| Security policy / owner / MFA / privilege / encryption / vuln / logging / patch / assurance | COVERED |
| Privacy processing, DPA, transfers, subprocessors, breach notify | COVERED |
| Data-subject rights as a standalone scored row | INTENTIONALLY CONSOLIDATED into DPA evidence |
| SDLC / OSS / change / API auth / API minimization | COVERED |
| Dedicated application pentest | INTENTIONALLY CONSOLIDATED into Baseline independent assurance |
| Cloud hosting, isolation, region, baselines, CMK | COVERED |
| Cloud backup residency as its own Cloud row | INTENTIONALLY CONSOLIDATED into BCDR + region |
| Privileged identity lifecycle | COVERED |
| Network segmentation as its own pack question | INTENTIONALLY CONSOLIDATED into IR-05 + Identity |
| BCP / test / RTO / backup / restore | COVERED |
| Regulatory owner / findings / audit rights | COVERED |
| Physical facility / visitor / media / destruction | COVERED |
| Fourth-party and AI | COVERED as additional recommended templates, not an eighth workbook pack |
| Importing 102 verbatim workbook questions | INTENTIONALLY OMITTED |

No material workbook control family is recorded as MISSING. Remaining gaps are PARTIAL or INTENTIONALLY CONSOLIDATED. Do not import 102 questions to close the count difference.

## 3. Scoring

| Topic | Workbook | Supreme (authoritative) | Decision |
|---|---|---|---|
| Response states | Yes / Partial / No / N/A / Not Answered | Yes / Partial / No / Not applicable / Unknown | Keep vendor answers; treat Unknown/Not Answered as incomplete for review |
| Weights | 1–5 | Template weights (commonly 6–10) | Keep existing template weights |
| Residual formula | `(Partial×2 + No×4) / (4 × applicable weights)` lower-is-better % | `deterministicRiskEngine` / `explainableRiskService` vendor residual | **Do not replace** vendor residual. Workbook % is an assessment-level control-gap metric only |
| Four bands | Low <15, Moderate <35, High <60, Critical ≤100 | Vendor residual bands from ADR-0001 | Four workbook bands apply only to the control-gap metric |
| Historical ScoreCalculation | — | Immutable | Unchanged |

Risk acceptance must not automatically reduce residual (ADR-0001). Vendor must never accept the customer's risk.

## 4. Delivery

4A Send invitation email and 4B Copy secure invitation link use the same hashed, single-use, expiring, tenant-isolated token. Resend and recopy rotate and revoke the prior token. Copy must not write “email sent.” Mark as shared is optional and is not email delivery. Queued ≠ Delivered.

## 5. Register sync

D-01: customer vendor register displayed `inherentRiskScore` as the risk score. Authoritative field is `residualRiskScore`.  
D-02: assessment submit now recalculates the existing residual so posture, workspace, and reports read the same roll-up. No duplicate vendor-risk field.

## 6. Phase C

Remediation, risk acceptance, VendorContract, Approve / Approve with Conditions / Reject, Active, monitoring, and reassessment already exist. Contract renewal maps to `VendorContract.renewalDate` (fallback `expirationDate`). Do not add a vendor-level duplicate date.

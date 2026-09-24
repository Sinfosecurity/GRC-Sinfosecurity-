# Product priority decision memo

**Item:** #39 — strategy only  
**Date:** 2026-09-23  
**Does not authorize implementation.**  
**Does not start #24–#38 or #40.**  
**Does not unfreeze #23.** Frozen candidate remains `0f42cba86f42fa9df0399634bceb520036ed82ce`.

Canonical research: `docs/competitive/SUPREME-COMPETITIVE-CAPABILITY-MATRIX.md`  
Gap ownership: `docs/competitive/COMPETITIVE-GAP-ROADMAP.md`

This memo answers **what Supreme should do next**. It does not build anything. It does not declare #39 PASS or COMPLETE.

---

## 1. Decision

Supreme already has a private-testing TPRM Golden Journey and accepted Risk / Compliance / Privacy / AI / Automation / Graph modules. The next work is **not** more industry editions and **not** a competitor-feature clone.

The next authorized sequence, when Product Leadership later authorizes work, should be:

1. Keep #23 on zero-spend hold until included Render minutes reset, then host-prove frozen `0f42cba` only.
2. Close **commercial readiness** so a buyer can pay and trust the vendor: #2 / #11 path, then #34.
3. Close **enterprise-sale capability** already on the roadmap: #21 live SSO/SCIM, then #22 live integrations and ratings-as-observations.
4. Create **market proof** only after a sellable hosted product exists: #36 / #37.
5. Defer #24, #25, and #27–#31 until there is a product that can be sold and supported.

Do not start those items from this memo.

---

## 2. Three gap types

| Type | Meaning | Typical owner |
| --- | --- | --- |
| PRODUCT CAPABILITY GAP | The product cannot do the job in a buyer evaluation | #12 extension, #21, #22, #23 hosted proof, #27–#31 |
| COMMERCIAL READINESS GAP | The company cannot contract, invoice, assure, or operate as a vendor | #2, #9/#11, #34, legal/support/DR expectations |
| MARKET / PROOF GAP | Buyers cannot see that anyone else bought or used it | #36, #37, #32/#33, #35 |

Do not treat SOC 2 as a TPRM feature. Do not treat founding customers as a missing Engagement object.

---

## 3. Priority groups

### P0 — COMMERCIAL BLOCKER

These stop a paid sale even if the product demo is strong.

| Priority | Type | Owner | Now | Recommendation |
| --- | --- | --- | --- | --- |
| Commercial production / live Stripe | COMMERCIAL READINESS | #2 / #11 | PARTIAL / NO-GO | Required to invoice. Do not fake paid state. Do not change live Stripe from this memo. |
| Production GO / security checklist | COMMERCIAL READINESS | #9 / #11 | #11 production-ready NO; GO NO-GO | Keep NO-GO until Product Leadership separately authorizes. Not a #39 build. |
| Trust Program (SOC 2 / ISO / trust center) | COMMERCIAL READINESS | #34 | NOT STARTED | Enterprise security questionnaires will fail without Supreme’s own assurance. Recommend after #21/#22 live proof is scheduled, not before #23 hold is understood. |
| Support / legal / backup-DR / incident expectations | COMMERCIAL READINESS | #5 already PASS; legal/support #7/#34 | Operational pieces exist; commercial pack does not | Package what exists. Do not rebuild Backup/DR. |

### P1 — ENTERPRISE SALE BLOCKER

These stop a CISO / TPRM / IT security evaluation of the **product**.

| Priority | Type | Owner | Now | Recommendation |
| --- | --- | --- | --- | --- |
| Live SSO / SCIM / JIT (Entra / Okta / Google) | PRODUCT CAPABILITY | #21 | Accepted; live federation NOT TESTED | First product gate after #23 hold allows other work. Architecture exists. |
| Live integrations / signed webhooks / public API proof | PRODUCT CAPABILITY | #22 | Accepted; live Slack/Jira NOT TESTED | Second product gate. Internal `/api/v1` is not enough. |
| External ratings as observations (SecurityScorecard / BitSight) | PRODUCT CAPABILITY | #22; later #40 measurement only | NOT IMPLEMENTED | Adapter + observation object. Must not overwrite residual. Do not start #40. |
| SIG / CAIQ questionnaire libraries | PRODUCT CAPABILITY | #12 extension; authorize via #39 | NOT IMPLEMENTED | License or partner content. Do not copy without rights. |
| #23 hosted five-gap proof | PRODUCT CAPABILITY | Frozen `0f42cba` | CI-proven; not hosted-proven | Environment hold. Not new Insurance scope. |
| Tenant isolation / MFA / audit / Evidence | PRODUCT CAPABILITY | #3 / #8 / #12 | Isolation and Evidence PROVEN; staging MFA is grace | Keep. Production MFA already required by policy. |

### P2 — IMPORTANT COMPETITIVE GAP

Expected on a shortlist. Not the next build unless Product Leadership later authorizes.

| Priority | Type | Owner | Recommendation |
| --- | --- | --- | --- |
| Vendor exchange / trust profile | PRODUCT CAPABILITY | #39 strategy; possible later #40 | Decide build vs partner. Do not fabricate a network. |
| Global regulatory content | PRODUCT CAPABILITY | #27–#31 | After a sellable product. Do not dump on #23. |
| Fourth-party intelligence | PRODUCT CAPABILITY | #22 / #40 | After ratings-as-observations. |
| External threat intelligence fabric | PRODUCT CAPABILITY | #19 + #20 + #22; #40 later | Intelligence exists; live threat fabric does not. |
| AI assistance (evidence review / autofill) | PRODUCT CAPABILITY | #19 / #20 via #39 | Humans remain authoritative. No silent scoring. |
| Partner ecosystem | MARKET / PROOF | #32 / #33 | After something can be implemented for a customer. |
| Founding customers | MARKET / PROOF | #36 | After commercial path exists. |
| Case studies | MARKET / PROOF | #37 | After founding use. |
| #24 Financial Services Edition | PRODUCT CAPABILITY | #24 | Banks need it. Do not start now. |
| #25 Government Edition | PRODUCT CAPABILITY | #25 | Public sector needs it. Do not start now. |
| No-code workflow configuration | PRODUCT CAPABILITY | #39 | Do not clone LogicGate. |

### P3 — DIFFERENTIATOR / FUTURE

Preserve or defer. Do not build to match a brochure.

| Priority | Type | Owner | Recommendation |
| --- | --- | --- | --- |
| Third Party ≠ Engagement | DIFFERENTIATOR | #12 | Preserve. Not unique vs OT/SN/Archer/PU/Aravo. |
| Question ≠ Finding; Signal ≠ Finding | DIFFERENTIATOR | #12 / #19 | Preserve. |
| Fail-closed Shared Evidence | DIFFERENTIATOR | #3 / #14 | Preserve. |
| Residual unchanged by acceptance | DIFFERENTIATOR | #15 / #12 | Preserve. |
| Insurance as configuration | DIFFERENTIATOR | #23 | Finish hosted proof later. Do not expand. |
| Governance Graph | DIFFERENTIATOR | #13 | Preserve. |
| Financial viability intelligence | FUTURE | data-provider / #22 | Partner, do not build a bureau. |
| Quantitative risk / FAIR | FUTURE / SPECIALIZED | #39 | Do not start. |
| AI runtime governance | FUTURE / SPECIALIZED | #18 later | Not OneTrust Guard / ServiceNow Control Tower. |
| Policy / claims / treaty administration | OUT OF PRODUCT | none | Do not build. |

---

## 4. Buyer-blocker matrix

| Buyer | Supreme already proves | What could block purchase | Owner | Class |
| --- | --- | --- | --- | --- |
| CISO | #12 lifecycle, isolation, Evidence + malware, residual, AI inventory | Live SSO; ratings; Supreme’s own SOC 2; live integrations | #21, #22, #34 | MUST HAVE |
| CRO | #15 register; acceptance does not lower residual | FAIR/Quantify (optional); executive IRM dashboards | #15 / #39 | IMPORTANT for quant; MUST HAVE is honesty + register |
| TPRM Lead | Intake, Engagement, IRA, portal, findings, offboarding | SIG/CAIQ; exchange; ratings; vendor delegation | #12 extension, #22, #39 | MUST HAVE libraries; IMPORTANT exchange |
| Chief Compliance Officer | #16 applicability honesty; shared controls | Licensed content libraries; horizon scanning | #27–#31 | MUST HAVE for regulated enterprise |
| Privacy Officer | #17 ROPA / DSR / DPIA / transfers | OneTrust-scale consent/DSR; DataGuidance | #17 | IMPORTANT; not P0 vs TPRM/CISO |
| AI Governance Lead | #18 inventory + human decisions | Runtime guardrails; EU AI Act content pack | #18 / #28 | IMPORTANT |
| Internal Audit | Immutability, graph, Evidence, audit events | AuditBoard-depth methodology; export pack; Supreme SOC 2 | #16 / #34 | IMPORTANT |
| Procurement | Intake + contract gate | ServiceNow/Coupa/Zip integration; CLM | #22 | MUST HAVE integration; CLM is OPTIONAL |
| Insurance Risk / Compliance | Edition configuration; NG/US-NY provenance; governance views | #23 not PASS; hosted gaps; US statutory depth | #23 hold; later #27 | MUST HAVE hosted #23 proof for insurance buyers; #27 IMPORTANT later |

---

## 5. Proposed enterprise-sale minimum

This is a **private-testing → first paid design-partner** baseline. It is **not** production-ready and **not** commercial GO.

| Area | Minimum | Already? | Owner |
| --- | --- | --- | --- |
| Tenant isolation | Two-tenant denial proven | PROVEN #12 | #12 |
| MFA | Production-required TOTP; no silent grace in production | Policy PROVEN; staging grace accepted | #8 |
| Audit | Immutable audit of decisions and evidence | PROVEN | #8 / #12 |
| Evidence | Shared Evidence + CLEAN required + fail-closed malware | PROVEN | #3 / #14 |
| Live SSO | One real customer IdP (Entra or Okta) | DEFERRED | #21 |
| API | Documented public API with tenant tokens | PARTIAL | #22 |
| Notifications | Queued ≠ Delivered remains honest | PROVEN as honesty rule | #12 / #20 |
| Core integrations | At least one live ticketing or IdP-adjacent integration | DEFERRED | #22 |
| Commercial billing | Live or explicitly contracted design-partner billing | PARTIAL / NO-GO | #2 / #11 |
| Trust / security package | Honest current-stage pack: pentest rem, isolation, malware, backup/DR. SOC 2 later | #9/#3/#5 exist; #34 not started | #34 |
| Support model | Named support path from #7 | PASS as console; commercial SLA not sold | #7 / #34 |
| Legal docs | MSA / DPA / subprocessors — not a punch-list feature | NOT a current item | legal / #34 |
| Backup / DR | Already PASS | PASS | #5 |
| Incident-response expectations | Documented vendor IR, not a new engine | NOT STARTED as customer-facing pack | #34 |
| Ratings | Optional for first design partner if residual honesty is explained | NOT IMPLEMENTED | #22 |
| Questionnaire libraries | First design partner may accept Supreme packs if scoped | PARTIAL | #12 / #39 |

Do not add no-code, FAIR, fourth-party, or FS/Gov editions to this minimum merely because competitors have them.

---

## 6. What not to build

- Policy administration
- Claims administration
- Treaty administration
- Insurance-specific evidence store
- Duplicate risk engine
- Duplicate compliance engine
- Fake ratings engine that writes residual
- AI auto-approval of vendors, systems, or applicability
- Duplicate vendor master
- Global regulatory content copied without rights
- #23 Phase C
- #24–#38 or #40 from this memo

---

## 7. Roadmap ownership (recommendation only)

| If Product Leadership later wants… | Owner |
| --- | --- |
| Invoice a customer | #2 / #11 |
| Pass an enterprise security review | #21 then #22 then #34 |
| Look like SSC/BitSight | #22 observations, not a bureau |
| SIG/CAIQ | #12 extension after content rights |
| Vendor exchange | #39 decision, then partner or later item |
| US/UK/EU/Africa/APAC packs | #27–#31 |
| Banks | #24 |
| Government | #25 |
| Customers and stories | #36 / #37 |
| Partners | #32 / #33 |
| Continuous competitive scoring | #40 — not started |

---

## 8. #23 and #39 position

**#23:** ACTIVE / NOT PASS. Phase B accepted. Zero-spend hold. Five gaps IMPLEMENTED / CI-PROVEN / NOT HOSTED-PROVEN. Do not purchase Render minutes. Spend limit $0.00.

**#39:** RESEARCH PACKAGE READY FOR PRODUCT LEADERSHIP REVIEW. Not PASS. Not COMPLETE. This memo is strategy evidence only.

# Competitive gap roadmap

**Item:** #39 research only  
**Date:** 2026-09-23  
**Does not authorize implementation.**  
**Does not start #24, #27, #30, #40, or Phase C.**  
**Does not change #23 frozen candidate** `0f42cba86f42fa9df0399634bceb520036ed82ce`.

Companion: `docs/competitive/SUPREME-COMPETITIVE-CAPABILITY-MATRIX.md`

---

## How to read this file

Every material Supreme gap maps to an **existing** punch-list owner. #23 is not a dumping ground. #39 records strategy; #40 is not started and must not be used as a shadow implementation item.

Commercial classes:

- **MUST HAVE FOR ENTERPRISE SALE** — likely stops a paid enterprise deal
- **IMPORTANT** — expected in a shortlist
- **DIFFERENTIATOR** — preserve; do not dilute
- **NICE TO HAVE** — later
- **FUTURE / SPECIALIZED** — do not build unless Product Leadership authorizes a new scope

---

## Preserve (differentiators)

| Capability | Why keep | Do not |
| --- | --- | --- |
| Third Party ≠ Engagement | Hosted #12 proof | Claim uniqueness vs OneTrust / ServiceNow / Archer / ProcessUnity / Aravo |
| Requester / GRC / Vendor isolation | Wave 1 hosted | Weaken invitation architecture to remove Viewer SKIP |
| Question ≠ Finding; Signal ≠ Finding | Honesty | Auto-create findings from answers or ratings |
| Residual unchanged by acceptance | ADR-0001 / #15 | Inverse “controls lower residual” formulas |
| Shared Evidence + fail-closed malware | #3 / #14 | Insurance-specific file store |
| Insurance as configuration | #23 blueprint | Fork, or absorb #27/#30 into #23 |
| Governance Graph | #13 | Separate graph database |
| Unknown ≠ 0; configured ≠ compliant | Product rules | Demo percentages |

---

## Must-have commercial gaps

| Gap | Why it stops a sale | Owner | Now |
| --- | --- | --- | --- |
| Live SSO / SCIM / JIT | Enterprise IdP is a security questionnaire item | #21 | Architecture accepted; live Entra/Okta/Google NOT TESTED |
| Live integrations + public API/webhooks | Buyers need ServiceNow / Jira / Slack / procurement | #22 | Live Slack/Jira NOT TESTED |
| External ratings as observations | CISOs compare to SSC / BitSight | #22 + later #40 | Not implemented; must not overwrite residual |
| Licensed regulatory content | CCOs will not replace Archer/OneTrust content with reference packs | #27–#31 | NOT STARTED |
| Commercial production / live Stripe | Cannot invoice | #2 / #11 | NO-GO |
| Trust Program | Buyers ask for Supreme SOC 2 / ISO | #34 | NOT STARTED |
| Customer proof | No founding-customer or case-study item | #36 / #37 | NOT STARTED |
| Industry questionnaire libraries | TPRM leads expect SIG/CAIQ | #12 extension; authorize via #39 | Not implemented |
| Financial-services edition | Banks will not buy “Insurance + generic GRC” as DORA/OCC | #24 | NOT STARTED — do not start from this research |
| Government edition | Public sector RFPs | #25 | NOT STARTED |

---

## Important gaps

| Gap | Owner | Note |
| --- | --- | --- |
| Shared assessment / risk-profile network | #39 strategy; possible later #40 | PL must choose build / partner / data-provider. Do not fabricate an exchange |
| Fourth-party / Nth-party inventory | #22 / #40 | Documented at OneTrust, MetricStream, SSC, BitSight |
| AI evidence review / autofill | #19 / #20 only if PL authorizes | Humans remain authoritative. Govern through #39 until authorized |
| Reporting catalog depth | #39 vs existing Reports | Do not create reports to match a competitor count |
| No-code application studio | #39 | Do not clone LogicGate App Studio |
| Partner program / portal | #32 / #33 | Implementation ecosystem |
| Global GTM / international rollout | #35 / #38 | After a sellable product |
| Healthcare content | #26 and/or #27 | HIPAA / HITRUST are not Supreme packs |
| Data residency SKU | #38 / #5 | Not verified as a published SKU |
| Export / audit package maturity | #16 / #34 | Shared-core exam readiness is enough for current #23 |
| Vendor-side questionnaire delegation | #12 extension | Vendor must not see IRA |
| Continuous vendor-threat fabric | #19 + #20 + #40 | Intelligence exists; live threat fabric does not |
| Insurance hosted five-gap proof | Frozen `0f42cba` | Environment hold. Not new Insurance scope |

---

## Future / specialized — do not start

| Idea | Why not now |
| --- | --- |
| FAIR / Monte Carlo quantification | Archer Insight / LogicGate Quantify specialty |
| Runtime AI guardrails / MCP SDK | OneTrust / ServiceNow Control Tower specialty |
| Consent platform / CMP | OneTrust Consent — not Supreme’s current buyer |
| PEP / sanctions / D&B financials | Data-provider partnership, not a core engine |
| Policy / claims / treaty administration | Insurance cores; out of Supreme |
| Dedicated exam subsystem | Shared-core sufficient for current #23 |
| US/NG statutory dumps into #23 | #27 / #30 if authorized |

---

## Segment → owner

| Segment gap | Owner |
| --- | --- |
| Banks / DORA / OCC depth | #24 then #27 / #28 |
| Government / FedRAMP | #25 |
| Other industries (healthcare, energy) | #26 |
| US insurance statutory packs beyond #23 reference | #27 |
| UK / EU | #28 |
| Middle East | #29 |
| Africa beyond NG reference | #30 |
| APAC | #31 |
| Partner motion | #32 / #33 |
| Assurance | #34 |
| GTM | #35 |
| Design partners / stories | #36 / #37 |
| International operations | #38 |
| Competitive research refresh | #39 |
| Continuous scoring models | #40 — not started |

---

## Recommended sequence (authorization required)

This is advice, not a schedule and not a new punch-list.

1. Hold #23. Host-prove `0f42cba` when included Render minutes reset.
2. #21 live federation.
3. #22 live integrations and ratings-as-observations.
4. #34 Trust Program in parallel with #2/#11 commercial path.
5. Questionnaire-library / exchange **decision** on #39 (no build yet).
6. #36 founding-customer motion only after a sellable hosted product.
7. #24 / #27+ only by later Product Leadership authorization.

Do not implement competitive gaps from this file.

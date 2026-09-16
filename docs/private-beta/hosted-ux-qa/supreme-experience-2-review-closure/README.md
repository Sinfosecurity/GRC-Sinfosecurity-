# #12-V Review & Decide exception-driven closure

Engineering hosted evidence. Product Leadership decides #12-V and #12. This folder does not declare PASS, private-beta ready, or production-ready.

**Implementation SHA:** `6cb25e8e4e61db7dc9674df6d5757b9e483badc0`  
**Prior grouping SHA:** `e82cf64a53fd662b825c65ed9540349028bdf17c`  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35053907016 PASS  
**Hosted API `/health`:** `6cb25e8e4e61db7dc9674df6d5757b9e483badc0`  
**Hosted frontend `/version.json`:** `6cb25e8e4e61db7dc9674df6d5757b9e483badc0`  
**Fixture:** `VND-2026-0022`  
**Script:** `scripts/hosted-supreme-review-closure.py`  
**Migration:** NONE

## Review counts (live tenant, not frontend-only)

| Fact | Value |
| --- | --- |
| Total responses | 36 |
| Satisfactory | 13 |
| Clarifications (source rows) | 18 |
| Potential findings | 19 |
| Flat exception rows before grouping | 37 |
| Material review units after grouping | 8 |
| Clarification groups | 15 |
| Evidence issue groups | 3 |

Source truth is unchanged. Grouping is client-side on the existing onboarding GET `review.items` payload.

## Before / after

| Measure | Before this sprint | After |
| --- | --- | --- |
| Primary review presentation | 37 equal exception rows (visual pass capped the first 8) | 8 material issue cards; clarifications and evidence are separate queues |
| Clicks to first material issue | 1 (open Decisions, then scan a mixed list) | 0 (Decisions is the default Review & Decide tab; material is the default queue) |
| Full source responses | Available | Still available via View full assessment |
| Exceptions hidden | No | No |

## Screenshots

41 PNGs. Required cores at 375 / 768 / 1024 / 1440 / 1920:

- `review-summary-*`
- `material-issues-*`
- `clarifications-*`
- `evidence-issues-*`
- `full-assessment-*`
- `finding-context-*`
- `decision-ready-*`

Regression extras: `home-375`, `home-1440`, `request-1440`, `assess-1440`, `vendor-review-1440`, `monitor-1440`.

## Accessibility / performance

- Review summary axe: 0 serious / 0 critical
- Decision-ready axe: 0 serious / 0 critical
- Home axe: 0 serious / 0 critical
- Review API requests on Decisions: 3 (`/auth/me`, `/organization/current`, `/vendors/onboarding/VND-2026-0022`)
- N+1: NO
- CSP: not weakened
- Load time was not separately instrumented beyond `networkidle`

## Findings / risk

Finding confirm 200. Remediation assign 200. Risk acceptance 200. Residual recorded 100 before and 100 after acceptance. Approval with conditions 200. Vendor activated ACTIVE.

## Out of scope

H-2, H-4, H-5, H-6, H-7, #21, Home/nav redesign, scoring, tiering, finding rules, evidence rules, RBAC, tenant isolation, main merge, production.

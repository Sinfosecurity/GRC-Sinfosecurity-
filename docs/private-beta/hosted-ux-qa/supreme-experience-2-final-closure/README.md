# #12-V final experience closure

Engineering hosted evidence for Home data-state truth and Review & Decide grouping. Product Leadership decides #12-V and #12. This folder does not declare PASS.

**Implementation SHA:** `7dac1ba30f3cddfa51ab7080cda03a94b10b62af`  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35055313722 PASS  
**Hosted API `/health`:** `7dac1ba30f3cddfa51ab7080cda03a94b10b62af`  
**Hosted frontend `/version.json`:** `7dac1ba30f3cddfa51ab7080cda03a94b10b62af`  
**Review fixture:** `VND-2026-0023`  
**Script:** `scripts/hosted-supreme-final-closure.py`  
**Migration:** NONE

## Closure B — Home data-state

Before this fix, Dashboard initialized `work` to numeric zeros and rendered `AttentionHero` with `queue.length === 0`, so a refresh could show "0 need your attention" / "Nothing needs your attention" before `/tprm/attention` returned.

After the fix, attention, work, statistics, and intelligence each have `loading | ready | error`. Zeros and all-clear copy render only after a successful response.

Hosted proof:

- `home-loading-throttled-*` — Home APIs held; page shows "Checking what needs your attention…"; no all-clear. Axe 0 serious.
- `home-loading-normal-1440` — unthrottled refresh often completed before the checking copy was observable. No false all-clear was recorded.
- `home-loaded-real-data-*` — UI count matched live `/tprm/attention` (39 items).
- `home-true-zero-1440` — successful empty attention fixture rendered "Nothing needs your attention".
- `home-error-or-partial-state-1440` — statistics 500 left attention usable and did not render all-clear.

## Closure A — Review & Decide

Live tenant counts on `VND-2026-0023`:

| Fact | Value |
| --- | --- |
| Total responses | 36 |
| Satisfactory | 13 |
| Clarifications | 18 |
| Potential findings | 19 |
| Flat exception rows | 37 |
| Material review units | 8 |
| Clarification groups | 15 |
| Evidence issue groups | 3 |

Finding confirm 200. Remediation 200. Risk acceptance 200. Residual 100 → 100. Approval 200. Active.

## Screenshots

54 PNGs. Prior #12-F / #12-V folders were not overwritten.

## Accessibility

Home loading, Home loaded, Review summary, and decision-ready: 0 serious / 0 critical. CSP not weakened.

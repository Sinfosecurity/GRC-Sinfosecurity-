# #12 Wave 6 — ongoing monitoring + signal triage + reassessment handoff

**Item:** Golden Journey Engagement monitoring  
**Branch:** `supreme-risk-transformation`  
**Starting SHA:** `da0119b12c7ab487cb17468c02e0c216d16a504b`  
**Implementation SHA:** `2d8fe29a8e5ece972e0d2020ee25c474a2ecde91`  
**Hosted SHA:** API and frontend `2d8fe29a8e5ece972e0d2020ee25c474a2ecde91`  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35557647040 PASS  
**Status:** IMPLEMENTED — READY FOR PRODUCT LEADERSHIP REVIEW  
**Wave 5 accepted:** YES for current stage (`88938c2` / `9639535` / `da0119b`)  
**Wave 6 accepted:** NO  
**Wave 7:** NOT STARTED  
**#12:** NOT PASS  
**Production:** untouched  
**main:** not merged  

## Architecture

Third Party ≠ Engagement. The Monitoring Profile belongs to the Engagement. VendorMonitoring remains readable legacy at `/tprm/monitoring/legacy-signals` and is not Engagement authority. A signal is an observation. It does not change residual risk, Control Effectiveness, or Engagement ACTIVE status, and it does not start Wave 7 reassessment.

## Hosted golden walk

Staging only. Authenticated API walk + UI/responsive/a11y walk. See `results.json` and `screenshots/`.

| Check | Result |
| --- | --- |
| Azure residual before | MEDIUM 58 |
| Profile configured and activated | PASS |
| Manual HIGH observation | PASS |
| Inbox contains signal | PASS |
| Assign / Azure affected / triage | PASS |
| Residual after triage | MEDIUM 58 unchanged |
| Control Effectiveness | PARTIALLY_EFFECTIVE unchanged |
| Escalate | PASS |
| Finding only after reviewed handoff | PASS |
| Reassessment recommended | `wave7Started=false`, no new IRA |
| Microsoft 365 not auto-rewritten | PASS |
| Third Party signal independent impacts | Azure AFFECTED / M365 NEEDS_REVIEW |
| Requester denied | 403 API / Access Denied UI |
| Vendor denied | 401 on internal monitoring APIs |
| Azure still ACTIVE | PASS |
| BitSight / SecurityScorecard | NOT_CONFIGURED |
| Responsive 375–1920 | no overflow |
| Accessibility | labelled controls, table, visible focus |

## Provider honesty

No live BitSight, SecurityScorecard, Slack, or Jira connection. Manual, internal review, vendor-notification (internal model), and Intelligence attention are the available sources.

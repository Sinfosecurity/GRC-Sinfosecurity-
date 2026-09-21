# #12 Wave 5 — hosted closure

**Item:** Golden Journey Engagement decision path  
**Branch:** `supreme-risk-transformation`  
**Starting SHA:** `1bece45cb94de832ef40b3d811977a179058f15b`  
**Implementation SHA:** `88938c263d741365578e874599156096fe5d6276`  
**Hosted frontend/API SHA:** `963953570154616f3a2029e854de339711eb9ea7`  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35517206054 PASS  
**Status:** HOSTED CLOSURE READY FOR PRODUCT LEADERSHIP REVIEW  
**Wave 4 accepted:** YES for current stage  
**Wave 5 accepted:** NO  
**Wave 6:** NOT STARTED  
**#12:** NOT PASS  
**Production:** untouched  
**main:** not merged  

## Architecture

Third Party ≠ Engagement. Every Wave 5 record is Engagement-scoped. Risk acceptance does not lower Residual Risk. Approval authority is existing RBAC capability (`risk.treat` / `risk.accept` / `approval.decide` / `engagement.activate`), not invented job-title thresholds. Self-approval is denied by default.

## Authenticated hosted walk

Staging only. QA organization `supreme-grc-qa`. Passwords were rotated through the staging-only QA bootstrap and are not stored here.

Personas used:

- `qa.requester@supremegrc.test` — BUSINESS_OWNER
- `qa.tprm.lead@supremegrc.test` — RISK_MANAGER
- `qa.tprm.analyst@supremegrc.test` — ASSESSOR
- Vendor — invitation-only VendorContact. No Vendor User.

Primary Engagement: Microsoft Corporation QA → Azure Hosting QA `ENG-2026-0001` `93a259e6-81bf-4eb1-b79f-2077c6eeafda`.

Sibling: Microsoft 365 Collaboration QA `ENG-2026-0002` `eeb0ae53-0e05-4748-8434-79f28c9e564a`.

See `results.json` and `screenshots/`.

## Closure proof

1. Hosted lineage includes implementation `88938c2`. Wave 5 migration applied.
2. Azure starting residual CONFIRMED MEDIUM 58. One OPEN MEDIUM Finding. Governance PARTIALLY_EFFECTIVE. Compensating controls unchanged after acceptance.
3. Decisions workspace sections: Residual, Treatment, Acceptance, Approvals, Contract Requirements, Contract Gate, Activation, Decision Briefs. History is the Engagement History tab. One primary next action.
4. Analyst selected MITIGATE, then TRANSFER, then ACCEPT. Residual stayed MEDIUM 58.
5. Self-approval by the requester of acceptance: HTTP 403.
6. Lead approved acceptance. Residual, Finding, Control Effectiveness, and compensating controls unchanged.
7. Mandatory requirement sourced from confirmed Finding `5385cace-58f3-4c95-8b9b-42eda09bc14d`.
8. Gate BLOCKED. Activation denied HTTP 409 with the exact blocker.
9. Requirement satisfied through the product API. Gate APPROVED.
10. Lead activated Azure. Status ACTIVE. Next action: Monitoring setup pending Wave 6.
11. Microsoft 365 remained DUE_DILIGENCE_PLANNING with no Azure treatment, acceptance, requirements, or ACTIVE status.
12. Third Party rollup lists separate Engagement states.
13. Requester Decisions API 403. Requester UI `/unauthorized` Access Denied. Requester home shows business-safe “Approved to proceed” only.
14. Vendor-plane JWT 401 on decisions, treatment, acceptance, contract, gate, activate, and briefs. Invitation page has no Wave 5 internals.
15. Decision Brief v1 `af41694a-…` unchanged; v2 `eff9926d-…` created after activation.
16. Disposable Avoid QA became AVOIDED and cannot activate. Azure stayed ACTIVE.
17. Audit events present for treatment, acceptance, approval, contract requirement, gate blocked/approved, and activation.
18. Internal notifications queued. 0 leaked to requester. Delivery not claimed.
19. Responsive 375 / 768 / 1024 / 1440 / 1920: no horizontal overflow, no clipped primary controls, mobile nav drawer present.
20. Accessibility: labelled controls, semantic blocker list, status text not color-only, visible gold focus, keyboard tab, `role="alert"` error state.
21. No new VendorMonitoring, reassessment, termination, or offboarding records.

## Known limitations

- Contract Exceptions exist on the API workspace. The hosted Decisions page has no dedicated Contract Exceptions heading. No exceptions were recorded on Azure. No new Wave 5 UI scope was added.
- Analyst self-approval returned the capability 403 “Forbidden: Insufficient permissions” because ASSESSOR lacks `risk.accept`. The same-user SoD rule remains in code for users who do have `risk.accept`.
- History tab lists Engagement lifecycle events. Wave 5 decision events were proven through hosted audit APIs, not as new History-row copy.
- Notifications are Queued. Delivered is not claimed.

## Screenshots

`screenshots/lead-azure-decisions-{375,768,1024,1440,1920}.png`  
`screenshots/lead-azure-decisions-focus.png`  
`screenshots/lead-nav-375-open.png`  
`screenshots/lead-azure-history-1440.png`  
`screenshots/lead-m365-decisions-1440.png`  
`screenshots/lead-microsoft-third-party-1440.png`  
`screenshots/requester-home-1440.png`  
`screenshots/requester-denied-decisions-1440.png`  
`screenshots/vendor-activate-{375,768,1024,1440,1920}.png`

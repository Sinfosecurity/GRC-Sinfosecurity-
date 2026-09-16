# Supreme Experience 2.0

Engineering record for #12-V. Product Leadership decides #12 PASS. This file does not declare competitive superiority.

**Item:** #12-V Supreme Third Party — Seamless Experience & Visual Transformation  
**Starting SHA:** `11b37f52006092bee3e15b8bb1608650cdb0151c`  
**Implementation SHA:** `6cb25e8e4e61db7dc9674df6d5757b9e483badc0`  
**Review-closure SHA:** `6cb25e8e4e61db7dc9674df6d5757b9e483badc0`  
**Prior visual SHA:** `6c0795cebcf83c0dd5e187cdd619e6daaaba4c7b`  
**Prior structure SHA:** `a11405ff624571336dcc4cbd8690be48149c0a2f`  
**Branch:** `supreme-risk-transformation`  
**Migration:** NONE  
**Duplicate TPRM model:** NO

## Design principles

1. Supreme does the administration. Humans make the decisions.
2. Present five customer stages. Keep eight governed states underneath.
3. Exception-driven, not form-driven.
4. Automate deterministic administration. Do not silently automate risk acceptance, material tier override, finding closure that needs validation, final approval, or rejection.
5. Real tenant data only. No fake trends.
6. Presentation change only. IR-01–IR-15, eight packs, supreme-risk-1.2.0, tenant isolation, hard floors, Phase C, Governance Graph, Shared Evidence, and domain products are unchanged.

## Five-stage customer experience

| Customer stage | Governed states |
| --- | --- |
| Request | REQUEST |
| Assess | INTAKE, TIER_REVIEW, DUE_DILIGENCE_PLAN |
| Vendor Review | READY_TO_SEND, AWAITING_VENDOR, VENDOR_IN_PROGRESS |
| Review & Decide | SUBMITTED, UNDER_REVIEW, REMEDIATION, RISK_ACCEPTANCE, CONTRACT_REVIEW, APPROVAL |
| Monitor | ACTIVE, REASSESSMENT, OFFBOARDING |

Mapping lives in `frontend/src/experience/customerStages.ts`. API `stageKey` values are unchanged.

## Navigation

Primary **Work** group stays open: Home, Third Parties, Onboard, Assessments, Findings, Decisions.

Programs, Intelligence, Automation, Governance, Reports, and Administration collapse unless the current route is inside them. Authorization still uses `canSeeNav`. Nothing authorized was removed.

## Home

The equal MetricCard strip is gone.

Home now shows:

- Attention hero from `tprmAPI.attention()`
- Unequal metrics: Critical vendors emphasized; decisions, overdue findings, and assessments due recede
- Attention queue with one next action per item
- Portfolio counts and a real `tierCounts` distribution
- Intelligence teaser only when live items exist

Home loads three APIs in parallel: attention, vendor statistics, intelligence teaser. Domain dashboards are not fetched to render Home.

## Vendor workspace

One workspace. Six sections: Overview, Assessment, Findings, Evidence, Decisions, History.

The hero shows name, service, owner, tier, inherent, residual, and status. LifecycleProgress shows the five customer stages. NextActionCard names one dominant action.

Assessment combines intake, tier, packs, and send. After intake, **Assessment scope ready** shows recommended tier, inherent risk, why, and packs on the same tab.

Decisions lead with exception counts and keep **View full assessment** secondary.

Active / reassessment / offboarding content appears on Overview so an approved vendor is not an unfinished onboarding case.

## Request

`/vendor-onboarding` asks vendor, service, and internal owner first. Context-only spend and start date stay secondary. Submit opens Assess. The vendor is not invited.

## Vendor portal

Vendor home is **Security review for [customer]**, percent complete, remaining questions, due date, and Continue. Customer administration, other vendors, and internal scoring are not shown. Questionnaire adds **Next unanswered**.

## Exception-driven review

Analysts see how many items need review first. Satisfactory answers stay in the full assessment.

### Review & Decide closure

Decisions no longer opens a flat equal list of every exception row. The existing `review.items` payload is grouped client-side into material issues, clarifications, and evidence issues. Hosted fixture `VND-2026-0022` had 36 responses, 13 satisfactory, 18 clarification rows, 19 potential findings, and 37 flat exception rows. After grouping the primary queue was 8 material units, with 15 clarification groups and 3 evidence groups still visible in their own queues. View full assessment remains. Finding confirm, remediation, and risk acceptance stay in context. Acceptance did not change residual (100 → 100). Evidence: `docs/private-beta/hosted-ux-qa/supreme-experience-2-review-closure/`.

## Automation boundaries

Automatic: inherent score, recommended tier, hard floors, recommended packs, invitation state, vendor progress, unanswered/exception identification, due dates, reassessment date where existing rules apply.

Human: risk acceptance, material tier override, finding validation/closure, final approval, rejection.

H-2 and H-7 were not implemented.

## Before / after steps

Counts include required confirmations. They do not include typing every IR answer.

| Journey | Before (#12-F 11-tab workspace) | After (Experience 2.0) |
| --- | --- | --- |
| Request → assessment ready | Request submit, open workspace, Intake tab, submit intake, Tier Review tab, confirm, Assessment Plan tab, confirm (8 screens) | Request submit lands in Assessment; intake + scope summary + confirm on the same tab (3 screens) |
| Assessment ready → invitation | Find Due Diligence tab, enter contact, send (3 screens) | Same Assessment tab: Send invitation or Copy secure link (1 screen) |
| Vendor activation → submit | Activate, landing, open pack, answer, submit (3 screens + questions) | Same three surfaces; Continue and Next unanswered reduce hunting |
| Submit → exception review | Find Review among 11 tabs, scan the full list (2 screens, all items first) | Decisions opens on exception counts; Review N items is the next action (1 screen) |
| Exceptions → decision ready | Findings, Contract, and Approval as separate tabs (3 screens) | Findings stay available; contract and decision brief share Decisions (1–2 screens) |
| Decision → monitor | Activate, then find Active tab (2 screens) | Activate; Overview already shows monitoring posture (1 screen) |

## Visual refinement after first hosted pass

The first #12-V pass changed structure. This follow-up removed competing navy slabs, oversized page titles, and unbounded attention lists.

- Page titles use `h2` sizing.
- Home greeting, priority queue (first six), and portfolio sit on cream with separators instead of stacked MetricCards.
- Vendor hero is a compact metadata header.
- Lifecycle uses an underline current step.
- Completed intake collapses behind Review intake answers.
- Exception lists show eight rows unless the analyst asks for all.
- Send appears only in Vendor Review or later, as Review and send.
- Home leftover count sits outside the list so axe `list` stays valid.

Prior screenshots in `supreme-experience-2/` were not overwritten. Visual follow-up shots are in `supreme-experience-2-visual/`.

## Remaining limitations

- Register still exists as a list. Opening a row still uses the existing vendor drawer plus the onboarding workspace for lifecycle work.
- Full questionnaire answering remains sequential. Next unanswered does not skip evidence requirements.
- Invitation email remains Queued ≠ Delivered.
- Hosted inbox receipt was not tested.
- H-2, H-4, H-5, H-6, H-7 remain open.
- #21 remains PAUSED.
- Cursor does not declare #12 PASS, better than OneTrust, private-beta ready, or production-ready.

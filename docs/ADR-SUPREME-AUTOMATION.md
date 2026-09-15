# ADR: Supreme Automation

**ADR ID:** ADR-SUPREME-AUTOMATION  
**Status:** ACCEPTED  
**Date:** 2026-09-14  
**Item:** #20 Supreme Automation  
**Starting SHA:** `75e743b37a4fd75af10e7f82e87e0790c3dc8ed2`  
**Production-ready claim:** NO  
**#1–#19 status:** Product Leadership accepted  
**#21 authorized:** NO

## CONTEXT

Product Leadership authorized #20 on 2026-09-14. Supreme already records governed truth and interprets it (#19). Operators still do the administration: remind, assign, request evidence, escalate, and prepare decisions.

Legacy in-memory `/tasks` and `/workflows` APIs are not this product. Placeholder Bull processors are not this product.

## PROBLEM

Without a dedicated orchestration layer, later work will either:

1. silently write residual risk, close findings, approve vendors/AI, or declare compliance, or
2. invent a second event bus and parallel Finding/Risk/Task databases.

Both would break explainability and human authority.

## DECISION

#20 introduces a **governed orchestration plane**. It coordinates administration. It does not become another governance product and it does not decide.

| Concern | Authoritative store | #20 role |
|---|---|---|
| Vendor / assessment / finding | `Vendor`, `VendorAssessment`, `VendorIssue` | Trigger, notify, create follow-up work |
| Enterprise risk / acceptance | `EnterpriseRisk`, `EnterpriseRiskDecision` | Trigger, request human renewal/review |
| Controls / tests / evidence | `OrganizationControl`, `OrganizationControlTest`, `EvidenceGovernanceLink` | Trigger, request replacement/review |
| Compliance / privacy / AI | Existing #16–#18 models | Trigger, remind, assign review |
| Intelligence | `IntelligenceItem` | May trigger from Critical Attention; never mutate source via Intelligence |
| Follow-up coordination | `AutomationWorkItem` | Orchestration only — not a finding, risk, or approval |
| Automation definition / version / run | `AutomationDefinition`, `AutomationVersion`, `AutomationExecution` | Orchestration metadata |

No second Vendor, Risk, Finding, Control, Evidence, Compliance, Privacy, AI, Decision, or Governance Graph model.

No generic outbound webhook platform. That remains #22.

### Product principle

Supreme does the administration. Humans make the decisions.

Automation may route, assign, remind, escalate, create follow-up work, request evidence, request review, start a governed reassessment workflow, create notifications, schedule governed checks, and prepare decision packages.

It must not automatically accept risk, approve vendors, approve AI, change residual risk, close findings without governed validation, declare compliance, make legal conclusions, close privacy requests, change control effectiveness without an evidence/test result, or override human authority.

### Authority levels

| Level | Meaning |
|---|---|
| FACT | A value copied from an authoritative record |
| AUTOMATION ACTION | A versioned administrative action against existing services |
| HUMAN DECISION | An explicit person action on the source record |

These three are never presented as the same thing.

## WORKFLOW MODEL

Customer-facing shape is structured, not raw JSON:

**WHEN** (trigger) → **IF** (deterministic conditions) → **THEN** (safe actions) → **REQUIRES HUMAN DECISION** (visible boundary).

Definitions have a lifecycle: `DRAFT` → `ACTIVE` → `PAUSED` → `ARCHIVED`.

Editing an `ACTIVE` automation creates a new draft version. Publishing a version does not rewrite historical executions.

## TRIGGER MODEL

Triggers come from real Supreme events or scheduled scans of real records.

Event triggers are emitted after authoritative writes (finding created, control test recorded, intelligence item generated, and similar). Scheduled triggers scan real due dates (finding overdue, evidence expiring, risk acceptance nearing expiry). Fake events are not created.

## CONDITION MODEL

Conditions are a closed catalog: equality, membership, boolean flags, and numeric thresholds (for example “expires within 30 days”). There is no customer JavaScript, shell, or expression language.

## ACTION MODEL

Actions invoke existing services:

- create an `AutomationWorkItem` (review, reminder, evidence request, decision request, reassessment request)
- notify the owner in-app and by existing transactional email
- record audit

Prohibited action keys (`AUTO_APPROVE_VENDOR`, `AUTO_ACCEPT_RISK`, `AUTO_CLOSE_CRITICAL_FINDING`, `AUTO_MARK_COMPLIANT`, `AUTO_APPROVE_AI`, `AUTO_DECLARE_PRIVACY_TRANSFER_VALID`) are rejected at publish and at execute.

## HUMAN APPROVAL BOUNDARIES

Every published template that could precede a material conclusion carries an explicit human boundary. The workflow may assemble context and create a decision request. The human still accepts risk, closes the finding, approves the vendor, or records the source change.

Preview never writes. Live writes only allowed administrative actions.

## EXECUTION STATE

`QUEUED` → `RUNNING` → `SUCCEEDED` | `PARTIAL` | `FAILED` | `DEAD_LETTER` | `SKIPPED`. `PREVIEW` is recorded separately and performs no writes.

Paused automations do not start new executions. Historical runs remain.

## RETRY, IDEMPOTENCY, DEAD-LETTER

Delivery on the existing Bull/Redis queues is **at-least-once**. Exactly-once is not claimed.

Idempotency key: `automationId:versionId:event:sourceModel:sourceId:timezoneDay`.

The same finding-overdue event cannot create five reminder work items on the same calendar day in the organization timezone.

Notification/email actions may retry with the existing notification `dedupeKey`. Creating governance records is not retried if a work item for that execution already exists.

Permanent failures move to `DEAD_LETTER` / Needs Attention. Failed runs are not discarded. Manual retry is permitted for retryable actions only.

## SCHEDULING AND TIMEZONE

Scheduled scans reuse the existing Bull monitoring/assessment infrastructure plus an in-process scan that works when Redis is unavailable. Customer UX records the organization timezone (`Organization.timezone`). UTC is not silently assumed in the UI.

## AUDIT, RBAC, TENANT ISOLATION

Audit actions: `automation.created`, `automation.published`, `automation.enabled`, `automation.paused`, `automation.triggered`, `automation.execution.started`, `automation.action.executed`, `automation.action.failed`, `automation.retried`, `automation.approval.requested`, `automation.archived`.

Permissions: `automation.read`, `automation.manage`, `automation.retry`.

Viewer reads. Admins and risk managers configure. Every query is tenant-scoped. Client `organizationId` overrides are rejected.

## VERSIONING

Each execution stores `versionId` and `versionNumber`. Publishing v2 does not change the version pointer on historical runs.

## SECRETS AND EXTERNAL PROCESSORS

No secrets in conditions, actions, or execution logs. No customer-provided code. No generic external webhook action in #20. If Redis/queue is unavailable, status is truthful (`NOT_CONFIGURED` / `DEGRADED` / `ERROR`). Successful execution is never simulated.

AI agents are not claimed. Deterministic workflow automation is sufficient. If AI is `NOT_CONFIGURED`, Automation still functions.

## ROLLBACK BOUNDARIES

Pause stops new triggers. Work items are not deleted. Source governance records are never rolled back by Automation; humans change source records.

## PUBLIC STATUS

Marketing remains Roadmap / Private Testing until Product Leadership accepts #20.

## ADDENDUM — INTELLIGENCE → AUTOMATION CONTRACT

**Date:** 2026-09-15  
**Status:** ACCEPTED for #20 closure  
**Does not change #19 deterministic priority rules.**

### Root cause of the prior hosted miss

`#19` rule `control.test_failed` assigns **HIGH_ATTENTION**, not **CRITICAL_ATTENTION**.  
`persist()` previously emitted `intelligence.critical_attention` only when a **new** Intelligence item was created at Critical Attention.

A failed control test therefore correctly created INT-* as High Attention and never emitted this event. That is not a fake-event problem. It is a contract mismatch: the previous walk used a fact `#19` does not classify as Critical Attention.

### Authoritative origin

The event is emitted only from `enterpriseIntelligenceService.persist` after a successful Intelligence generate/reconcile write. It is never emitted from UI code, Automation scan of Intelligence rows, or direct database insertion.

`generate()` / `workspace()` remain the accepted `#19` generation path. Opening Intelligence after an authoritative source write is the real product path.

### Event

`intelligence.critical_attention`

Emitted when an Intelligence item **becomes current Critical Attention**:

1. first create with `priority = CRITICAL_ATTENTION` and `current = true`
2. reopen (`current` was false) as Critical Attention
3. priority change to Critical Attention while remaining or becoming current

Not emitted when:

- priority is HIGH_ATTENTION, REVIEW, or POSITIVE
- the item is already current Critical Attention and the fingerprint is unchanged (regenerate / redelivery)
- the item is resolved (`current = false`, lifecycle `RESOLVED_BY_SOURCE`)

Resolved items do not create a new current-critical run unless a later material source condition produces a new or reopened Critical Attention item.

### Payload (documented; facts are loaded from the Intelligence record)

| Field | Source |
|---|---|
| organizationId | persist tenant |
| event | `intelligence.critical_attention` |
| sourceModel | `IntelligenceItem` |
| sourceId | Intelligence item UUID |
| sourcePublicId | `INT-*` |
| actorUserId | generate actor, when present |
| priority | `CRITICAL_ATTENTION` |
| domain | Intelligence domain |
| ruleId | deterministic rule id |
| lifecycle | item lifecycle at emit |
| current | `true` |
| generatedAt | item generatedAt (loaded, not invented) |

Automation then loads authoritative facts from `IntelligenceItem` (`intelligence.priority`, `intelligence.current`, owner). It does not mutate Intelligence or the source product.

### Delivery

Existing `emitSupremeAutomationEvent` → in-process `handleEvent`. Same at-least-once bus as other `#20` events. No second event bus. Duplicate event delivery is suppressed by the execution idempotency key:

`automationId:versionId:intelligence.critical_attention:IntelligenceItem:{itemId}:{timezoneDay}`

### Human boundary

Automation may create review work and notify. It must not accept risk, close findings, change residual risk, approve vendors or AI, declare compliance, or rewrite Intelligence source facts.

### High Attention

High Attention is a permitted Intelligence priority. It does **not** emit `intelligence.critical_attention`. A failed control test remains High Attention per `#19` and may still trigger the separate `control.test.failed` automation.

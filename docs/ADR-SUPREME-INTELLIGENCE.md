# ADR: Supreme Intelligence

**ADR ID:** ADR-SUPREME-INTELLIGENCE  
**Status:** ACCEPTED  
**Date:** 2026-09-14  
**Item:** #19 Supreme Intelligence  
**Starting SHA:** `d3a381172e1a32283a123ccf3c5184a5342201af`  
**Production-ready claim:** NO  
**#12–#18 status:** Product Leadership accepted  
**#20 authorized:** NO

## CONTEXT

Product Leadership authorized #19 on 2026-09-14. Supreme already records governed truth in Third Party, Risk, Compliance, Privacy, AI Governance, Controls, Evidence, Findings, Decisions, Monitoring, Audit, and the Governance Graph. Operators still have to visit each product to answer what changed, why it matters, and what it affects.

Dashboard attention queues, analytics pages, and the legacy `/ai-insights` surface are **not** this product.

## PROBLEM

Without a dedicated interpretation layer, later work will either:

1. duplicate vendor, risk, finding, control, evidence, compliance, privacy, AI, decision, or graph objects into a second database, or
2. invent scores, threat feeds, or legal conclusions that no authoritative product recorded.

Both would break explainability and the accepted authority model.

## DECISION

#19 introduces a **derived intelligence plane**. It interprets and prioritizes governed records. It does not become another governance product.

| Concern | Authoritative store | #19 role |
|---|---|---|
| Vendor / assessment / finding / TPRM decision | `Vendor`, `VendorAssessment`, `VendorIssue`, `RiskDecisionBrief` | Read, group, explain |
| Enterprise risk / appetite / acceptance | `EnterpriseRisk`, `EnterpriseRiskDecision` | Read, group, explain |
| Controls / tests | `OrganizationControl`, `OrganizationControlTest` | Read, group, explain |
| Evidence bytes / malware / freshness | `StoredObject`, `EvidenceGovernanceLink` | Read metadata only. Never evidence bodies |
| Compliance gaps / exceptions | `ComplianceGap`, `ComplianceException` | Read, group, explain |
| Privacy DSR / transfer / DPIA | `PrivacyRightsRequest`, `PrivacyTransfer`, `PrivacyDpia` | Read, group, explain |
| AI system / approval / test / change | `AiSystem`, `AiApproval`, `AiTest`, `AiChange` | Read, group, explain |
| Graph identity / impact | `GovernanceNode`, `GovernanceEdge` | Bounded traversal of real edges only |
| Intelligence item / lifecycle | `IntelligenceItem` + `IntelligenceHistory` | Derived, rebuildable, tenant-scoped |
| External intelligence | No provider | Honest `NOT_CONFIGURED` |
| AI narrative | Existing `aiProvider` | Optional summary of recorded facts only |

No second Vendor, Risk, Finding, Control, Evidence, Compliance, Privacy, AI, Decision, or Governance Graph model.

### Product principle

Supreme Intelligence interprets. Humans decide.

Intelligence may identify, prioritize, explain, connect, summarize, highlight, compare, and surface review guidance.

It must not silently approve, reject, accept risk, change a risk score, close findings, implement controls, approve AI, determine compliance, make legal conclusions, close privacy requests, or approve vendors.

### Authority levels

These three labels are never presented as the same thing:

| Level | Meaning | UI label |
|---|---|---|
| FACT | A value copied from an authoritative record | Fact |
| DERIVED INTELLIGENCE | A deterministic grouping, priority, or explanation produced by a versioned rule | Derived intelligence |
| AI-GENERATED NARRATIVE | Optional prose that restates recorded facts when an AI provider is configured | AI narrative |

AI narrative is absent when the provider is `NOT_CONFIGURED`. The product still functions.

## PURPOSE

Answer, from governed data:

- What changed?
- What needs attention?
- Why does it matter?
- What is affected?
- What facts support this?
- Who needs to review or decide?
- What should be reviewed next?

Home remains “what work do I need to do now?” Intelligence is “what materially changed, why it matters, what it affects, and what deserves review?”

## AUTHORITATIVE INPUTS

Rules read live tenant rows. They do not copy payloads into Intelligence as a second source of truth.

Material-change rules (`supreme-intelligence-1.0.0`) are explicit:

- vendor tier is Critical or High and a review is due
- residual rating is High or Critical and appetite is outside appetite or near tolerance
- risk acceptance is expired or due within 14 days
- Critical or High finding is open, or a finding closed (positive)
- latest control test is FAIL or PASS (positive)
- evidence freshness is EXPIRED, EXPIRING, REVOKED, or scan is FAILED / INFECTED; CURRENT after expiry is positive renewal
- compliance gap is OPEN or CLOSED (positive)
- privacy DSR is overdue or due within 7 days; transfer or DPIA requires review
- AI system is PRODUCTION without a current human approval; AI test FAIL; recorded AI change
- TPRM decision brief is pending

Meaningless field edits are not intelligence.

## DERIVED INTELLIGENCE

`IntelligenceItem` is a rebuildable derived record:

- public customer ID `INT-00001`
- grouping key for deduplication
- rule id + rule version
- priority, polarity, lifecycle
- provenance (source product, model, id, timestamp)
- facts, affected objects, source links
- fingerprint of the current condition

Regeneration upserts by `(organizationId, groupingKey, ruleId)`. When the authoritative condition ends, the item becomes `RESOLVED_BY_SOURCE` and `current=false`. Historical rows are not deleted. Future rule versions do not rewrite stored `ruleVersion` or stored reasoning.

If the derived table is lost, rebuild by running generation against live source tables. Source records remain authoritative.

## PRIORITY MODEL

Priorities are coarse by design. There is no invented “93.7% dangerous” score.

| Priority | Typical conditions |
|---|---|
| Critical attention | Expired/revoked/blocked evidence on a Critical vendor or High/Critical risk; Critical open finding; overdue DSR; unapproved production AI |
| High attention | High finding; High/Critical risk outside appetite; failed control test; open compliance gap; transfer/DPIA review required; failed AI test |
| Review | Reassessment due; acceptance nearing expiry; near tolerance; expiring evidence |
| Positive movement | Finding closed; control test PASS; evidence renewed; risk returned within appetite; gap closed |

## DEDUPLICATION

One source object produces one current item per rule.

Example: one expired evidence file mapped to 14 requirements produces one item. Affected counts list the 14 requirements. Drill-down uses stored affected objects. The engine does not emit 14 top-level cards.

## LIFECYCLE

Operational states: `NEW`, `ACKNOWLEDGED`, `UNDER_REVIEW`, `RESOLVED_BY_SOURCE`, `SUPERSEDED`.

Acknowledging an item never closes a finding, changes a risk, approves a vendor, closes a gap, or changes a control.

## GRAPH USAGE

Impact uses `#13` `impact()` / `findNodeBySource()`. Depth and result limits stay `GRAPH_MAX_DEPTH = 3` and `GRAPH_MAX_RESULTS = 200`. Missing nodes produce empty graph impact, not invented edges. Relationship labels are human-readable.

## RBAC AND TENANT ISOLATION

Permission: `intelligence.read`, `intelligence.acknowledge`, `intelligence.report`.

More importantly, each item declares required source permissions. A user without `privacy.read` does not see privacy intelligence. Intelligence is not a side channel.

Lookups are organization-scoped. Cross-tenant ids return 403/404 without metadata.

Role lenses hide operational noise for executives and restrict business owners to records they own.

## EXTERNAL INTELLIGENCE

No provider is configured. The API returns `External intelligence not configured`. No fake breach, news, vendor-incident, or cyber-score feed is generated.

## AI BOUNDARY

Deterministic intelligence is the core. If `aiProvider` is configured, AI may summarize existing facts. It must not invent scores, findings, incidents, evidence, compliance state, legal conclusions, or approvals.

## PERFORMANCE

`GET /intelligence/workspace` is one server-side aggregation. Browsing uses the `intelligence` limiter (180/15m, user+org). PDF uses `reportLimiter`. Generation is bounded (500 source rows per class).

## BACKUP / REBUILD

`IntelligenceItem`, `IntelligenceHistory`, and `IntelligenceCounter` are listed in `AUTHORITATIVE_TABLES` because they hold operational lifecycle and historical reasoning. They remain derived: a wipe can be rebuilt from source tables. Evidence bodies, passwords, and tokens are never stored.

## AUTOMATION BOUNDARY

#19 detects and recommends review. It does not implement trigger → action workflows, an automation designer, or an execution engine. Those belong to #20.

## HONESTY

- No simulated external feed
- No invented trends (`Trend not yet established` when history does not support comparison)
- Public website remains Roadmap until Product Leadership accepts #19
- PPTX is not shipped in this ADR unless a later change meets the accepted premium board standard

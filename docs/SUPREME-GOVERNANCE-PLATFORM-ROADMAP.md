# Supreme Governance Platform — Master Roadmap

**Status:** Target architecture. Not a production claim.  
**Branch:** `supreme-risk-transformation` only. Do not merge `main`. Do not deploy production without an independent review.  
**Product today:** Supreme Third Party (TPRM) on a shared Express + Prisma + React monolith.  
**Destination:** One governance operating system with seven modules.

This document is the north-star plan. It is **not** permission to implement every section in one commit.

---

## Vision

Build a governance platform that is **better than the established enterprise GRC generation** — not by copying any competitor’s UI, terminology, workflows, or content, and not by winning a feature-count contest.

Supreme succeeds when customers can say:

- It was faster to deploy than traditional GRC.
- Teams understand why a risk is scored that way.
- Evidence is collected once and reused defensively.
- Executives can read the reports without a translator.
- Workflows need less chase-and-remind.
- Third-party, enterprise, privacy, and AI risk are connected.
- Attention is obvious.
- AI explains itself and never invents authority.
- Decisions trace back to evidence.
- Governance is an operating system, not a spreadsheet collection.

The benchmark is **product superiority**: easier to implement, easier to understand, more automated, more explainable, more decision-oriented, less administratively burdensome — for mid-market and large enterprise.

---

## Honesty rules (non-negotiable)

These rules already apply to shipped TPRM and apply to every future module.

- No mock data in normal production workflows.
- Demo data may exist **only** in an explicitly labeled **DEMO WORKSPACE**.
- No fake AI. No simulated security. No fabricated monitoring events. No fake integrations.
- If a provider is unavailable, the product shows **NOT CONFIGURED** (or DEGRADED / FAILED) truthfully.
- Human decisions remain authoritative. AI may summarize and recommend; it never writes residual risk or silent approvals.
- Historical records are immutable. Methodology, mapping, and workflow changes get versions and effective dates.
- Tenant isolation, RBAC, auditability, and explainable scoring are preserved. Working TPRM is not rewritten for novelty.

---

## Architecture

Implemented today as a **modular monolith**:

```
Organization
  → Vendor → Inherent risk → Assessment / evidence
  → Deterministic explainable score
  → Decision Brief (human) → Findings / CAP
  → Monitoring signals (recorded only) → Reports
```

**Runtime**

| Layer | Current implementation |
|---|---|
| Frontend | Vite / React (`frontend/src`) |
| Backend | Express (`backend/src/server.ts`) → `/api/v1` |
| Data | Prisma / PostgreSQL |
| Identity | Prisma `User` / `Organization` via `authService` |
| Authorization | `security/rbac.ts` + `requirePermission` |
| Tenancy | `organizationId` on every tenant query |
| Storage | `objectStorageService` (S3 or explicit local) |
| Scoring | `deterministicRiskEngine` + persisted `ScoreCalculation.factors` |
| Decisions | `RiskDecisionBrief` with immutable decided snapshots |
| Evidence | `StoredObject` + `EvidenceLink` + `VendorDocument` |
| AI | `aiProvider` — NOT_CONFIGURED without keys |
| Jobs | Bull queues defined; processors still placeholders |
| Billing | Stripe when configured; otherwise NOT_CONFIGURED |

**Target shared services** (grow in place; do not fork seven apps)

- Identity, RBAC / future ABAC, session governance
- Tenant + organizational hierarchy
- Governance Graph (object relationships)
- Universal evidence + lineage
- Decision engine (briefs across modules)
- Attention engine (one prioritized queue)
- Workflow / automation engine
- Governed agents (on top of automation)
- Intelligence event bus (normalized external signals)
- Search (structured + governed NL)
- Reporting / export
- Audit, observability, webhooks, versioned API

See also: `docs/SUPREME-RISK-ARCHITECTURE.md`, `docs/ADR-0001-phase-a-tprm-explainability.md`, `docs/SECURITY-MODEL.md`, `docs/TENANT-ISOLATION.md`, `docs/RBAC.md`.

---

## Seven modules

These are **modules on one platform**, not seven products with duplicate records.

| Module | Purpose | Status |
|---|---|---|
| **Supreme Third Party** | TPRM lifecycle, explainable scoring, decision briefs, evidence, findings, monitoring, reports | **CURRENT spearhead** — production-readiness in progress |
| **Supreme Risk** | Enterprise risk register, appetite, heatmaps, aggregation, treatment | Backend Prisma `Risk*` exists; UI still mock. **Phase 3** |
| **Supreme Compliance** | Common control framework, mappings, testing, attestation, audit prep | Prisma `Control*` / `Compliance*` exist; compliance API is stub; UI mock. **Phase 3** |
| **Supreme Privacy** | Inventory, RoPA, PIA/DPIA, DSAR, transfers, consent architecture | Not started (unmounted in-memory sketch only). **Phase 4** |
| **Supreme AI Governance** | AI system inventory, model risk, responsible AI, AI Decision Brief | Not started (`AiOperationLog` is telemetry only). **Phase 5** |
| **Supreme Intelligence** | Normalized external signals correlated to graph objects | Architecture only; TPRM monitoring is recorded-events-only. **Phase 6** |
| **Supreme Automation** | WHEN / IF / THEN workflows, SLAs, governed agents | In-memory GRC workflow stub; Prisma vendor approvals unused in UI. **Phase 7** |

---

## Supreme Governance Graph

The platform must understand relationships instead of siloed copies.

**Target object families**

Organizations, business units, legal entities, users, teams, assets, applications, systems, vendors, fourth parties, AI systems, data assets, processing activities, risks, controls, requirements, regulations, frameworks, policies, evidence, assessments, findings, issues, remediation, incidents, contracts, obligations, exceptions, risk acceptances, decisions, approvals, monitoring signals, audit events, workflows.

**Example chain (target, not current)**

Vendor → processes personal data → supports application → application supports business process → governed by control → control maps to a requirement → evidence supports control → finding weakens control → vendor residual changes → enterprise risk changes → workflow triggers → executive decision required.

**What already exists (do not duplicate)**

- TPRM graph: `Vendor`, assessments, documents, issues, contracts, fourth parties, monitoring, reviews, exceptions, SOC scope, BAA, ISO mappings, business-process mappings
- Explainability graph: `ScoreCalculation`, `ScoringMethodology`, `RiskDecisionBrief`, `Questionnaire*`
- Evidence graph (partial): `StoredObject`, `EvidenceLink`, `VendorDocument`
- Enterprise GRC models (backend, mostly unwired UI): `Risk`, `Control`, `ComplianceFramework`, `Incident`, `Policy`
- Identity: `User`, `Organization`, `AuditEvent`

**What must be added later (not now)**

Shared `GovernanceNode` / relationship table or equivalent typed edges; privacy and AI-system objects; intelligence events; workflow definitions; evidence lineage query (“where is this evidence used?”); organizational hierarchy rollups.

Avoid creating a second Vendor, Evidence, or Finding model per module.

---

## Shared services — CURRENT vs target

| Service | CURRENT | Target |
|---|---|---|
| Explainable scoring | Vendor residual with named factors; methodology versioned | Same standard for ERM, privacy, AI |
| Decision Briefs | TPRM only; human decision; immutable snapshot | Briefs for risk acceptance, exceptions, privacy, AI, incidents |
| Evidence | Vendor + assessment links; scan honesty | Universal links + lineage + reuse across controls |
| Attention | TPRM overdue reviews, assessments, issues, documents | One queue across all modules, ranked |
| Reports | Board / executive / findings / monitoring / brief / scorecard / assessment PDFs | Module families + role dashboards |
| Search | Vendor list filter only | Tenant-scoped universal + governed NL |
| Automation | Placeholder queues; in-memory workflow builder | Persisted engine, approvals, SLAs, audit |
| Agents | Evidence analyst when configured | Fact / inference / recommendation split; approval for high impact |
| Integrations | Slack / Jira / ServiceNow / SIEM honest HTTP or NOT_CONFIGURED | Integration platform + webhook + credential vault |
| Identity | Prisma login, invite, password reset | SSO (SAML/OIDC), SCIM, MFA, session governance |

---

## Competitive benchmark (category, not clone)

Do not copy any competitor’s UI, IA, proprietary content, or workflows. The question is: **why is Supreme better?**

| Area | Enterprise standard (category) | Supreme today | Differentiator to protect | Remaining gap |
|---|---|---|---|---|
| TPRM | Inventory, tiering, questionnaires, evidence, residual, monitoring, approvals | Real lifecycle + explainable score + Decision Brief + professional reports | **Why the score changed** is first-class | External monitoring adapters, vendor portal, fourth-party UI |
| ERM | Register, appetite, heatmap, treatment, KRI | Prisma register; mock UI | Connect vendor residual → enterprise risk | Wire UI; appetite/tolerance/aggregation |
| Compliance | Common controls, mappings, testing, audit packs | Models exist; API stub; mock UI | **One evidence item, many defensible requirements** | Control intelligence + licensed content handling |
| Privacy | RoPA, PIA/DPIA, DSAR | Absent | Graph to vendors / AI / transfers | Phase 4 |
| AI governance | Inventory, risk class, oversight, incidents | Absent | AI Decision Brief + no silent authority | Phase 5 |
| Intelligence | Ratings, breaches, sanctions, regulatory feeds | Recorded TPRM signals only | Honest NOT_CONFIGURED; no invented ratings | Provider adapters + correlation |
| Automation | Triggers, branches, SLAs, tickets | Stub | Governed agents on top of workflows | Phase 7 |
| Implementation | Months of professional services | Signup + TPRM quick path exists | **Supreme Quickstart** | Import, guided mapping, first executive report in days |
| Trust | SOC 2 / ISO story | Tenant isolation + audit + scan honesty | Production truthfulness | SSO, residency, scale certification |

Categories represented for orientation only: OneTrust, AuditBoard, LogicGate, Archer, ServiceNow GRC/IRM, MetricStream, Vanta, Drata. None is a template.

---

## Differentiators (protect these)

1. **Explainable risk** — no black-box authoritative score.
2. **Evidence-to-decision** — evidence leads to a defensible brief.
3. **Governance Graph** — objects connect; modules do not silo.
4. **Universal evidence** — collect once; reuse when the relationship is defensible.
5. **Decision Briefs** — data becomes an executive decision.
6. **Supreme Automation** — repetitive chase work is automated.
7. **Governed AI** — AI assists; humans remain accountable; FACT / INFERENCE / RECOMMENDATION are labeled.
8. **Implementation speed** — enterprise governance without a six-month program.
9. **Executive clarity** — reports a CISO can send to a board.
10. **One platform** — TPRM + Risk + Compliance + Privacy + AI + Intelligence + Automation.

---

## Phases

Each phase needs **independent certification**. Do not self-certify. Do not skip gates to start the next module.

### Phase 1 — Production-ready Supreme Third Party (NOW)

Finish a sellable TPRM product.

- Browser E2E of the live journey (login → vendor → assessment → evidence → finding → explainable risk → decision → reports)
- Close production-readiness gaps: admin pages still on mock data, leftover legacy GRC routes, job processors, CI green, migration rehearsal
- Keep report quality at consulting-deliverable standard
- Preserve tenant isolation, RBAC, immutable briefs, scoring honesty

**Exit:** Independent review can call Supreme Third Party a **staging / production candidate** with evidence, not a slide.

### Phase 2 — Enterprise TPRM

- Continuous monitoring adapters (CONNECTED only after a live test)
- Vendor portal (questionnaires, evidence, CAP, messages) — isolated external identity
- Workflows that persist (assessment due, evidence expiry, finding overdue)
- SSO / SAML / OIDC, MFA, session governance; SCIM design
- Versioned public API, API keys / service accounts, webhooks
- Fourth-party graph UI on existing `FourthParty` model
- Guided CSV/XLSX import for vendors and findings

### Phase 3 — Supreme Risk + Supreme Compliance

- Replace mock ERM / controls / incidents / policies UIs with Prisma APIs
- Risk taxonomy, appetite, tolerance, heatmaps, aggregation, treatment
- Common control library; cross-framework mapping **without embedding copyrighted control text**
- Licensed / customer-supplied framework content
- Evidence reuse across controls when the link is defensible
- Control testing, deficiencies, exceptions, attestation

Vendor residual must be able to contribute to enterprise risk without a second invented score.

### Phase 4 — Supreme Privacy

- Data inventory, processing activities, RoPA
- PIA / DPIA / transfer / LIA
- DSAR intake and fulfillment with deadlines
- Retention, residency, DPA, privacy incidents
- Graph links to vendors, systems, and (later) AI systems

### Phase 5 — Supreme AI Governance

- AI system inventory and intake
- Risk classification, model / responsible-AI / privacy / security review
- AI Governance Decision Brief (same immutability rules as TPRM)
- Accommodate NIST AI RMF, ISO/IEC 42001, EU AI Act **as customer policy mappings**, not copied legal text
- Incidents, monitoring, human oversight evidence

### Phase 6 — Supreme Intelligence

- Normalized `IntelligenceEvent` (source, provider, entity, type, severity, confidence, dates, evidence ref, affected objects, recommended action, status)
- Correlate to vendors, assets, risks, controls, AI systems, privacy activities
- Provider categories: security ratings, threat intel, sanctions, corporate registry, financial health, regulatory feeds
- Never show a clean bill of health for an unconnected provider

### Phase 7 — Supreme Automation + governed agents

- Persisted WHEN / IF / THEN engine: conditions, branches, approvals, timers, SLAs, retries, versioning, execution history
- Agents on top of automation: summarize, extract, draft, recommend — never silently decide
- Every AI operation logged (`organization`, user, agent, action, inputs, output, model, timestamp, status)
- High-impact actions require human approval

### Phase 8 — Graph maturity + command center

- Full Governance Graph query and visualization
- Executive command center with drill-down to evidence
- Universal search + governed natural-language query
- Regulatory-change management
- Role-specific dashboards (Board, CISO, CRO, Privacy, AI, Audit, Business Owner)
- Organizational hierarchy rollups
- Advanced analytics that do not invent data

---

## CURRENT / NEXT / LATER

Use this list so the target architecture does not become uncontrolled scope.

### CURRENT (in code on this branch)

- Prisma auth, tenant RBAC, audit events
- TPRM vendor lifecycle, assessments, questionnaires, evidence upload, findings/CAP
- Explainable scoring (`supreme-risk-1.1.0`); risk acceptance is **not** a scoring control
- Risk Decision Briefs (generate, decide, immutable snapshot, PDF)
- What Needs Attention (TPRM live records)
- Monitoring page: recorded `VendorMonitoring` only; provider health independent of signal count
- Professional PDF/CSV/XLSX/PPTX reports (board, executive, findings, monitoring, brief, scorecard, assessment)
- AI analyst and integrations degrade to NOT_CONFIGURED
- Nav: Home / Third Party / Intelligence / Administration
- Development preview banner; demo workspace is the preview tenant, not a production path

### NEXT (Phase 1 — do this before new modules)

1. **Browser E2E certification** of the TPRM journey against a live database (Playwright; no suite exists today).
2. **Wire Administration to real APIs:** Organization, Users & Roles, Audit Log (backends already exist).
3. **Quarantine or hide legacy GRC silo pages** that still use local mock arrays (`RiskManagement`, `ComplianceManagement`, `ControlsManagement`, `Incidents`, `Policies`, `Analytics`, `Tasks`, `WorkflowBuilder`, `ISO27001`, `TISAX`, etc.) until Phase 3 wires them honestly.
4. **Production gates:** CI green on GitHub, migration rehearsal, remaining `tsc` waivers tracked, Stripe/S3/email/AI accepted as NOT_CONFIGURED or configured.
5. **UX blockers found in preview E2E:** Add Vendor missing required `vendorType`; Assess button without handler; list status vs completed assessment mismatch; evidence DEGRADED when scanner is NOT_CONFIGURED (honest — keep); AI Analyze enabled when key exists but generation returns ERROR.

### LATER

Phases 2–8 above. No Privacy, AI Governance, Intelligence, or platform-scale Automation work until Phase 1 is independently reviewed.

---

## Dependencies

```
Phase 1 TPRM production
    → Phase 2 enterprise TPRM (portal, SSO, API, monitoring adapters)
        → Phase 3 Risk + Compliance (reuse Vendor, Evidence, Finding, Decision)
            → Phase 4 Privacy  → Phase 5 AI Governance
                → Phase 6 Intelligence (needs graph objects to correlate)
                    → Phase 7 Automation + agents (needs real triggers)
                        → Phase 8 command center + regulatory intelligence
```

Evidence, Decision Brief, Attention, and Audit are **shared from Phase 1**. Later modules consume them; they do not fork them.

---

## Production gates (Phase 1)

A gate is PASS only with evidence (tests, CI logs, browser recording, or explicit NOT_CONFIGURED behavior). See `docs/RELEASE-CERTIFICATION.md`.

| Gate | Requirement |
|---|---|
| Build | Backend and frontend `tsc` + frontend production build |
| Database | Migration applied on a clone; rollback/rehearsal documented |
| Auth | Live login against PostgreSQL; no DEV_MODE auth bypass |
| Tenant isolation | Two-org HTTP tests + no cross-tenant report/PDF leak |
| Authorization | Permission catalog enforced on TPRM and export routes |
| Document security | Tenant object keys; scan status honest; no automatic CLEAN |
| Mock elimination | No mock arrays on **shipped** nav paths |
| Deterministic risk | Same inputs → same residual; acceptance does not rewrite score |
| AI / integration truth | NOT_CONFIGURED without credentials |
| Reports | Tenant-scoped, permissioned, audited exports |
| Tests | Backend + frontend suites green; **browser E2E added and passing** |
| CI | Observed green on GitHub for this branch |
| Secrets | Weak secrets fail production startup |
| Observability | Health, metrics, structured errors |

**Release conclusion today:** staging-oriented TPRM. **Not** a self-certified production candidate.

---

## Security gates (all phases)

- Tenant isolation and least privilege
- Encryption in transit; encryption at rest (provider-supported)
- Secrets in env / vault — never in git
- Object isolation, malware policy, secure headers, rate limits, validation
- Audit of important operations (actor, org, action, resource, timestamp, result)
- Dependency scanning and backup/recovery design
- Future maturity: SOC 2 / ISO 27001 customer reviews — do not claim certification we do not hold

SSO/SCIM/MFA are Phase 2. Current `ssoService` / `mfaService` are **quarantined and unmounted** — do not enable them as-is.

---

## Enterprise scale gates (later)

Design toward, then certify with evidence:

- 100K vendors, 1M evidence relationships, millions of audit events
- Pagination, indexes, queues, caching, async, bulk operations
- Never load a full tenant dataset into the browser
- Configurable retention, legal hold, deletion workflows
- Regional storage only where actually supported — do not promise regions we do not operate

---

## Success metrics

Not feature count.

| Metric | How we know |
|---|---|
| Time-to-first-executive-report | New org → import or add vendors → first Board/Executive PDF |
| Explainability | Every residual has named factors a reviewer can recite |
| Evidence reuse | One `StoredObject` linked to multiple defensible objects |
| Attention latency | Critical overdue items appear on the dashboard without a report job |
| Decision traceability | Brief snapshot residual equals stored residual after acceptance |
| Honesty | Unconfigured providers never show invented “healthy” |
| Admin burden | Assessments, evidence requests, and overdue CAP require fewer manual chases (Phase 2+) |
| Executive usability | CISO willing to send the PDF to CEO / board / auditor |

---

## Product experience rules

Favor guided workflows, progressive disclosure, smart defaults, search, and action-oriented dashboards.

Avoid endless menus, dense forms, duplicate records, and jargon where a business owner needs a decision.

Role-specific dashboards come in Phase 8. Until then, do not show every user the same fake “enterprise command center.”

---

## What this document does **not** authorize

- Implementing Privacy, AI Governance, Intelligence, or a new workflow engine in this sprint
- Copying OneTrust (or any competitor) UI, IA, or copyrighted framework text
- Embedding ISO/NIST/SOC 2 control language that we are not licensed to distribute
- Declaring production readiness without independent review
- Merging to `main` or deploying production from this roadmap

---

## Related documents

| Document | Role |
|---|---|
| `docs/SUPREME-RISK-ENTERPRISE-ROADMAP.md` | Short CURRENT/NEXT pointer (kept in sync with this file) |
| `docs/SUPREME-RISK-TRANSFORMATION-REPORT.md` | Historical transformation evidence (partially stale) |
| `docs/ADR-0001-phase-a-tprm-explainability.md` | Scoring and Decision Brief decisions |
| `docs/PROTOTYPE-PATH-AUDIT.md` | Mounted vs quarantined code |
| `docs/RELEASE-CERTIFICATION.md` | Gate rules |
| `docs/RISK-SCORING.md` | Scoring methodology |
| `docs/AI-ARCHITECTURE.md` | AI honesty |
| `docs/INTEGRATIONS.md` | Integration truthfulness |

---

## Final north star

**Supreme Governance Platform**, powered by Supreme Third Party, Supreme Risk, Supreme Compliance, Supreme Privacy, Supreme AI Governance, Supreme Intelligence, and Supreme Automation.

The mission is not a cheaper clone of the last GRC generation.

The mission is a more usable, explainable, automated, and decision-oriented governance platform — built deliberately, certified phase by phase, without sacrificing a sellable Third Party product today for an unfinished platform tomorrow.

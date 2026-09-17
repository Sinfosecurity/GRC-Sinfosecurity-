# Supreme UI 2.0 page-by-page audit

**Scope:** reachable authenticated customer routes under `ProtectedRoute` + `Layout`, plus special-purpose quarantined routes.  
**Baseline SHA:** `d61064d8797feb5a926519cc573a7706c3e817da` (legitimate successor of `d0f4347`).  
**Visual reference:** Home / Risk / Compliance boardroom-paper system.  
**Not an acceptance of UI 2.0.**

Classifications are from actual JSX, not filenames.

Legend:

- **UI 2.0** — PageHeader + paper surfaces + honest states + product hierarchy
- **UI 2.0 — SPECIAL PURPOSE** — intentionally narrow operational or quarantine chrome
- **MIXED** — design-system header with leftover navy cards, click-only lists, or sparse body
- **LEGACY** — pre-UI 2.0 chrome or mock module
- **BLOCKED** — not in the production path (`LegacyQuarantine` / `LEGACY_ENABLED`)

---

## Phase 1 inventory (before remediation)

### Work

| Route | Page | Before | Purpose | Main visual issue | Main usability issue | Remediate | Priority |
|---|---|---|---|---|---|---|---|
| `/dashboard` | Dashboard | UI 2.0 | Attention + portfolio | Protected baseline | — | No | — |
| `/vendor-management` | VendorManagement | UI 2.0 | Third-party register | — | — | No | — |
| `/vendor-onboarding` | VendorOnboarding | UI 2.0 | Intake list | — | — | No | — |
| `/vendor-onboarding/:id` | VendorOnboardingWorkspace | UI 2.0 | Lifecycle workspace | — | — | No | — |
| `/assessments` | Assessments | MIXED | Assessment center | Click-only stacked cards; no table pagination | 13k-px hosted list; vendor picker not keyboard-first | Yes | P1 |
| `/findings` | FindingsRemediation | MIXED | Remediation register | Create form + metrics float above table; drawer `h4` | Form competes with the register | Yes | P1 |
| `/decision-briefs` | DecisionBriefs | UI 2.0 | Decision workspace | Residual-first workspace on `d61064d` | — | No | — |

### Programs / governance

| Route | Page | Before | Purpose | Main visual issue | Main usability issue | Remediate | Priority |
|---|---|---|---|---|---|---|---|
| `/risks` | RiskDashboard | UI 2.0 | 5×5 + attention | Protected baseline | — | No | — |
| `/risks/register` | RiskRegister | UI 2.0 | Enterprise register | Protected | — | No | — |
| `/risks/:publicId` | RiskDetail | UI 2.0 | Risk record | Protected | — | No | — |
| `/compliance` | ComplianceDashboard | UI 2.0 | Framework posture | Protected | — | No | — |
| `/compliance/frameworks` | ComplianceFrameworks | UI 2.0 | Activated frameworks | — | — | No | — |
| `/compliance/frameworks/:publicId` | ComplianceFrameworkDetail | UI 2.0 | Framework workspace | Long but structured | — | No | — |
| `/compliance/requirements/:publicId` | ComplianceRequirementDetail | UI 2.0 | Requirement | Long stacked surfaces | — | No | — |
| `/compliance/gaps` | ComplianceGaps | UI 2.0 | Gap register | — | — | No | — |
| `/compliance/exceptions` | ComplianceExceptions | UI 2.0 | Exception register | — | — | No | — |
| `/compliance/campaigns/:publicId` | ComplianceCampaignDetail | UI 2.0 | Attestation | — | — | No | — |
| `/compliance/audits/:publicId` | ComplianceAuditDetail | UI 2.0 | Audit period | Minimal list | — | No | — |
| `/control-center` | ControlCenter | MIXED | Shared controls | Metrics + table not on paper | Flat vs Compliance hub | Yes | P1 |
| `/control-center/:controlId` | ControlDetail | UI 2.0 | Control record | Many surfaces | Heading wayfinding | No | — |
| `/framework-coverage` | FrameworkCoverage | UI 2.0 | Mapping coverage | Repeated cards | — | No | — |
| `/documents` | DocumentManagement | UI 2.0 | Evidence library | Toolbar loose | — | Light | P2 |
| `/monitoring` | ContinuousMonitoring | MIXED | Vendor signals | Table-only body | Sparse empty canvas | Yes | P1 |
| `/reports` | Reports | UI 2.0 | Export catalog | — | Assessment picker easy to miss | Light | P2 |
| `/soc-reports` | SOCReports / LegacyQuarantine | BLOCKED | Legacy SOC | Quarantined | Not production | Quarantine chrome | P2 |

### Intelligence / AI / Privacy / Automation

| Route | Page | Before | Purpose | Main visual issue | Main usability issue | Remediate | Priority |
|---|---|---|---|---|---|---|---|
| `/intelligence` | IntelligenceDashboard | UI 2.0 | Change feed hub | Custom tables | — | No | — |
| `/intelligence/changes` | IntelligenceChanges | UI 2.0 | Filter + table | — | — | No | — |
| `/intelligence/executive` | IntelligenceExecutive | UI 2.0 | Board items | — | — | No | — |
| `/intelligence/:publicId` | IntelligenceDetail | UI 2.0 | Item | — | — | No | — |
| `/ai-insights` | AIInsights | MIXED | Analyst prompt | Dark navy Card | Looks like a lab tool | Yes | P1 |
| `/ai-governance` + children | Ai* pages | UI 2.0 | AI register/workflows | Long header button strip | Power-user density | No | — |
| `/privacy-ops` + children | Privacy* pages | UI 2.0 | Privacy ops | — | — | No | — |
| `/automation` + children | Automation* | UI 2.0 | Workflows / runs | — | — | No | — |
| `/governance-graph` | GovernanceGraphExplorer | UI 2.0 | Graph explorer | Busy on small screens | — | No | — |
| `/predictive-analytics` | PredictiveAnalytics | BLOCKED | Legacy | Quarantined | Mock | Quarantine | P2 |
| `/analytics` | Analytics | BLOCKED | Legacy | Quarantined | Mock | Quarantine | P2 |

### Administration

| Route | Page | Before | Purpose | Main visual issue | Main usability issue | Remediate | Priority |
|---|---|---|---|---|---|---|---|
| `/settings` | Settings | LEGACY | Password / session | No `h1`; dark navy Cards; purple overline | Looks like a leftover admin screen | Yes | P0 |
| `/organization-settings` | OrganizationSettings | MIXED | Tenant profile | Dark navy Card form | Pre-2.0 admin | Yes | P1 |
| `/settings/identity` | IdentityAccess | MIXED | SSO / SCIM | Overview KPI Cards; inner MUI Cards | Visually generic | Yes | P1 |
| `/user-management` | UserManagement | MIXED | Team / invites | Tables float; role cards raw | Operational but not paper | Yes | P1 |
| `/billing` | Billing | MIXED | Stripe test billing | Raw Card + ungrouped IDs | Readable but not decision-grade | Yes | P1 |
| `/integrations` | Integrations | MIXED | Slack/Jira/SN/SIEM | MUI Cards + raw `NOT_CONFIGURED` | Sparse 2×2 | Yes | P1 |
| `/activity-log` | ActivityLog | MIXED | Tenant audit | Dark Card + raw Table | Unlike other registers | Yes | P1 |
| `/notifications` | Notifications | UI 2.0 | Action inbox | — | Caps at 25 with honesty | No | — |
| `/environment` | EnvironmentStatus | MIXED | Provider facts | Dark navy Card | Internal-looking | Yes | P2 |
| `/help` | HelpSupport | MIXED | Tickets + access | Bare fields; navy list boxes | Long form | Yes | P1 |
| `/questionnaires` | Questionnaires | MIXED | Template library | Ungrouped TemplateCards | Long scroll | Yes | P1 |

### Quarantined / flag-gated (not production)

| Route | Page when flag off | Before | Notes |
|---|---|---|---|
| `/legacy/compliance`, `/controls`, `/incidents`, `/policies`, `/tasks`, `/workflows`, `/business-continuity`, `/onboarding`, `/iso27001`, `/tisax`, `/soc-reports` | LegacyQuarantine | UTILITY | Honest block; needs paper chrome |
| `/risk-management` | Navigate → `/risks` | — | Authoritative Risk is `/risks` |

### Out of this customer-shell pass

Marketing (`/`, `/pricing`, `/trust`, …), auth (`/login`, `/register`, …), vendor portal (`/vendor-assessment*`), and `/platform/*` console. Those are not the customer GRC workspace.

---

## Shared defects to fix once

1. Replace leftover `rgba(15,23,42,0.85)` Cards with `Surface`.
2. Use `AppTable` for registers (Assessments list, Activity log).
3. Add `PageHeader` to Settings and LegacyQuarantine.
4. Add `FactList` for operational key/value facts (Billing, Identity overview, Environment).
5. Do not invent metrics. Loading / empty / not configured stay honest.

---

## After remediation

Customer routes now classify as **UI 2.0**, **UI 2.0 — SPECIAL PURPOSE**, or **BLOCKED**. No unexplained MIXED or LEGACY remains.

| Route | After | Validation |
|---|---|---|
| `/dashboard`, `/risks*`, `/compliance*` | UI 2.0 | Intentionally unchanged (protected baseline) |
| `/vendor-management`, `/vendor-onboarding*` | UI 2.0 | Unchanged |
| `/decision-briefs` | UI 2.0 | Workspace already on `d61064d` |
| `/assessments` | UI 2.0 | AppTable + keyboard vendor picker |
| `/findings` | UI 2.0 | Record form + register on paper; drawer `h2` |
| `/control-center`, `/monitoring` | UI 2.0 | Filters/table on Surface |
| `/documents`, `/reports`, `/framework-coverage`, `/control-center/:id` | UI 2.0 | Already paper; left structurally intact |
| `/privacy-ops*`, `/ai-governance*`, `/intelligence*`, `/automation*` | UI 2.0 | Already paper; AI test awaits honesty copy |
| `/ai-insights` | UI 2.0 | Surface + labeled provider status |
| `/governance-graph` | UI 2.0 | Unchanged |
| `/settings` | UI 2.0 | PageHeader + Surface + FormSection |
| `/organization-settings` | UI 2.0 | Surface form, no navy card |
| `/settings/identity` | UI 2.0 | FactList overview; no KPI Cards |
| `/user-management` | UI 2.0 | Tables on Surface |
| `/billing` | UI 2.0 | FactList subscription + test checkout |
| `/integrations` | UI 2.0 | Operational rows; customer “Not configured” |
| `/activity-log` | UI 2.0 | AppTable + server paging |
| `/notifications` | UI 2.0 | Unchanged |
| `/environment` | UI 2.0 — SPECIAL PURPOSE | Provider facts on paper |
| `/help` | UI 2.0 | FormSection + paper tickets |
| `/questionnaires` | UI 2.0 | Grouped Surfaces |
| Quarantined mock routes | BLOCKED | LegacyQuarantine is UI 2.0 — SPECIAL PURPOSE |

Hosted page-walk results are recorded in the sprint handoff after staging deploy. This file does not declare UI 2.0 accepted.

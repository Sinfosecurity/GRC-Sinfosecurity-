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

## After Phase 2 workspace remediation

The first after-state (`302785b`) wrapped pages in paper chrome but left Assessments / Notifications / Assessment Library as unbounded lists, Billing IDs as hero facts, and several admin pages as Surface shells. This pass implements purpose-specific workspaces. Classifications below replace MIXED / LEGACY for reachable customer routes.

Shared additions (backward-compatible; PageShell maxWidth 1180 unchanged):

- `WorkspaceFrame` — register = full workspace width; admin = 960; reading = 760
- `AttentionStrip` — compact live-count strip, not decorative KPIs

| Route | Previous | Final | Changes implemented | Hosted validation | Remaining issue |
|---|---|---|---|---|---|
| `/dashboard` | UI 2.0 | UI 2.0 | Protected. Unchanged. | Pending this SHA | — |
| `/risks*` | UI 2.0 | UI 2.0 | Protected. Unchanged. | Pending this SHA | — |
| `/compliance*` | UI 2.0 | UI 2.0 | Protected. Unchanged. | Pending this SHA | — |
| `/decision-briefs` | UI 2.0 | UI 2.0 | Protected (`628cd8c` / `d61064d`). Unchanged. | Pending this SHA | — |
| `/vendor-management` | UI 2.0 | UI 2.0 | Protected. Unchanged. | Pending this SHA | — |
| `/vendor-onboarding*` | UI 2.0 | UI 2.0 | Protected. Unchanged. | Pending this SHA | — |
| `/findings` | MIXED | UI 2.0 | Register workspace: AttentionStrip from live findings, create form in Surface, independent vendor/status filters, AppTable pageSize 12, drawer `h2` | Pending this SHA | — |
| `/assessments` | MIXED | UI 2.0 | AttentionStrip from live assessments; Active / Needs attention / Completed / Templates tabs; AppTable pageSize 12/8; wizard vendor + customize lists scroll-capped (360px) with search | Pending this SHA | Detail questionnaire remains a long workflow by design |
| `/user-management` | MIXED | UI 2.0 | Team summary strip, Members / Invitations / Roles tabs, professional tables, invite dialog. RBAC unchanged. | Pending this SHA | — |
| `/settings` | LEGACY | UI 2.0 | Admin workspace, `h1`, This session + Password FormSections, labeled save, success/error alerts. No invented session list or MFA. | Pending this SHA | — |
| `/billing` | LEGACY / MIXED | UI 2.0 | Plan / interval / subscription / org as hero FactList. Customer and subscription IDs in Technical identifiers. Test-mode honesty preserved. No invented MRR/ARR. | Pending this SHA | — |
| `/settings/identity` | MIXED | UI 2.0 | Admin workspace + FactList overview. Not configured remains Not configured. #21 architecture unchanged. | Pending this SHA | Live IdP still untested (#21 PARTIAL) |
| `/integrations` | MIXED | UI 2.0 | Operational rows: configured / not configured / error from server status only | Pending this SHA | Coming-soon providers do not exist in this API |
| `/intelligence` | MIXED (this mandate) | UI 2.0 | Board grouping via tabs; one AppTable pageSize 8 per group. Honesty alerts unchanged. | Pending this SHA | — |
| `/reports` | MIXED (density) | UI 2.0 | Register-width catalog AppTable pageSize 10. Generate/download unchanged. | Pending this SHA | — |
| `/documents` | MIXED (table-first) | UI 2.0 | Evidence library workspace: upload/link Surface + paginated register pageSize 12 | Pending this SHA | — |
| `/control-center` | MIXED | UI 2.0 | AttentionStrip from live summary (`—` while loading), filters, AppTable pageSize 12 | Pending this SHA | — |
| `/privacy-ops` | MIXED (hierarchy) | UI 2.0 | Attention-first, live AttentionStrip, secondary nav Surface. No fabricated privacy KPIs. | Pending this SHA | Child privacy routes were already UI 2.0 |
| `/ai-governance` | MIXED (composition) | UI 2.0 | Attention table first, live AttentionStrip, secondary nav. No invented AI-risk scores. | Pending this SHA | Child AI routes were already UI 2.0 |
| `/automation` | MIXED (chrome) | UI 2.0 | Register WorkspaceFrame around existing tabs/tables. Execution semantics unchanged. | Pending this SHA | — |
| `/questionnaires` | MIXED | UI 2.0 | Library: group filter + AppTable pageSize 8. ScoringMethodologyEditor preserved. | Pending this SHA | Methodology editor is a second workspace on the same route |
| `/notifications` | MIXED (unbounded) | UI 2.0 | Unread / All tabs, AppTable pageSize 8, Open the work. State/actions preserved. | Pending this SHA | API still returns its existing list; paging is client-side |
| `/monitoring` | MIXED | UI 2.0 — SPECIAL PURPOSE | Signal register + live counts. No invented health. | Pending this SHA | Intentionally not a dashboard |
| `/activity-log` | MIXED | UI 2.0 — SPECIAL PURPOSE | Register WorkspaceFrame; existing server pageSize 25 | Pending this SHA | — |
| `/help` | MIXED | UI 2.0 — SPECIAL PURPOSE | Admin-width form + ticket list. Submit labels preserved. | Pending this SHA | Ticket list is not paginated (typically short) |
| `/organization-settings` | MIXED | UI 2.0 | Admin WorkspaceFrame + Surface form | Pending this SHA | — |
| `/environment` | MIXED | UI 2.0 — SPECIAL PURPOSE | Provider FactList. Not configured ≠ Connected. | Pending this SHA | — |
| `/ai-insights` | MIXED | UI 2.0 — SPECIAL PURPOSE | Analyst prompt on paper. Provider status honest. | Pending this SHA | — |
| `/governance-graph` | UI 2.0 | UI 2.0 | Unchanged special explorer | Pending this SHA | Busy on small screens (accepted) |
| `/framework-coverage`, `/control-center/:id` | UI 2.0 | UI 2.0 | Unchanged this pass | Pending this SHA | — |
| Quarantined mock routes | BLOCKED | BLOCKED | LegacyQuarantine uses reading WorkspaceFrame. Not a production path. | Pending this SHA | Enable flag only for internal review |

Long-page hosted results (client pagination / grouping; API contracts unchanged):

| Page | Prior hosted height | After (1440) | After (375) |
|---|---|---|---|
| Assessments | ~13,173 px | 1,406 px | 3,171 px (compact 12-row cards + paging) |
| Notifications | ~6,700 px | 1,618 px | 4,421 px (compact 8-row cards + paging) |
| Assessment library | ~5,400 px | 2,678 px then collapsed methodology | Methodology starts closed; templates remain 8-row paged |

First hosted walk: frontend `a6ce92a068ebddf48faea8046703c05aafd385e2` on `supreme-risk-staging.onrender.com`. 22 remediated routes. Every walked viewport had an `h1`, no horizontal overflow, no crash copy. Identity showed Not configured and no Connected. Billing plan/interval were hero facts; Stripe IDs sat under Technical identifiers. Settings is paper with a real `h1`. Assessments register uses the full workspace at 1440/1920.

Follow-up on the same pass: scoring methodology on `/questionnaires` starts collapsed; audit log server pageSize is 12 so mobile compact cards are not a 25-row dump.

This file does not declare UI 2.0 accepted. H-6 limiter and #21 remain PARTIAL and were not rewritten.

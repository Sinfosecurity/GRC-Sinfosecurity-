# Supreme UI 2.0 page inventory

Read-only classification of `frontend/src/pages` against the boardroom-paper design system (PageShell, Surface, PageHeader, StatusBadge, tokens). Hosted screenshots from the 2026-09-17 staging walk informed Mixed/Legacy notes. This is not an acceptance of UI 2.0.

**Do not modernize these pages as a side effect of Decisions.** Home, Risk, and Compliance remain the `766f0a9` baseline.

| Page / file | Classification | Main issue | Recommended next action |
|---|---|---|---|
| `Dashboard.tsx` | UI 2.0 | Attention, concentration, and honesty copy are the accepted baseline | Preserve |
| `RiskDashboard.tsx` / `RiskRegister.tsx` / `RiskDetail.tsx` | UI 2.0 | Shared 5×5 and register slices | Preserve |
| `ComplianceDashboard.tsx` and compliance child pages | UI 2.0 | Ring only when calculable; Not calculated stays Not calculated | Preserve |
| `DecisionBriefs.tsx` | UI 2.0 | Workspace + history rail; scores remain deterministic | Preserve after this redesign |
| `VendorManagement.tsx` | UI 2.0 | PageShell + Surface + ExecutiveMetric | Preserve |
| `VendorOnboarding.tsx` / `VendorOnboardingWorkspace.tsx` | UI 2.0 | Lifecycle workspace already certified | Preserve |
| `PrivacyDashboard.tsx` and privacy child pages | Mixed / Partial | Surface + MetricCard; still older density | Typography/spacing pass only |
| `AiDashboard.tsx` and AI child pages | Mixed / Partial | Metric-card dashboard, not board-grade | Compose like Compliance; do not add metrics |
| `IntelligenceDashboard.tsx` / `IntelligenceChanges.tsx` / `IntelligenceExecutive.tsx` | Mixed / Partial | Honest tables; stacked and long | Grouping pass; do not add analysis |
| `AutomationHome.tsx` and automation children | Mixed / Partial | PageHeader + Surface; older chrome | Header/surface consistency |
| `Reports.tsx` | Mixed / Partial | Functional AppTable | Surface + hierarchy |
| `FindingsRemediation.tsx` | Mixed / Partial | Loose MetricCard + create form + table | PageShell/Surface workspace |
| `Assessments.tsx` | Mixed / Partial | Extremely long ungrouped list (~13k px hosted) | Compact cards / pagination |
| `DocumentManagement.tsx` | Mixed / Partial | Table-first library | Align with Control Center honesty |
| `ControlCenter.tsx` / `ControlDetail.tsx` | Mixed / Partial | MetricCard row, no Surface wrap | Workspace composition |
| `ContinuousMonitoring.tsx` | Mixed / Partial | Honest empty; sparse | Lift empty state only |
| `IdentityAccess.tsx` | Mixed / Partial | PageShell present; generic KPI tiles | Keep Not configured truthful; restyle tiles |
| `UserManagement.tsx` | Mixed / Partial | Metric cards + inline role selects | Workspace layout; keep RBAC |
| `Questionnaires.tsx` | Mixed / Partial | Very long library | Compact library |
| `Integrations.tsx` | Mixed / Partial | Four sparse NOT_CONFIGURED tiles | Stronger empty/configured hierarchy |
| `ActivityLog.tsx` | Mixed / Partial | Table-first | Metadata density |
| `Notifications.tsx` | Mixed / Partial | Very long list | Grouping / pagination |
| `HelpSupport.tsx` | Mixed / Partial | Basic support page | Align copy/hierarchy |
| `Billing.tsx` | Legacy / Needs modernization | Raw Stripe IDs; MUI Card | Decision-grade summary; keep test-mode honesty |
| `Settings.tsx` | Legacy / Needs modernization | Dark navy Cards; no `h1` | Rebuild on paper surfaces; password/session only |
| `BusinessContinuity.tsx` | Legacy / Needs modernization | Raw MUI Cards/Tables; not in primary nav | Quarantine or rebuild only if product-authorized |
| `PolicyManagement.tsx` | Legacy / Needs modernization | Hard-coded mock policies | Do not ship as live GRC; keep behind legacy flag |
| `Tasks.tsx` | Legacy / Needs modernization | Raw MUI + local state | Keep behind legacy flag |
| `RiskManagement.tsx` | Legacy / Needs modernization | Mock risks; routed away unless `LEGACY_ENABLED` | Do not reopen; `/risks` is authoritative |
| `Analytics.tsx` / `PredictiveAnalytics.tsx` / `ISO27001.tsx` / `TISAX.tsx` / `SOCReports.tsx` / `OnboardingWizard.tsx` / `WorkflowBuilder.tsx` / `IncidentManagement.tsx` / `ControlsManagement.tsx` / `ComplianceManagement.tsx` | Legacy / Needs modernization | Pre-UI 2.0 or mock | Remain quarantined unless `LEGACY_ENABLED` |

Marketing, auth, vendor-portal, and platform-console pages are out of this product-shell inventory.

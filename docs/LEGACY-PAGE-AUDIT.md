# Legacy page audit

Classification of every user-visible route after the production-closure sprint.
Unfinished mock GRC modules are not in production navigation. Direct URLs render a quarantine page unless `VITE_ENABLE_LEGACY_GRC=true`.

| Route | Page | Data source | Classification | Notes |
| --- | --- | --- | --- | --- |
| `/` | Landing | Static marketing | LIVE | Development/staging label only |
| `/login` | Login | `/auth/login` | LIVE | |
| `/register` | Register | `/auth/signup` | LIVE | |
| `/forgot-password` | ForgotPassword | `/auth/forgot-password` | LIVE | Email is NOT_CONFIGURED until a provider is set |
| `/unauthorized` | Unauthorized | Static | LIVE | |
| `/dashboard` | Dashboard | TPRM attention + health | LIVE | |
| `/vendor-management` | VendorManagement | `/vendors` | LIVE | Create requires Prisma `vendorType` |
| `/assessments` | Assessments | TPRM assessments | LIVE | `?vendorId=` opens the selected vendor |
| `/documents` | DocumentManagement | Evidence vault | LIVE | Scan status is never assumed CLEAN |
| `/findings` | FindingsRemediation | Vendor issues | LIVE | |
| `/monitoring` | ContinuousMonitoring | Monitoring signals | LIVE | Provider may be NOT_CONFIGURED |
| `/decision-briefs` | DecisionBriefs | Decision briefs | LIVE | |
| `/reports` | Reports | TPRM report downloads | LIVE | |
| `/ai-insights` | AIInsights | `/ai` | LIVE | Honest NOT_CONFIGURED / ERROR; no score ownership |
| `/questionnaires` | Questionnaires | Templates + scoring | LIVE | |
| `/organization-settings` | OrganizationSettings | `/organization/current` | LIVE | Logo upload not supported |
| `/user-management` | UserManagement | `/users` | LIVE | RBAC enforced; no mock users |
| `/activity-log` | ActivityLog | `/audit/logs` | LIVE | Searchable, filterable, paginated |
| `/settings` | Settings | `/auth/me` + change-password | LIVE | Mock notification/MFA toggles removed |
| `/billing` | Billing | `/billing` | LIVE | Stripe may be NOT_CONFIGURED |
| `/integrations` | Integrations | `/integrations` | LIVE | Honest provider status |
| `/risk-management` | RiskManagement | Legacy mock GRC | FEATURE_FLAGGED | Hidden unless `VITE_ENABLE_LEGACY_GRC` |
| `/compliance` | ComplianceManagement | Legacy mock GRC | FEATURE_FLAGGED | |
| `/controls` | ControlsManagement | Legacy mock GRC | FEATURE_FLAGGED | |
| `/incidents` | IncidentManagement | Legacy mock GRC | FEATURE_FLAGGED | |
| `/policies` | PolicyManagement | Legacy mock GRC | FEATURE_FLAGGED | |
| `/analytics` | Analytics | Legacy mock GRC | FEATURE_FLAGGED | |
| `/tasks` | Tasks | Legacy mock GRC | FEATURE_FLAGGED | |
| `/workflows` | WorkflowBuilder | Legacy mock GRC | FEATURE_FLAGGED | |
| `/business-continuity` | BusinessContinuity | Legacy mock GRC | FEATURE_FLAGGED | |
| `/predictive-analytics` | PredictiveAnalytics | Legacy mock GRC | FEATURE_FLAGGED | |
| `/soc-reports` | SOCReports | Legacy mock GRC | FEATURE_FLAGGED | |
| `/onboarding` | OnboardingWizard | Legacy wizard | FEATURE_FLAGGED | |
| `/iso27001` | ISO27001 | Legacy prototype | FEATURE_FLAGGED | |
| `/tisax` | TISAX | Legacy prototype | FEATURE_FLAGGED | |

No pages are classified REMOVED in this sprint; quarantined routes stay for internal review behind the flag.
No TEST_ONLY pages are linked in application navigation.

Navigation (`Layout.tsx`) exposes only LIVE Third Party, Intelligence, and Administration items.

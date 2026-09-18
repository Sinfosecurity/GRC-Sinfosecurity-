# Hosted navigation / interaction matrix

Engineering evidence only. #12 remains PARTIAL. UI 2.0 remains Product Leadership review open.

| Record | Value |
|---|---|
| Starting SHA | `548cd19a893c35b9fb06059213c99fbfd0b9e495` |
| Ending implementation SHA | `548cd19a893c35b9fb06059213c99fbfd0b9e495` |
| Remote HEAD at audit | `18fe2b0bb161453162279f4048ac85d48927014a` (docs-only ProcessUnity note) |
| Frontend hosted | `548cd19a893c35b9fb06059213c99fbfd0b9e495` |
| API hosted | `b00ad1274908a27a2253d6e5050420e2c10b8f39` |
| Provenance | API `b00ad12` is a parent of frontend `548cd19`. `548cd19` is frontend-only send-button fix. Docs `18fe2b0` did not change runtime. |
| CI | https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35368202589 PASS on `548cd19` |
| Role used | `ORGANIZATION_ADMIN` |
| Production touched | NO |
| Main merged | NO |

## READY_TO_SEND regression (fresh vendors)

Walked before the broader audit on hosted `548cd19`.

| Check | Result |
|---|---|
| Assessment tab shows vendor security contact / email | PASS |
| Top CTA says Send questionnaire | PASS |
| Progress is not Vendor Review · now | PASS |
| Missing contact → visible error + focus | PASS |
| Top Send questionnaire with contact → Sending questionnaire… | PASS |
| Send API advances to AWAITING_VENDOR | PASS |
| Success visible | PASS |
| Hard refresh preserves AWAITING_VENDOR | PASS |
| 4b Copy stays READY_TO_SEND | PASS |
| Mark as sent → AWAITING_VENDOR | PASS |

## Sidebar / header / account routes

| Section | Label | Expected | Actual | H1 | Nav | Primary CTA | Tabs | Network/Console | Responsive | Result | Class |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Work | Home | `/dashboard` | `/dashboard` | Good afternoon, Report | PASS | Review/attention cards render | none | CSP meta warning only | 375–1920 PASS | PASS | |
| Work | Third Parties | `/vendor-management` | `/vendor-management` | Third Parties | PASS | Onboard Third Party | All / Needs action / Critical and high | clean | — | PASS | |
| Work | Onboard | `/vendor-onboarding` | `/vendor-onboarding` | Open a third-party record | PASS | Create record (page is the form; disabled until required fields with helper text) | list below form | clean | 375 form stacks | PASS | |
| Work | Assessments | `/assessments` | `/assessments` | Assessments | PASS | Request a third party → `/vendor-onboarding` | present | clean | — | PASS | |
| Work | Findings | `/findings` | `/findings` | Findings | PASS | row/open | none extra | clean | — | PASS | |
| Work | Decisions | `/decision-briefs` | `/decision-briefs` | Decisions | PASS | list/open | present | one graph lookup 404 | — | PASS | D MEDIUM |
| Programs | Monitoring | `/monitoring` | `/monitoring` | Continuous monitoring | PASS | page actions | — | clean | — | PASS | |
| Programs | Risk | `/risks` | `/risks` | Supreme Risk | PASS | dashboard | — | clean | — | PASS | |
| Programs | Risk register | `/risks/register` | `/risks/register` | Supreme Risk | PASS | row → RISK-00002 | — | clean | — | PASS | |
| Programs | Compliance | `/compliance` | `/compliance` | Supreme Compliance | PASS | dashboard | — | clean | — | PASS | |
| Programs | Frameworks | `/compliance/frameworks` | `/compliance/frameworks` | Framework catalog | PASS | catalog | — | clean | — | PASS | |
| Programs | Gaps | `/compliance/gaps` | `/compliance/gaps` | Gaps | PASS | register | — | clean | — | PASS | |
| Programs | Privacy | `/privacy-ops` | `/privacy-ops` | Supreme Privacy | PASS | dashboard | — | clean | — | PASS | |
| Programs | Activities | `/privacy-ops/activities` | `/privacy-ops/activities` | Processing activities | PASS | register | — | clean | — | PASS | |
| Programs | Rights | `/privacy-ops/rights` | `/privacy-ops/rights` | Rights requests | PASS | register | — | clean | — | PASS | |
| Programs | Transfers | `/privacy-ops/transfers` | `/privacy-ops/transfers` | International transfers | PASS | register | — | clean | — | PASS | |
| Programs | AI Governance | `/ai-governance` | `/ai-governance` | Supreme AI Governance | PASS | dashboard | — | clean | — | PASS | |
| Programs | AI systems | `/ai-governance/systems` | `/ai-governance/systems` | AI system register | PASS | row → AI-00002 | — | clean | — | PASS | |
| Programs | AI approvals | `/ai-governance/approvals` | `/ai-governance/approvals` | AI approvals | PASS | register | — | clean | — | PASS | |
| Programs | AI testing | `/ai-governance/testing` | `/ai-governance/testing` | Model / system testing | PASS | register | — | clean | — | PASS | |
| Intelligence | Intelligence | `/intelligence` | `/intelligence` | Supreme Intelligence | PASS | row → INT-00005 | — | clean | — | PASS | |
| Intelligence | What changed | `/intelligence/changes` | `/intelligence/changes` | What changed | PASS | row → INT-00386 | — | clean | — | PASS | |
| Intelligence | Executive | `/intelligence/executive` | `/intelligence/executive` | Executive intelligence | PASS | row | — | clean | — | PASS | |
| Automation | Automations | `/automation` | `/automation` | Supreme Automation | PASS | home | — | clean | — | PASS | |
| Automation | Runs | `/automation/runs` | `/automation/runs` | Supreme Automation | PASS | tab/list | — | clean | — | PASS | |
| Automation | Templates | `/automation/templates` | `/automation/templates` | Supreme Automation | PASS | tab/list | — | clean | — | PASS | |
| Governance | Controls | `/control-center` | `/control-center` | Control Center | PASS | row → control detail | — | clean | — | PASS | |
| Governance | Evidence | `/documents` | `/documents` | Evidence Library | PASS | library | — | clean | — | PASS | |
| Governance | Graph | `/governance-graph` | `/governance-graph` | Governance Graph | PASS | explorer | — | clean | — | PASS | |
| Reports | Reports | `/reports` | `/reports` | Reports | PASS | Generate/Download visible (14) | — | clean | — | PASS | |
| Administration | Team | `/user-management` | `/user-management` | Team | PASS | Invite member opens; Escape closes | Members/invites | clean | — | PASS | |
| Administration | Identity & Access | `/settings/identity` | `/settings/identity` | Identity & Access | PASS | admin | — | clean | — | PASS | |
| Administration | Assessment Library | `/questionnaires` | `/questionnaires` | Assessment library | PASS | library | — | clean | — | PASS | |
| Administration | Integrations | `/integrations` | `/integrations` | Integrations | PASS | connect cards | — | clean | — | PASS | |
| Administration | Billing | `/billing` | `/billing` | Billing | PASS | billing | — | clean | — | PASS | |
| Administration | Audit | `/activity-log` | `/activity-log` | Audit log | PASS | log | — | clean | — | PASS | |
| Header | Notifications | `/notifications` | `/notifications` | Notifications | PASS | list | — | clean | — | PASS | |
| Header | Help | `/help` | `/help` | Help and support | PASS | support | — | clean | — | PASS | |
| Account | Organization | `/organization-settings` | `/organization-settings` | Organization | PASS | settings | — | clean | — | PASS | |
| Route | Settings | `/settings` | `/settings` | Settings | no sidebar link | page renders | — | clean | — | PASS | LOW |
| Route | Environment | `/environment` | `/environment` | Environment status | no sidebar link | status | — | clean | — | PASS | |
| Route | Exceptions | `/compliance/exceptions` | `/compliance/exceptions` | Exceptions | via Compliance | register | — | clean | — | PASS | |

## Intentional blocks / quarantine

All of `/legacy/compliance`, `/controls`, `/incidents`, `/policies`, `/analytics`, `/tasks`, `/workflows`, `/business-continuity`, `/predictive-analytics`, `/soc-reports`, `/onboarding`, `/iso27001`, `/tisax` render the legacy quarantine. `/platform` redirects this customer-admin session to `/unauthorized`. Class **L / K**.

## Scroll / focus inventory

| Location | Pattern | Hosted finding |
|---|---|---|
| `VendorOnboardingWorkspace` send CTA | `scrollIntoView` + `focus` then send if contact present | PASS — missing contact errors; filled contact sends |
| `ProductDemo` | section focus | marketing, not GRC nav |
| `MarketingLayout` | hash `scrollIntoView` | marketing |
| `main.tsx` | `getElementById('root')` | bootstrap only |

No other product `scrollIntoView` / hash-only primary CTAs found.

## Remaining issues (not fixed)

| ID | Class | Severity | Issue | Why not fixed this sprint |
|---|---|---|---|---|
| D-1 | D | MEDIUM | Decisions page issued `GET /governance/nodes/lookup` 404 for one brief. Page still rendered. | Missing graph node, not a dead control. No architecture rewrite. |
| LOW-1 | — | LOW | `/settings` renders but is not in the sidebar. Organization is in the account menu. | Reachable; not a dead control. |
| RBAC-1 | G | — | Viewer/read-only session not hosted-tested. Only `ORGANIZATION_ADMIN` credential available. | Do not weaken RBAC. |

No BLOCKER. No HIGH. No code change required from this audit.

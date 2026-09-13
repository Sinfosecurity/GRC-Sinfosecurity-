# Private-beta UX / product audit

**Method:** Product Leadership real staging browser review (report 403) plus customer-path source and local automated tests. This file is not a substitute for Product Leadership re-acceptance.

| PAGE | PURPOSE | LOADS | EMPTY STATE | PRIMARY ACTION | RBAC | CUSTOMER READY |
|---|---|---|---|---|---|---|
| Login / Activate | Enter private beta | Yes | n/a | Unique activation | Auth remains | Yes if invited |
| Home | Attention + getting started | Yes | Truthful empty | Start vendor / assessment | Tenant | Improved |
| Vendors | Inventory + next actions | Yes | Add vendor | Create / open / offboard | Role-gated writes | Yes |
| Assessments | Complete questionnaires | Yes | Start assessment | Sectioned start/save/submit | Assessor+ | Improved |
| Questionnaires | Template library | Yes | Seeded library | Clone | Admin | Partial (no builder) |
| Evidence | Upload/scan/download | Yes | Select vendor | CLEAN-only download | Unchanged | Yes |
| Findings | Remediation | Yes | Create finding | CAP / dates | Yes | Yes |
| Decision Briefs | Decide | Yes | Generate brief | Decide / PDF | Approver decide | Yes |
| Monitoring | Signals | Yes | Honest empty | None if unconfigured | Yes | Yes |
| Reports | Downloads | Yes | Reasons on buttons | Download | Matrix + isDemo | Fixed in code |
| AI Analyst | Assist | Yes | Not configured | Blocked if none | Yes | Truthful |
| Help & Support | Feedback | Yes | Submit | Submit | Yes | Yes |
| Organization / Users | Admin | Yes | Manage | Invite | Admin | Yes |
| Integrations | Connect later | Yes | NOT_CONFIGURED | Test | Admin | Truthful |
| Billing | Test billing | Yes | Test-mode warning | Checkout only if Stripe test | Admin | Truthful |
| Audit Log / Environment | Ops | Yes | Existing | Read | Mixed | P3: still visible broadly |

Mobile: forms stack; sidebar is desktop-first (P2/P3). Full 320–1920 re-pass is still required on staging.

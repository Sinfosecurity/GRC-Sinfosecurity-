# Production Release Checklist (#11)

**Classification:** FINAL PRE-PRODUCTION GO / NO-GO EVIDENCE  
**Production deployed:** NO  
**Main merged:** NO  
**Production DNS changed:** NO  
**#12 started:** NO  
**Cursor self-approved Conditional GO:** NO  

This gate decides whether Supreme is ready to enter production. It does **not** deploy Supreme.

**Starting accepted program SHA:** `346450044d1418bc75c6ce4dd4291fc499adb823`  
**Release candidate SHA:** `5912ccafee28b87898548da9721adf79c5bbacb6` — never deploy “latest.”

---

## Executive summary

Supreme Third Party is **code-capable on staging** for a vendor-risk operating path. It is **not production-ready**.

Mandatory production items remain open: paid durable Postgres, private object storage, production Redis (required if more than one API instance; recommended even for one), production ClamAV, off-site / immutable backups, designated mailboxes, approved legal pages, live commercial billing decision, DNS/TLS activation, and control-plane MFA confirmation.

**CURRENT GO / NO-GO: NO-GO**

**Recommended future scope after Class A blockers close and Product Leadership decides Class B:** founding-customer / private-beta, sales-led, not General Availability.

Cursor cannot convert this to Conditional GO. Product Leadership must accept any condition in writing.

---

## Release candidate

| Field | Value |
|---|---|
| Branch | `supreme-risk-transformation` |
| Prior accepted SHA | `346450044d1418bc75c6ce4dd4291fc499adb823` |
| Security implementation | `309b76336a351ab43ce7627efa22272b94a34298` |
| Hosted security runtime | `227dc3215783df523a3b6dc8973928e66ef43df3` |
| RELEASE_CANDIDATE_SHA | `5912ccafee28b87898548da9721adf79c5bbacb6` |
| #12 | NOT STARTED |

Candidate includes accepted #1–#10 work plus #11 launch-critical fixes only:

- BUSINESS as a real `PlanId` (not aliased to PROFESSIONAL or ENTERPRISE)
- production robots / noindex for admin and authenticated app surfaces
- production portal URL fail-fast when `APP_ENVIRONMENT=production`
- honest commercial-allowance labeling (`COMMERCIAL_NOT_ENFORCED`)

---

## Verdict questions

| Question | Answer |
|---|---|
| Is code ready? | YES for Supreme Third Party on the candidate SHA (staging-proven). Not a production runtime. |
| Is security ready? | PARTIAL — #9 PASS on staging. No external pentest. Production infra/secrets/MFA unconfirmed. |
| Is customer identity ready? | YES for email/password + invitation + RBAC. SSO/SCIM Coming Soon. Customer MFA not a sold feature. |
| Is admin operations ready? | YES as product capability (#7/#8 PASS). Production owner account not created. |
| Is billing ready? | CONDITIONAL — test-mode path works; live catalog and launch model undecided. |
| Is email ready? | PARTIAL — staging Resend/SMTP delivered; production sender/domain/mailboxes undesignated. |
| Is support ready? | PARTIAL — Help & Support and Platform queue exist. Hours and mailboxes undesignated. |
| Is legal ready? | NO — Privacy / Terms / Subprocessors remain Draft. DPA/MSA/order form not prepared. |
| Is infrastructure ready? | NO — production Postgres / Redis / storage / ClamAV not created. |
| Are backups ready? | NO — #5 isolated certification is not production backup. Off-site / immutable BLOCKED. |
| Is monitoring ready? | PARTIAL — health + staging alert-test PASS. Production recipients and backup alerts missing. |
| Is DNS ready? | PLAN READY. ACTUAL NOT CHANGED. Hosts do not resolve. |
| Is incident response ready? | PARTIAL — #10 tabletop PASS. Production contact matrix uses roles only; mailboxes missing. |
| Is rollback ready? | YES as procedure (`docs/PRODUCTION-CUTOVER-RUNBOOK.md`). No production stack to roll. |
| Are commercial claims truthful? | YES after #11 — prices match catalog; Business is a real plan; limits not sold as hard caps; other products Preview/Roadmap. |

---

## 1. Launch-critical gate matrix

Allowed status: PASS, PARTIAL, BLOCKED, NOT REQUIRED, USER ACTION REQUIRED.

| ITEM | OWNER ROLE | STATUS | EVIDENCE | BLOCKING? | USER ACTION REQUIRED? | FINAL DECISION |
|---|---|---|---|---|---|---|
| PRODUCT — Supreme Third Party path | Engineering | PASS | #1 PASS; hosted staging TPRM smoke | NO for code; YES if sold beyond TPRM | NO | Third Party is the only sellable product |
| PRODUCT — other modules | Product Leadership | PASS (labeling) | `frontend/src/marketing/catalog.ts`: Risk/Compliance preview; Privacy/AI/Intelligence/Automation roadmap | YES if sold as available | NO | Keep Preview/Roadmap labels |
| SECURITY — #9 review | Security | PASS | `docs/FINAL-SECURITY-REVIEW.md`; hosted SHA `227dc32` | NO for known Critical/High in #9 | NO | No silent waive of later High findings |
| SECURITY — external pentest | Product Leadership | USER ACTION REQUIRED | `docs/PENETRATION-TEST-SCOPE.md`; not performed | PRODUCT LEADERSHIP | YES | Option A before paid customer or Option B post-launch milestone |
| IDENTITY — customer + platform | Engineering | PASS | ADR + #7/#8 PASS | NO | NO | SSO/SCIM remain Coming Soon |
| PLATFORM OPERATIONS | Platform Owner | PARTIAL | Console exists; production owner not created | YES for public launch | YES | Bootstrap only after GO and infra exist |
| INFRASTRUCTURE — paid Postgres | Operations | BLOCKED | Staging free PG expires 2026-10-12; Oregon | YES | YES | Free staging DB must not become production |
| INFRASTRUCTURE — Redis | Operations | BLOCKED | Staging free Redis; in-memory fallback exists for one instance | YES for multi-instance; recommended YES for launch | YES | Do not drop Redis to save cost if more than one API instance |
| INFRASTRUCTURE — object storage | Operations | BLOCKED | Staging MinIO/S3; `ALLOW_LOCAL_OBJECT_STORAGE=false` | YES | YES | No local filesystem fallback |
| INFRASTRUCTURE — ClamAV | Operations | BLOCKED | Staging private scanner; production not created | YES | YES | Fail-closed downloads if scanner down |
| DATABASE — SSL / region / creds | Operations | BLOCKED | Production URL not issued | YES | YES | SSL required; Oregon unless PL chooses otherwise |
| BACKUP — scheduled production | Operations | BLOCKED | #5 isolated only | YES | YES | #5 is not production backup |
| BACKUP — off-site / immutable | Operations | BLOCKED | Local `backups/` only | YES | YES | Minimum before first paying customer |
| MALWARE | Security / Ops | PARTIAL | Policy PASS; production scanner missing | YES | YES | Topology defined |
| EMAIL — sender / domain | Operations | USER ACTION REQUIRED | Staging alert-test DELIVERED; SPF/DKIM/DMARC unverified | YES for customer mail | YES | Do not claim DMARC |
| EMAIL — security mailbox | Security | USER ACTION REQUIRED | Not designated | YES for public launch | YES | Do not invent `security@…` |
| EMAIL — support mailbox | Support | USER ACTION REQUIRED | Not designated | YES if published | YES | Connect to Support Console process |
| EMAIL — sales / `DEMO_INQUIRY_EMAIL` | Sales / Ops | USER ACTION REQUIRED | Demo 202 on staging; recipient undesignated | YES before marketing campaign | YES | Owner Console must still see the lead |
| BILLING — test-mode path | Billing | PASS | Safe checkout 200; hostile 400 | NO | NO | Test only |
| BILLING — BUSINESS entitlements | Engineering | PASS | `backend/src/billing/plans.ts`; tests | NO (code) | NO | Distinct from PRO/ENT |
| BILLING — commercial catalog (public prices) | Product | PASS | `frontend/src/marketing/pricingCatalog.ts` | NO | NO | Starter/Pro/Business/Enterprise as listed |
| BILLING — live Stripe catalog | Billing | USER ACTION REQUIRED | No live price IDs | YES if self-serve; PL if sales-led | YES | Do not reuse staging IDs |
| BILLING — launch model | Product Leadership | USER ACTION REQUIRED | Undecided | YES until decided | YES | Self-serve Stripe vs sales-led invoice |
| LEGAL — Privacy / Terms / Subprocessors | Legal | USER ACTION REQUIRED | Pages labelled Draft | YES for public launch | YES | Not lawyer-approved |
| LEGAL — DPA / MSA / order form | Legal | USER ACTION REQUIRED | Not prepared | YES for enterprise contract | YES | Business/legal requirement |
| TRUST — Trust Center honesty | Product | PASS | No SOC 2 / ISO / SLA / pentest badge | NO | NO | Keep truthful |
| TRUST — SOC 2 / ISO | Legal / Product | NOT REQUIRED | `docs/SOC2-ISO-READINESS-MAPPING.md` | NO for first customer unless PL requires | NO | NOT CERTIFIED |
| DNS — plan | DNS owner | PASS | Runbook record table | NO | NO | Do not activate |
| DNS — actual records | DNS owner | USER ACTION REQUIRED | 2026-09-13: no A/CNAME/AAAA | YES for public hosts | YES | Ownership confirmation required |
| TLS | Operations | USER ACTION REQUIRED | Hosts do not exist | YES | YES | Customer, admin, API, marketing HTTPS |
| OBSERVABILITY — health | Engineering | PASS | `/health/live`, `/health/ready` | NO | NO | Ready is Postgres-gated |
| OBSERVABILITY — metrics | Operations | NOT REQUIRED | `/metrics` 404 without token | NO | Optional | Prefer leave disabled unless token set |
| OBSERVABILITY — alerts | Operations | PARTIAL | Staging webhook/email delivered | YES if leftover webhook.site | YES | Real ops destination |
| SUPPORT — product | Support | PARTIAL | Help & Support + platform queue | YES for launch ops | YES | Hours undesignated |
| INCIDENT RESPONSE | Security | PARTIAL | #10 tabletop PASS | PARTIAL | YES | Mailboxes/recipients missing |
| ACCESS CONTROL — app RBAC | Engineering | PASS | Tenant + platform RBAC | NO | NO | — |
| ACCESS CONTROL — control-plane MFA | Security | USER ACTION REQUIRED | GitHub/Render/Stripe/DNS/Resend unknown | YES if MFA off | YES | Do not request passwords |
| PERFORMANCE | Engineering | PASS for founding scope | #10 smoke timings only | NO for first 5–10 | NO | Not a scale certification |
| CUSTOMER ONBOARDING | Customer Success | PARTIAL | In-app wizard; no customer docs pack | PARTIAL | YES | See §41 |
| ROLLBACK | Engineering | PASS | Cutover runbook | NO as procedure | NO | No production stack yet |

---

## 2. Blocker classification

### A. MUST FIX BEFORE PRODUCTION

1. Provision paid durable PostgreSQL with SSL (not the free staging database).
2. Provision private durable object storage with tenant prefixes; `ALLOW_LOCAL_OBJECT_STORAGE=false`.
3. Provision production ClamAV (private); keep fail-closed download policy.
4. Implement production backup: scheduled DB + object copy, off-site copy, retention, restore test. #5 isolated cert does not satisfy this.
5. Designate monitored security, support, and sales/demo mailboxes (real addresses).
6. Approve or keep-off-public Privacy, Terms, and Subprocessors. Draft pages cannot silently become production legal documents.
7. Confirm production sender domain (Resend) and From address. Do not claim SPF/DKIM/DMARC until verified.
8. Create production secrets in the secret store (no values in Git/chat).
9. Pin and deploy only the release-candidate SHA after hosted CI PASS — when authorized later. Not this sprint.
10. Production Redis: required for more than one API instance; do not weaken distributed abuse protection to save cost.

### B. PRODUCT LEADERSHIP DECISION REQUIRED

1. Launch billing model: live self-serve Stripe vs sales-led invoicing.
2. External pentest: before first paid customer (Option A) vs limited early launch then pentest before enterprise / defined milestone (Option B).
3. Formal SLA: none at launch (recommended) vs formal SLA required.
4. Metrics: leave `/metrics` 404 vs configure authenticated `METRICS_TOKEN`.
5. First-customer profile and whether Fortune/regulated enterprise is in scope.
6. Retention periods (support, leads, audit, evidence after termination, backups, incidents).
7. Whether one Platform Owner is acceptable at T0 (recommended: two independently secured owners soon after).
8. Production hosting spend and region confirmation (current staging region: Oregon).
9. Whether DPA/MSA/order form is required before the first contract.
10. Control-plane MFA confirmation for GitHub, Render, Stripe, DNS/registrar, Resend.

### C. CAN LAUNCH WITH DOCUMENTED LIMITATION

Only if Product Leadership explicitly accepts. Cursor does not accept these.

1. Stripe test gaps: hosted `invoice.payment_failed`, test-clock renewal, browser Checkout + hCaptcha — **ACCEPTED LIMITATION** for a sales-led founding launch; **PRODUCTION BLOCKER** if self-serve card collection is the launch model.
2. No SOC 2 / ISO 27001 certification.
3. No external pentest (only if Option B is accepted).
4. Single-region Oregon hosting; no customer-selectable residency.
5. SSO / SCIM / public API / webhooks Coming Soon.
6. Seat/vendor numeric allowances not hard-enforced.
7. No formal uptime/support SLA.
8. Customer documentation pack incomplete (in-app Help exists).
9. `/metrics` disabled (404) if health/alerts exist.
10. Single Platform Owner at T0 if a second emergency owner is scheduled immediately after.

### D. POST-LAUNCH ROADMAP

1. #12 Supreme Third Party Production v1 (not started).
2. Recurring external pentest / bug bounty.
3. SOC 2 Type I readiness program, then Type II; ISO 27001 later.
4. Customer MFA, SSO, SCIM.
5. Public API and webhooks.
6. Hard enforcement of commercial allowances **if** they are sold as contractual caps.
7. Multi-region residency.
8. Formal CAB / production change tickets.
9. Immutable log/SIEM store.
10. Later product modules (#13+): Risk, Compliance, Privacy, AI Governance, Intelligence, Automation.

---

## 3–8. Stripe / commercial

**#2 remains PARTIAL / CONDITIONALLY CLEARED.**

### Catalog (verified in repository)

| Plan | Monthly | Annual | Public CTA |
|---|---|---|---|
| STARTER | $599 | $5,990 | Get Started → `/register` |
| PROFESSIONAL | $1,499 | $14,990 | Get Started → `/register` |
| BUSINESS | $2,999 | $29,990 | Request a Demo only |
| ENTERPRISE | Custom | Starting from $59,000/year | Contact Sales / Demo |

### BUSINESS entitlements (#11 fix)

`PlanId` now includes `BUSINESS`. `normalizePlan('BUSINESS')` is `BUSINESS`, not STARTER.

| Field | PROFESSIONAL | BUSINESS | ENTERPRISE |
|---|---|---|---|
| maxUsers | 25 | 75 | ∞ |
| maxVendors | 250 | 750 | ∞ |
| advancedReporting / monitoring / integrations | true | true | true |
| sso | false | false | true (flag only; SSO product is Coming Soon) |

Numeric allowances are **`COMMERCIAL_NOT_ENFORCED`**. Public pricing does not publish seat/vendor caps. Do not sell them as hard contractual limits until enforcement exists.

### Live Stripe catalog (not provisioned)

Required if self-serve is chosen (no values here):

- Products for Starter, Professional, Business (Enterprise sales-led)
- Monthly and annual price IDs
- Live publishable key, live secret, live webhook secret
- Customer Portal
- Webhook endpoint on the production API

Do not use live keys unless Product Leadership provides them. Do not reuse staging test IDs.

### Remaining Stripe test gaps

| Gap | Classification | Why |
|---|---|---|
| Hosted `invoice.payment_failed` | ACCEPTED LIMITATION if sales-led; BLOCKER if self-serve launch | Code path exists; hosted event not demonstrated |
| Test-clock renewal | ACCEPTED LIMITATION | Not demonstrated; not required to relabel #2 PASS |
| Browser Checkout + hCaptcha | ACCEPTED LIMITATION if sales-led; BLOCKER if self-serve | Staging API checkout 200; full browser+captcha not certified |

**LAUNCH BILLING MODEL: UNDECIDED.** Cursor does not choose.

---

## 9–13. Database, Redis, storage, backup

| Component | Launch requirement | Current | Decision |
|---|---|---|---|
| Postgres | Paid, SSL, production creds, backup-capable, appropriate region | Free staging PG, Oregon, expires 2026-10-12 | BLOCKED |
| Redis | Paid/private; TLS/private network as offered | Staging free Redis; memory store if unset | Required for >1 API instance. Single-instance can run in-memory. Do not drop Redis to save cost if abuse protection must stay distributed. |
| Object storage | Private, durable, tenant prefixes, encryption, credential separation, ClamAV | Staging MinIO/S3 | BLOCKED. No local disk. |
| Off-site / immutable backup | Before first paying customer | Local `backups/` only | BLOCKED |

### Proposed launch backup policy (internal target, not a contract)

- Daily automated PostgreSQL backup
- Daily object-storage copy
- Off-site copy in a second account/region or provider backup product
- Versioning or immutability where the provider supports it
- Retention target: 14 daily / 8 weekly / 12 monthly
- Internal RPO ≤ 24 hours; internal RTO ≤ 4 hours once automation exists
- Restore test before first paying customer and after any schema change

Do not publish this as a customer SLA unless Legal/Product approve.

---

## 14–17. Mailboxes and sender

| Mailbox | Status | Notes |
|---|---|---|
| Security reporting | USER ACTION REQUIRED | Concept only: a monitored security address. Not invented. |
| Support intake | USER ACTION REQUIRED | Required if support email is published. |
| Sales / `DEMO_INQUIRY_EMAIL` | USER ACTION REQUIRED | Demo 202 + Owner Console queue exist. Notification recipient undesignated. |
| Production From / Resend domain | USER ACTION REQUIRED | SPF/DKIM/DMARC: UNKNOWN. Do not claim DMARC. |

Prospect-facing demo success may remain 202 if mail fails; Platform Owner must still see the unresolved lead.

---

## 18–21. Legal, retention, Trust

| Document | Status | Launch |
|---|---|---|
| Privacy | DRAFT | BLOCKER / USER ACTION |
| Terms | DRAFT | BLOCKER / USER ACTION |
| Subprocessors | DRAFT — no invented vendor list | BLOCKER / USER ACTION |
| DPA | NOT READY | Required for typical B2B enterprise sale |
| MSA | NOT READY | Required for typical B2B enterprise sale |
| Order form | NOT READY | Required for typical B2B enterprise sale |
| Security addendum | NOT READY | Optional unless enterprise asks |

### Retention worksheet (no invented legal periods)

| Record | Proposed owner | Status |
|---|---|---|
| Support tickets | Legal + Support | USER ACTION / LEGAL DECISION REQUIRED |
| Demo leads | Legal + Sales | USER ACTION / LEGAL DECISION REQUIRED |
| Audit events | Legal + Security | USER ACTION / LEGAL DECISION REQUIRED |
| Evidence after tenant termination | Legal + Product | USER ACTION / LEGAL DECISION REQUIRED |
| Deleted-account handling | Legal + Engineering | USER ACTION / LEGAL DECISION REQUIRED |
| Backup residue | Legal + Operations | USER ACTION / LEGAL DECISION REQUIRED |
| Incident records | Legal + Security | USER ACTION / LEGAL DECISION REQUIRED |

### Trust Center

Public Trust / Security pages do **not** claim SOC 2 certified, ISO 27001 certified, external pentest completed, formal SLA, or available SSO/SCIM.

SOC 2: **NOT CERTIFIED**  
ISO 27001: **NOT CERTIFIED**

Suggested trust roadmap (not a certification claim): close production backups and legal pages → complete authorized pentest → SOC 2 Type I readiness → Type II → ISO 27001 scoping.

---

## 22. External pentest decision

External test has **not** occurred. Scope exists in `docs/PENETRATION-TEST-SCOPE.md`.

| Option | Tradeoff |
|---|---|
| A — require pentest before first paid customer | Stronger diligence; delays revenue; still not a certification |
| B — limited founding launch, pentest before enterprise / named milestone | Faster learning; higher residual risk; must be disclosed honestly to those customers |

Product Leadership decision. Cursor does not choose.

---

## 24–26. DNS, TLS, indexing

Intended records (not created, not activated):

| Hostname | Type | Intended target |
|---|---|---|
| `app.supremerisk.com` | CNAME | Production customer static service |
| `admin.supremerisk.com` | CNAME | Same SPA or dedicated admin static service |
| `api.supremerisk.com` | CNAME | Production API |
| `www.supremerisk.com` | CNAME | Marketing static |
| apex `supremerisk.com` | ALIAS/ANAME or 301 → www | Provider-specific |

DNS/registrar ownership: USER ACTION — not confirmed in this repository. Do not change records in #11.

TLS: Render-managed certificates once custom domains exist. No public launch until customer, admin, API, and marketing resolve over valid HTTPS.

### Admin / app indexing (#11 fix)

Production `robotsPolicyForPath`:

- `index,follow` only for marketing paths
- `noindex,nofollow` for `/admin`, `/platform`, `/dashboard`, auth routes, and host `admin.supremerisk.com`
- production `robots.txt` Disallow for those prefixes
- `_headers` `X-Robots-Tag: noindex, nofollow` for `/admin/*`, `/platform/*`, `/dashboard/*`

---

## 27–29. Metrics, monitoring, alerting

**Metrics decision A (recommended at launch):** keep `/metrics` 404 unless a high-entropy `METRICS_TOKEN` is set. Not a launch blocker if health/alerts exist.

Minimum launch monitoring (implemented vs required):

| Signal | Implemented now | Required at launch |
|---|---|---|
| API live/ready | YES (staging) | YES |
| Frontend serve | YES (staging) | YES |
| Database | YES via ready | YES |
| Redis | Health field | YES if configured |
| Object storage | Health field | YES |
| ClamAV | Health field; not a ready-fail | YES review |
| Email | Alert-test on staging | YES production recipient |
| Stripe | Test webhooks on staging | YES if live billing |
| Errors | Provider health + logs | YES |
| Backup result | NO production job | YES |

Alerting: production must not use webhook.site. Designate a real controlled destination.

---

## 30–35. Control-plane access and secrets

| Provider | MFA | Classification |
|---|---|---|
| GitHub | UNKNOWN | USER ACTION REQUIRED |
| Render | UNKNOWN | USER ACTION REQUIRED |
| Stripe | UNKNOWN | USER ACTION REQUIRED |
| DNS / registrar | UNKNOWN | USER ACTION REQUIRED |
| Resend | UNKNOWN | USER ACTION REQUIRED |

Passwords were not requested.

### Production access matrix (roles, not names)

| System | Who should have access |
|---|---|
| GitHub (this repo) | Engineering lead; Platform Owner (read + release) |
| Render production | Operations; Platform Owner |
| Production Postgres | Operations (break-glass); not Support Analyst |
| Redis | Operations |
| Object storage | Operations; Security (incident) |
| Stripe | Billing; Platform Owner |
| Resend | Operations; Support Admin (templates only if offered) |
| DNS / registrar | DNS owner; Platform Owner |
| Security mailbox | Security Admin; Platform Owner |
| Support mailbox | Support Admin / Analyst |
| Production app `PLATFORM_OWNER` | Primary + recommended second emergency owner |

### Platform Owner launch procedure (do not execute now)

1. Real internal email
2. One-time bootstrap token ≥32 characters
3. Unique generated password printed once
4. Immediate TOTP enrollment
5. Recovery codes stored offline
6. Disable bootstrap flag
7. Second independently secured owner as soon as practical

Single-owner at T0: **HIGH operational risk**. Acceptable only as a short, documented exception.

### Secret-generation checklist (names only)

`JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `DATABASE_URL`, Redis URL, storage keys, Stripe (if live), Resend, optional `METRICS_TOKEN`, `PLATFORM_OWNER_BOOTSTRAP_TOKEN`.

Rotation consequences: JWT rotation invalidates sessions; `ENCRYPTION_KEY` change prevents reading existing MFA secrets unless re-enrollment/migration is planned; DB/storage/Stripe/Resend rotate in the provider console then the secret store.

See `docs/SECRET-ROTATION-REQUIRED.md` and the cutover runbook.

---

## 36–38. Production build and product truth

Required production frontend: `VITE_ENVIRONMENT=production`, no staging banner, no Vite HMR, `sourcemap: false`, API host = production API, robots as above, no secrets in the bundle.

| Product | Public status |
|---|---|
| Supreme Third Party | available / production-capable on staging |
| Supreme Risk | preview |
| Supreme Compliance | preview |
| Supreme Privacy | roadmap |
| Supreme AI Governance | roadmap |
| Supreme Intelligence | roadmap |
| Supreme Automation | roadmap |

Pricing comparison: API/Webhooks Coming Soon all tiers; SSO/SCIM Coming Soon on Business/Enterprise. Backend `ENTERPRISE.sso=true` is a future flag, not a shipped SSO product.

---

## 39–42. Customer scope, onboarding, offboarding

**Safe initial customer:** SMB / mid-market design partner or founding customer; non-high-risk pilot. Not Fortune 100 / highly regulated enterprise until pentest, legal pack, production backups, and billing model are decided.

**Founding capacity (not a load test):** first 5 customers on a single-region paid stack is the honest operating target. First 10 requires watching DB connections, storage, ClamAV memory, and support load. First 20 requires a capacity review. Do not fabricate throughput.

### First-customer onboarding checklist

1. Commercial agreement (or explicit founding-pilot terms)
2. Tenant created
3. Organization admin identified
4. Plan assigned server-side (STARTER / PROFESSIONAL / BUSINESS / ENTERPRISE)
5. Invitation + password + role
6. MFA/SSO truth: password + optional customer MFA later; SSO not available
7. Vendor import (manual or CSV if used)
8. First assessment
9. Evidence upload (malware path)
10. Support path shown
11. Billing: Stripe or sales-led invoice as decided
12. Training: live walkthrough; customer docs still PARTIAL

### Offboarding (legal retention pending policy)

Disable tenant → export available tenant data → cancel billing → close support → retain or delete evidence per approved policy → accept backup residue until retention expires.

---

## 43–47. Support, IR, SLA

Help & Support works on staging. Platform queue, staff roles, customer-approved support access, and escalation exist as product. Operational ownership and hours are USER ACTION REQUIRED. **Do not claim 24/7.**

### First-release escalation (roles)

| Class | Primary | Escalate |
|---|---|---|
| P1 (service down / data leak / malware bypass) | Operations + Security | Platform Owner |
| P2 (degraded / single-tenant) | Operations | Platform Owner |
| Security incident | Security Admin | Platform Owner + Legal |
| Billing issue | Billing | Platform Owner |
| Email outage | Operations | Support Admin |
| Malware outage | Operations + Security | fail-closed; Platform Owner |

Breach notification: escalate Security → Platform Owner → Legal. Statutory deadlines vary by jurisdiction. Do not invent global clocks.

**SLA decision: NO FORMAL SLA AT LAUNCH** unless Product Leadership requires one.

---

## 48–52. Performance, capacity, residency, subprocessors, cookies

#10 smoke is a baseline, not scale certification. Lack of load testing does **not** block a founding-customer launch of ≤5 tenants. It **does** block a GA / large-enterprise claim.

Capacity triggers (watch, do not invent hard numbers): API CPU/memory, DB connections/storage, Redis memory, ClamAV memory, object-storage size/errors.

**Data residency:** intended first region Oregon (Render staging region). Regional residency is **not** supported today. Do not claim global residency.

### Likely launch subprocessors (when production is contracted)

Render (hosting/DB/Redis as used), Stripe (payments if used), Resend (email if used). Do not add unused companies. Customer-data role must match the actual processor. The public Subprocessors page remains Draft until Legal publishes the list.

### Cookies / tracking

No marketing analytics, gtag, or tracking-cookie implementation found on the public site. Session/auth cookies are application cookies. Do not add tracking in this gate. If analytics is added later, Privacy/consent must be updated first.

---

## 53–55. Demo, sales, billing handoff

Demo path on staging: submit → stored → Owner Console visible → notification attempted if recipient configured → assignment/follow-up status. **Operational before any marketing campaign.**

Minimum sales workflow (no CRM build): demo → qualified → proposal → commercial agreement → tenant provision.

If Stripe is not live: sales-led invoice / contract billing + server-side plan assignment. Accounting process is a Product Leadership / finance decision.

---

## 56–59. Change control, merge plan, notes

| Rule | Policy |
|---|---|
| Branch | Implementation on `supreme-risk-transformation` until GO |
| Production edits | Forbidden outside approved SHA deploy |
| CI | Hosted Supreme CI on the exact SHA; no skipped gates |
| Review | Required before merge to `main` |
| Deploy | Render (or successor) pinned SHA |
| Rollback | Previous good SHA + DNS + restore policy |

### Main merge plan (PREPARE ONLY — DO NOT EXECUTE)

| Field | Value |
|---|---|
| Source | `supreme-risk-transformation` |
| Target | `main` |
| Expected release SHA | RELEASE_CANDIDATE_SHA after #11 CI PASS and later GO |
| Required checks | Supreme CI `quality` on that SHA |
| Tag | Propose `v1.0.0-founding` or `v1.0.0` only when GO; do not tag now |

### Draft release notes — Supreme Third Party Production v1

**Included only when production actually ships (not now):**

- Tenant-isolated vendor inventory, assessments, evidence (fail-closed malware), findings, explainable residual risk, Decision Briefs, monitoring workspace, reports
- Organization RBAC, invitations, Platform Owner / Support Console
- Tested Stripe subscription path (if live catalog enabled) or sales-led plan assignment
- Draft-or-approved legal pages as actually published

**Not included:** Risk/Compliance as finished products; Privacy/AI/Intelligence/Automation; SSO/SCIM; public API/webhooks; SOC 2/ISO; formal SLA; multi-region residency.

---

## 60–62. Documentation and DR

| Customer doc | Status |
|---|---|
| Getting Started | PARTIAL — in-app onboarding; `docs/user-guide.md` is pre-transformation and not launch-safe |
| Admin Guide | MISSING as a customer document |
| User Guide | MISSING (current file is installer/legacy) |
| Vendor / assessment workflow | PARTIAL — in-app only |
| Evidence / findings / reports | PARTIAL — in-app only |
| Help & Support | PASS as in-app |
| Security / Trust | PASS as public pages (honest) |
| Billing | PARTIAL — in-app Billing + public Pricing |

Operations runbooks exist: cutover, DR, platform access, support console, configuration matrix. Someone can operate from those docs without reading source, **once production infra exists**.

#5 isolated restore still applies to the current schema (rehearsed again in #10). Production DR cannot be PASS until production backup topology exists.

---

## 63–66. Candidate CI, smoke, rollback

Candidate must pass hosted Supreme CI on the exact SHA. `#11` also enabled `pipefail` on the backend/frontend test steps so a failed suite can no longer be hidden by `tee`.

Post-cutover smoke (shorter than full CI):

```bash
CUTOVER_FRONTEND_URL=https://app.supremerisk.com \
CUTOVER_API_URL=https://api.supremerisk.com \
./scripts/cutover-smoke.sh
```

Cover: live/ready, customer login page, admin login page, demo 202, metrics 404, legacy 404, hostile CORS, plane isolation.

Rollback: previous good staging SHA from #10 was `9a195a2` (not a production rollback target). Production rollback = prior production SHA + DNS delete/restore + **no migrate-down** (restore or forward-fix). Provider rollback table is in the cutover runbook.

---

## Launch recommendation

| Field | Value |
|---|---|
| Recommended type now | **NO-GO** |
| After Class A + Class B decisions | **FOUNDING CUSTOMER RELEASE** (sales-led) or **PRIVATE BETA** |
| Limited commercial launch | Not yet |
| General Availability | Not yet |
| CURRENT GO / NO-GO | **NO-GO** |
| Conditional GO | Only if Product Leadership signs the conditions. Cursor does not approve. |

---

## First 30 days (after a future GO)

Daily: provider health, backup job result, failed logins, support tickets, malware status, billing events (if live), email delivery, obvious performance, DB/storage growth, customer feedback.

Do not create recurring automation in this gate.

### 30-day exit before aggressive sales

- No critical security/isolation incidents
- Support functioning within stated hours
- A production backup restored successfully into isolation
- First-customer TPRM path stable
- Billing path matches the chosen model
- No tenant-isolation incidents

---

## Cost / infrastructure (no invented sticker prices)

| Class | Items |
|---|---|
| KNOWN | Staging uses Render Oregon: free Postgres (expires 2026-10-12), free Redis, starter API, static frontend, starter MinIO, private ClamAV. Those plans are **not** production. |
| ESTIMATED | Paid Render Postgres; paid Redis; paid web services; private object store; private ClamAV; Resend production; optional Stripe fees; domain/DNS; backup storage |
| UNKNOWN / USER DECISION | Exact paid SKUs, object-store vendor, backup product, whether live Stripe is in month-1 spend |

---

## Launch risks

| Severity | Risk |
|---|---|
| Critical | No production-grade DB / storage / malware / off-site backup |
| Critical | Draft legal pages on a public commercial site |
| High | Undesignated security/support/sales mailboxes |
| High | Live Stripe catalog missing while public prices exist |
| High | Control-plane MFA unknown |
| High | Single operator / single region |
| Medium | No SOC 2 / ISO / external pentest |
| Medium | Incomplete customer documentation |
| Medium | Stripe test-gap residue if self-serve is chosen |

These are real launch blockers or diligence gaps. They are not ordinary “startup flavor.”

---

## Release procedure (later, after GO)

Follow `docs/PRODUCTION-CUTOVER-RUNBOOK.md`. Do not merge `main`, deploy production, or change DNS from this checklist.

---

## Sign-off

| Role | Decision | Date | Notes |
|---|---|---|---|
| Engineering (evidence) | #11 checklist complete. Production ready: **NO**. GO: **NO-GO**. | 2026-09-13 | Evidence only |
| Security | | | |
| Legal | | | |
| Billing / Finance | | | |
| Operations | | | |
| Product Leadership | | | **Only this row authorizes a later GO or Conditional GO** |

---

**#11 EVIDENCE RESULT:** PASS (complete honest NO-GO package)  
**PRODUCTION READY:** NO  
**#12:** NOT AUTHORIZED

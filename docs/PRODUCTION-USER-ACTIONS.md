# Production user actions

Actions that require the business owner / account holder. Cursor cannot complete these.

No passwords, API keys, recovery codes, or live Stripe secrets belong in chat or this file.

**Related:** `docs/PRODUCTION-RELEASE-CHECKLIST.md`

| Field | Value |
|---|---|
| Count | 22 |
| Production deployed | NO |
| Cursor may invent mailboxes | NO |

---

## 1. Approve production hosting spend

| Field | Value |
|---|---|
| ACTION | Approve paid production Postgres, Redis, application services, private object storage, private ClamAV, and backup storage. Do not promote the free staging database. |
| WHY | Free staging Postgres expires 2026-10-12 and is not durable production. |
| BLOCKING? | YES |
| WHERE | Render (or successor) billing + object-storage vendor console |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Account passwords, payment cards, connection strings |
| STATUS | USER ACTION REQUIRED |

## 2. Confirm production region

| Field | Value |
|---|---|
| ACTION | Confirm first hosting region. Staging is Oregon. Single-region only at launch. |
| WHY | Customer data residency claims must be true. |
| BLOCKING? | YES if a different region is required and not provisioned |
| WHERE | Hosting console |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Console sessions |
| STATUS | USER ACTION REQUIRED |

## 3. Confirm DNS and registrar ownership

| Field | Value |
|---|---|
| ACTION | Confirm who can create records for `supremerisk.com` (apex, www, app, admin, api). Do not publish records until GO. |
| WHY | Public launch needs TLS hostnames. Ownership is not proven in the repo. |
| BLOCKING? | YES for public hosts |
| WHERE | Registrar + DNS provider |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Registrar password, transfer PIN |
| STATUS | USER ACTION REQUIRED |

## 4. Confirm control-plane MFA

| Field | Value |
|---|---|
| ACTION | Enable and confirm MFA on GitHub, Render, Stripe, DNS/registrar, and Resend for every privileged login. |
| WHY | A privileged service without MFA is a launch concern. |
| BLOCKING? | YES if any privileged account lacks MFA |
| WHERE | Each provider’s security settings |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Passwords, TOTP secrets, recovery codes, session cookies |
| STATUS | UNKNOWN / USER ACTION REQUIRED |

## 5. Designate security mailbox

| Field | Value |
|---|---|
| ACTION | Create or approve a real monitored security reporting address and name the on-call owner. |
| WHY | Public launch needs a real security contact. |
| BLOCKING? | YES |
| WHERE | Domain mailbox / Google Workspace / Microsoft 365 |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Mailbox password |
| STATUS | USER ACTION REQUIRED |

## 6. Designate support mailbox

| Field | Value |
|---|---|
| ACTION | Create or approve a real support intake address if support email will be published. Connect it to the Support Console process. |
| WHY | Customers need a truthful intake path. |
| BLOCKING? | YES if the address will be published |
| WHERE | Domain mailbox + Platform Support process |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Mailbox password |
| STATUS | USER ACTION REQUIRED |

## 7. Designate sales / demo mailbox

| Field | Value |
|---|---|
| ACTION | Approve `DEMO_INQUIRY_EMAIL` (or equivalent) as a real monitored sales inbox. |
| WHY | Demo requests must not disappear operationally. The Owner Console still stores the lead. |
| BLOCKING? | YES before a marketing campaign |
| WHERE | Domain mailbox + production env (value set in host secret store, not Git) |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Mailbox password |
| STATUS | USER ACTION REQUIRED |

## 8. Verify Resend / sending domain

| Field | Value |
|---|---|
| ACTION | Verify the production From domain in Resend. Confirm SPF/DKIM. Only claim DMARC after it is actually published and checked. |
| WHY | Invitations, resets, and alerts must send from a real domain. |
| BLOCKING? | YES for customer email |
| WHERE | Resend + DNS (TXT records) |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | SMTP passwords, API keys |
| STATUS | USER ACTION REQUIRED |

## 9. Approve legal launch pages

| Field | Value |
|---|---|
| ACTION | Counsel reviews and approves Privacy, Terms, and Subprocessors — or Product Leadership keeps them unpublished / clearly non-contractual. |
| WHY | Current pages are Draft. They cannot silently become production legal documents. |
| BLOCKING? | YES for public commercial launch |
| WHERE | Legal review; then repo content replacement |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Privileged legal advice you do not want in the repo |
| STATUS | DRAFT / USER ACTION REQUIRED |

## 10. Decide DPA / MSA / order form

| Field | Value |
|---|---|
| ACTION | Decide whether first customer requires a DPA, MSA, order form, and security addendum. Commission counsel if yes. |
| WHY | Typical B2B enterprise sale needs them. They are not in the product. |
| BLOCKING? | YES for enterprise contract; PL for founding pilots |
| WHERE | Legal / commercial paper |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Unsigned strategy that must stay privileged |
| STATUS | NOT READY |

## 11. Approve retention policy

| Field | Value |
|---|---|
| ACTION | Set retention for support tickets, demo leads, audit logs, evidence after tenant termination, deleted accounts, backups, and incidents. |
| WHY | Engineering must not invent legal periods. |
| BLOCKING? | YES as policy before promising customers; PARTIAL for a tightly scoped pilot if Legal accepts |
| WHERE | Legal + Product worksheet in the #11 checklist |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Nothing secret required; do not paste customer data |
| STATUS | USER ACTION / LEGAL DECISION REQUIRED |

## 12. Choose pentest policy

| Field | Value |
|---|---|
| ACTION | Option A: external pentest before first paid customer. Option B: limited founding launch, pentest before enterprise / a named milestone. |
| WHY | Scope exists; no external test has occurred. |
| BLOCKING? | YES until chosen; Option A blocks paid launch until the test |
| WHERE | Product Leadership + Security |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Tester credentials, VPN keys |
| STATUS | UNDECIDED |

## 13. Confirm billing launch model

| Field | Value |
|---|---|
| ACTION | Choose live self-serve Stripe **or** sales-led invoicing / contract billing for first customers. |
| WHY | Live catalog is not provisioned. Public prices exist. |
| BLOCKING? | YES until decided |
| WHERE | Product Leadership + Finance |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Live Stripe secret keys |
| STATUS | UNDECIDED |

## 14. Provision live Stripe catalog (only if self-serve)

| Field | Value |
|---|---|
| ACTION | If self-serve is chosen: create live products/prices for Starter, Professional, Business (monthly + annual); webhook; portal; live publishable + secret. Enterprise remains sales-led. |
| WHY | Staging test price IDs must not be reused. |
| BLOCKING? | YES if self-serve; NO if sales-led is chosen |
| WHERE | Stripe Dashboard (live mode) + Render env |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | `sk_live_`, `rk_live_`, `whsec_` live secrets |
| STATUS | USER ACTION REQUIRED |

## 15. Choose backup product and retention

| Field | Value |
|---|---|
| ACTION | Approve scheduled DB + object backups, off-site copy, versioning/immutability if offered, and whether the internal 14/8/12 retention target is intended. |
| WHY | #5 isolated restore is not production backup. |
| BLOCKING? | YES before first paying customer |
| WHERE | Hosting + storage vendor backup settings |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Backup encryption keys, restore credentials |
| STATUS | USER ACTION REQUIRED |

## 16. Designate production alert destination

| Field | Value |
|---|---|
| ACTION | Replace any rehearsal webhook.site URL with a real controlled mailbox or ops webhook. |
| WHY | Production alerts must reach operators. |
| BLOCKING? | YES if leftover test webhook |
| WHERE | Render `ALERT_WEBHOOK_URL` / `ALERT_EMAIL_TO` |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Webhook signing secrets |
| STATUS | USER ACTION REQUIRED |

## 17. Decide metrics exposure

| Field | Value |
|---|---|
| ACTION | Leave `/metrics` unavailable (404) **or** set a high-entropy `METRICS_TOKEN`. Do not expose metrics publicly. |
| WHY | Token is not configured. This alone is not a launch blocker. |
| BLOCKING? | NO |
| WHERE | Production secret store |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | The token value |
| STATUS | USER ACTION OPTIONAL |

## 18. Approve support hours

| Field | Value |
|---|---|
| ACTION | State truthful launch support hours. Do not claim 24/7. |
| WHY | Help & Support currently promises no contractual response time. |
| BLOCKING? | YES if hours will be published |
| WHERE | Product Leadership + Support |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Personal phone numbers you do not want in docs |
| STATUS | USER ACTION REQUIRED |

## 19. Decide SLA posture

| Field | Value |
|---|---|
| ACTION | Confirm **no formal SLA at launch** or commission a formal SLA. |
| WHY | Trust/status pages must not invent uptime promises. |
| BLOCKING? | YES only if a formal SLA is required and missing |
| WHERE | Product Leadership + Legal |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Nothing required |
| STATUS | UNDECIDED — recommended no formal SLA |

## 20. Confirm least-privilege production access

| Field | Value |
|---|---|
| ACTION | Assign the role matrix in the #11 checklist to real people. Prefer two independently secured emergency-capable owners. |
| WHY | Single-operator risk is High. Privilege spread is also a risk. |
| BLOCKING? | PARTIAL — one owner can bootstrap; two owners recommended before/soon after launch |
| WHERE | GitHub, Render, Stripe, DNS, Resend, mailbox admin |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Named personal credentials |
| STATUS | USER ACTION REQUIRED |

## 21. Approve first-customer profile

| Field | Value |
|---|---|
| ACTION | Confirm founding customers are SMB/mid-market or design partners — not highly regulated enterprise — unless you accept the extra risk. |
| WHY | No pentest, no SOC 2/ISO, single region, legal drafts. |
| BLOCKING? | YES if you intend to sell regulated enterprise immediately |
| WHERE | Product Leadership |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Customer confidential data |
| STATUS | USER ACTION REQUIRED |

## 22. Do not authorize #12 or production DNS from chat

| Field | Value |
|---|---|
| ACTION | After reviewing this package, record GO, Conditional GO (with named conditions), or NO-GO in program state. Only then may a later sprint start #12. |
| WHY | Cursor must not self-approve Conditional GO, merge `main`, or change DNS. |
| BLOCKING? | YES for #12 |
| WHERE | `docs/SUPREME-PROGRAM-STATE.md` |
| WHAT NOT TO SHARE WITH CURSOR/CHAT | Production secrets |
| STATUS | PRODUCT LEADERSHIP REVIEW REQUIRED |

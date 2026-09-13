# Final security review (#9)

**Program item:** #9 Final Security Review
**Branch:** `supreme-risk-transformation`
**Starting SHA:** `806975fd8d8093dd11bc987db82518b75110e636`
**Last runtime SHA before this sprint:** `9a195a27c67851566bef1cfa6bee461d2350d557`
**Production deployment:** NO
**Main merged:** NO
**#10 started:** NO
**SOC 2 certified:** NO
**ISO 27001 certified:** NO
**External pentest performed:** NO

Engineering evidence result is recorded here. **Program acceptance of #9 still requires Product Leadership review before #10.**

## Scope

Adversarial review of authentication, sessions, customer/admin planes, platform RBAC, support access, break-glass, tenant isolation, web controls, uploads/malware, billing/email, secrets, logging, reports, and prior gates #2–#8.

## Evidence result

**#9 EVIDENCE RESULT: PASS**

No unresolved Critical production blocker. High issues found in this sprint were fixed or classified below with a defensible non-blocking rationale. #10 is not started.

## Architecture and data

See `docs/SECURITY-ARCHITECTURE.md`. Trust boundaries: INTERNET, CUSTOMER PLANE, INTERNAL ADMIN PLANE, TENANT DATA, PLATFORM OPERATIONS, PRIVATE INFRASTRUCTURE, EXTERNAL PROVIDERS.

## Findings register

### FSR-001 — In-memory tasks/workflows/reports were cross-tenant

| Field | Value |
|---|---|
| Severity | CRITICAL |
| Category | Tenant isolation / IDOR |
| Component | `/api/v1/tasks`, `/workflows`, `/reports` |
| Evidence | Global in-memory `Map` with no `organizationId` |
| Exploitability | Any authenticated tenant user on the same process |
| Business impact | Cross-tenant read/write of legacy mock objects |
| Remediation | Unmounted unless `ENABLE_LEGACY_INMEMORY_APIS=true` and never when `NODE_ENV=production` |
| Status | FIXED |
| Production blocker | YES — resolved |

### FSR-002 — Password reset reactivated DISABLED accounts

| Field | Value |
|---|---|
| Severity | HIGH |
| Category | Authentication |
| Component | `authService.resetPassword` |
| Evidence | Reset set `status: ACTIVE` without checking disablement |
| Exploitability | Valid reset token issued before disable (1-hour window) |
| Business impact | Admin disablement bypass |
| Remediation | Reject DISABLED; revoke outstanding reset tokens on disable and on new reset request |
| Status | FIXED |
| Production blocker | YES — resolved |

### FSR-003 — Access JWT survived password change

| Field | Value |
|---|---|
| Severity | HIGH |
| Category | Session |
| Component | `middleware/auth.ts` |
| Evidence | Refresh revoked; access `iat` not compared to `passwordChangedAt` |
| Exploitability | Stolen access token valid up to TTL after password change |
| Business impact | Session theft window after credential rotation |
| Remediation | Reject JWT when `iat` is before `passwordChangedAt` |
| Status | FIXED |
| Production blocker | YES — resolved |

### FSR-004 — Last organization administrator could be removed

| Field | Value |
|---|---|
| Severity | HIGH |
| Category | Authorization |
| Component | `identityUserService` |
| Evidence | No remaining-admin count on demote/disable |
| Exploitability | Privileged tenant user |
| Business impact | Tenant lockout |
| Remediation | Block demote/disable of the last ACTIVE org admin |
| Status | FIXED |
| Production blocker | YES — resolved |

### FSR-005 — Break-glass accepted any active incident

| Field | Value |
|---|---|
| Severity | HIGH |
| Category | Support access |
| Component | `supportAccessService.requestBreakGlass` |
| Evidence | Incident not required to list the target org |
| Exploitability | Privileged support with any open incident |
| Business impact | Policy bypass of tenant-bound emergency access |
| Remediation | Require incident `organizations` to include the target org |
| Status | FIXED |
| Production blocker | YES — resolved |

### FSR-006 — Unvalidated Stripe return URLs

| Field | Value |
|---|---|
| Severity | HIGH |
| Category | Open redirect |
| Component | `billing.routes` checkout/portal |
| Evidence | Client `successUrl` / `cancelUrl` / `returnUrl` passed to Stripe |
| Exploitability | Authenticated `billing.manage` user |
| Business impact | Post-checkout phishing redirect |
| Remediation | `assertSafeAppReturnUrl` allowlists CORS / portal origins |
| Status | FIXED |
| Production blocker | YES — resolved |

### FSR-007 — Unauthenticated `/metrics`

| Field | Value |
|---|---|
| Severity | HIGH |
| Category | Information disclosure |
| Component | `server.ts` `/metrics`, `/metrics/json` |
| Evidence | Public Prometheus/JSON metrics, rate-limit skip |
| Exploitability | Unauthenticated Internet client |
| Business impact | Operational reconnaissance |
| Remediation | Require `METRICS_TOKEN`; otherwise 404 |
| Status | FIXED |
| Production blocker | YES — resolved |

### FSR-008 — Static `/uploads` bypassed download policy

| Field | Value |
|---|---|
| Severity | HIGH |
| Category | Object storage |
| Component | `express.static('/uploads')` |
| Evidence | Unauthenticated file serve; bypassed scan/tenant checks when local disk used |
| Exploitability | Knowledge of storage key; staging currently uses S3 |
| Business impact | Unauthorized evidence download |
| Remediation | Static mount removed; downloads only via authorized API |
| Status | FIXED |
| Production blocker | YES — resolved |

### FSR-009 — CSV/XLSX formula injection

| Field | Value |
|---|---|
| Severity | MEDIUM |
| Category | Export safety |
| Component | vendor/findings/monitoring/risk-history exports |
| Evidence | User names/titles prefixed with `= + - @` were emitted raw |
| Exploitability | Tenant user plants formula; another user opens CSV/XLSX in Excel |
| Business impact | Client-side spreadsheet execution |
| Remediation | `spreadsheetSafe` neutralization |
| Status | FIXED |
| Production blocker | NO after fix |

### FSR-010 — SMTP header injection

| Field | Value |
|---|---|
| Severity | MEDIUM |
| Category | Email |
| Component | `smtpClient` Subject/To/From |
| Evidence | No CR/LF stripping |
| Exploitability | User-controlled subject (e.g. demo company) |
| Business impact | Extra SMTP headers |
| Remediation | `sanitizeHeaderValue` |
| Status | FIXED |
| Production blocker | NO after fix |

### FSR-011 — JWT algorithm not pinned

| Field | Value |
|---|---|
| Severity | LOW |
| Category | Session |
| Component | `jwt.verify` / `jwt.sign` |
| Remediation | HS256 pinned |
| Status | FIXED |
| Production blocker | NO |

### FSR-012 — Concurrent password-reset tokens

| Field | Value |
|---|---|
| Severity | MEDIUM |
| Category | Authentication |
| Remediation | New reset request marks prior unused tokens used |
| Status | FIXED |
| Production blocker | NO |

### FSR-013 — `/auth/refresh` lacked a limiter

| Field | Value |
|---|---|
| Severity | MEDIUM |
| Category | Abuse protection |
| Remediation | `authRateLimiter` applied |
| Status | FIXED |
| Production blocker | NO |

### FSR-014 — Legacy 500 responses leaked `error.message`

| Field | Value |
|---|---|
| Severity | MEDIUM |
| Category | Error handling |
| Component | vendor/approval/concentration/risk-history/risk-appetite routes |
| Remediation | Hosted/production returns a generic 500 message |
| Status | FIXED |
| Production blocker | NO after fix |

### FSR-015 — Access JWT also stored in `localStorage`

| Field | Value |
|---|---|
| Severity | MEDIUM |
| Category | XSS impact |
| Component | frontend `AuthContext` / `api.ts` |
| Evidence | Bearer preferred from `localStorage`; httpOnly cookie also set |
| Exploitability | Requires XSS or a compromised script |
| Business impact | Session theft if XSS appears |
| Remediation | No current HTML sink (`dangerouslySetInnerHTML` absent). Cookie-only migration deferred (high regression risk). Production CSP added to the static build. |
| Status | ACCEPTED / DOCUMENTED |
| Production blocker | NO — no active XSS vector; defense-in-depth CSP added |

### FSR-016 — Frontend had no CSP/security headers

| Field | Value |
|---|---|
| Severity | MEDIUM |
| Category | Web |
| Remediation | Production Vite plugin emits CSP meta + `_headers` |
| Status | FIXED |
| Production blocker | NO |

### FSR-017 — Swagger UI was public

| Field | Value |
|---|---|
| Severity | LOW |
| Category | Enumeration |
| Remediation | `/api-docs` mounted only when `NODE_ENV !== 'production'` |
| Status | FIXED |
| Production blocker | NO |

### FSR-018 — No access-token denylist

| Field | Value |
|---|---|
| Severity | INFO |
| Category | Session |
| Evidence | Design: short TTL + DB status/MFA/`passwordChangedAt` checks |
| Status | ACCEPTED |
| Production blocker | NO |

### FSR-019 — Customer MFA not implemented

| Field | Value |
|---|---|
| Severity | INFO |
| Category | Authentication |
| Evidence | ADR: platform MFA required; customer MFA is a later item |
| Status | ACCEPTED |
| Production blocker | NO for #9 (not an implemented-control bypass) |

### FSR-020 — SSO / SCIM not implemented

| Field | Value |
|---|---|
| Severity | INFO |
| Category | Identity |
| Evidence | Pricing shows Coming Soon; ADR defers |
| Status | ACCEPTED |
| Production blocker | NO |

### FSR-021 — No public security reporting mailbox

| Field | Value |
|---|---|
| Severity | INFO |
| Category | Trust |
| Evidence | Trust/Security pages do not invent an address |
| Remediation | Product Leadership must designate a real mailbox before public launch |
| Status | OPEN — production requirement |
| Production blocker | NO under the technical release-blocking rule |

### FSR-022 — Stripe remaining hosted lifecycle gaps

| Field | Value |
|---|---|
| Severity | INFO |
| Category | Billing completeness |
| Evidence | #2 PARTIAL / CONDITIONALLY CLEARED — not a new secret leak |
| Status | UNCHANGED |
| Production blocker | NO for #9 security (still a later commercial gate) |

### FSR-023 — Production backup/retention/DSR policy incomplete

| Field | Value |
|---|---|
| Severity | INFO |
| Category | Privacy / DR |
| Evidence | #5 certified isolated restore only; no approved retention schedule; no mounted DSR API |
| Status | OPEN — policy decision required |
| Production blocker | NO for #9 technical review; YES for later production legal/ops gates |

### FSR-024 — Evidence `ownerId` not bound to tenant vendor graph

| Field | Value |
|---|---|
| Severity | LOW |
| Category | Integrity |
| Evidence | Object remains tenant-scoped; download still org-checked |
| Status | DOCUMENTED |
| Production blocker | NO |

### FSR-025 — No current user-controlled SSRF surface

| Field | Value |
|---|---|
| Severity | INFO |
| Category | SSRF |
| Evidence | Outbound HTTP uses env/provider URLs only |
| Status | PASS |
| Production blocker | NO |

## Regression of prior gates

| Gate | Result |
|---|---|
| #2 Stripe | PARTIAL / CONDITIONALLY CLEARED — no secret/webhook regression; return URLs hardened |
| #3 Malware | PASS — scanner policy unchanged; support still cannot mark CLEAN; static upload bypass removed |
| #4 Rate limiting | PASS — MFA/login/demo unchanged; refresh and evidence-upload limiters added |
| #5 Backup / restore | PASS — not reopened |
| #6 Hosted CI | Required on this sprint’s final SHA |
| #7 Platform Owner | PASS (this task’s authorization) — no RBAC weakening |
| #8 Identity / admin | PASS (this task’s authorization) — MFA/step-up/support preserved |

## Tests added

`backend/src/__tests__/final-security-review.test.ts` covers in-memory 404, metrics token, billing return URL, password-change JWT invalidation, disabled reset, last org admin, break-glass org binding, and CSV formula neutralization.

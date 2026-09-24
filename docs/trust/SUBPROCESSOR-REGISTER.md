# Subprocessor register

**Status:** DRAFT / LEGAL REVIEW REQUIRED  
**Scope:** processors actually used for **current hosted staging / private-testing**, plus contracted-but-not-live services called out honestly.  
**Not:** a production customer subprocessors roster. Production hosting is not fully provisioned.  
**Owner:** Product Leadership / legal  
**Review by:** 2026-12-23  
**Effective date of this draft:** 2026-09-23

Do not guess locations. If unknown: **Not recorded / To be confirmed.**

| Provider | Purpose | Data category | Location | Status | Source | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Render | Host staging frontend, API, and related services | Application compute; may process tenant request data in memory/logs | Render staging documented as Oregon in cutover docs | IN USE (staging) | `docs/PRODUCTION-CUTOVER-REHEARSAL.md`; live hosts `supreme-risk-staging.onrender.com`, `supreme-risk-staging-api.onrender.com` | Not a production host |
| Render / MinIO service `supreme-risk-staging-minio` | S3-compatible evidence object storage | Evidence bytes, checksums, scan status metadata | Not recorded / To be confirmed (same Render workspace) | IN USE (staging) | #12 persistence evidence; disk `minio-data-live` | Persistent disk attached; not AWS S3 |
| PostgreSQL on Render (`supreme-risk-staging-pg` in DR docs) | Application database | Tenant business records | Not recorded / To be confirmed | IN USE (staging) | `docs/BACKUP-RESTORE-CERTIFICATION.md` | Free Render Postgres noted as expiring 2026-10-12; **not acceptable for production** |
| GitHub | Source control and hosted CI | Source code; CI logs; no customer tenant database | GitHub (location not recorded here) | IN USE | #6 Hosted CI PASS | Not a customer data store |
| Stripe | Test-mode Checkout / Portal / webhooks when keys present | Billing identifiers, test payment metadata | Stripe (location not recorded here) | CONFIGURED TEST-MODE / NOT LIVE | #2 PARTIAL; commercial production NO-GO | Live Stripe must not be implied |
| Email (Resend or SMTP as configured) | Transactional mail (invites, MFA, notifications) | Email addresses, message metadata | Not recorded / To be confirmed | DEGRADED / PARTIAL | Viewer hosted session SKIP; invitation Queued ≠ Delivered | Do not claim reliable email delivery |
| ClamAV (when connected) | Malware scan of uploads | File bytes during scan | Not recorded / To be confirmed | CONNECTED on staging health when reported | #3 PASS; fail-closed if absent | Scanner itself is not backed up |
| hCaptcha | Checkout bot resistance | Browser challenge data | Not recorded / To be confirmed | NOT DEMONSTRATED | #2 remaining check | Do not list as a live production control |
| OpenAI / other AI provider | Optional TPRM assistance | Prompts if configured | Not recorded | TYPICALLY NOT_CONFIGURED | #18 `aiProvider` NOT_CONFIGURED is TPRM assistance, not the AI Governance product | Do not claim an AI subprocessor unless keys exist |
| Entra / Okta / Google | Customer IdP | Identity assertions if federated | n/a | ARCHITECTURE ONLY — LIVE VALIDATION DEFERRED | #21 | Not a current subprocessor |
| Slack / Jira | Notifications / tickets | Message/ticket payloads if connected | n/a | LIVE VALIDATION DEFERRED | #22 | Not a current subprocessor |

**Not listed:** invented CDN, analytics, or SOC 2 tooling. None were purchased for this phase.

Updates require human approval. This register does not automatically stay current.

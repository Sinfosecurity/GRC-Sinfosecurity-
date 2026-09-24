# Subprocessor register

**Status:** DRAFT / LEGAL REVIEW REQUIRED  
**Scope:** processors actually used for **current hosted staging / private-testing**, plus contracted-but-not-live services called out honestly.  
**Not:** a production customer subprocessors roster. Production hosting is not fully provisioned.  
**Owner:** Product Leadership / legal  
**Last reviewed:** 2026-09-23  
**Review by:** 2026-12-23  
**Effective date of this draft:** 2026-09-23

Do not guess locations. If unknown: **UNKNOWN / TO BE CONFIRMED**.  
Do not list architecture-only providers as live subprocessors.  
Updates require human approval. This register does not automatically stay current.

## In use or configured (staging / private-testing)

| Provider | Purpose | Data category | Location | Status | Source | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Render | Host staging frontend, API, and related services | Application compute; may process tenant request data in memory/logs | Render staging documented as Oregon in cutover docs — **region UNKNOWN / TO BE CONFIRMED for every current service** | IN USE (staging) | `docs/PRODUCTION-CUTOVER-REHEARSAL.md`; live hosts `supreme-risk-staging.onrender.com`, `supreme-risk-staging-api.onrender.com` | Not a production host. Do not treat as commercial production infrastructure. |
| Render MinIO service `supreme-risk-staging-minio` | S3-compatible evidence object storage | Evidence bytes, checksums, scan status metadata | UNKNOWN / TO BE CONFIRMED (same Render workspace) | IN USE (staging) | #12 persistence evidence; disk `minio-data-live` | Persistent disk attached; not AWS S3; production object storage not validated |
| Render Postgres (`supreme-risk-staging-pg` in DR docs) | Application database | Tenant business records | UNKNOWN / TO BE CONFIRMED | IN USE (staging) | `docs/BACKUP-RESTORE-CERTIFICATION.md` | Free Render Postgres noted as expiring 2026-10-12; **not acceptable for production** |
| GitHub | Source control and hosted CI | Source code; CI logs; not the customer tenant database | UNKNOWN / TO BE CONFIRMED (GitHub-hosted) | IN USE | #6 Hosted CI PASS | Not a customer data store |
| Stripe | Test-mode Checkout / Portal / webhooks when keys present | Billing identifiers, test payment metadata | UNKNOWN / TO BE CONFIRMED (Stripe) | CONFIGURED TEST-MODE / NOT LIVE | #2 PARTIAL; commercial production NO-GO | Live Stripe must not be implied. Live billing not authorized. |
| Email via Resend (SMTP `smtp.resend.com` and/or Resend HTTP API as configured) | Transactional mail (invites, MFA, notifications) | Email addresses, message metadata | UNKNOWN / TO BE CONFIRMED | CONFIGURED / DELIVERY UNCONFIRMED | `docs/PRIVATE-BETA-CERTIFICATION.md`; Viewer hosted session SKIP; invitation Queued ≠ Delivered | Provider identified as Resend when SMTP host is `smtp.resend.com`. Sending-domain verification and inbox receipt remain **UNKNOWN / TO BE CONFIRMED**. Do not claim reliable email delivery. SendGrid is an alternate code path; not listed as live unless keys are shown to be in use. |
| ClamAV (when connected) | Malware scan of uploads | File bytes during scan | UNKNOWN / TO BE CONFIRMED | CONNECTED on staging health when reported; otherwise fail-closed | #3 PASS | Scanner itself is not backed up. Not a customer data store after scan. |

## Not live subprocessors (do not list as current processors)

| Provider | Why it is not a live subprocessor | Status |
| --- | --- | --- |
| hCaptcha | Checkout bot resistance was not demonstrated as a live production control | NOT DEMONSTRATED — architecture/check only |
| OpenAI / other AI completion provider | Optional TPRM assistance is typically `NOT_CONFIGURED` | NOT a current subprocessor unless keys are proven live |
| Entra / Okta / Google | Customer IdP federation | ARCHITECTURE ONLY — LIVE VALIDATION DEFERRED (#21) |
| Slack / Jira | Notifications / tickets | LIVE VALIDATION DEFERRED (#22) |
| AWS S3 | Not the current staging evidence store | NOT IN USE for staging evidence (MinIO is) |
| Trust Center SaaS / SOC 2 / ISO tooling | None purchased | NOT IN USE — spend $0.00 |
| CDN / analytics products | None recorded as configured for this phase | NOT LISTED |

**Not listed:** invented CDN, analytics, or certification tooling.

## Reconciliation notes (Phase 1)

- Render, MinIO, Render Postgres, GitHub, Stripe test-mode, Resend (email), and ClamAV (when connected) are the current staging/private-testing set supported by program evidence.
- Email provider is **identified as Resend when so configured**, not a guessed mailbox vendor. Delivery remains unconfirmed.
- Data-location facts stay **UNKNOWN / TO BE CONFIRMED** except where a prior cutover doc already recorded Oregon for Render staging — that historical note is not re-asserted as freshly measured in Phase 1.
- Production DNS, production object storage, and live Stripe are **not** on this register as live customer processors.

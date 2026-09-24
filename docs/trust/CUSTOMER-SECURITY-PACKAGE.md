# Customer security package

**Audience:** enterprise diligence under NDA / design-partner review  
**Status:** USABLE DILIGENCE PACKAGE — not a certification, not a SOC 2 report, not an ISO certificate  
**Environment described:** hosted staging / private-testing unless a section says otherwise  
**Do not include:** secrets, internal IPs, exploit payloads, QA passwords, private endpoints, implementation-sensitive remediations  
**Owner:** Product Leadership / Security  
**Approver:** Product Leadership  
**Last reviewed:** 2026-09-23  
**Review by:** 2026-12-23

Commercial production remains **NO-GO**. #12 is **PASS — PRIVATE-TESTING RELEASE CANDIDATE** only.

---

## 1. Company / product overview

Supreme is a multi-tenant governance, risk, and compliance platform (TPRM plus shared GRC modules). Tenants record vendors, assessments, evidence metadata, risks, controls, findings, privacy objects, AI inventory, and decisions.

**Authoritative evidence:** punch list #1 PASS; `docs/SUPREME-MASTER-PUNCH-LIST.md`; public catalog remains honest about Roadmap items.

**Honesty:** This is not commercial GA. Founding-customer and GTM items (#35/#36) are NOT STARTED. Do not present synthetic cert tenants as customers.

## 2. Security architecture

Organization data is scoped to the authenticated tenant. Cross-tenant access is denied (typically 403 or anti-enumerating 404). Browser sessions use in-memory access tokens and an HttpOnly refresh cookie (`sr_refresh`) on hosted HTTPS.

**Authoritative evidence:** `docs/SECURITY-ARCHITECTURE.md`; `docs/SECURITY-MODEL.md`; claims C-01, C-05, C-06.

**Do not attach:** internal service diagrams that name private hosts, credentials, or unpublished endpoints.

## 3. Data flow

A tenant user or vendor submits data to the hosted API. The API scopes every read and write to the authenticated organization. Tenant business records persist in Render Postgres. Evidence bytes persist in S3-compatible MinIO. Optional transactional email goes through Resend when configured. Stripe test-mode may receive billing identifiers when test keys are present. ClamAV may receive file bytes during scan when connected.

**Authoritative evidence:** `docs/SECURITY-ARCHITECTURE.md`; `SUBPROCESSOR-REGISTER.md`; #3 / #12 Evidence.

**Honesty:** This describes **staging / private-testing**. Production object storage is not validated. Email delivery is unconfirmed. Live Stripe is not authorized. Do not publish secret values, private IPs, or unpublished endpoints.

## 4. Access control

Role-based access control is enforced on the server. Privileged actions require an authorized role. Viewer and vendor planes are isolated from requester IRA and GRC notes. Support access is customer-approved; there are no default credentials.

**Authoritative evidence:** #8 PASS; claim C-02.

**Limitation:** Live customer IdP federation is deferred (#21).

## 5. Authentication / MFA

Password authentication plus TOTP privileged-MFA architecture. Production configuration (`APP_ENVIRONMENT=production`) is required to enforce customer privileged MFA. Staging currently uses an audited grace so private-testing QA is not locked out. Staging login without MFA is **not** proof that production MFA is off.

**Authoritative evidence:** #8; 2026-09-22 MFA policy; claim C-10 (PARTIAL).

**Limitation:** Staging grace is not production proof. Live Entra / Okta / Google SSO is **SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED**.

## 6. Tenant isolation

Tenant isolation is enforced. Cross-tenant reads do not return another tenant’s records. Two-tenant hosted proof exists for the private-testing release candidate, including the 2026-09-22 rem/retest.

**Authoritative evidence:** #12 two-tenant hosted proof; 2026-09-22 rem; claim C-01.

## 7. Encryption

Hosted staging uses HTTPS in transit. Secrets and stored objects use the platform encryption path described in product security pages.

**Authoritative evidence:** TrustCenter / SecurityOverview; security model docs; claim C-05.

**Limitation:** Do not publish cipher-suite lists or key-location detail. At-rest KMS posture is not a certified claim. Production object storage is **not validated**.

## 8. Evidence security

Evidence bytes live in S3-compatible object storage (staging: MinIO with persistent disk). Downloads require malware status CLEAN. Pending, failed, or non-CLEAN evidence is not downloadable (fail-closed). Support cannot mark evidence CLEAN. There is no local-filesystem evidence fallback on the hosted staging evidence path used for #12.

**Authoritative evidence:** #3 PASS; #14 Shared Evidence; #12 Evidence; claim C-03.

**Limitation:** Production object storage is not validated. Do not imply AWS S3 unless that store is actually contracted.

## 9. Malware scanning

Uploads are scanned. Fail-closed if the scanner is absent or the result is not CLEAN. ClamAV is used when connected on staging.

**Authoritative evidence:** #3 PASS; `SUBPROCESSOR-REGISTER.md` ClamAV row.

**Limitation:** Scanner location is UNKNOWN / TO BE CONFIRMED. Scanner itself is not backed up as a data store.

## 10. Audit logging

Significant actions write tenant-scoped audit events. This is not a SIEM product.

**Authoritative evidence:** #8 / #12; claim C-04.

## 11. Secure development

GitHub-hosted CI runs typecheck, tests, Prisma validate, production build, public-build safety, and secret scan. This is not a certified SDLC audit.

**Authoritative evidence:** #6 PASS; questionnaire Q-18.

**Limitation:** Not a certified secure-development attestation. Do not claim ISO or SOC 2 SDLC certification.

## 12. Vulnerability management

Identified findings from 2026-09-22 security testing were remediated and two-tenant retested on staging.

**Authoritative evidence:** `docs/security/PENTEST-2026-09-22-REMEDIATION.md`; #6 PASS; claim C-09.

**Limitation:** No named external firm. No bug bounty. Not a certified vulnerability-management attestation.

## 13. Penetration-testing summary

**Date:** 2026-09-22  
**Environment:** hosted staging only  
**Performer:** not recorded as a named external audit firm. Do not invent one.  
**Scope:** application security on staging frontend and API; two-tenant isolation; public health disclosure; session cookies; webhook sink authentication; OIDC discovery request safety.  
**Not in scope:** production, Stripe provider abuse, Render shared infrastructure, real malware.

High-level categories remediated (evidence-supported): unsafe outbound URL fetch on identity discovery; public health information disclosure; generic 500 error leakage; refresh token no longer stored in `localStorage`; unauthenticated webhook-sink writes rejected.

This summary omits payloads, credentials, internal endpoints, QA accounts, and sensitive remediation detail.

**Authoritative evidence:** `PUBLIC-TRUST-CONTENT.md` pentest section; claim C-09. Claim C-22 (named firm) is NOT_SUPPORTED.

**Current status:** Remediation ACCEPTED FOR CURRENT STAGE as part of #12 private-testing certification. Not a commercial certification.

## 14. Incident response

Internal runbooks exist for detection, triage, containment, restore, and post-review. The operations console exists (#7).

**Authoritative evidence:** `docs/DISASTER-RECOVERY-RUNBOOK.md`; #7.

**Limitation:** No contractual customer-notification hours. Do not publish an incident SLA.

## 15. Backup / DR

Isolated two-tenant PostgreSQL + evidence-object restore was certified (#5 PASS).

**Authoritative evidence:** `docs/BACKUP-RESTORE-CERTIFICATION.md`; `docs/DISASTER-RECOVERY-RUNBOOK.md`; claim C-07.

**Limitation:** RTO/RPO are **not contractually defined**. Not multi-region HA. Not immutable backups. Render free Postgres noted as expiring 2026-10-12 is **not acceptable for production**. Claim C-19 is NOT_SUPPORTED.

## 16. Subprocessors

Current **staging / private-testing** processors are listed in `SUBPROCESSOR-REGISTER.md`. Production roster is not contracted.

**Authoritative evidence:** `SUBPROCESSOR-REGISTER.md`.

**Limitation:** LEGAL REVIEW REQUIRED before a customer-facing production list. Locations flagged UNKNOWN / TO BE CONFIRMED must stay that way. Architecture-only providers (Entra/Okta/Google, Slack/Jira) are not live subprocessors.

## 17. Privacy position

The product can record ROPA, rights, transfers, and retention tasks (#17 PASS). Public `/privacy` is a draft pending legal review. No binding DPA is approved.

**Authoritative evidence:** #17; `LEGAL-DOCUMENT-STATUS.md`; claim C-20.

**Limitation:** LEGAL REVIEW REQUIRED. Supreme does not auto-delete customer data from connected external systems.

## 18. Assurance position

| Strength | Supreme today |
| --- | --- |
| IMPLEMENTED CONTROL | Tenant isolation, RBAC, fail-closed evidence, audit, rate limits |
| TESTED CONTROL | Two-tenant isolation; #5 isolated restore; #12 Evidence |
| PENETRATION TESTED | 2026-09-22 findings remediated and retested on staging; no named external firm |
| CERTIFIED / ATTESTED | **None.** Not SOC 2, ISO 27001, FedRAMP, HIPAA, or PCI |

#19 Supreme Intelligence is **PASS — Product Leadership accepted 2026-09-14**. That is acceptance of a product module, not a certification.

**Authoritative evidence:** `ASSURANCE-CLAIMS-REGISTER.md`; punch list #19.

## 19. Known limitations

- #12 is private-testing RC only; commercial production NO-GO
- Production object storage not validated
- Live billing not authorized (Stripe test-mode only)
- Production DNS untouched
- SOC 2 / ISO not certified
- Live IdP federation deferred (#21)
- Live Slack / Jira validation deferred (#22)
- #23 Insurance Edition ACTIVE / NOT PASS (frozen `0f42cba`; five gaps not hosted-proven)
- Security contact NOT CONFIGURED
- Support contact USER ACTION REQUIRED
- Email delivery degraded / unconfirmed (Queued ≠ Delivered)
- `/status` NOT_CONFIGURED — no uptime percentage
- Public legal pages are drafts
- #24 and #40 NOT STARTED

## 20. Contact-readiness status

| Contact | Status |
| --- | --- |
| Security | NOT CONFIGURED — USER ACTION REQUIRED |
| Support | NOT CONFIGURED — USER ACTION REQUIRED |
| Status page | NOT_CONFIGURED / NOT MONITORED |

See `CONTACT-READINESS.md`. Do not invent addresses.

---

Do not ship this pack as a “SOC 2 report” or “ISO certificate.”

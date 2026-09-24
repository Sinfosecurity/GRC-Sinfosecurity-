# Security questionnaire answer bank

**Use:** internal reuse for enterprise questionnaires  
**Do not:** copy SIG/CAIQ proprietary question text  
**Last reviewed:** 2026-09-23  
**Review by:** 2026-12-23  
**Owner:** Security / Product Leadership  

Every row: status, answer, evidence, owner, last reviewed, limitations.

| Category | Status | Answer | Evidence | Owner | Last reviewed | Limitations |
| --- | --- | --- | --- | --- | --- | --- |
| Governance | PARTIAL | Supreme records risks, controls, evidence, findings, and decisions. A Trust Program Phase 0 pack now maps those facts for buyers. | #13–#16; this folder | PL | 2026-09-23 | No SOC 2 / ISO management-system certification |
| Access Control | SUPPORTED | Server-side RBAC; tenant isolation; support access is customer-approved; no default credentials | #8 PASS | Security | 2026-09-23 | Live customer IdP federation deferred (#21) |
| Authentication | PARTIAL | Password + TOTP privileged MFA architecture. Production config requires privileged MFA. Staging uses audited grace | #8; 2026-09-22 MFA policy | Security | 2026-09-23 | Staging grace is not production proof |
| Encryption | PARTIAL | HTTPS in transit on staging. Secrets and stored objects use the platform encryption path described in product security pages | TrustCenter / SecurityOverview; security model docs | Security | 2026-09-23 | Do not publish cipher-suite or key-location detail. At-rest KMS posture is not a certified claim |
| Vulnerability Management | PARTIAL | 2026-09-22 findings remediated and retested. Hosted CI includes tests and secret scan | pentest rem; #6 | Security | 2026-09-23 | No named external firm; no bug bounty |
| Logging | SUPPORTED | Tenant-scoped audit events for significant actions | #8 / #12 | Security | 2026-09-23 | Not a SIEM product |
| Incident Response | PARTIAL | Internal detection/triage/containment/restore/post-review runbooks exist | DR runbook; #7 console | Operations | 2026-09-23 | No contractual notification hours |
| Business Continuity | PARTIAL | Isolated two-tenant DB + object restore certified | #5 PASS | Operations | 2026-09-23 | RTO/RPO not contractually defined; not multi-region HA; not immutable backups |
| Third Parties | PARTIAL | Staging uses Render, GitHub, MinIO, test Stripe, email, ClamAV as recorded | `SUBPROCESSOR-REGISTER.md` | Legal | 2026-09-23 | Production roster not contracted |
| Data Protection | PARTIAL | Tenant scoping; fail-closed evidence; privacy operations module exists | #3 #14 #17 | Privacy | 2026-09-23 | No approved DPA |
| Secure Development | PARTIAL | GitHub-hosted CI: typecheck, tests, Prisma validate, production build, public-build safety, secret scan | #6 PASS | Engineering | 2026-09-23 | Not a certified SDLC audit |
| AI | PARTIAL | AI Governance inventory is human-authoritative. Optional TPRM AI provider is often NOT_CONFIGURED | #18 PASS | AI | 2026-09-23 | No runtime guardrail product; no auto-approval |
| Privacy | PARTIAL | Product can record ROPA, rights, transfers, retention tasks. Public privacy page is a draft | #17; LegalDraft | Legal | 2026-09-23 | LEGAL REVIEW REQUIRED |

If a questionnaire asks “Are you SOC 2 certified?” the answer is **No.**

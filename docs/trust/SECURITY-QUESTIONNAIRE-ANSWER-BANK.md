# Security questionnaire answer bank

**Use:** internal reuse for enterprise questionnaires  
**Do not:** copy SIG, CAIQ, or other copyrighted question text  
**Do not:** claim SOC 2, ISO 27001, FedRAMP, HIPAA, or PCI certification  
**Last reviewed:** 2026-09-23  
**Review by:** 2026-12-23  
**Owner:** Security / Product Leadership  
**Approver:** Product Leadership  

Statuses match the Assurance Claims Register: SUPPORTED | PARTIAL | DEFERRED | NOT_SUPPORTED | LEGAL_REVIEW_REQUIRED.

If a questionnaire asks whether Supreme is SOC 2 or ISO 27001 certified, the answer is **No.**

---

### Q-01 — Governance records

| Field | Value |
| --- | --- |
| domain | Governance |
| question theme | Whether the platform records risks, controls, evidence, findings, and decisions |
| answer | Yes. Supreme records those objects in-tenant. A Trust Program pack maps the facts for buyers. This is not a certified management system. |
| status | PARTIAL |
| evidence | #13–#16 PASS; `docs/trust/` |
| owner | Product Leadership |
| lastReviewed | 2026-09-23 |
| limitations | No SOC 2 / ISO management-system certification |
| customer-safe wording | Supreme records risks, controls, evidence, findings, and decisions. Supreme is not SOC 2 or ISO 27001 certified. |

### Q-02 — Access control / RBAC

| Field | Value |
| --- | --- |
| domain | Access control |
| question theme | Whether access is role-based and enforced server-side |
| answer | Yes. RBAC is enforced on the server. Viewer and vendor planes are isolated from requester notes. |
| status | SUPPORTED |
| evidence | #8 PASS; claim C-02 |
| owner | Security |
| lastReviewed | 2026-09-23 |
| limitations | Live customer IdP federation deferred (#21) |
| customer-safe wording | Role-based access control is enforced on the server. Live SSO federation is supported in architecture and not live-validated. |

### Q-03 — Default / shared credentials

| Field | Value |
| --- | --- |
| domain | Access control |
| question theme | Default passwords or shared admin credentials |
| answer | No default credentials. Support access is customer-approved. |
| status | SUPPORTED |
| evidence | #8 PASS |
| owner | Security |
| lastReviewed | 2026-09-23 |
| limitations | None material for this theme |
| customer-safe wording | Supreme does not ship default credentials. Support access is customer-approved. |

### Q-04 — Authentication

| Field | Value |
| --- | --- |
| domain | Authentication |
| question theme | Password and MFA |
| answer | Password plus TOTP privileged-MFA architecture. Production config requires privileged MFA. Staging uses an audited grace. |
| status | PARTIAL |
| evidence | #8; 2026-09-22 MFA policy; claim C-10 |
| owner | Security |
| lastReviewed | 2026-09-23 |
| limitations | Staging grace is not production proof |
| customer-safe wording | Privileged MFA is required in production configuration. Staging currently uses an audited grace for private testing. |

### Q-05 — SSO / IdP federation

| Field | Value |
| --- | --- |
| domain | Authentication |
| question theme | Live Entra / Okta / Google SSO |
| answer | Architecture exists. Live validation is deferred. |
| status | DEFERRED |
| evidence | #21; claim C-11 |
| owner | Identity |
| lastReviewed | 2026-09-23 |
| limitations | Do not say live SSO is in production use |
| customer-safe wording | SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED. |

### Q-06 — Tenant isolation

| Field | Value |
| --- | --- |
| domain | Isolation |
| question theme | Whether one customer can read another customer’s data |
| answer | No. Tenant isolation is enforced. Cross-tenant reads do not return another tenant’s records. |
| status | SUPPORTED |
| evidence | #12 two-tenant hosted proof; 2026-09-22 rem; claim C-01 |
| owner | Security |
| lastReviewed | 2026-09-23 |
| limitations | Proof is private-testing / staging, not commercial production |
| customer-safe wording | Tenant isolation is enforced. Cross-tenant reads do not return another tenant’s records. |

### Q-07 — Encryption in transit

| Field | Value |
| --- | --- |
| domain | Encryption |
| question theme | HTTPS / TLS |
| answer | Hosted staging uses HTTPS. TLS terminates at the host. |
| status | SUPPORTED |
| evidence | staging hosts; claim C-05 |
| owner | Security |
| lastReviewed | 2026-09-23 |
| limitations | Do not publish cipher suites. This is staging, not a production certificate claim. |
| customer-safe wording | Hosted staging uses HTTPS. |

### Q-08 — Encryption at rest

| Field | Value |
| --- | --- |
| domain | Encryption |
| question theme | Data at rest / KMS |
| answer | Stored objects and secrets use the platform encryption path described in product security pages. |
| status | PARTIAL |
| evidence | security model docs; TrustCenter / SecurityOverview |
| owner | Security |
| lastReviewed | 2026-09-23 |
| limitations | Not a certified KMS / FIPS claim. Do not publish key-location detail. Production object storage not validated. |
| customer-safe wording | Application secrets and stored objects use the platform encryption path. This is not a certified encryption attestation. |

### Q-09 — Evidence / file security

| Field | Value |
| --- | --- |
| domain | Evidence |
| question theme | How uploaded files are stored and downloaded |
| answer | Staging uses S3-compatible MinIO with a persistent disk. Download requires CLEAN malware status. Fail-closed otherwise. |
| status | SUPPORTED |
| evidence | #3 PASS; #12 Evidence; claim C-03 |
| owner | Security |
| lastReviewed | 2026-09-23 |
| limitations | Production object storage not validated. Not AWS S3 unless contracted. |
| customer-safe wording | Evidence downloads require a CLEAN malware scan. Non-CLEAN files are not downloadable. |

### Q-10 — Malware scanning

| Field | Value |
| --- | --- |
| domain | Malware |
| question theme | Whether uploads are scanned |
| answer | Yes, when ClamAV is connected. If the scanner is absent or the result is not CLEAN, download is denied. |
| status | SUPPORTED |
| evidence | #3 PASS; subprocessor register |
| owner | Security |
| lastReviewed | 2026-09-23 |
| limitations | Scanner location TO BE CONFIRMED. Fail-closed if disconnected. |
| customer-safe wording | Uploads are malware-scanned. Download is fail-closed unless the scan is CLEAN. |

### Q-11 — Logging and audit

| Field | Value |
| --- | --- |
| domain | Logging |
| question theme | Audit trail of significant actions |
| answer | Significant actions write tenant-scoped audit events. |
| status | SUPPORTED |
| evidence | #8 / #12; claim C-04 |
| owner | Security |
| lastReviewed | 2026-09-23 |
| limitations | Not a SIEM product; not a multi-year log-retention SLA |
| customer-safe wording | Significant actions are audited in-tenant. |

### Q-12 — Vulnerability management

| Field | Value |
| --- | --- |
| domain | Vulnerability management |
| question theme | How vulnerabilities are found and closed |
| answer | 2026-09-22 identified findings were remediated and two-tenant retested. Hosted CI includes tests and secret scan. |
| status | PARTIAL |
| evidence | pentest rem docs; #6 PASS; claim C-09 |
| owner | Security |
| lastReviewed | 2026-09-23 |
| limitations | No named external firm; no bug bounty; not a certified VM program |
| customer-safe wording | Identified 2026-09-22 security findings were remediated and retested on staging. Supreme is not running a public bug bounty. |

### Q-13 — Penetration test

| Field | Value |
| --- | --- |
| domain | Security testing |
| question theme | Independent / annual pentest |
| answer | Security testing on 2026-09-22 on hosted staging. Not recorded as a named external firm. Customer-safe summary only. |
| status | PARTIAL |
| evidence | `PUBLIC-TRUST-CONTENT.md`; claim C-09; C-22 NOT_SUPPORTED |
| owner | Security |
| lastReviewed | 2026-09-23 |
| limitations | No firm attribution; no production pentest; omit exploits |
| customer-safe wording | Application security testing was performed on hosted staging on 2026-09-22. Findings in that exercise were remediated and retested. This is not a certification. |

### Q-14 — Incident response

| Field | Value |
| --- | --- |
| domain | Incident response |
| question theme | IR plan and customer notification |
| answer | Internal detection, triage, containment, restore, and post-review runbooks exist. |
| status | PARTIAL |
| evidence | DR runbook; #7 console |
| owner | Operations |
| lastReviewed | 2026-09-23 |
| limitations | No contractual notification hours |
| customer-safe wording | Internal incident-response runbooks exist. Supreme has not published a contractual notification-hour SLA. |

### Q-15 — Business continuity / backup

| Field | Value |
| --- | --- |
| domain | Business continuity |
| question theme | Backup and restore |
| answer | Isolated two-tenant database and object restore was certified. |
| status | PARTIAL |
| evidence | #5 PASS; claim C-07 |
| owner | Operations |
| lastReviewed | 2026-09-23 |
| limitations | RTO/RPO not contractual; not multi-region HA; not immutable backups |
| customer-safe wording | Isolated restore of tenant database and evidence objects has been tested. RTO and RPO are not contractually defined. |

### Q-16 — Subprocessors

| Field | Value |
| --- | --- |
| domain | Third parties |
| question theme | Who processes customer data |
| answer | Current staging processors are listed in the subprocessor register. Production roster is not contracted. |
| status | PARTIAL |
| evidence | `SUBPROCESSOR-REGISTER.md` |
| owner | Legal |
| lastReviewed | 2026-09-23 |
| limitations | Locations TO BE CONFIRMED where unknown; architecture-only tools are not live subprocessors |
| customer-safe wording | Supreme maintains a staging / private-testing processor register. A production customer subprocessor notice requires legal review. |

### Q-17 — Data protection / DPA

| Field | Value |
| --- | --- |
| domain | Privacy |
| question theme | DPA and privacy notice |
| answer | Public privacy page is a draft. No approved DPA. |
| status | LEGAL_REVIEW_REQUIRED |
| evidence | `LEGAL-DOCUMENT-STATUS.md`; claim C-20 |
| owner | Legal / Privacy |
| lastReviewed | 2026-09-23 |
| limitations | Do not treat drafts as binding |
| customer-safe wording | Privacy Notice and DPA are not counsel-approved. Product privacy operations exist for tenant-recorded ROPA, rights, and retention tasks. |

### Q-18 — Secure development / CI

| Field | Value |
| --- | --- |
| domain | Secure development |
| question theme | How code is tested before release |
| answer | GitHub-hosted CI: typecheck, tests, Prisma validate, production build, public-build safety, secret scan. |
| status | PARTIAL |
| evidence | #6 PASS |
| owner | Engineering |
| lastReviewed | 2026-09-23 |
| limitations | Not a certified SDLC audit |
| customer-safe wording | Changes run through hosted CI including tests and secret scanning. This is not a certified secure-development attestation. |

### Q-19 — AI use

| Field | Value |
| --- | --- |
| domain | AI |
| question theme | Whether AI auto-approves or invents facts |
| answer | AI Governance inventory is human-authoritative. Optional TPRM AI provider is typically NOT_CONFIGURED. Intelligence interprets recorded facts only. |
| status | PARTIAL |
| evidence | #18 PASS; #19 PASS (product module); claim C-21 |
| owner | AI / Product Leadership |
| lastReviewed | 2026-09-23 |
| limitations | No runtime guardrail product; no auto-approval; #19 PASS is not a certification |
| customer-safe wording | Humans remain authoritative for AI inventory and approvals. Supreme Intelligence interprets recorded Supreme facts and does not invent monitoring events. Optional AI assistance is often not configured. |

### Q-20 — Integrations (Slack / Jira / ratings)

| Field | Value |
| --- | --- |
| domain | Integrations |
| question theme | Live Slack, Jira, or external ratings |
| answer | Architecture exists. Live provider validation is deferred. |
| status | DEFERRED |
| evidence | #22; claim C-12 |
| owner | Integrations |
| lastReviewed | 2026-09-23 |
| limitations | Do not say live Slack/Jira are validated |
| customer-safe wording | SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED. |

### Q-21 — Production / commercial readiness

| Field | Value |
| --- | --- |
| domain | Commercial |
| question theme | Whether the product is production-ready or generally available |
| answer | No. #12 is a private-testing release candidate. Commercial production is NO-GO. |
| status | NOT_SUPPORTED |
| evidence | #11 NO-GO; #12 PASS private-testing only; claim C-16 |
| owner | Program |
| lastReviewed | 2026-09-23 |
| limitations | Do not imply GA, live billing, or production DNS |
| customer-safe wording | Supreme’s current accepted release is a private-testing release candidate. Commercial production is not authorized. |

### Q-22 — Certifications

| Field | Value |
| --- | --- |
| domain | Assurance |
| question theme | SOC 2, ISO 27001, FedRAMP, HIPAA, PCI |
| answer | No. None of those certifications or attestations exist. |
| status | NOT_SUPPORTED |
| evidence | claims C-13, C-14, C-15 |
| owner | Trust |
| lastReviewed | 2026-09-23 |
| limitations | Never answer “compliant with SOC 2” as a substitute for certified |
| customer-safe wording | Supreme is not SOC 2, ISO 27001, FedRAMP, HIPAA, or PCI certified. |

### Q-23 — Status page / uptime

| Field | Value |
| --- | --- |
| domain | Availability |
| question theme | Public status page and uptime percentage |
| answer | `/status` is NOT_CONFIGURED. No uptime percentage is published. |
| status | NOT_SUPPORTED |
| evidence | `PublicStatus.tsx`; claim C-18 |
| owner | Operations |
| lastReviewed | 2026-09-23 |
| limitations | Do not invent 99.x figures |
| customer-safe wording | A live public status page is not configured. Supreme does not publish an uptime percentage. |

### Q-24 — Security / support contact

| Field | Value |
| --- | --- |
| domain | Contact |
| question theme | How to report security issues or get support |
| answer | Neither a public security mailbox nor a confirmed public support mailbox is configured. |
| status | NOT_SUPPORTED |
| evidence | `CONTACT-READINESS.md`; claim C-23 |
| owner | Security / Operations |
| lastReviewed | 2026-09-23 |
| limitations | Do not invent `security@` or promote unconfirmed `support@` |
| customer-safe wording | A public security reporting address is not configured. A public support mailbox is not confirmed. |

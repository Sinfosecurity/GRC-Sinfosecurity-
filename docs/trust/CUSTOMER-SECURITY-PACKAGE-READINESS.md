# Customer security package — release checklist

**Source:** `CUSTOMER-SECURITY-PACKAGE.md`  
**Rule:** The pack may be customer-shareable under NDA only if BLOCKED sections are removed or honestly labeled.  
**lastReviewed:** 2026-09-23  
**reviewBy:** 2026-12-23  
**Owner:** Product Leadership / Security  
**Approver:** Product Leadership

| Class | Meaning |
| --- | --- |
| READY | May be shared with environment labels and no extra blocker |
| LIMITED | Shareable only with the stated limitation left visible |
| BLOCKED | Remove or label “not available / not configured / legal review required” |

| Section | Class | Why |
| --- | --- | --- |
| Security Overview | READY | STAGING / PRIVATE-TESTING; no certification language |
| Architecture | LIMITED | Customer-safe only; no secrets, private IPs, or unpublished endpoints |
| Tenant Isolation | READY | C-01 SUPPORTED; label environment |
| RBAC | READY | C-02 SUPPORTED |
| MFA | LIMITED | Production enforcement is PRODUCTION CONFIGURATION; staging grace disclosed. Do not say MFA is enforced on the current host for all users |
| Encryption | LIMITED | Staging HTTPS READY; at-rest / production storage LIMITED |
| Evidence Security | READY | Fail-closed CLEAN; production object storage called out as unvalidated |
| Malware | READY | Fail-closed; ClamAV when connected |
| Audit | READY | Tenant-scoped events; not a SIEM |
| Vulnerability Management | LIMITED | 2026-09-22 rem + CI; not a certified VM program |
| Pentest | READY | Use `PENTEST-PUBLIC-SUMMARY.md` only |
| Incident Response | LIMITED | Runbooks exist; no notification-hour SLA — BLOCKED if rewritten as a contractual commitment |
| Backup / DR | LIMITED | Isolated restore tested; production backup / RTO / RPO BLOCKED as contractual claims |
| Subprocessors | LIMITED | Staging register only. Production list BLOCKED |
| Privacy | BLOCKED | LEGAL_REVIEW_REQUIRED — do not attach drafts as approved notices |
| Assurance | READY | States IMPLEMENTED / TESTED / PENETRATION TESTED / none CERTIFIED. SOC 2/ISO are No |
| Contacts | BLOCKED | Security and support NOT CONFIGURED — label honestly or omit addresses |

**Share decision:** NDA diligence pack is usable if Privacy is labeled draft/legal-review, Contacts are labeled not configured, and Subprocessors are labeled staging / private-testing. It is **not** a SOC 2 report and **not** authorized for public website publication in this phase.

# Customer diligence bundle (docs-only index)

**Audience:** NDA / design-partner review  
**Status:** INDEX — not a SOC 2 report, not an ISO certificate, not public-site copy  
**Environment:** STAGING / PRIVATE-TESTING  
**lastReviewed:** 2026-09-23  
**reviewBy:** 2026-12-23

Privacy and legal drafts must **not** be presented as approved.  
Contacts must say **NOT CONFIGURED**.

| Section | Source | Share class |
| --- | --- | --- |
| Security Overview | `PUBLICATION-CANDIDATE.md` `/security` proposed copy | READY |
| Architecture | `CUSTOMER-SECURITY-PACKAGE.md` §2–3 (no secrets) | LIMITED |
| Tenant Isolation | C-01; package §6 | READY |
| RBAC | C-02; package §4 | READY |
| MFA limitation | C-10 PARTIAL — PRODUCTION CONFIGURATION requires privileged MFA; staging uses an audited grace | LIMITED |
| Encryption limitation | C-05 READY (staging HTTPS); at-rest / production storage LIMITED | LIMITED |
| Evidence Security | C-03; package §8 | READY |
| Malware | C-03; ClamAV when connected | READY |
| Audit | C-04 | READY |
| Secure Development | #6 PASS; Q-18 | LIMITED |
| Vulnerability Management | C-09; #6 | LIMITED |
| Pentest Summary | `PENTEST-PUBLIC-SUMMARY.md` | READY |
| Incident Response | runbooks exist; no notification-hour SLA | LIMITED |
| Backup/DR | C-07 tested restore; no contractual RTO/RPO | LIMITED |
| Staging Subprocessors | `SUBPROCESSOR-PUBLICATION-READINESS.md` staging list only | LIMITED |
| Assurance Position | no CERTIFIED / ATTESTED claims | READY |
| Known Limitations | private-testing RC; commercial NO-GO; #21/#22 deferred; #23 not PASS; contacts NOT CONFIGURED | READY |

**Do not attach as approved:** Privacy Notice, Terms, DPA, Subprocessor Notice, Security Addendum, AUP, Cookie Notice, VDP.

**Contacts:** SECURITY CONTACT NOT CONFIGURED. SUPPORT CONTACT NOT CONFIGURED.

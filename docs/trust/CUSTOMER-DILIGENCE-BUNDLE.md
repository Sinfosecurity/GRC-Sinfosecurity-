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

**Excluded or clearly marked — not approved / not configured / not production:**

| Item | Mark |
| --- | --- |
| Privacy legal drafts (Notice, DPA, Cookie, Terms, AUP, VDP, Security Addendum, Subprocessor Notice) | EXCLUDE as approved; LEGAL REVIEW REQUIRED |
| Unconfigured contacts | MARK: SECURITY CONTACT NOT CONFIGURED. SUPPORT CONTACT NOT CONFIGURED. |
| Production-only claims | EXCLUDE (MFA proof, object storage, RTO/RPO, uptime, live Stripe, production roster) |
| Staging subprocessors | LIMITED — not the final production notice |

## Questionnaire release set

Internal customer-response set = READY + READY_WITH_LIMITATION only.

**READY:** Q-02, Q-03, Q-06, Q-07, Q-09, Q-10, Q-11, Q-21 as No, Q-22 as No, Q-23 as No, Q-24 as not configured.

**READY_WITH_LIMITATION:** Q-01, Q-04, Q-05 deferred sentence, Q-08, Q-12, Q-13, Q-14, Q-15, Q-16 staging register only, Q-18, Q-19, Q-20 deferred sentence.

**Excluded:** Q-17 (LEGAL_REVIEW_REQUIRED). Any live-SSO / live-Slack / live-ratings “yes.”

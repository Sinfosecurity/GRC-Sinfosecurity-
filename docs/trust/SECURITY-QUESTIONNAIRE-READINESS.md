# Security questionnaire readiness

**Source:** `SECURITY-QUESTIONNAIRE-ANSWER-BANK.md`  
**lastReviewed:** 2026-09-23  
**reviewBy:** 2026-12-23  
**Owner:** Security / Product Leadership  
**Rule:** No SIG/CAIQ copied text. No SOC 2 / ISO / FedRAMP / HIPAA / PCI certification claims.

| Class | Meaning |
| --- | --- |
| READY | SUPPORTED, customer-safe, may be sent under NDA without extra caveats beyond environment labels |
| READY_WITH_LIMITATION | Usable if the limitation is kept in the answer |
| LEGAL_REVIEW_REQUIRED | Legal document or binding conclusion |
| PRODUCTION_VALIDATION_REQUIRED | Would over-claim unless production/live proof exists |

| ID | Domain | Class | Limitation to keep |
| --- | --- | --- | --- |
| Q-01 | Governance records | READY_WITH_LIMITATION | Not a certified management system |
| Q-02 | RBAC | READY | Live SSO is a different question |
| Q-03 | Default credentials | READY | — |
| Q-04 | Authentication / MFA | READY_WITH_LIMITATION | Staging grace; production enforcement is configuration, not current-host proof |
| Q-05 | SSO / IdP | PRODUCTION_VALIDATION_REQUIRED as live; READY_WITH_LIMITATION as “SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED” |
| Q-06 | Tenant isolation | READY | Label STAGING / PRIVATE-TESTING |
| Q-07 | Encryption in transit | READY | Say hosted staging HTTPS |
| Q-08 | Encryption at rest | READY_WITH_LIMITATION | Not a certified KMS/FIPS claim; production object storage unvalidated |
| Q-09 | Evidence / file security | READY | Staging MinIO; production storage unvalidated |
| Q-10 | Malware scanning | READY | Fail-closed if scanner absent |
| Q-11 | Audit logging | READY | Not a SIEM; no retention SLA |
| Q-12 | Vulnerability management | READY_WITH_LIMITATION | No named firm; no bounty |
| Q-13 | Pentest | READY_WITH_LIMITATION | Use `PENTEST-PUBLIC-SUMMARY.md` only |
| Q-14 | Incident response | READY_WITH_LIMITATION | No contractual notification hours |
| Q-15 | Backup / DR | READY_WITH_LIMITATION | Isolated restore tested; RTO/RPO not contractual |
| Q-16 | Subprocessors | LEGAL_REVIEW_REQUIRED for a customer notice; READY_WITH_LIMITATION for “staging register exists” |
| Q-17 | DPA / privacy notice | LEGAL_REVIEW_REQUIRED | Drafts are not binding |
| Q-18 | Secure development / CI | READY_WITH_LIMITATION | Not a certified SDLC audit |
| Q-19 | AI | READY_WITH_LIMITATION | #19 is an accepted product module, not certified AI intelligence |
| Q-20 | Slack / Jira / ratings | PRODUCTION_VALIDATION_REQUIRED as live; READY_WITH_LIMITATION as LIVE VALIDATION DEFERRED |
| Q-21 | Production / GA | DO_NOT_PUBLISH as yes; READY as **No — private-testing RC, commercial NO-GO** |
| Q-22 | Certifications | READY as **No** | Supreme is not SOC 2, ISO 27001, FedRAMP, HIPAA, or PCI certified |
| Q-23 | Status / uptime | READY as **No live status page; no uptime %** | `/status` NOT_CONFIGURED / NOT MONITORED |
| Q-24 | Security / support contact | CONTACT path: treat as READY as **not configured** | Do not invent addresses |

Q-21 is classified READY only for the honest **No**. A “yes, production-ready” answer is DO_NOT_PUBLISH / PRODUCTION_VALIDATION_REQUIRED.

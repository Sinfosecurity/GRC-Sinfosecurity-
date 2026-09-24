# Customer security package (outline)

**Audience:** enterprise diligence under NDA / design-partner review  
**Do not include:** secrets, internal IPs, exploit details, QA passwords, private endpoints, implementation-sensitive payloads  
**Status:** OUTLINE — assemble from the files below when a buyer is authorized  
**Owner:** Product Leadership / Security  
**Review by:** 2026-12-23

| Tab | Source | Public? |
| --- | --- | --- |
| Security Overview | `PUBLIC-TRUST-CONTENT.md` | after PL approval |
| Architecture Summary | `docs/SECURITY-ARCHITECTURE.md` + `docs/SECURITY-MODEL.md` (redact internals) | private pack |
| Data Flow Summary | customer submits data → API (tenant-scoped) → PostgreSQL + MinIO; email if configured; Stripe test-mode if configured | private pack |
| Subprocessor Register | `SUBPROCESSOR-REGISTER.md` | legal review first |
| Backup / DR Summary | #5 certification + runbook customer-safe extract | no production RTO/RPO |
| Incident Response Summary | runbook customer-safe extract; no notification-hour SLA | private pack |
| Pentest Summary | `PUBLIC-TRUST-CONTENT.md` pentest section only | customer-safe |
| Access Control / MFA Summary | #8 + privileged MFA policy; staging grace disclosed | private pack |
| Evidence Security Summary | #3 / #14 / #12 | after PL approval |
| Privacy Position | `PUBLIC-TRUST-CONTENT.md` + legal drafts | LEGAL REVIEW REQUIRED |
| Certification / Assurance Position | `ASSURANCE-CLAIMS-REGISTER.md` SUPPORTED + NOT SUPPORTED list | after PL approval |
| Known Limitations | live SSO deferred; live Slack/Jira deferred; email degraded; no SOC 2/ISO; production NO-GO; #23 not PASS; security mailbox not configured | always include |

Do not ship this pack as “SOC 2 report” or “ISO certificate.”

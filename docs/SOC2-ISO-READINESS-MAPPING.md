# SOC 2 / ISO 27001 internal readiness mapping

**Classification:** INTERNAL READINESS MAPPING
**SOC 2 certified:** NO
**ISO/IEC 27001 certified:** NO
**Penetration test:** NOT PERFORMED

This is not an audit report and not a certification claim.

| Theme | Implemented today | Gap |
|---|---|---|
| Access control | Tenant RBAC, platform RBAC, plane-separated sessions, MFA for platform roles | Customer MFA, SSO/SCIM |
| Change management | GitHub-hosted Supreme CI on the exact SHA; no production deploy workflow | Formal CAB / production change tickets |
| Logging | Tenant and platform audit events; secret scrubbing | Long-term immutable log store / SIEM |
| Malware | Fail-closed ClamAV; CLEAN never invented | Production scanner SLA |
| Backup | Isolated two-tenant restore certified (#5) | Scheduled off-site immutable production backups |
| Recovery | DR runbook exists | Production RTO/RPO |
| CI | Hosted quality job required | Branch protection still a later decision |
| MFA | Platform TOTP + recovery + step-up | Customer MFA |
| Tenant isolation | Per-query `organizationId`; IDOR tests | Legacy in-memory APIs now unmounted |
| Incident management | Platform incidents + customer comms flags | Formal CSIRT / customer notification SLA |
| Support access | Customer approval, READ_ONLY default, revoke/expiry | Broader tenant-data tools still snapshot-scoped |
| Secure SDLC | CI secret scan, dependency review, this #9 review | Recurring external pentest / bug bounty |

Legal pages remain draft until counsel approves them.

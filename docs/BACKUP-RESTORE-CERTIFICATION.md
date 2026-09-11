# Backup / restore certification

**Source:** isolated `supreme_risk_staging` on `127.0.0.1:55434`
**Restore target:** isolated `supreme_risk_restore` on the same host
**Production:** not contacted
**Starting SHA:** `e03295f42a8d5c9fc7458b38b6da1701e5b2079f`

## Procedure

1. `pg_dump -Fc` of the staging database.
2. `CREATE DATABASE supreme_risk_restore`.
3. `pg_restore --no-owner --no-acl` into the restore database.
4. Compare table counts.

Local dump files live under `backups/staging/` and are gitignored.

## Seed-only rehearsal

Ran at 2026-09-11T22:31:58Z.

| Table | Staging | Restore |
| --- | --- | --- |
| User | 2 | 2 |
| Organization | 1 | 1 |
| Vendor | 2 | 2 |
| VendorAssessment | 0 | 0 |
| RiskDecisionBrief | 0 | 0 |
| VendorRiskHistory | 0 | 0 |
| AuditEvent | 0 | 0 |
| StoredObject | 0 | 0 |
| EvidenceLink | 0 | 0 |

## Post-E2E restore

Backup file: `backups/staging/staging-post-e2e-20260911T223816Z.dump`
Ran at 2026-09-11T22:38:16Z.

| Table | Staging | Restore |
| --- | --- | --- |
| User | 4 | 4 |
| Organization | 3 | 3 |
| Vendor | 4 | 4 |
| VendorAssessment | 2 | 2 |
| RiskDecisionBrief | 2 | 2 |
| VendorRiskHistory | 2 | 2 |
| AuditEvent | 71 | 71 |
| StoredObject | 3 | 3 |
| EvidenceLink | 3 | 3 |
| VendorIssue | 2 | 2 |

Users, vendors, assessments, evidence metadata, findings, decision briefs, score history, and audit logs matched.

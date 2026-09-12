# Hosted staging migration evidence

**Branch:** `supreme-risk-transformation`  
**Host:** Render project `Supreme Risk` / environment `Staging`  
**Database:** `supreme-risk-staging-pg` / `supreme_risk_staging`  
**Mechanism:** baseline SQL from `prisma/baseline/pre-transformation.prisma` via `prisma migrate diff --from-empty`, then `prisma migrate deploy`.  
**Not used:** `prisma db push`

## Applied chain

1. `prisma migrate diff --from-empty --to-schema-datamodel prisma/baseline/pre-transformation.prisma --script`
2. `prisma db execute` of that baseline SQL against the hosted database
3. `prisma migrate deploy`

| Migration | Result |
| --- | --- |
| 20260910120000_supreme_risk_saas_foundation | applied |
| 20260910180000_phase_a_tprm_foundation | applied |
| 20260910193000_tprm_evidence_scoring_reports | applied |
| 20260911180000_organization_profile_fields | applied |

A first empty-database `migrate deploy` failed with `type "Role" does not exist` because the checked-in migrations are additive. That failed row was marked rolled back, the baseline was applied, then `migrate deploy` succeeded.

## Preserved objects

Present after deploy: `Organization`, `User`, `Vendor`, `VendorAssessment`, `EvidenceLink`, `VendorIssue`, `ScoreCalculation`, `RiskDecisionBrief`, `AuditLog`, `AuditEvent`.

A separate hosted database `supreme_risk_restore` was created on the same Render Postgres instance for restore verification.

## Hosted backup / restore

Mechanism: PostgreSQL 16 `pg_dump --format=plain --no-owner --no-acl` of `supreme_risk_staging`, then `psql` restore into `supreme_risk_restore` on the same hosted instance. `prisma db push` was not used.

| Object | Source | Restore |
| --- | ---: | ---: |
| Organization | 1 | 1 |
| User | 2 | 2 |
| Vendor | 2 | 2 |
| VendorAssessment | 0 | 0 |
| EvidenceLink | 0 | 0 |
| VendorIssue | 0 | 0 |
| ScoreCalculation | 0 | 0 |
| RiskDecisionBrief | 0 | 0 |
| AuditEvent | 2 | 2 |

Relationship checks on the restore database: `users_with_org=2`, `vendors_with_org=2`. Counts matched.

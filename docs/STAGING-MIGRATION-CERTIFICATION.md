# Staging migration certification

**Database:** isolated `supreme_risk_rehearsal` on `127.0.0.1:55434`. Production was not contacted.
**Application database:** isolated `supreme_risk_staging` on the same host.
**Ran at:** 2026-09-11T22:31:58Z
**Starting SHA:** `e03295f42a8d5c9fc7458b38b6da1701e5b2079f`
**Hosted restage (2026-09-12):** **BLOCKED** — no public/hosted staging database exists. The local chain below was not re-applied to a hosted instance.

## Procedure

1. Create an empty PostgreSQL database with a staging-only URL.
2. `prisma db push` the pre-transformation baseline schema (`backend/prisma/baseline/pre-transformation.prisma`). No `migrate reset`.
3. Insert Organization, User, Vendor, Risk, VendorAssessment, and VendorRiskHistory rows representing existing GRC/TPRM data.
4. Apply every current additive migration SQL file, in order:
   - `20260910120000_supreme_risk_saas_foundation`
   - `20260910180000_phase_a_tprm_foundation`
   - `20260910193000_tprm_evidence_scoring_reports`
   - `20260911180000_organization_profile_fields`
5. Insert Decision Brief, StoredObject, and EvidenceLink rows that the baseline schema could not hold.
6. Verify baseline rows still exist.
7. Recreate `supreme_risk_staging` the same way, mark migrations applied, seed the staging workspace, and run the application against that migrated database.

`prisma migrate deploy` cannot be used as the first command on an empty database because the first migration is additive and expects the pre-transformation `Role` enum. The supported path is baseline → apply SQL → `prisma migrate resolve --applied`.

## Results

| Check | Result |
| --- | --- |
| Destructive reset | none |
| Admin user `user_rehearsal_baseline` | preserved |
| Vendor `Baseline Vendor Intact` | preserved |
| Assessment `assess_rehearsal_baseline` | preserved |
| Score history `score_rehearsal_baseline` | preserved |
| Decision brief `brief_rehearsal_baseline` | present after TPRM migrations |
| Evidence relationship `link_rehearsal_baseline` | present |
| `verify-rehearsal.js` | `REHEARSAL_VERIFICATION=PASS` |

## Application against migrated DB

The staging API on port 4100 used `supreme_risk_staging` after the same baseline-plus-migration path. Seed created `Supreme Risk Staging Workspace`. Browser E2E and provider checks ran against that database.

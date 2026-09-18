# Insurance Edition Phase B — local gates

Staging golden walk is `scripts/hosted-insurance-edition-phase-b-qa.py` (writes `results.json` and screenshots here). It has not been run against a Phase B hosted SHA.

Local gates on 2026-09-18 against starting SHA `cd463017ee6e00ff1804ba691243c38fd104a72e` plus uncommitted Phase B work. Re-run after IRA/assessment-plan/privacy-context closure:

- `prisma migrate deploy` applied `20260918220000_insurance_phase_b` to local test Postgres `127.0.0.1:55433`
- backend `tsc --noEmit` pass
- frontend `tsc --noEmit` pass
- `insurance-edition.test.ts` + `insurance-edition-phase-b.test.ts` 8/8 pass
- `InsuranceHome.test.tsx` 3/3 pass
- recovery-certification + supreme-automation-engine 14/14 pass

Hosted CI, staging SHA recertification, and Phase B screenshots remain open. Do not treat this file as hosted proof.

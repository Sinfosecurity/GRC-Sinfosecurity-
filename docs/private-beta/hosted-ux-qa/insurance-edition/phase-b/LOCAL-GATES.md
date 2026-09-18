# Insurance Edition Phase B — local and hosted gates

Official hosted walk is `scripts/hosted-insurance-edition-phase-b-qa.py`.

## Local gates (2026-09-18)

Recorded against starting SHA `cd463017ee6e00ff1804ba691243c38fd104a72e` plus Phase B implementation `f87038fa160e935ae6b6f890a3124dd383c0b1ec`:

- `prisma validate` PASS; migration `20260918220000_insurance_phase_b` applied locally on `127.0.0.1:55433`
- backend `tsc --noEmit` PASS
- frontend `tsc --noEmit` PASS
- `insurance-edition.test.ts` + `insurance-edition-phase-b.test.ts` 8/8 PASS
- `InsuranceHome.test.tsx` 3/3 PASS
- frontend suite 221/221 PASS
- frontend production build + public-build-safety PASS
- `ci-security` SECRET_SCAN=PASS MIGRATION_SAFETY=PASS
- full backend suite: 1 pre-existing local intelligence flake (`ERROR` vs `NOT_CONFIGURED`); hosted CI backend suite PASS

## Hosted gates (2026-09-18)

- CI https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35405219418 SUCCESS on `f87038fa160e935ae6b6f890a3124dd383c0b1ec`
- Staging frontend `/version.json` and API `/health.gitSha` both `f87038f`
- Official walk **38 PASS / 0 FAIL**
- Supplemental hosted proofs **99 PASS / 0 FAIL / 1 SKIP** (viewer session)
- Health: postgres/redis/stripe/automation/storage/malware up; mongodb/email/ai NOT_CONFIGURED or DEGRADED; memory high. Expected staging degraded profile. Production not touched.

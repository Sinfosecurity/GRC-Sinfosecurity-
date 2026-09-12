# Hosted CI / release-gate certification (#7)

**Classification:** release-gate evidence
**Production deployment:** NO
**Starting baseline SHA:** `38e6c35c356050cca923ad7a7165f09c0a218521`

This document does not declare production-ready and does not claim SOC 2 or ISO certification.

## GitHub Actions account status

Hosted runners **do not start**. GitHub returns:

> The job was not started because your account is locked due to a billing issue.

Latest observed hosted attempt after the Supreme CI workflow commit:

- Workflow: `Supreme CI`
- Run ID: `34719068078`
- URL: https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34719068078
- SHA: `958981b8cf40215ab02d794964a0f96d7b2cdbd7`
- Job: `quality`
- Runner name: empty
- Steps: none
- Annotation: account locked due to a billing issue

Prior identical lock at baseline SHA `38e6c35c356050cca923ad7a7165f09c0a218521`:

- Workflow: `CI` (pre-change name)
- Run ID: `34711650763`
- URL: https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34711650763

This is an **external account/billing lock**. Local test execution is not a hosted PASS.

## Workflow inventory

Only one workflow file exists: `.github/workflows/ci.yml`.

| Workflow | File | Trigger | Job | Purpose |
|---|---|---|---|---|
| Supreme CI | `.github/workflows/ci.yml` | push to `supreme-risk-transformation`; pull_request to `main` or `supreme-risk-transformation`; `workflow_dispatch` | `quality` | Authoritative release-quality gate |

No production-deploy workflow exists in `.github/workflows/`. Staging auto-deploy remains a Render setting, not GitHub Actions.

Previous `CI / quality` job used `npm install`, `prisma db push` rehearsal of only the first migration, and did not capture SHA, run `migrate deploy` for the full chain, check public build safety, or emit a release summary. It had no `continue-on-error` and did not deploy production.

## Authoritative gate

**Intended required branch-protection check later:** `Supreme CI / quality`

Do not change GitHub branch protection without explicit approval.

### Runner / runtime

- GitHub-hosted `ubuntu-latest`
- Node 20
- Disposable `postgres:16` service: `supreme_test` / `supreme_risk_test` on localhost
- No Render, Stripe, Resend, ClamAV, or hosted MinIO

### Mandatory commands

1. `git rev-parse HEAD` must equal `GITHUB_SHA`
2. Backend install (`npm ci` if a lockfile exists, otherwise `npm install`)
3. `npx prisma generate`
4. `npx prisma validate`
5. `bash backend/scripts/ci-migrate-deploy.sh`
   - Empty CI DB: bootstrap `prisma/baseline/pre-transformation.prisma`
   - Apply each committed `migration.sql`
   - `prisma migrate resolve --applied`
   - `prisma migrate deploy` (must report no pending migrations)
6. `backend` `tsc --noEmit`
7. `bash backend/scripts/ci-security.sh` (secret scan, all-migration safety, `npm audit --omit=dev`)
8. Backend full Jest suite
9. Frontend install
10. Frontend `tsc --noEmit`
11. Frontend full Vitest suite
12. Frontend production `npm run build`
13. `bash frontend/scripts/public-build-safety.sh`

### Security / hygiene

- Secret scan reports path:line:rule only. It does not print matched secret text.
- Migration safety fails on unexpected `DROP DATABASE`, `DROP TABLE`, `TRUNCATE`, or `prisma migrate reset`.
- Dependency policy fails the job on **direct production critical** advisories. High/transitive findings are recorded, not auto-failed.
- Lockfiles are currently gitignored. `npm ci` cannot run until lockfiles are tracked.

### Artifacts

Uploads `ci-artifacts/` (SHA file, test transcripts, summary). Does not upload `.env`, dumps, credentials, or evidence objects.

## External service dependence

None for this workflow. CI uses a disposable Postgres service and test doubles already in the suite.

## Known issues

- Hosted GitHub Actions is **BLOCKED — EXTERNAL** by account billing lock
- `package-lock.json` is gitignored; install is `npm install` until lockfiles are tracked
- Frontend `npm audit --omit=dev` reports direct **high** `react-pdf` and transitive `tar` / `canvas` / `pdfjs-dist`. Not a direct-critical blocker under current policy
- Additive migrations require the documented baseline bootstrap on empty databases; `migrate deploy` alone cannot initialize a blank database
- `scripts/staging-certify.sh` remains unsafe for recovery (drops local staging) and is not used by CI

## Prior certifications

| Gate | Status |
|---|---|
| Stripe #3 | PARTIAL / CONDITIONALLY CLEARED |
| Malware #4 | PASS |
| Rate limiting #5 | PASS |
| Request Demo UX | PASS |
| Backup / restore #6 | PASS |
| Commercial pricing | unchanged |

FINAL for this sprint is determined by whether a GitHub-hosted runner actually starts and all mandatory jobs are green. A billing lock is **BLOCKED**, not PASS.

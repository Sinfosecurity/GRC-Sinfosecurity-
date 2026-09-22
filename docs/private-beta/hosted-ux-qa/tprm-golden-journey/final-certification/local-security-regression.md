# Local security regression — BLOCKED

**Status:** BLOCKED  
**blockerType:** LOCAL_TEST_INFRASTRUCTURE  
**environment:** local  
**productCodeReached:** false  
**Not:** PRODUCT FAIL  
**Not:** CERTIFICATION FAIL  

This does **not** waive hosted CI on the exact certification SHA.

## Command

```bash
cd backend
npm run typecheck && npx jest --runInBand \
  src/__tests__/pentest-2026-09-22-remediation.test.ts \
  src/__tests__/health.integration.test.ts \
  --forceExit
```

## Expected database

`postgresql://supreme_test:supreme_test@127.0.0.1:5432/supreme_risk_test`

CI uses the same user/password against a disposable `postgres:16` service.

## What failed

Postgres rejected the local `supreme_test` credentials:

`Authentication failed against database server at 127.0.0.1`

## Affected tests

Application assertions were not reached:

- public signup tenant isolation (received 500 instead of 201)
- M-5 webhook sink
- public API mass assignment and IDOR
- SCIM authentication

## Local results that did run

- backend typecheck: PASS
- MFA policy unit test: PASS
- bucket bootstrap unit tests: PASS (5)

## Authoritative alternate evidence

Hosted CI https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35686586390 PASS on `da9f7de77239f0a354508fe757b1f2291637f20f`. Exact certification SHA CI is required separately and is not waived.

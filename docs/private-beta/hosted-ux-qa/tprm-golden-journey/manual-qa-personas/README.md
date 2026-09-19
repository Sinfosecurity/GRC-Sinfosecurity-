# #12 staging QA personas — testability checkpoint

This is **not** a #12 PASS. Wave 5 is **not started**. Golden Journey and vendor authentication were not changed.

**Starting SHA:** `797177f2a55f5ee47edc543f17e05f99c979db7c`  
**Purpose:** Give Product Leadership usable staging identities for an end-to-end manual Golden Journey walk.

## Remote

Staging frontend: https://supreme-risk-staging.onrender.com  
Staging API: https://supreme-risk-staging-api.onrender.com  
Login: https://supreme-risk-staging.onrender.com/login  
Vendor activation: https://supreme-risk-staging.onrender.com/vendor-assessment/activate

## QA organization

| Field | Value |
| --- | --- |
| Name | Supreme GRC QA Organization |
| Slug | `supreme-grc-qa` |
| Id | `0e0de017-919a-4886-93d7-420b05f71f62` |

Dedicated staging-only tenant. Not a customer tenant.

## Personas

| Participant | Name | Email | Role | Landing |
| --- | --- | --- | --- | --- |
| Business Requester | QA Requester | qa.requester@supremegrc.test | BUSINESS_OWNER | `/request` |
| TPRM Lead | QA TPRM Lead | qa.tprm.lead@supremegrc.test | RISK_MANAGER | `/dashboard` |
| TPRM Analyst | QA TPRM Analyst | qa.tprm.analyst@supremegrc.test | ASSESSOR | `/dashboard` |

Vendor remains invitation-only:

| Contact | Email | User row |
| --- | --- | --- |
| QA Vendor Contact | qa.vendor@supremegrc.test | **None** |

Passwords are operator-only. They are not recorded here.

## Operator reset

```bash
APP_ENVIRONMENT=staging ALLOW_STAGING_QA_PERSONAS=true \
  npx ts-node --transpile-only backend/src/scripts/tprmQaPersonas.ts status

APP_ENVIRONMENT=staging ALLOW_STAGING_QA_PERSONAS=true \
  npx ts-node --transpile-only backend/src/scripts/tprmQaPersonas.ts reset-test-data

APP_ENVIRONMENT=staging ALLOW_STAGING_QA_PERSONAS=true \
  npx ts-node --transpile-only backend/src/scripts/tprmQaPersonas.ts seed-manual-case
```

Wrapper: `scripts/staging/tprm-qa-personas.ts`  
The script aborts unless `APP_ENVIRONMENT` is `staging` or `test` **and** `ALLOW_STAGING_QA_PERSONAS=true`. Production is refused.

Reset is scoped to `supreme-grc-qa` only. It does not mint a static vendor token. Each vendor test must copy a new product invitation.

## Manual Golden Journey record

| Field | Value |
| --- | --- |
| INT | `INT-2026-0001` |
| Third party requested | Microsoft Corporation QA |
| Service | Azure Hosting QA |
| Purpose | Host a customer-facing QA application. |
| Status | UNASSIGNED |
| Pre-completed | No |

Product Leadership should move this same case through Waves 1–4. Wave 5 is not authorized.

## Vendor invitation method

Use the normal TPRM Analyst path after the Due-Diligence Plan is confirmed:

1. Select QA Vendor Contact / `qa.vendor@supremegrc.test`
2. Copy or Send the activation link
3. Open `/vendor-assessment/activate`
4. Activate once

The invitation is random, hashed at rest, single-use, expiring, and revocable. Do not create a User, password, or static QA code for the vendor.

## Confirmations

- Vendor remains VendorContact + invitation + bounded VendorPortalSession
- No Vendor User
- No static vendor code
- No auth bypass
- No plaintext credential committed
- Requester stays requester-only
- TPRM Lead and Analyst stay GRC-only
- No workspace switcher
- #12 Golden Journey unchanged
- Wave 5 not started
- `main` not merged
- Production untouched

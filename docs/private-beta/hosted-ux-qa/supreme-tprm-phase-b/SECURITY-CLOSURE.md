# Phase B final security closure — activation tokens

**Date:** 2026-09-13  
**Item:** #12 Supreme Third Party — Phase B Final Security Closure  
**Hosted API SHA:** `faefbf38a5dcfa16b8986f0f777a55806ea8d7f6`  
**Hosted frontend SHA:** `2ebb32564a8bd861ee1b8f3e17e65f05227e587f`  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34801731893 PASS on `faefbf3`  
**Backend tests:** 369  
**Frontend tests:** 163  
**Phase B integration (local re-run):** 4 passed  
**Tenant:** Elite Claims  
**Fresh vendors:** `VND-2026-0007` (activation) and `VND-2026-0008` (cross-vendor)  
**Invitation ID:** not returned on the customer invitation payload. First invite recorded as Pending / Queued / expires `2026-09-28T03:47:38.419Z`.  
**Email:** provider status **Queued**. Provider delivered: UNKNOWN. Human inbox: NOT TESTED.  
**Production:** NO  
**Phase C / #19 / #20:** NOT AUTHORIZED

Frontend SHA differs from API SHA. Not silently reconciled. Frontend after `2ebb325` did not change for this token fix.

## Hosted results

| Check | Result | Evidence |
|---|---|---|
| Hosted API is `faefbf3` | PASS | `/health` `gitSha` |
| First send | 201 | `VND-2026-0007` invitation Pending, email Queued |
| Resend rotates link | PASS | New activation URL issued |
| Prior token after resend | 410, no session token | Revoked/replaced PENDING invite |
| First activation | **200** | `sessionId=898ac79c-4767-4867-a700-f92f4a3e8825` |
| Same token reused | **410**, no token in body | Second session **not** issued |
| Vendor JWT → `GET /api/v1/vendors` | 401 | Vendor plane boundary |
| Other tenant GET `VND-2026-0007` | 404, IDs absent | Cross-tenant |
| Vendor A session reads vendor B assessment | 404 Assessment not found | Cross-vendor; workspaces isolated |
| Expired token | **FAIL (hosted)** | Staging has no clock/backdate hook. `expiresAt` is 14 days out. Code path exists at `activateVendorAccess` for `expiresAt < now` → 410. Not hosted-proved. |

Machine log: `activation-security.json`.

## Honesty

- Queued is not Delivered.
- Inbox receipt was not observed.
- Expired tokens were not hosted-proved. Do not treat that line as PASS.
- Portal UX, questionnaire, evidence, submit, and analyst review were not redesigned this closure.

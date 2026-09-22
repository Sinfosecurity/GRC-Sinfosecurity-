# #12 consolidated Golden Journey certification

This is the final consolidated certification gate for `#12`. It is **not** Wave 9 and **not** a new punch-list number.

**Certification SHA:** `da9f7de77239f0a354508fe757b1f2291637f20f`  
**Hosted frontend SHA:** `da9f7de77239f0a354508fe757b1f2291637f20f`  
**Hosted API SHA:** `b5d006599e9a6a93b69d8a73500b9d0159f0229b`  
**Lineage:** Wave 8 `037b8e98dac360e12084bb0de8b66ee666036feb` + pentest remediation `da9f7de`. Frontend is the remediation SHA. API is the prior remediation deploy `b5d0065` plus the same security/session lineage; cookie-refresh paint fix `da9f7de` is on the frontend.  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35686586390 PASS  
**Environment:** staging only  
**#12 PASS:** NO  
**Commercial GO:** NO  
**Production:** untouched  
**main:** not merged  

Wave 8 ACCEPTED FOR CURRENT STAGE (`037b8e98dac360e12084bb0de8b66ee666036feb`, hosted API `6b7933ef415d32f58377012344cc68ded32ea36b`, CI 35681630112).  
Security remediation ACCEPTED FOR CURRENT STAGE (`da9f7de77239f0a354508fe757b1f2291637f20f`, evidence `4f59f3326781d925570309f041b6971d791be40f`, acceptance record `87b6b6e996683cb3b13c19c078016df8d26c9698`).

## Starting state

QA organization `supreme-grc-qa` `0e0de017-919a-4886-93d7-420b05f71f62`.

| Record | Id | Starting state | Use |
| --- | --- | --- | --- |
| Microsoft Corporation QA | `b777503b-8a35-4a4c-ad10-b0bfdd599c2b` | Shared Third Party | Reused |
| Azure Hosting QA | `93a259e6-81bf-4eb1-b79f-2077c6eeafda` | `OFFBOARDED` | Immutable later-stage history |
| Microsoft 365 Collaboration QA | `eeb0ae53-0e05-4748-8434-79f28c9e564a` | `DUE_DILIGENCE_PLANNING` | Live sibling, not mutated |
| Certification Services | `63684046-97fc-40cb-be3c-10ba0b26748e` | created this gate | Live intake → IRA → tier → DD |
| Info Request intake | new | created this gate | Information-request round-trip |

Azure was not restarted. Rewriting OFFBOARDED history would falsify accepted records.

## Personas

| Participant | Email | Role |
| --- | --- | --- |
| Requester | `qa.requester@supremegrc.test` | BUSINESS_OWNER |
| TPRM Lead | `qa.tprm.lead@supremegrc.test` | RISK_MANAGER |
| TPRM Analyst | `qa.tprm.analyst@supremegrc.test` | ASSESSOR |
| Vendor | `qa.vendor@supremegrc.test` | invitation-only; no User row |
| OIDC SSRF actor | fresh signup ORGANIZATION_ADMIN | identity.manage without weakening QA RBAC |

## Evidence E2E (mandatory)

First `POST /api/v1/documents` returned sanitized 500. Staging logs: **The specified bucket does not exist**. Diagnostics had reported `provider=s3` / `up` because configuration presence is not a write probe.

Staging MinIO bucket was recreated with a one-off Render job using the API service’s own environment. No local-filesystem workaround. No production change.

Retest:

| Check | Result |
| --- | --- |
| PDF upload | 201 `03f22c61-15f4-44ce-9bec-47eb882400d0` scan **CLEAN** |
| PNG upload | 201 `6175b9cb-efd6-4347-80a6-2ab584842ea9` scan **CLEAN** |
| Authorized download | 200, 286 bytes |
| Unauthenticated download | 401 |
| Cross-tenant download | 404 |
| Shared Evidence first link | 201 SUPPORTS → Microsoft vendor |
| Malware | CONNECTED; this run returned CLEAN inline. Fail-closed pending downloads remain configured (`allowPendingDownloads=false`). |

## Result

Hosted API + UI + gap closure: **0 FAIL**. SKIPs documented.

Cursor does **not** declare `#12` PASS.

## SKIPs

| Check | Reason |
| --- | --- |
| `vendor.hosted.session` | Invitation does not return an activation secret. Auth not weakened. |
| `public.api.client.qa` | QA RISK_MANAGER cannot mint developer clients (403). Org B signup can; public vendor IDOR 404. |
| `error.sanitization.hosted` | No safe crash probe. Live `/documents` 500 before bucket restore returned generic `An unexpected error occurred.` with request id — hosted M-1 proof. Automated handler tests remain. |

## Honesty

- Staging privileged MFA is grace. Production `APP_ENVIRONMENT=production` forces privileged TOTP. **STAGING GRACE — PRODUCTION ENFORCEMENT PATH VERIFIED.**
- Email verification is not a hard blocker on trial session. **EXPECTED DESIGN.**
- BitSight / SecurityScorecard / Slack / Jira: **NOT_CONFIGURED**.
- Authenticated OIDC: localhost / metadata / RFC1918 rejected 400; Microsoft public issuer discovered 200.
- Notifications queued ≠ delivered.
- `#23` smoke only.

## Screenshots

`screenshots/` — requester, GRC lifecycle, Azure/M365, vendor activate, responsive 375–1920.

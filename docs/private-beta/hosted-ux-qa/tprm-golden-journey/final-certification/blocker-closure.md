# #12 Evidence durability blocker closure

This is **not** Wave 9 and **not** a new punch-list number.

**#12 PASS:** NO  
**Commercial GO:** NO  
**Production:** untouched  
**main:** not merged  

Waves 1–8 ACCEPTED FOR CURRENT STAGE.  
Security remediation ACCEPTED FOR CURRENT STAGE.

## Result

**#12 CONSOLIDATED GOLDEN JOURNEY CERTIFICATION — EVIDENCE RESULT PASS — READY FOR PRODUCT LEADERSHIP FINAL ACCEPTANCE**

Cursor does not declare `#12` PASS.

## Option used

**OPTION A.** Persistent disk `minio-data-live` was attached to the exact MinIO service used by the staging API. Unused sibling `supreme-risk-staging-minio-1` was not treated as success.

## Storage topology

| Field | Before | After |
| --- | --- | --- |
| Provider | MinIO / S3-compatible | MinIO / S3-compatible persistent object storage |
| Not AWS S3 | yes | yes |
| API `S3_ENDPOINT` host | `supreme-risk-staging-minio.onrender.com` | `supreme-risk-staging-minio.onrender.com` |
| Live service | `supreme-risk-staging-minio` `srv-daiep37qj5pc739qfvpg` | same |
| Disk | **none** | `dsk-dapgkkgae00c73d28kdg` `minio-data-live` 1 GB |
| Mount path | none | `/data` |
| MinIO data path | ephemeral `/data` | persistent `/data` (`minio server /data`) |
| Bucket | `supreme-risk-staging` | `supreme-risk-staging` |
| `APP_ENVIRONMENT` | staging | staging |
| Unused sibling | `minio-1` `srv-daiegbfqj5pc739pc5gg` has `/data`, unused | unchanged; unused |

Live API deploy remained `dep-dap6dsh7lnhs73asuapg` on `ace61c75c8b82623a46bc0d31525a75d00efafc6`.  
Live MinIO instance after disk attach: `dep-dapgl83bc2fs73fm7mj0`. A later docker rebuild `dep-dapgnp3tqb8s7392mft0` **build_failed**; the disk-mounted instance stayed live. Object-store proof is a **process restart**, not that failed rebuild.

## Object inventory

**Before change (ephemeral store, local capture):** 3 objects.

| StoredObject | Key | Bytes | sha256 |
| --- | --- | --- | --- |
| `03f22c61-15f4-44ce-9bec-47eb882400d0` | `…/407ff8f9-…-cert-1790053101.pdf` | 286 | `26fb196de7…` |
| `6175b9cb-efd6-4347-80a6-2ab584842ea9` | `…/3afa1f76-…-cert-1790053101.png` | 67 | `ebf4f635a1…` |
| `b19229bc-e681-46d7-936c-ab916d1907b5` | `…/d8b91c6f-…-honesty-1790076341.pdf` | 286 | `26fb196de7…` |

First disk-mounted deploy emptied `/data`. Objects were restored from the local capture by job `job-dapgn1v40ujc73eh5nig` using the **same keys**. No StoredObject rows were recreated.

**After persistence + closure uploads:** job `job-dapgrn0ae00c73d2ukig` at `2026-09-22T23:23:51Z`:

```
env=staging
bucket=supreme-risk-staging
host=supreme-risk-staging-minio.onrender.com
head=exists
keyCount=7
```

Seven keys match the seven StoredObject records below. No duplicate DB records.

## Persistence proof

Fresh closure uploads (this session):

| File | StoredObject | Key | Scan | sha256 |
| --- | --- | --- | --- | --- |
| PDF | `95c8476e-54e3-45e5-be13-279e4ceb7755` | `…/8d04a033-…-closure-1790119263.pdf` | CLEAN | `26fb196de7965414cb9d97b791b7bd53b9b4a10cf51a2f51f1c63db0c4a1653c` |
| PNG | `0378d254-722a-4fe5-be8e-cb1ce56acc9f` | `…/b53852f0-…-closure-1790119263.png` | CLEAN | `ebf4f635a17d10d6eb46ba680b70142419aa3220f228001a036d311a22ee9d2a` |

| Boundary | Result |
| --- | --- |
| Upload fresh PDF/PNG | **PASS** — 201 CLEAN |
| MinIO process restart `srv-daiep37qj5pc739qfvpg` | **PASS** — health 502 then 200; all 7 objects 200 with same checksums; no re-restore |
| API restart `srv-daieg75g1s2s73f0rmig` | **PASS** — all 7 objects 200, same `storageKey` |
| Prior persist PDF/PNG `52929772-…` / `18ef7218-…` | **PASS** — survived earlier MinIO restart and this restart |
| Historical certification objects | **PASS** — same keys after restore + restarts |

This crossed the object-store restart boundary. Persistence is not inferred from disk configuration alone.

## Security after storage change

| Check | Result |
| --- | --- |
| Authorized download | 200 |
| Unauthenticated download | 401 |
| Cross-tenant download (new Org B `aae26d14-…`) | 404 |
| Anonymous MinIO list | 403 AccessDenied |
| Anonymous object GET | 403 AccessDenied |
| Frontend object-store secrets | none |
| Public `/health` | `{status,timestamp}` only — PENTEST-H2 preserved |

## Malware

Fresh PDF and PNG reached **CLEAN**. Fail-closed download policy unchanged (`allowPendingDownloads=false`, `allowUnscannedDownloads=false`). Diagnostics `malwareProvider` was **DEGRADED** immediately before the API restart and **CONNECTED** after it. CLEAN upload status is the malware-path proof. DEGRADED is not treated as PASS for diagnostics. Non-CLEAN objects remain unusable by existing policy.

## Shared Evidence

Same StoredObject `52929772-847d-4fe0-b3d0-626452f8e3b8` linked to:

- CONTROL `GOV-01` `ab0f0c05-…` — link `090f666e-54b9-4d4d-8e37-7db465e7cd3e` 201 SUPPORTS
- VENDOR Microsoft — link `12cfa233-1de4-47f8-aa28-57ce4a26429b` 201 PARTIALLY_SUPPORTS
- Prior VENDOR SUPPORTS already existed (409)

Same object. Same StoredObject authority. No second byte copy. Impact after restart still lists GOV-01. Residual scores unchanged.

## Bucket bootstrap / production guard

After restart: `head=exists`. No create. No delete. Application helper `backend/src/storage/bucketBootstrap.ts` still refuses production opportunistic create. That guard was not modified.

## Recertification scope

**RE-RUN THIS CLOSURE:** Evidence upload, download, malware CLEAN path, Shared Evidence reuse, tenant isolation, anonymous MinIO denial, public `/health`, persistence across MinIO restart and API restart, offboarding inspectable 200.

**REUSED PRIOR CERTIFICATION EVIDENCE:** Waves 1–8 Golden Journey walk, Azure OFFBOARDED / M365 DUE_DILIGENCE_PLANNING isolation, Cycle 1 MEDIUM 58, OIDC SSRF, UI screenshots, invitation-only Vendor, requester denials, exact prior certification SHA CI `35721879631` on `ace61c7`.

## Known limitations

- Full MinIO docker rebuild `dep-dapgnp3tqb8s7392mft0` build_failed. Proof is process restart of the disk-mounted live instance.
- Unused `minio-1` still has its own disk and is not used by the API.
- Local Jest security regression remains **BLOCKED — LOCAL TEST INFRASTRUCTURE**.
- Invitation inbox remains Queued ≠ Delivered.
- Production object storage was not touched and is not validated by this work.

# Staging object-storage persistence

Staging Evidence uses **MinIO / S3-compatible persistent object storage**.

It is **not** AWS S3.

Production object storage was not touched and is not validated by this work.

## Provider

| Field | Value |
| --- | --- |
| API `S3_ENDPOINT` host | `supreme-risk-staging-minio.onrender.com` |
| Service | `supreme-risk-staging-minio` `srv-daiep37qj5pc739qfvpg` |
| Live disk | `dsk-dapgkkgae00c73d28kdg` `minio-data-live` 1 GB mounted at `/data` |
| MinIO data path | `/data` |
| Bucket | `supreme-risk-staging` |
| `ALLOW_LOCAL_OBJECT_STORAGE` | `false` |
| Unused sibling | `supreme-risk-staging-minio-1` has 1 GB `/data` and is **not** used by the API |

## Prior missing-bucket event

Classification: **ENVIRONMENT / STORAGE PROVISIONING FAILURE**, not an application Evidence design failure.

Job `job-dap0l8dg1s2s738vm0fg` at `2026-09-22T04:57:40Z`:

- `head-miss`
- `bucket-created`

No local-filesystem fallback was introduced.

## Disk attach and restore

1. Existing 3 certification objects were copied locally with keys, sizes, and sha256.
2. Persistent disk was attached to the live API MinIO service, not `minio-1`.
3. First disk-mounted deploy emptied `/data` (`job-dapgku60tbcc73are4c0` `head=NotFound` count 0).
4. Job `job-dapgn1v40ujc73eh5nig` restored the same 3 keys. StoredObject ids were unchanged.

## Idempotent bootstrap

After restart, job `job-dapgrn0ae00c73d2ukig`:

- `head=exists`
- `keyCount=7`
- no delete
- no bucket replace

Application helper: `backend/src/storage/bucketBootstrap.ts`. Production opportunistic create is refused.

## Persistence

| Boundary | Result |
| --- | --- |
| API restart `srv-daieg75g1s2s73f0rmig` | **PASS** — 7 objects still 200, same keys/checksums |
| Object-store disk | **PASS** — live MinIO has 1 GB `/data` |
| Object-store process restart `srv-daiep37qj5pc739qfvpg` | **PASS** — health 502 then 200; 7 objects still 200; no re-restore |
| Empty bucket recreate | **not used** as a persistence substitute |

See `blocker-closure.md`.

## Production boundary

Production object storage must be provisioned through the approved infrastructure design. Staging MinIO behavior is not copied to production. No production bucket is claimed. Commercial production remains NO-GO.

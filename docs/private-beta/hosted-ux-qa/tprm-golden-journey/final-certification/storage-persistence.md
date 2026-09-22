# Staging object-storage persistence

Staging Evidence uses **MinIO / S3-compatible** object storage.

It is **not** AWS S3.

## Provider

| Field | Value |
| --- | --- |
| API `S3_ENDPOINT` host | `supreme-risk-staging-minio.onrender.com` |
| Service | `supreme-risk-staging-minio` `srv-daiep37qj5pc739qfvpg` |
| Live disk | **none** |
| Blueprint disk | `minio-data` → `/data` 1 GB (`render.staging.yaml`) |
| `ALLOW_LOCAL_OBJECT_STORAGE` | `false` |
| Unused sibling | `supreme-risk-staging-minio-1` has 1 GB `/data` and is **502** |

## Prior missing-bucket event

Classification: **ENVIRONMENT / STORAGE PROVISIONING FAILURE**, not an application Evidence design failure.

Job `job-dap0l8dg1s2s738vm0fg` at `2026-09-22T04:57:40Z`:

- `head-miss`
- `bucket-created`

No local-filesystem fallback was introduced.

## Idempotent bootstrap

Job `job-dap6cftg1s2s739jkkd0`:

- `head1=exists`
- `create=BucketAlreadyOwnedByYou`
- `head2=exists`
- key count 3 → 3

No delete. No bucket replace. Objects remained listed.

Application helper: `backend/src/storage/bucketBootstrap.ts`. Production opportunistic create is refused.

## Persistence

| Boundary | Result |
| --- | --- |
| API restart `srv-daieg75g1s2s73f0rmig` | **PASS** — PDF/PNG still 200 |
| Object-store disk | **FAIL** — live MinIO has no disk |
| Object-store restart/redeploy | **FAIL** — not executed; would destroy live Evidence on ephemeral storage |
| Empty bucket recreate | **not used** as a persistence substitute |

A recreated empty bucket is not persisted Evidence.

## Production boundary

Production object storage must be provisioned through the approved infrastructure design. Staging MinIO behavior is not copied to production. No production bucket is claimed. Commercial production remains NO-GO.

# Backup / restore / disaster-recovery certification (#6)

**Classification:** RECOVERY / CERTIFICATION ONLY
**Live staging modified or overwritten:** NO
**Production contacted:** NO
**Starting SHA:** `f0d696e5d276d6be650d1176549cf7430f513c0b`

This document replaces the earlier count-only local rehearsal. That rehearsal was **PARTIAL / LOCAL ONLY / UNTESTED for object storage and tenant integrity**. This sprint certifies a populated two-tenant restore into an isolated target.

Do not treat this as a production SLA or a SOC 2 / ISO 27001 certification.

## Recovery dependency map

| Component | Class | Backup? | Notes |
|---|---|---|---|
| PostgreSQL application data | AUTHORITATIVE | YES | Organizations, users, vendors, assessments, responses, findings, CAPs, contracts, monitoring, fourth parties, scores, decisions, evidence metadata, audit, local billing, notifications |
| Evidence / object storage | AUTHORITATIVE | YES | Bytes at `StoredObject.storageKey` plus checksum, size, content type, scan status |
| Prisma / schema / migration state | AUTHORITATIVE | YES when present | Included in `pg_dump`; isolated source may be schema-pushed |
| Local demo-request JSONL | AUTHORITATIVE on that instance | YES if present | Not in PostgreSQL; hosted uses DB/notification records |
| Stripe | EXTERNAL PROVIDER + local fields | Local only | `billingCustomerId`, `billingSubscriptionId`, plan, interval, status, `SubscriptionEvent` |
| Resend / SMTP | EXTERNAL PROVIDER + local records | Local only | Delivery history at the provider is not restored |
| Redis rate-limit / cache | EPHEMERAL | NO | Counters rebuild; losing them does not corrupt business data |
| JWT access / refresh tokens | EPHEMERAL / RECONSTRUCTABLE | NO | Users re-authenticate after disaster |
| Application configuration | AUTHORITATIVE / reconstructed | Separate | Env vars are not inside `pg_dump`. Restore config from the secret store, never from Git |
| ClamAV | EXTERNAL SCANNER | NO | Policy and scan **status rows** restore; the scanner itself is not backed up |
| Render free PostgreSQL | INFRASTRUCTURE RISK | n/a | `supreme-risk-staging-pg` expires **2026-10-12**. Not acceptable for production |

## Consistency strategy

PostgreSQL and object storage are **not** snapshotted in one distributed transaction. Certification uses:

1. Controlled write quiescence after populate
2. Pre-backup relational manifest (IDs, counts, FK invariants, checksums, scan status)
3. Object manifest (key, size, SHA-256)
4. `pg_dump -Fc` then object copy
5. Isolated restore
6. Post-restore manifest compare and object checksum verify

A restore that brings back database rows whose objects are missing, or objects whose checksums drifted, is a **FAIL**.

## Existing tooling audit

| Artifact | Verdict |
|---|---|
| `scripts/staging-certify.sh` | **UNSAFE** for this sprint — drops `supreme_risk_staging` |
| Prior `docs/BACKUP-RESTORE-CERTIFICATION.md` | **STALE / PARTIAL / LOCAL ONLY** — counts only, no objects |
| `scripts/recovery-certify.sh` | **REAL** isolated certify path |
| `backend/src/recovery/*` | Guards, populate, manifest, object checksums, post-restore checks |
| Render scheduled backups | **NOT implemented** on the current free database plan |

## Backup procedure

```bash
RECOVERY_CONFIRM=ISOLATED_CERTIFICATION_ONLY \
./scripts/recovery-certify.sh
```

The script:

- refuses production and `supreme_risk_staging` as restore targets
- requires `RECOVERY_CONFIRM=ISOLATED_CERTIFICATION_ONLY`
- creates `supreme_risk_recovery_source` and `supreme_risk_recovery_target` on local `127.0.0.1:55434`
- populates RECOVERY ORG A and RECOVERY ORG B
- writes `pg_dump -Fc` and an object-storage copy under `backups/recovery-cert/` (gitignored)
- restores only into the isolated target database and isolated object namespace
- reconciles manifests, verifies tenant isolation, RBAC, malware policy, risk, reports, audit, and billing local state
- runs missing-object and checksum negative tests on **copies**

Never run `scripts/staging-certify.sh` as a #6 restore.

## Backup protection (current)

| Control | Status |
|---|---|
| Destination | Local `backups/` only (gitignored) |
| Off-site / immutable copy | **NOT implemented** |
| Encryption at rest | Host volume only; no separate backup encryption |
| Encryption in transit | Local UNIX sockets / localhost TCP; hosted dump uses SSL |
| Public access | Artifacts are not published and must not be committed |
| Credential separation | Restore requires explicit confirmation and localhost + name guards |
| Secrets in filenames / logs | Forbidden; identity logs database name and host only |

This is **not** production-grade off-site backup.

## Retention / rotation (production target, not implemented)

| Cadence | Retain |
|---|---|
| Daily | 14 days |
| Weekly | 8 weeks |
| Monthly | 12 months |

Deletion: age-out after retain window, plus on-demand shred of certification dumps.
Access: recovery operators only.
Restore-test frequency: quarterly isolated drill, after any schema change that touches evidence or tenant keys.

Render free PostgreSQL does not provide this retention. Do not purchase upgrades without approval.

## Populated dataset

Two synthetic tenants, no real customer PII.

**RECOVERY ORG A** — PROFESSIONAL, three vendors (CRITICAL / HIGH / MEDIUM), admin + assessor + viewer, completed assessments, responses, findings + CAP, contracts, monitoring, fourth party on the critical vendor, inherent/residual scores (`supreme-risk-1.1.0`), RISK_ACCEPTED briefs that do **not** change residual, CLEAN and NOT_CONFIGURED evidence objects, audit events, test-mode billing IDs, in-app notification.

**RECOVERY ORG B** — STARTER, two vendors, same shape, different IDs and objects.

## Stripe / email / Redis after restore

- Local billing fields and `SubscriptionEvent` rows must survive.
- Stripe remains the provider-side source. Post-disaster: restore local state → query Stripe test/live as appropriate → replay missing webhooks → verify entitlements. Database backup does **not** back up Stripe.
- Restoring Supreme does **not** restore Resend/SMTP delivery history. Internal notification rows survive.
- Redis counters are intentionally discarded. Sessions are invalid after disaster; users sign in again. Rate-limit buckets start empty.

## Proposed objectives (not public SLAs)

| Objective | Certification evidence | Production target |
|---|---|---|
| RPO | Quiesced populate → dump; last included audit id recorded | ≤ 24 hours initially (daily backup) |
| RTO | Measured database + object + reconcile time on this dataset | ≤ 4 hours as an internal target once off-site restore automation exists |

Do not market these as SLAs.

## Future automation

| Control | Status |
|---|---|
| Isolated certify script and guards | IMPLEMENTED |
| Manifest + checksum reconcile | IMPLEMENTED |
| Scheduled hosted backups | RECOMMENDED |
| Failed-backup alerts / age-of-last-good-backup | RECOMMENDED |
| Quarterly restore drills | RECOMMENDED |
| Immutable / off-site / cross-region copies | FUTURE |
| Atomic DB+object snapshot | FUTURE |

## Certification run BR-6-20260912T183207Z

| Item | Result |
|---|---|
| Source SHA | `f0d696e5d276d6be650d1176549cf7430f513c0b` |
| Isolated source | `supreme_risk_recovery_source` on `127.0.0.1:55434` |
| Isolated target | `supreme_risk_recovery_target` + isolated object namespace |
| Live staging modified | NO (`supreme_risk_staging` still present) |
| PostgreSQL backup | `pg_dump -Fc` non-empty custom format; TOC lists Organization and related tables |
| Object backup | 11 files (10 `StoredObject` bytes + demo JSONL); SHA-256 verified |
| Database restore | 2s |
| Object restore | 1s |
| Reconcile | 2s |
| Total measured RTO (restore+objects+reconcile) | 5s |
| Constraints / indexes after restore | 266 / 263 |
| Hosted PostgreSQL dump → isolated `supreme_risk_hosted_restore` | PASS (523 TOC entries) |
| Hosted object-storage dump of live staging | NOT taken (safety). Objects certified on the populated isolated dataset |
| Pre/post manifest | PASS all authoritative counts, tenant IDs, checksums, risk scores, invariants |
| Post-restore checks | 45 PASS / 0 FAIL |
| Reports | Decision Brief, Executive, Scorecard, Assessment, Findings PDF/CSV, Board PDF/PPTX PASS; Org A brief for Org B = 404 |
| Negative tests | missing object detected; checksum tamper detected |
| Restore guards | refuse missing confirm; refuse `supreme_risk_staging` |
| Recovery audit event | `recovery.certification.verify` written after restore |

Sanitized evidence: `docs/evidence/BACKUP-RESTORE-CERT-6.json`

That file must not contain connection strings, password hashes, tokens, or object bytes.

## Hosted PostgreSQL lifecycle risk

`supreme-risk-staging-pg` is a **free** Render database previously recorded as expiring **2026-10-12T05:47:40Z**. It is not acceptable for production. Do not purchase or upgrade without approval.

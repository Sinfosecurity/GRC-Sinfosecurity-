# Disaster recovery runbook

**Label:** RECOVERY / CERTIFICATION ONLY until a cutover decision is recorded.
**Never restore over live staging or production from this runbook without a documented authority change.**

This is an operational guide for another competent engineer. It contains no secrets.

## 1. Incident declaration

Declare a disaster when authoritative Supreme data is unavailable or untrustworthy:

- PostgreSQL unreachable or corrupt
- evidence objects missing or inconsistent with `StoredObject`
- tenant data mixed or unrestorable
- backup required after a destructive change

Record: incident id, UTC time, detector, suspected blast radius, whether staging or production is affected.

## 2. Recovery authority

Required before any restore:

- named incident commander
- confirmation that the target is isolated **or** an approved production cutover
- `RECOVERY_CONFIRM=ISOLATED_CERTIFICATION_ONLY` for certification / rehearsal targets

Refuse the restore if the target host is not local for rehearsal, or if the database name is `supreme_risk_staging`, `production`, or `prod`.

## 3. Select the backup

1. Choose the newest **good** `pg_dump -Fc` whose object-backup folder exists.
2. Read the pre-backup manifest (counts, tenant IDs, evidence checksums).
3. Confirm the application SHA that produced the backup.
4. Do not use a dump that has no matching object backup unless the incident is database-only and evidence objects are already intact.

## 4. Prepare an isolated recovery target

Required:

- separate PostgreSQL database whose name contains `recovery`, `restore`, or `cert`
- separate object-storage namespace / bucket
- separate configuration pointing at those two targets

Comment the database: `RECOVERY / CERTIFICATION ONLY`.

Do **not**:

- drop or truncate `supreme_risk_staging`
- overwrite the live staging bucket
- point `DATABASE_URL` of the live API at the recovery database until cutover is approved

## 5. Database restore

```bash
RECOVERY_CONFIRM=ISOLATED_CERTIFICATION_ONLY \
RESTORE_DATABASE_URL='postgresql://USER@127.0.0.1:55434/supreme_risk_recovery_target' \
npx ts-node --transpile-only src/recovery/cli.ts assert-target

pg_restore --no-owner --no-acl -d "$RESTORE_DATABASE_URL" "$DUMP_FILE"
```

Verify: restore exit 0, tables present, constraints/indexes present, `_prisma_migrations` coherent if the dump included it.

## 6. Object restore

```bash
OBJECT_BACKUP=/path/to/object-backup \
OBJECT_RESTORE=/path/to/isolated-restore \
npx ts-node --transpile-only src/recovery/cli.ts restore-objects
```

Verify key, size, and SHA-256 for every `StoredObject` in the manifest.

## 7. Configuration restoration

Restore environment from the secret manager, not from Git:

- `DATABASE_URL` → recovery target only
- object storage credentials → recovery namespace only
- JWT, Stripe, Resend, Redis, ClamAV as they existed at the recovery point

Never paste secrets into tickets or this runbook.

## 8. External-provider reconciliation

### Stripe

1. Restore local `Organization` billing fields and `SubscriptionEvent`.
2. Query Stripe (test or live according to the environment).
3. Replay / process missing webhooks.
4. Verify plan, interval, subscription status, and entitlements.

Database backup is not a Stripe backup.

### Email

Provider delivery history is not restored. Internal notification rows should already be in PostgreSQL. Send at most one controlled test message if email must be proven.

### Redis

Do not restore rate-limit keys. Expect empty counters and expired sessions.

## 9. Data / tenant / security verification

Run the post-restore verifier against the recovery database and restored objects:

- organization, user, vendor, assessment, response, finding, CAP, risk, decision, evidence, audit, billing counts
- representative IDs and foreign keys
- object checksums
- Org A cannot read Org B vendors, assessments, findings, evidence, reports, or audit rows (403/404)
- recovered users authenticate; ADMIN / ASSESSOR / VIEWER permissions unchanged
- CLEAN evidence remains downloadable; non-CLEAN remains blocked
- risk acceptance still does not reduce residual
- historical audit events exist; a new audit event can be written

A successful restore that breaks tenant isolation is a **FAIL**. Stop.

## 10. Application and business validation

Regenerate:

- Decision Brief PDF
- Executive PDF
- Vendor Scorecard PDF
- Assessment PDF
- Findings PDF/CSV
- Board PDF or PPTX

Confirm tenant data, risk values, and findings. Binary-identical PDFs are not required.

## 11. Cutover decision

Only after verification PASS:

1. Freeze writes on the failed environment if it is still reachable.
2. Repoint the application to the recovered database and object namespace.
3. Invalidate sessions (expected).
4. Record the cutover time and the backup identifier used.

If verification FAIL: do not cut over. Keep the isolated target for forensics.

## 12. Rollback / escalation

- Rollback = leave traffic on the last known good environment; do not overwrite it with a failed recovery.
- Escalate if backups are missing, checksums fail, tenant isolation fails, or Stripe entitlements cannot be reconciled.
- Do not “force PASS” by relaxing malware or tenant checks.

## 13. Post-incident review

Record: certification/incident id, source SHA, backup timestamp, target, RPO (data lost after backup), RTO (clock time), exceptions, and whether recovery created an audit/certification event.

Feed the record to internal security review and future Platform Owner & Support Console. Do not claim SOC 2 or ISO certification from a drill.

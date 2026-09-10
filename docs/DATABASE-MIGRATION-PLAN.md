# Database migration plan

## Current truth

The Prisma schema evolved without a standard `prisma/migrations/<timestamp>_name/migration.sql` history. The previous `init.sql` file was supplemental (comments, a few indexes, triggers) and did **not** create application tables.

Railway `startCommand` runs `prisma migrate deploy`.

## Strategy

1. **Do not reset** production databases.
2. Apply only the additive migration:
   `backend/prisma/migrations/20260910120000_supreme_risk_saas_foundation`
3. That migration uses `IF NOT EXISTS` / `ADD VALUE IF NOT EXISTS` so it can run against:
   - a fresh database
   - a database previously created with `prisma db push`

## Production coordination

Before first deploy of `supreme-risk-transformation`:

1. Take a PostgreSQL backup.
2. If `_prisma_migrations` already has rows from a failed deploy, inspect them. Do not delete data.
3. If tables already exist and Prisma believes no migrations were applied, mark the new migration after a successful dry-run:
   - apply the SQL in a transaction on a clone first
   - then `prisma migrate deploy` on production
4. If `prisma migrate deploy` tries to recreate existing objects, stop and resolve with `prisma migrate resolve` rather than resetting.

## What the foundation migration adds

- SaaS fields on `Organization` (slug, plan, trial, billing, `isDemo`, status)
- Account status / MFA fields on `User`
- Auth tables: refresh tokens, password reset tokens, invitations
- Immutable `AuditEvent`
- `StoredObject` metadata
- Questionnaire templates (versioned)
- Score calculation history
- Notifications, integration connections, AI operation logs, Stripe webhook events
- New enum values for roles, vendor status, finding status, scan status

No tables are dropped. Tenant data is retained when an organization is suspended.

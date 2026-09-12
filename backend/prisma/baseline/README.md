# Pre-transformation Prisma schema

Frozen copy of `backend/prisma/schema.prisma` at `5916d7224ea5edef7f2b3726a452cc2261cb9b0d`.

- `pre-transformation.prisma` — schema snapshot
- `pre-transformation.sql` — `prisma migrate diff --from-empty` SQL used to bootstrap an **empty disposable** database before the additive migration chain

The first committed Prisma migrations are additive. An empty CI database therefore:

1. Applies `pre-transformation.sql` with `prisma db execute` (not `prisma db push`)
2. Applies each `prisma/migrations/*/migration.sql`
3. Records history with `prisma migrate resolve --applied`
4. Runs `prisma migrate deploy` and requires no pending migrations

Never run `prisma generate` from the baseline schema as the application client. Application generate uses `backend/prisma/schema.prisma`.

Do not apply the baseline SQL to hosted staging or production. Those databases already have the additive history.

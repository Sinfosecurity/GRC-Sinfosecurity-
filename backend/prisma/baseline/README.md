# Pre-transformation Prisma schema

Frozen copy of `backend/prisma/schema.prisma` at `5916d7224ea5edef7f2b3726a452cc2261cb9b0d`.

Used only by `backend/scripts/rehearse-migration.sh` to build a test/staging database that represents the supported baseline **before** `20260910120000_supreme_risk_saas_foundation`.

Never run `prisma generate` from this file as the application client. Application generate uses `backend/prisma/schema.prisma`.

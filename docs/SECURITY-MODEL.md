# Security model

## Authentication

Production login uses Prisma users and bcrypt password hashes. Sessions are JWT access tokens plus hashed refresh tokens. Password reset and invitation tokens are stored hashed.

`DEV_MODE` cannot authenticate users and cannot be enabled when `NODE_ENV=production`.

Errors return a generic "Invalid credentials" message.

Disabled and pending accounts cannot sign in. Suspended or cancelled organizations are rejected at the auth middleware.

## Authorization

Permissions are derived from role. Sensitive actions (approval, risk acceptance, user/org/billing/integration administration, evidence deletion, export) require explicit permissions.

## Tenant isolation

Tenant id is taken from the authenticated membership record, not from the browser. Resource queries use `WHERE id = ? AND organizationId = ?`.

## Secrets

Startup validates `JWT_SECRET` and `DATABASE_URL` in production. Predictable encryption keys including `dev-encryption-key` fail startup.

Audit events never persist passwords, tokens, or MFA secrets.

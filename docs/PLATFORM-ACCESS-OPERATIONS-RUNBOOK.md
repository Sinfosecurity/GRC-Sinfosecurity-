# Platform access operations runbook

**Production-ready claim:** NO  
**#9 Final Security Review:** NOT STARTED  
**DNS:** do not change production DNS in this sprint.

Hosted production-like environments (`NODE_ENV=production`) must set a high-entropy `ENCRYPTION_KEY` before Platform Owner MFA enrollment. The API refuses to start without it. Do not commit the key.

## First Platform Owner bootstrap

There is no default `admin/admin` account and no seeded password.

On an empty deployment (zero active `PLATFORM_OWNER` / `PLATFORM_ADMIN` / `SUPERADMIN` users):

```bash
cd backend
PLATFORM_OWNER_BOOTSTRAP_ENABLED=true \
PLATFORM_OWNER_BOOTSTRAP_TOKEN='<32+ character secret matching itself>' \
PLATFORM_OWNER_BOOTSTRAP_EMAIL='owner@supreme.example' \
npm run platform:bootstrap-owner
```

The command prints a random password once to stdout. Do not commit it. Enroll TOTP at `/admin/login` before using `/platform`.

The command refuses to run after an owner exists.

## MFA recovery

Internal users use hashed single-use recovery codes shown only at enrollment.

There is no self-service “disable MFA because I lost my phone.”

Administrative reset: Platform Owner with a live 15-minute step-up session calls `POST /api/v1/platform/internal-users/:id/mfa-reset`. This clears the secret, recovery codes, refresh tokens, and elevations. The target must enroll again.

## Support access

1. Support requests access from `/platform/sessions` (reason, ticket, `READ_ONLY` default, 15/30/60 minutes).
2. The customer organization administrator approves or denies from Help & Support.
3. Support starts the session. It expires automatically.
4. The customer or a platform owner may revoke.

Denial is terminal. It is never converted to internal approval.

## Break-glass

Requires an active platform incident, reason, duration ≤ 15 minutes, step-up MFA, and approval by a different `PLATFORM_OWNER` or `SECURITY_ADMIN`. `postEventReviewRequired` is always set. Review the audit events after the emergency.

## Role administration

Changing a platform role or granting `PLATFORM_OWNER` requires step-up. Last-owner and self-demotion protections remain.

## Staging certification

Create the staging owner only through bootstrap on the staging API. Do not commit credentials. After MFA enrollment, walk `/platform` and a customer approval cycle.

## Future SSO / SCIM

Not implemented. Internal staff should eventually use the corporate IdP on `admin.supremerisk.com`. Customer SSO/SCIM remains Coming Soon.

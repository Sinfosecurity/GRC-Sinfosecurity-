# ADR — Enterprise Identity (SSO / SCIM / JIT)

**ADR ID:** ADR-ENTERPRISE-IDENTITY  
**Status:** ACCEPTED  
**Date:** 2026-09-15  
**Item:** #21  
**Starting SHA:** `7b3f9018930549aa67a6790fcfd9862115b55315`  
**Production-ready claim:** NO  
**#21 PASS:** NOT DECLARED  
**#22:** NOT AUTHORIZED

This extends `docs/ADR-IDENTITY-ADMIN-SUPPORT-ARCHITECTURE.md`. It does not replace that ADR.

## Decision

Supreme adds enterprise identity on the **existing identity plane**.

- One `User` model. One `Organization` model. Existing `Role` / RBAC remain authoritative.
- Two authorization planes remain: customer application and Supreme platform administration.
- Enterprise SSO users become ordinary Supreme users in the asserting organization.
- No second session system. Federated login calls the existing session issuer.
- Platform TOTP MFA remains mandatory for platform staff. Customer SSO does not disable it.
- Customer break-glass (SSO recovery) is not platform break-glass / support access.

## Existing architecture reused

| Concern | Reuse |
|---|---|
| User / Organization / Role | Prisma models |
| Password, reset, invite, activate | `authService` |
| JWT + refresh | `issueSession`, `RefreshToken` |
| MFA / recovery / step-up | `totpMfaService` (platform) |
| Support / platform break-glass | `supportAccessService` (unchanged) |
| Audit | `recordAudit` |
| Secret at rest | `secretBox` |
| Token hash | `hashToken` |
| Entitlement flag | `sso` on ENTERPRISE when Stripe is connected |
| Rate limit category | `ssoLimiter` |

Quarantined `ssoService` / `auth.enhanced.routes` / in-memory MFA are **not** mounted.

## New records (additive)

- `IdentityProvider` — org-scoped SAML or OIDC configuration
- `IdentityDomain` — globally unique claimed domain; must be verified
- `IdentityRoleMapping` — IdP group → existing Supreme role
- `IdentityExternalAccount` — stable `issuer + subject` bound to a `User`
- `SsoLoginState` — state / nonce / PKCE / SAML request id
- `SsoReplayRecord` — assertion replay protection
- `ScimToken` — hashed, rotatable, org-scoped
- `ScimGroup` / `ScimGroupMember` — provisioning groups
- `IdentityBreakGlassGrant` — time-limited customer SSO recovery
- `User.sessionEpoch` — incremented on disable/deprovision so access JWTs die
- `User.provisioningSource` / `User.lastSsoAt`

`User.hashedPassword` stays required. JIT/SCIM users receive a random unusable hash. They do not choose a privileged role.

## Security boundaries

1. Tenant isolation: provider, domain, SCIM token, and group mapping are organization-scoped.
2. Domain uniqueness: Organization A cannot claim a domain already claimed by Organization B.
3. Discovery does not return organization name, tenant UUID, or protocol details.
4. SAML responses are signature-validated. Issuer, audience, destination, recipient, time window, and replay are checked. Contents are never trusted because they decoded.
5. OIDC validates state, nonce, issuer, audience, expiry, and JWKS signature. Authorization-code + PKCE.
6. Role mapping is administrator-configured. Unknown groups never become privileged. Multiple matches take the **lowest** mapped authority.
7. Mandatory SSO requires: verified domain, successful test, and a recovery administrator. Password login remains for that recovery path and time-limited grants only.
8. SCIM bearer tokens are shown once, stored hashed, revocable, and cannot read or mutate another tenant.
9. Deprovisioning (`active=false`) disables the user, revokes refresh tokens, increments `sessionEpoch`, and preserves historical attribution.
10. Audit never stores passwords, SAML assertions, OIDC tokens, or SCIM secrets.

## MFA policy

| Path | MFA |
|---|---|
| Local customer password | Existing policy (not required) |
| Customer SSO | IdP authentication. Supreme does not claim IdP MFA unless the assertion includes trustworthy AMR/ACR evidence (not claimed in this sprint) |
| Customer break-glass password | Existing customer password path; audited |
| Platform login | Existing TOTP remains required |

## Hosted verification

Real Entra/Okta/Google connectivity is **not claimed** unless a live IdP is used. Automated tests sign and verify standards-based messages. Staging SCIM and admin UX can be hosted-proved without a vendor IdP. Unproven live IdP paths remain PARTIAL.

## Out of scope

- #22 public API / webhooks
- Production DNS
- Provider certification badges
- A second identity store
- Changing #12 Third Party workbook/lifecycle/email

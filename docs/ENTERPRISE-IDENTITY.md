# Enterprise Identity — architecture

**Item:** #21  
**ADR:** `docs/ADR-ENTERPRISE-IDENTITY.md` (extends `docs/ADR-IDENTITY-ADMIN-SUPPORT-ARCHITECTURE.md`)  
**#21 PASS:** NOT DECLARED  
**Production-ready claim:** NO  

This document describes the customer enterprise identity capability. It does not include secrets.

## Identity architecture

Supreme keeps **one identity plane**.

- One `User` model
- One `Organization` model
- Existing `Role` / RBAC remain authoritative
- Existing JWT + refresh session issuer
- Two authorization planes remain: customer application and Supreme platform administration

Enterprise SSO and SCIM create or update ordinary Supreme users in the asserting organization. They do not create a second user store, organization store, role system, or session system.

Platform TOTP MFA and platform/support break-glass (`supportAccessService`) are unchanged.

## SSO model

Each organization may configure one SAML or OIDC identity provider (`IdentityProvider`). Status is truthful:

| Status | Customer label |
|---|---|
| none | Not configured |
| DRAFT / CONFIGURED | Configured — not verified |
| TESTED | Configured — verified |
| ENABLED | Enabled |
| DISABLED | Disabled |

`Connected` is never shown unless a real verification or enablement happened. Configuration without a successful test is not verified.

Login discovery: the user enters a work email. If that domain is **verified** and the provider is TESTED or ENABLED, Supreme returns `{ ssoAvailable, publicId, continueLabel }`. Discovery does not return organization name, tenant UUID, protocol, or ACS details.

## SAML flow

1. Administrator saves IdP entity ID, SSO URL, and public X.509 signing certificate.
2. Supreme publishes SP entity ID, ACS URL, and SP metadata.
3. User is redirected with a SAML AuthnRequest and RelayState.
4. IdP POSTs a SAMLResponse to `/api/v1/auth/sso/saml/acs/:publicId`.
5. Supreme validates XML signature, issuer, audience, destination, recipient, InResponseTo, NotBefore / NotOnOrAfter, then records the assertion ID for replay protection.
6. A one-time exchange code is issued. The browser completes at `/login/sso/complete`. JWTs are not placed in the ACS redirect URL.

Private IdP secrets are not stored. Only the public signing certificate is kept.

## OIDC flow

1. Administrator enters an issuer. Supreme uses discovery for authorization, token, and JWKS endpoints.
2. Authorization-code + PKCE. State and nonce are bound to a short-lived `SsoLoginState`.
3. Callback exchanges the code, then verifies the ID token: issuer, audience, signature (JWKS), expiry, nonce.
4. The same federated finish / exchange path as SAML is used.

Claims are not trusted because they decoded.

## JIT

If the IdP identity is valid and no Supreme user exists, JIT creates a user only when the organization policy allows it. The user is created on the existing `User` model with a random unusable password hash. The role comes from administrator-configured group mapping or the configured lowest default (`VIEWER`). The user cannot choose a privileged role.

## Account linking

Stable identity is `issuer + subject`, not email alone.

- Existing subject in this organization: reuse that user.
- Existing subject in another organization: deny.
- Existing email in this organization: link the subject.
- Existing email in another organization: deny.
- Disabled user: deny.

Email changes at the IdP do not create a second user when the subject is already linked.

## SCIM 2.0

Standards endpoints at `/scim/v2` and `/api/v1/scim/v2`:

- ServiceProviderConfig
- ResourceTypes
- Schemas
- Users (GET/POST/PUT/PATCH, filter `attr eq "value"`, pagination max 100)
- Groups (GET/POST, membership, explicit role mapping only)

Bearer tokens are high-entropy, organization-scoped, stored hashed, shown once, rotatable, and revocable. List APIs never return the secret.

SCIM users are ordinary Supreme users. `active=false` disables the user, revokes refresh tokens, increments `sessionEpoch` so existing access JWTs fail, and preserves historical attribution.

## Role / group mapping

Administrators map IdP / SCIM group names to existing Supreme roles. Unknown groups are ignored. Multiple matches take the **lowest** mapped authority. SCIM group names cannot invent Supreme roles.

## Tenant isolation

Provider, domain, SCIM token, group, and mapping rows are organization-scoped. Domains are globally unique. Org A cannot claim Org B’s domain, authenticate into Org B, or use a SCIM token against Org B.

## Deprovisioning and session revocation

Deactivation:

- `User.status = DISABLED`
- refresh tokens revoked
- password-reset tokens consumed
- `sessionEpoch` incremented
- historical records remain attributed to the same user id

## Audit

Identity events use `recordAudit`. Sensitive keys (`assertion`, `samlResponse`, tokens, secrets) are redacted. Raw assertions and bearer tokens are not stored.

## Customer break-glass

Mandatory SSO requires a verified domain, a successful test, and a recovery administrator. That administrator (and time-limited customer grants) may still use a password. This is not platform/support break-glass.

## MFA

| Path | Policy |
|---|---|
| Local customer password | Existing customer policy |
| Customer SSO | IdP authentication. Supreme does not claim IdP MFA without AMR/ACR evidence |
| Customer break-glass | Existing customer password path; audited |
| Platform staff | Existing TOTP remains required |

## Hosted verification requirements

- Organization Admin can open Identity & Access
- Viewer / Assessor / Approver cannot mutate identity
- Domain claim + verification workflow
- SSO configuration and test-connection behavior
- JIT and existing-account linking (automated)
- Role mapping
- SCIM token create / rotate / revoke
- SCIM user create / retry / deactivate
- Session revocation after deprovision
- Tenant isolation
- Audit
- Responsive / accessibility on changed routes

Live Entra / Okta / Google sign-in is not claimed unless a real IdP is used. Automated tests sign and verify standards-based messages.

## Security assumptions

- xml-crypto and jose perform cryptographic verification. Supreme does not invent signature algorithms.
- Replay records are unique per provider + assertion ID.
- Redirects after ACS go only to the configured customer frontend + `/login/sso/complete`.
- Discovery rate-limited by `ssoLimiter`.
- `IDENTITY_ALLOW_TOKEN_VERIFY` is a test/staging hook for domain verification without live DNS. It is not a production default.

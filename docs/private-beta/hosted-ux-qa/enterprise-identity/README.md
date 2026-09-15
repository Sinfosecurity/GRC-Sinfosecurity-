# Hosted #21 Enterprise Identity

**SHA:** `b01609aa7c45414bf3c3a2ca08249bf574366952`  
**Frontend:** https://supreme-risk-staging.onrender.com  
**API:** https://supreme-risk-staging-api.onrender.com  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34930403949 PASS  
**#21 PASS:** NOT DECLARED  
**Live Entra / Okta / Google:** NOT TESTED  

Elite Claims Identity & Access showed **Not configured** — no fake Connected badge.

A separate walk organization was used for mutating SSO/SCIM so Elite Claims was not placed under mandatory Company SSO.

## Proved on hosted staging

- Organization Admin opens Identity & Access
- Truthful overview states
- Provider create
- Enable / require Company SSO blocked until a successful test
- Domain claim started; verify without DNS correctly failed
- SCIM token created once and not re-listed
- SCIM user create, retry/idempotency, deactivate
- SCIM JWT from another tenant cannot list Users
- Responsive 375 / 768 / 1024 / 1440 / 1920
- axe on Identity Overview: 0 serious / 0 critical

## Not proved live

- Real SAML or OIDC identity provider sign-in
- DNS / well-known domain verification against a customer domain
- Viewer hosted session (CI denied Viewer `identity.manage` mutations)

## Screenshot index

- `identity-overview-375.png`
- `identity-overview-768.png`
- `identity-overview-1024.png`
- `identity-overview-1440.png`
- `identity-overview-1920.png`
- `identity-sso-1440.png`
- `identity-domains-1440.png`
- `identity-provisioning-1440.png`
- `identity-mapping-1440.png`
- `identity-policy-1440.png`
- `login-sso-discovery.png`

Raw SCIM secrets and certificates are not in this folder.

# Hosted #21 Enterprise Identity — origin correction

**Implementation SHA:** `e19f8bde268d668518b848acd6086d7723f7177d`  
**Frontend hosted SHA:** `e19f8bde268d668518b848acd6086d7723f7177d`  
**API hosted SHA:** `e19f8bde268d668518b848acd6086d7723f7177d`  
**Frontend:** https://supreme-risk-staging.onrender.com  
**API:** https://supreme-risk-staging-api.onrender.com  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35374688343 PASS  
**#21 PASS:** NOT DECLARED  
**LIVE IDP FEDERATION:** NOT TESTED  

Elite Claims Identity & Access remained **Not configured**. Mutating checks used a disposable Identity Walk organization. Company SSO was not required. No fake IdP credentials were used.

## Hosted service-provider origin

The previous localhost ACS / SP entity ID defect is not present on this SHA.

- Assertion Consumer Service URL: `https://supreme-risk-staging-api.onrender.com/api/v1/auth/sso/saml/acs/idp_72c720cec866`
- Service provider entity ID: `https://supreme-risk-staging-api.onrender.com/saml/sp/idp_72c720cec866`
- Metadata XML: same ACS and entity ID; no localhost
- SCIM 2.0 base URL: `https://supreme-risk-staging-api.onrender.com/scim/v2`

Screenshot proof: `identity-sso-1440.png`

## Proved on hosted staging

- Organization Admin opens Identity & Access
- Truthful overview / SSO states: Not configured or Configured — not verified. No Connected badge
- Enable / Require Company SSO blocked until a successful test (409)
- Domain claim started; verify without DNS failed and remained Pending
- SCIM token created once, not re-listed, used, then revoked; revoked token denied
- SCIM user create, retry/idempotency, deactivate
- Cross-tenant admin JWT cannot list SCIM Users
- Activity shows human labels with raw event identifiers
- Responsive 375 / 768 / 1024 / 1440 / 1920
- axe on Identity Overview: 0 serious / 0 critical

## Not proved live

- Real Entra / Okta / Google Workspace / Ping sign-in
- DNS / well-known verification against a customer-owned domain
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
- `identity-activity-1440.png`
- `login-sso-discovery.png`

Raw SCIM secrets and certificates are not in this folder.

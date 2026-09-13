# Penetration test scope

**Classification:** preparation only
**External pentest performed:** NO
**Production in scope:** NO

This document prepares a future authorized assessment. It does not claim a pentest occurred.

## In-scope environment

| Asset | URL |
|---|---|
| Staging frontend | https://supreme-risk-staging.onrender.com |
| Staging API | https://supreme-risk-staging-api.onrender.com |

Use **synthetic certification tenants only**. Do not use production customer data. Production hosts `app.supremerisk.com` / `admin.supremerisk.com` are **out of scope** until DNS is intentionally activated.

## In-scope roles

- Customer: `ORGANIZATION_ADMIN`, `ASSESSOR`, `APPROVER`, `VIEWER`
- Platform: `PLATFORM_OWNER`, `SECURITY_ADMIN`, `SUPPORT_ADMIN`, `SUPPORT_ANALYST`, `BILLING_SUPPORT`

## Test-account policy

- Create accounts through public signup or Platform Owner invitation on staging
- No shared default credentials
- Destroy or disable cert accounts after the engagement
- Do not persist TOTP secrets, recovery codes, or JWTs in tickets

## Third-party services — out of scope

Do not attack:

- Stripe (including test-mode abuse beyond the application’s own checkout/portal/webhook handling)
- Resend / SMTP providers
- GitHub
- Render shared infrastructure / other customers
- ClamAV as a generic Internet scanner (application upload policy may use EICAR only)

## Prohibited destructive actions

- Denial of service against Render or shared databases
- Uncontrolled credential stuffing / password spraying
- Real malware (EICAR only)
- Data destruction of shared staging beyond the tester’s tenants
- Changing production DNS or deploying production

## Contact / escalation

A dedicated public security mailbox is **not published**. Until Product Leadership designates one, escalate through the Platform Owner / program contact used for this repository. Do not invent `security@…` addresses.

## Evidence handling

- No secrets in reports (passwords, TOTP, recovery codes, JWTs, Stripe keys, connection strings)
- Tenant data from synthetic orgs only
- Findings should map to `docs/FINAL-SECURITY-REVIEW.md` IDs when overlapping

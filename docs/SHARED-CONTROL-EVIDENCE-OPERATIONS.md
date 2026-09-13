# Shared Control & Evidence Operations

**Audience:** operators and implementers  
**Item:** #14  
**Commercial production:** NO

## Routes

Tenant API prefix: `/api/v1/scc`

| Method | Path | Permission |
|---|---|---|
| GET | `/summary` | `control.read` |
| GET | `/controls` | `control.read` |
| GET | `/controls/:id` | `control.read` |
| PATCH | `/controls/:id` | `control.manage` |
| POST | `/controls/:id/tests` | `control.test` |
| GET | `/frameworks` | `framework.read` |
| GET | `/evidence` | `evidence.read` |
| POST | `/evidence/links` | `evidence.link` |
| POST | `/evidence/links/:id/review` | `evidence.review` |
| POST | `/evidence/links/:id/unlink` | `evidence.link` |
| GET | `/evidence/:id/impact` | `control.read` |
| GET | `/reports/:kind` | `report.export` |

Leftover `/api/v1/controls` remains the quarantined pre-TPRM CRUD. Do not point Control Center at it.

## First read

The first Control Center or framework-coverage read seeds the Supreme catalog and adopts missing `controlKey` values into the tenant without overwriting tenant edits.

## Malware

Do not treat PENDING, FAILED, INFECTED, ERROR, or NOT_CONFIGURED files as usable supporting evidence. Download policy stays fail-closed in the Evidence Vault.

## Recovery

`AUTHORITATIVE_TABLES` includes:

- `ControlCatalogEntry`
- `OrganizationControl`
- `FrameworkDefinition`
- `FrameworkVersion`
- `FrameworkRequirement`
- `RequirementControlMapping`
- `EvidenceGovernanceLink`
- `OrganizationControlTest`

Restore must preserve tenant ownership, mappings, evidence links, tests, and temporal `validTo` / freshness. Isolated recovery only. Do not restore onto live staging or production.

## Audit

Audited actions include control update, evidence link / unlink / review, and control test. Do not log file bodies or secrets.

## Reports

Control Coverage, Evidence Coverage, Framework Readiness, and Control Testing use live tenant data and the same operational export entitlement as other TPRM reports. They are readiness reports.

## Graph

Backfill adopts catalog controls and projects REQUIREMENT `SATISFIED_BY` CONTROL, EVIDENCE `SUPPORTED_BY` CONTROL, CONTROL `TESTED_BY` CONTROL_TEST. Do not invent MITIGATES or APPLIES_TO edges unless a user recorded that fact.

## Stop conditions

Do not start #15. Do not merge `main`. Do not deploy commercial production. Do not enable live Stripe.

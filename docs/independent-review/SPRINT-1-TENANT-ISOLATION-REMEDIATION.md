# Sprint 1 — Tenant Isolation Closure (C-2 / H-1)

Engineering evidence only. Product Leadership decides finding closure.

**Starting SHA:** `a051d04268b58bf57f83d9b53b4b8c62bf284ff5`  
**Scope:** C-2 and H-1 only. C-1 and H-2–H-7 were not changed.  
**Migration:** NONE. No schema redesign. Composite tenant FKs remain a follow-up.

## Invariant

No tenant-owned child may reference or expose a parent that has not first been proven to belong to the authenticated organization. Organization identity comes from the session, never from body/query.

## Helpers

`backend/src/security/tenantOwnership.ts`

- `requireVendorForOrganization`
- `requireAssessmentForOrganization` (optional vendor consistency → 409 same-tenant mismatch, 404 cross-tenant)
- `requireContractForOrganization`
- `requireAppetiteBreachForOrganization`
- `requireBusinessUnitForOrganization`
- `omitForeignParent` for include leakage

Cross-tenant lookup: **404** with no foreign name, public ID, or organization name.

## Historical malformed data

**NOT CHECKED** against hosted staging. No repair executed.

Read-only query if Product Leadership authorizes a staging inspection:

```sql
SELECT 'VendorAssessment' AS model, a.id, a."organizationId" AS child_org, v."organizationId" AS parent_org
FROM "VendorAssessment" a
JOIN "Vendor" v ON v.id = a."vendorId"
WHERE a."organizationId" <> v."organizationId";

SELECT 'VendorIssue' AS model, i.id, i."organizationId" AS child_org, v."organizationId" AS parent_org
FROM "VendorIssue" i
JOIN "Vendor" v ON v.id = i."vendorId"
WHERE i."organizationId" <> v."organizationId";
```

## Schema follow-up

Application guards are in place. Composite FKs `(organizationId, vendorId)` were not added in this sprint.

## Planes

- Customer `/api/v1/monitoring/dashboard` and `/business`: tenant-scoped counts.
- Root `/metrics`: still `METRICS_TOKEN` only (platform/ops). Not a customer-plane path. Unauthenticated and ordinary tenant tokens receive **404** (`Route /metrics not found`).

## Closed paths (engineering)

### C-2 assessment creation

| Route | Service | Parent check |
| --- | --- | --- |
| `POST /api/v1/tprm/vendors/:vendorId/assessments` | `vendorAssessmentService.createAssessment` | `requireVendorForOrganization(sessionOrg, vendorId)` before insert |
| `POST /api/v1/vendors/:id/assessments` | same | same; path `id` is the vendor; body `organizationId` ignored |

Cross-tenant vendor: **404**, no vendor/org name. Same-tenant create: **201**.

### C-2 finding / vendor-issue creation

| Route | Service | Parent check |
| --- | --- | --- |
| `POST /api/v1/tprm/vendors/:vendorId/findings` | route `findFirst(id+org)` then `vendorIssueService.createIssue` | vendor scoped; optional `assessmentId` via `requireAssessmentForOrganization` + vendor consistency |
| `POST /api/v1/vendors/:id/issues` | `vendorIssueService.createIssue` | same |

Cross-tenant vendor or assessment: **404**. Same-tenant vendor/assessment mismatch: **409**. Includes use `omitForeignParent`.

### H-1

| Path | Route | Service check |
| --- | --- | --- |
| Risk history | `GET/POST /api/v1/vendors/risk-history/:vendorId[/snapshot]` | vendor `findFirst(id+organizationId)` |
| Appetite breach | `POST /api/v1/risk-appetite/breaches/:breachId/resolve` | `requireAppetiteBreachForOrganization` |
| Contract analysis | `GET /api/v1/vendors/contracts/:contractId/risk-analysis` | `requireContractForOrganization` |
| SLA | `POST /api/v1/vendors/contracts/:contractId/sla` | same; session org overwrites body org |
| Legacy offboard | `POST /api/v1/vendors/:id/offboard` | vendor loaded by id+org **before** transaction. Canonical TPRM replacement remains `POST /api/v1/tprm/vendors/:vendorId/offboard`. Route kept. |
| ERM business unit | `POST /api/v1/erm/risks` | `requireBusinessUnitForOrganization`; forged body `organizationId` → **403** |
| Metrics | `GET /api/v1/monitoring/business` | `requireTenant` + `getMetricsSummary(organizationId)` — **CUSTOMER** plane |

## Tests

- `backend/src/__tests__/independent-review-c2-h1.isolation.test.ts` — 14 exploit-first cases
- `backend/src/__tests__/tenant-ownership.test.ts` — 2 helper cases
- Existing tenant isolation / IDOR / vendor-plane / support-plane suites unchanged and not weakened

CI `34963031173` on `a158c5afe7b2e3866388a49847beb3b881c0de85`: Prisma generate/validate, migrate deploy (24 migrations), backend **87 suites / 432 tests**, frontend **56 files / 174 tests**, typecheck, build, secret scan — all PASS.

## Hosted two-tenant proof (staging)

API `https://supreme-risk-staging-api.onrender.com` `/health` `gitSha=a158c5afe7b2e3866388a49847beb3b881c0de85` (status `degraded`, environment `staging`). Frontend deploy Live on the same SHA.

Two disposable organizations were signed up. Org A token was used against Org B object IDs. Org B rows were not updated on denied paths.

| Probe | HTTP | Metadata |
| --- | --- | --- |
| `POST /tprm/vendors/{B}/assessments` + forged org | **404** | none |
| `POST /vendors/{B}/assessments` + forged org | **404** | none |
| Same-tenant assessment create | **201** | n/a |
| `POST /tprm/vendors/{B}/findings` | **404** | none |
| `POST /vendors/{B}/issues` + forged org | **404** | none |
| Org A finding with Org B `assessmentId` | **404** | none |
| `GET /vendors/assessments/{B}` | **404** | none |
| Same-tenant finding create | **201** | n/a |
| Risk-history snapshot/read of vendor B | **404** / **404** | none |
| Same-tenant risk-history snapshot | **201** | n/a |
| Appetite resolve unknown UUID | **404** | none |
| Contract analysis unknown UUID / vendor-id-as-contract | **404** | none |
| SLA write unknown UUID / vendor-id-as-contract | **404** | none |
| `GET /vendors/{B}/contracts` as A | **200 `[]`** | none |
| Legacy offboard vendor B | **404**; B still `PROPOSED` | none |
| ERM risk with B `businessUnitId` | **404** | none |
| ERM risk with forged `organizationId` | **403** | none |
| Same-tenant ERM + own unit | **201** | n/a |
| `GET /monitoring/business` A vs B | **200**; each `vendors=1` | no B name in A |
| Customer token `GET /metrics` | **404** | platform plane hidden |
| Customer token vendor-portal assessment | **401** | vendor plane isolated |

Hosted same-tenant **contract create** is blocked by a pre-existing validator/Prisma `ContractType` mismatch (`MSA` vs `MASTER_SERVICE_AGREEMENT`). Hosted **appetite create** returns **500** because `reviewFrequency` is required in the service but stripped by the public schema. Those are not C-2/H-1 paths and were not changed. Real Org B contract and breach IDs were therefore proved in the isolation suite, not created on staging. No data repair ran.

**MIGRATION: NONE**

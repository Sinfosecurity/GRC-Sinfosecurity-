# Staging E2E certification

**Branch:** `supreme-risk-transformation`
**Starting SHA:** `ee25ffa04f87c5086ac731ecc4b20c13b3cc6c76`
**Public staging URL:** BLOCKED — none exists
**Isolated local UI:** `http://127.0.0.1:3200`
**Isolated local API:** `http://127.0.0.1:4100`

Public hosted browser E2E was not run. Localhost evidence below is not represented as public E2E.

## Public hosted E2E

**Result: BLOCKED**

No publicly reachable isolated Supreme Risk staging environment was created. Render has no Supreme Risk staging service. A Cloudflare tunnel to the preview stack (`3100`) is not isolated staging and was not used.

## Isolated local TPRM E2E (prior certification, still the latest full browser pass)

Ran against `http://127.0.0.1:3200` / `http://127.0.0.1:4100` with banner **SUPREME RISK — STAGING**.

| Step | Result |
| --- | --- |
| Marketing homepage | PASS on isolated UI |
| Request Demo | PASS (form submits) |
| Sign in | PASS |
| Organization profile | PASS |
| Invite user / revoke | PASS |
| Role management | PASS |
| Add vendor | PASS |
| Start / complete assessment | PASS |
| Upload evidence | PASS — StoredObject + EvidenceLink, scan `NOT_CONFIGURED` |
| Evidence policy | PASS — download 403 until CLEAN |
| Finding / CAP / validate / close | PASS |
| Recalculate explainable risk | PASS |
| Decision Brief + human decision | PASS — snapshot unchanged by AI |
| Report pack (10 downloads) | PASS — PDF/CSV/XLSX/PPTX |
| Audit log | PASS |
| Provider / environment status | PASS |
| Stripe subscription | BLOCKED — credentials required |

## Isolated notification E2E (this sprint, API + Mailpit)

Not a browser pass. Exercised the authenticated TPRM API on `4100` and confirmed Mailpit delivery.

| Event | In-app | Mailpit subject |
| --- | --- | --- |
| assessment.assigned | yes | Assessment assigned |
| assessment.completed | yes | Assessment completed |
| finding.assigned | yes | Finding assigned |
| remediation.requested | yes | Corrective action requested |
| remediation.validation_requested | yes | Remediation validated |
| finding.closed | yes | Finding closed |
| approval.requested | yes | Approval requested |
| approval.decision | yes | Decision recorded |
| ops.alert | yes | SUPREME RISK — STAGING alert test |

`FAILED` / `NOT_CONFIGURED` email states are covered by Jest (`notification-workflow.test.ts`), not by disabling staging SMTP.

## Isolated negative API (prior + still valid locally)

| Check | Result |
| --- | --- |
| Cross-tenant empty list | PASS |
| Assessor executive PDF | 403 |
| Expired session | 401 |
| Malformed vendor create | 400 |
| Stripe webhook without keys | 400/503 |
| Disabled-user / revoked invite | covered by Jest |

Public negative security E2E: **BLOCKED** (no public URL).

## Performance smoke (isolated API, 2026-09-12)

| Operation | Observed |
| --- | --- |
| Login | 197 ms |
| Vendor list | 52 ms |
| Assessment list | 16 ms |
| Findings list | 5 ms |
| Attention | 15 ms |
| System status | 7 ms |
| Findings CSV | 49 ms / 386 B |
| Executive PDF | 51 ms / 7320 B `%PDF-` |

No unbounded-query incident observed at this dataset size. This is not 100K-vendor certification.

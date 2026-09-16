# #12-V Supreme Experience 2.0 — Hosted Certification

Engineering evidence only. Product Leadership decides #12 PASS.

This is not a claim that Supreme is better than OneTrust. This is not private-beta ready or production-ready.

**Starting SHA:** `11b37f52006092bee3e15b8bb1608650cdb0151c`  
**Implementation SHA:** `a11405ff624571336dcc4cbd8690be48149c0a2f`  
**Hosted API SHA:** `a11405ff624571336dcc4cbd8690be48149c0a2f` (`GET /health` `gitSha`)  
**Hosted frontend SHA:** `a11405ff624571336dcc4cbd8690be48149c0a2f` (`/version.json`)  
**SHA match:** YES  
**`/health/build`:** route not present; `/health` is the hosted SHA evidence  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35048895472 PASS on `a11405f` (90 backend suites / 447 tests; 58 frontend files / 178 tests)  
**Migration:** NONE  
**Branch:** `supreme-risk-transformation`  
**Environment:** staging only. Production not deployed. `main` not merged.

## Fresh hosted vendor

`VND-2026-0017` on SHA `a11405f`.

| Step | Result |
| --- | --- |
| Request | 201 |
| Unknown complete | 400, privileged-access customer message |
| Unknown save | 200 |
| Intake | 200 |
| Pack confirm | 200 |
| Send email | 201 Queued. Queued is not inbox delivery |
| Activate / reuse | 200 / 410 |
| Vendor plane | 401 on `/api/v1/vendors` |
| Vendor submit | 9/9 assessments, 36 questions |
| Exceptions | 36 recorded · 14 satisfactory · 6 need clarification · 30 potential findings |
| Finding / acceptance | 200 / 200. Residual remained recorded; acceptance did not lower it |
| Contract / approval / activate | 200 / 200 / ACTIVE |
| Next reassessment | 2027-01-20 from existing rules |
| Reassessment read | 200 |

## Personas

| Persona | Landing | Next action visible | Irrelevant admin |
| --- | --- | --- | --- |
| Requester | Request a third party | Submit request | Programs/Administration collapsed |
| Internal contact / analyst | Home attention + vendor Assessment tab | Complete intake / Review N items | Domain programs not required to finish TPRM |
| Vendor | Security review for Elite Claims | Continue / View submission | Customer dashboards hidden |
| Approver | Decisions tab / decision briefs | Recorded decision brief on the same workspace | Vendor cannot accept risk |

## Accessibility

Hosted method: Playwright `page.evaluate` of local `scripts/axe.min.js` via CDP. Application CSP was not changed. `bypass_csp` was not used.

Pages: home, register, request, workspace, assess, decision, monitor, vendor landing, questionnaire.

Serious: 0. Critical: 0. No rules suppressed.

Keyboard: PARTIAL. No dedicated focus-trap walk in this sprint. Tab order was not failed by axe.

Contrast: PASS under wcag2aa on the pages above.

## Responsive

375 / 768 / 1024 / 1440 / 1920 captured for home, register, request, workspace, assess, decision, monitor, vendor landing, and questionnaire. Finding, evidence, and history captured at 375 and 1440. No page-level horizontal overflow.

## Performance

Home API requests before (#12-F / premium closure): 8, including unused domain dashboards for admin roles.

Home API requests after: 5 on the hosted page load (`auth/me`, `organization/current`, `tprm/attention`, `vendors/statistics`, `intelligence/teaser`). Dashboard body uses the last three. Layout uses the first two. Domain dashboards are not fetched to render Home.

Vendor workspace: existing onboarding GET plus reassessment GET only when Active/Reassessment/Offboarding.

Request waterfall: PARTIAL. Home no longer fans out to Risk/Compliance/Privacy/AI dashboards.

## Screenshot mapping

Folder: `docs/private-beta/hosted-ux-qa/supreme-experience-2/`

Prior folders were not overwritten.

| Required surface | Evidence |
| --- | --- |
| Home | `home-{375,768,1024,1440,1920}.png` |
| Register | `register-*` |
| Request | `request-*` |
| Assess / intake / result / packs / send | `assess-*` (one Assessment tab) |
| Vendor landing | `vendor-landing-*` |
| Questionnaire / submit | `questionnaire-*` |
| Evidence | `evidence-375`, `evidence-1440` |
| Exception review / decision brief / approval | `decision-*` |
| Finding / remediation | `finding-375`, `finding-1440` |
| Active / monitor / reassessment | `workspace-*`, `monitor-*` |

## Security / scoring on this walk

C-1 / C-2 / H-1 / H-3 were not reopened. Token reuse 410. Vendor plane 401. Malware policy unchanged. Risk acceptance recorded without lowering residual. H-2 and H-4–H-7 were not implemented.

## Remaining limitations

- The hosted fixture produced 30 potential findings of 36 answers, so the exception list is still long. The first experience is the count and one next action, not a workbook dump, but a high-exception vendor still has many rows.
- Assessment tab still contains the completed intake, packs, and send forms for inspection. That is one workspace, not four products, and it is a long page after Active.
- Keyboard certification is PARTIAL.
- Invitation remains Queued ≠ Delivered. Inbox receipt was not tested.
- `/health/build` is not a hosted route.

Cursor does not declare #12-V PASS, #12 PASS, better than OneTrust, private-beta ready, or production-ready.

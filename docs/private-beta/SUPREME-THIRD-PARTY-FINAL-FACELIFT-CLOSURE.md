# #12-F Supreme Third Party — Final Facelift Closure

Engineering evidence only. Product Leadership decides #12 PASS.

**Starting SHA:** `96ab7aed3c5d184639ebf7929768f3a7072c65a5`  
**Implementation SHA:** `35f2e32b9a5d71fd2c837a358858b5cf1b2b5cbd`  
**Unknown-block SHA:** `322f4bfb4beb37f6416a5e2035bb6ec882ac43d6`  
**Hosted frontend SHA:** `35f2e32b9a5d71fd2c837a358858b5cf1b2b5cbd`  
**Hosted API SHA:** `35f2e32b9a5d71fd2c837a358858b5cf1b2b5cbd`  
**SHA match:** YES  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35047762510 PASS  
**CI counts:** backend 90 suites / 447 tests; frontend 56 files / 175 tests  
**Migration:** NONE  
**Branch:** `supreme-risk-transformation`

## What changed

- Controlling Unknown facts can be saved and resumed. They block intake finalization, package confirmation, and invitation.
- Customer copy names the unresolved fact. Unknown is not treated as No.
- Resolving the fact recalculates packs. Privileged Unknown → High adds Privileged and Network Access.
- Disabled intake helper text and vendor overlines use readable Supreme tokens on cream.
- Evidence scan labels use Uploading / Scanning / Ready / Rejected / Security status unavailable.

Scoring methodology, tenant isolation, hard floors, Phase C, RBAC, Automation, Governance Graph, and Shared Evidence were not redesigned.

## Fresh hosted vendor

`VND-2026-0002` on SHA `35f2e32`.

| Step | Result |
| --- | --- |
| Unknown save | 200, INTAKE, unresolved scope present |
| Unknown complete | 400, privileged-access customer message |
| Unknown plan / send | 409 |
| Resolve IR-04 High | 200, TIER_REVIEW, privileged-network pack present |
| Request / intake | 201 / 200, Critical, inherent 80, residual 80 |
| Below-floor LOW | 409 |
| Packs | Baseline plus six selected packs |
| Send email | Email queued. Queued is not inbox delivery |
| Copy link | Not emailed |
| Activate / reuse | 200 / 410 |
| Landing | Requesting org, vendor, due, progress, Begin/Resume |
| Questionnaire / save / resume | 10 questions, last-saved returned, answer persisted |
| Evidence | 201 Ready after upload |
| Submit without attest | 400 |
| Submit | 200, confirmation shown |
| Analyst review | Vendor in progress, 10 exception items |

## Accessibility

Hosted method: Playwright `page.evaluate` of local `scripts/axe.min.js` via CDP. Application CSP was not changed.

Pages: register, request, unknown-block, workspace, request-tab, intake, tier, packs, send, review, findings, contract, approval, active, vendor-landing, questionnaire.

Serious: 0. Critical: 0. No rules suppressed.

## Responsive

375 / 768 / 1024 / 1440 / 1920 captured for intake, packs, send, vendor landing, questionnaire, analyst review, approval, and register. No page-level horizontal overflow.

## Email consistency

Hosted `GET /api/v1/system/email-previews` (`sent=false`) on this SHA:

- vendor.intake_assigned
- vendor.invitation
- vendor.invitation_reminder
- vendor.clarification_requested
- vendor.assessment_submitted
- vendor.approval_required
- automation.work
- auth.password_reset

Shared shell, Supreme header, context card, gold CTA, footer, and plain-text fallback. Invitation subject: `Action required: Complete your due diligence for Northwind Insurance`. Sender display: `Northwind Insurance via Supreme`. Inbox receipt was not tested. Staging email health was DEGRADED.

## Screenshots

`docs/private-beta/hosted-ux-qa/12-f-final-facelift/` was not overwritten.

New folder: `docs/private-beta/hosted-ux-qa/12-f-final-closure/`

## Remaining limitations

- Keyboard proof is representative, not every control on every page.
- Only one due-diligence pack was fully submitted on the golden vendor; other assigned packs remained open.
- Offboarding used no separate disposable fixture in this run.
- Real inbox delivery was not observed.
- H-2 and H-4–H-7 remain out of scope.

Cursor does not declare #12-F PASS, #12 PASS, private-beta ready, or production-ready.

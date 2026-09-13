# Private-beta UX defect register

Severity: P0 security/isolation/data loss · P1 principal workflow unusable · P2 important UX · P3 cosmetic.

## Closed in this remediation

| ID | Sev | Issue | Resolution |
|---|---|---|---|
| UX-001 | P1 | Authorized tester saw Download PDF then “You do not have permission to export this report.” | Root cause: hosted Stripe CONNECTED + tester org on STARTER (`advancedReporting: false`). Frontend mapped every 403 to a permission sentence. Fix: `isDemo` orgs may use reporting entitlements; role matrix distinguishes Viewer vs Assessor vs Admin; buttons disable with a plan/role reason. |
| UX-002 | P1 | Questionnaire library was a single short due-diligence form. | Seeded 15 Supreme templates with domains, evidence prompts, and conditionals. |
| UX-003 | P1 | Assessment UX was one undifferentiated list. | Section navigation, progress, save status, recommendations, Previous/Next. |

## Open

| ID | Sev | Issue |
|---|---|---|
| UX-010 | P2 | Full hosted golden-journey click-through of every report file on staging still required from Product Leadership after this SHA. |
| UX-011 | P2 | Custom questionnaires are clone-only; no visual question builder. |
| UX-012 | P2 | Critical-answer → automatic finding rules are documented, not auto-encoded for every example. |
| UX-013 | P3 | Assessment autosave is per-answer explicit save, not background debounce. |
| UX-014 | P3 | Sidebar still shows Environment/Security to all signed-in users. |

No known P0. Prior P1 report and questionnaire-library defects are closed in code pending Product Leadership browser acceptance.

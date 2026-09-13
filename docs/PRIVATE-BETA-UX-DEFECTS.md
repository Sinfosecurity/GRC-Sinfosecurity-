# Private-beta UX defect register

Severity: UX-P1 unusable/confusing primary workflow · UX-P2 major professional-quality issue · UX-P3 minor polish. Security/isolation remains P0 in other registers.

## Closed in this remediation

| ID | Sev | Issue | Resolution |
|---|---|---|---|
| UX-001 | P1 | Authorized tester saw Download PDF then “You do not have permission to export this report.” | `isDemo` reporting entitlements; role matrix; disabled Generate actions with a plain-language reason. |
| UX-002 | P1 | Questionnaire library was a single short due-diligence form. | 15 Supreme templates with domains, evidence prompts, and conditionals. |
| UX-003 | P1 | Assessment UX was one undifferentiated list. | Section navigation, progress, save status, Previous/Next. |
| UX-014 | P3 | Sidebar showed Environment/Security to every signed-in user. | Removed from customer navigation. Environment remains reachable only by direct URL for operators. |
| UX-030 | P2 | Customer UI was an indigo/pink glass admin template. | Navy/gold design system: tokens, typography, PageHeader, tables, badges, skeletons, grouped role-aware nav. |

## Open

| ID | Sev | Issue |
|---|---|---|
| UX-019 | P1 | Hosted Reports were disabled because the tenant behind vendor “Supreme Investigation” is Elite Claims: STARTER, `isDemo=false`, PAST_DUE, Stripe test mode CONNECTED. Evaluation access is now an authorized Platform workflow. Hosted Executive PDF on SHA `783bccf` downloaded and opened (2 pages). #12 remains FAIL pending Product Leadership visual acceptance. |
| UX-020 | P1 | Dashboard treated `/health` `degraded` as “API unreachable” while the API answered 200. Engineering chip removed; reachability is no longer a customer banner. |
| UX-021 | P1 | Designated evaluation orgs could still see “billing is not in good standing” on assessment writes if status was PAST_DUE. Evaluation orgs now skip write-standing checks; designation restores TRIAL standing. |
| UX-022 | P1 | Invitation PENDING was treated as email sent. Invitation lifecycle and email delivery are now separate. Customer copy is “Invitation created” / queued / not sent. |
| UX-023 | P1 | Assessment Center was vendor dropdown + template dropdown + Start. Replaced with recommended-plan wizard and focused questionnaire workspace. |
| UX-010 | P2 | Hosted golden-journey click-through of every report file on staging still required from Product Leadership. |
| UX-011 | P2 | Custom questionnaires are clone-only; no visual question builder. |
| UX-012 | P2 | Critical-answer → automatic finding rules are documented, not auto-encoded for every example. |
| UX-013 | P3 | Assessment save is per-answer, not background debounce. |
| UX-015 | P2 | Product Leadership must accept this redesign on **hosted staging**. Local screenshots in `docs/private-beta/ux-qa/` are not hosted proof. |
| UX-016 | P3 | On ~900px-tall viewports, Administration items below Organization may require a short sidebar scroll. |
| UX-017 | P3 | Vendor detail related modules (assessments, evidence, findings) deep-link to workspaces rather than embedding full inline lists. |
| UX-018 | P3 | Primary actions use gold fills; further restraint is possible if Product Leadership wants gold only on a single page CTA. |

Hosted Executive PDF download on SHA `783bccf` is proven (`docs/private-beta/ux-qa/hosted-reports/`). #12 remains PARTIAL. External testers must not be invited.

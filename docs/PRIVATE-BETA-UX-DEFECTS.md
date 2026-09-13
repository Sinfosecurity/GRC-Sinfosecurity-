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
| UX-019 | P1 | Hosted Product Leadership org “Supreme Investigation” had all report downloads disabled: “This download is not included in the current plan. Private-beta tester organizations can export reports.” The org was a normal STARTER signup (`isDemo=false`) while Stripe is CONNECTED. Fix: Platform Owner designates evaluation access through Platform → Private testers / organization detail. Customer-facing copy no longer mentions tester-org implementation. Hosted designation + Executive PDF download still required before Reports PASS. |
| UX-010 | P2 | Hosted golden-journey click-through of every report file on staging still required from Product Leadership. |
| UX-011 | P2 | Custom questionnaires are clone-only; no visual question builder. |
| UX-012 | P2 | Critical-answer → automatic finding rules are documented, not auto-encoded for every example. |
| UX-013 | P3 | Assessment save is per-answer, not background debounce. |
| UX-015 | P2 | Product Leadership must accept this redesign on **hosted staging**. Local screenshots in `docs/private-beta/ux-qa/` are not hosted proof. |
| UX-016 | P3 | On ~900px-tall viewports, Administration items below Organization may require a short sidebar scroll. |
| UX-017 | P3 | Vendor detail related modules (assessments, evidence, findings) deep-link to workspaces rather than embedding full inline lists. |
| UX-018 | P3 | Primary actions use gold fills; further restraint is possible if Product Leadership wants gold only on a single page CTA. |

UX-019 remains open until hosted staging designation and a real Executive PDF download are proven. External testers must not be invited.

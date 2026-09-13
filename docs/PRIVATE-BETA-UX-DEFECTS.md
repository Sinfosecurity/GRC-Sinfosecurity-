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
| UX-019 | P1 | Hosted Reports were disabled for Elite Claims billing standing. Closed: evaluation entitlement ≠ billing standing. Executive PDF re-downloaded on 2026-09-13 (8434 bytes, opens). |
| UX-020 | P1 | Dashboard treated `/health` `degraded` as “API unreachable.” Closed unless regression evidence appears. |
| UX-021 | P1 | Evaluation orgs blocked by PAST_DUE write-standing. Closed unless regression evidence appears. |
| UX-022 | P1 | Invitation PENDING treated as email sent. Delivery states are now separate. **Inbox receipt remains OPEN / USER ACTION REQUIRED.** |
| UX-023 | P1 | Assessment Center dropdown workflow. Closed as architecture; hosted wizard and library cards are live. |
| UX-024 | P1 | Duplicate Supreme templates. Closed on hosted staging: 16 canonical Supreme rows, 0 duplicate groups, custom clone labeled. |
| UX-010 | P2 | Hosted golden-journey click-through of every report file on staging still required from Product Leadership. |
| UX-011 | P2 | Custom questionnaires are clone-only; no visual question builder. |
| UX-012 | P2 | Critical-answer → automatic finding rules are documented, not auto-encoded for every example. |
| UX-013 | P3 | Assessment save is per-answer, not background debounce. |
| UX-015 | P2 | Product Leadership must accept this redesign on **hosted staging**. Local screenshots in `docs/private-beta/ux-qa/` are not hosted proof. |
| UX-016 | P3 | On ~900px-tall viewports, Administration items below Organization may require a short sidebar scroll. |
| UX-017 | P2 | Vendor Detail is a right-hand drawer, not a full-page flagship workspace. Hosted capture: `03-vendor-detail-1440.png`. |
| UX-025 | P2 | Platform Console interior not captured in this customer-admin session. Org Admin correctly receives Access Denied. |
| UX-018 | P3 | Primary actions use gold fills; further restraint is possible if Product Leadership wants gold only on a single page CTA. |

Hosted Executive PDF was re-downloaded during the 2026-09-13 closure run. #12 remains PARTIAL. Invitation inbox is USER ACTION REQUIRED. External testers must not be invited.

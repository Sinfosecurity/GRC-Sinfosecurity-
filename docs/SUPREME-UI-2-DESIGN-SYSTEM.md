# Supreme UI 2.0 Design System

**Authority:** shared visual language for the authenticated Supreme platform and vendor portal.  
**Status:** Engineering implementation. Not Product Leadership accepted.  
**Identity:** Supreme remains Supreme. The ledger generation replaces the navy L-chrome / cream-card generation.

This is not a page-by-page stylesheet. Tokens, theme, shell, and shared components carry the look.

---

## Principles

1. **Know what matters. See what it affects. Act on what needs attention.**
2. **Supreme does the administration. Humans make the decisions.**
3. **Evidence once. Govern everywhere.**
4. Color has meaning. Risk and governance status are the only places saturated color appears.
5. Surfaces are groups, not boxes. Hierarchy comes from canvas, type, spacing, and rules.
6. Customer language only on customer surfaces. No raw enums, provider names, or `NOT_CONFIGURED`.
7. Loading is not zero. Error is not all-clear. Partial is not complete.

---

## Tokens

Source: `frontend/src/design/tokens.ts`

| Token | Role | Value |
| --- | --- | --- |
| `navy950` / `navy900` | Ink chrome, primary action | `#100e0b` / `#1c1812` |
| `workspace` | Stone canvas | `#cfc8b8` |
| `surface` | Paper | `#f7f1e6` |
| `ink` / `inkMuted` | Text | `#16130f` / `#5c564c` |
| `gold` / `goldSoft` | Current state and primary accent | `#9a7b3c` / `#c4a056` |
| `critical` / `high` / `medium` / `low` | Risk and severity | `#9f2a1f` / `#a14a0d` / `#6a6458` / `#3d5c44` |
| Radius | Sharp ledger, not pill SaaS | `2–4px` |
| Type | Newsreader display, Source Sans 3 UI, IBM Plex Mono metrics | — |

Motion is 180–220ms and disabled when `prefers-reduced-motion: reduce`.

---

## Shell

- Warm-black rail with a brass inner edge.
- Light paper top bar. Organization in small caps. Search is an underline, not a dark pill.
- Workspace sits on stone, not nested cream cards.
- Customer navigation: Home, Third Parties, Risk, Compliance, Privacy, AI Governance, Intelligence, Automation, then Evidence, Reports, Administration.

---

## Shared components

| Component | UI 2.0 treatment |
| --- | --- |
| `AttentionHero` | Ink band, giant Newsreader count, gold kicker. Loading copy preserved. |
| `ExecutiveMetric` / `MetricCard` | Flush numerals. No metric boxes. |
| `PageHeader` | Display title, rule, gold eyebrow. |
| `Surface` | Divider grouping. No default bordered card. |
| `StatusBadge` | Left rule + uppercase label. Color is never the only cue. |
| `EmptyState` | Title + why + next action. No dashed box. |
| `LifecycleProgress` | Compact ticks. Current / completed / blocked / next. |
| `QueryState` | Skeleton while loading. Customer-safe errors. |

---

## Approval language

| System | Customer |
| --- | --- |
| Preparer, decision not recorded | Waiting for approval |
| Approver, decision not recorded | Ready for independent approval |
| `APPROVE` | Approved |
| `APPROVE_WITH_CONDITIONS` | Approved with conditions |
| `REJECT` | Rejected |
| `CLEAN` evidence | Ready |

The preparer does not see an Approve control. 403 remains the security backstop, not the normal experience.

---

## Out of scope

H-5, H-6, and #21 were not started. Risk methodology, certified security controls, and Phase C gates are unchanged.

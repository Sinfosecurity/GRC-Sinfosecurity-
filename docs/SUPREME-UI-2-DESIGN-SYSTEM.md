# Supreme UI 2.0 Design System

**Authority:** shared visual language for the authenticated Supreme platform and vendor portal.  
**Status:** Engineering implementation. Not Product Leadership accepted.  
**Identity:** Supreme remains Supreme. The boardroom-paper generation replaces both the navy L-chrome generation and the rejected flush-ledger generation.

This is not a page-by-page stylesheet. Tokens, theme, shell, and shared components carry the look.

---

## Principles

1. **Know what matters. See what it affects. Act on what needs attention.**
2. **Supreme does the administration. Humans make the decisions.**
3. **Evidence once. Govern everywhere.**
4. Color has meaning. Risk and governance status are the only places saturated color appears.
5. Work sits on ivory documents. The canvas is atmosphere; records, forms, and metrics live on paper.
6. Customer language only on customer surfaces. No raw enums, provider names, or `NOT_CONFIGURED`.
7. Loading is not zero. Error is not all-clear. Partial is not complete.

---

## Tokens

Source: `frontend/src/design/tokens.ts`

| Token | Role | Value |
| --- | --- | --- |
| `navy950` / `navy900` | Warm-black rail and primary action | `#14110e` / `#1f1a15` |
| `workspace` | Warm workspace | `#efe8db` |
| `surface` | Ivory document | `#fffdf8` |
| `surfaceMuted` | Recessed search and skeleton | `#f3eee3` |
| `ink` / `inkMuted` | Text | `#1a1612` / `#5f584e` |
| `gold` / `goldSoft` | Current state and the current action | `#a07d38` / `#c4a056` |
| `critical` / `high` / `medium` / `low` | Risk and severity | `#9f2a1f` / `#a14a0d` / `#6a6458` / `#3d5c44` |
| Radius | Paper, not pill SaaS | `6 / 10 / 14` |
| Type | Newsreader display, Source Sans 3 UI, IBM Plex Mono metrics | — |

Motion is 180–220ms and disabled when `prefers-reduced-motion: reduce`.

---

## Shell

- Warm-black rail with a brass inner edge.
- Ivory top bar. Organization in small caps. Search is a filled muted field, not an underline.
- Workspace is warm paper. Metrics, queues, registers, and forms sit on bordered ivory surfaces.
- Customer navigation: Home, Third Parties, Risk, Compliance, Privacy, AI Governance, Intelligence, Automation, then Evidence, Reports, Administration.

---

## Shared components

| Component | UI 2.0 treatment |
| --- | --- |
| `AttentionHero` | Ivory panel, gold left rule, dark numeral. Not a black billboard. Loading copy preserved. |
| `ExecutiveMetric` / `MetricCard` | Numerals on a divided paper strip. |
| `PageHeader` | Display title, gold eyebrow, no heavy rule. |
| `Surface` | Ivory document with hairline and paper shadow. |
| `FormSection` | Title and purpose on the left, fields on the right. |
| `StatusBadge` | Tinted pill with a status dot. Color is never the only cue. |
| `AppTable` | Search in the document toolbar. Rows flush to the paper. |
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

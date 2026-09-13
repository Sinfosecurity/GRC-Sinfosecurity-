# Supreme Premium UX Benchmark

**Purpose:** Lessons from publicly visible enterprise SaaS workflows. Not a copy of any product.  
**Decision date:** 2026-09-13  
**Authority:** Product Leadership #12 premium rebuild. #13 not authorized.

This document records **publicly described** patterns. It does not reproduce copyrighted screens, icons, or copy.

---

## Light / dark decision

**Chosen: premium light workspace + dark navy navigation.**

Enterprise Third Party work is tables, questionnaires, evidence, findings, and reports. Readability beats a full “cyber dark mode.” Linear’s public refresh makes the same point: chrome recedes; the work surface leads.

| Surface | Treatment |
|---|---|
| Left navigation | Deep navy, dimmer than content |
| Top bar | Navy, compact utilities |
| Workspace | Warm off-white / white cards |
| Gold | Restrained accent on primary actions and brand mark only |
| Semantic color | Risk and status only |

Dark-everywhere is not preserved because it already existed.

---

## Benchmark lessons

### Vanta

**Public lesson:** Guided, low-training dashboards. Status and pending work first. Simple language for non-security specialists.

| Area | Lesson |
|---|---|
| Navigation | Few primary destinations; settings do not compete with work |
| Dashboard | “What is not done” over raw inventory counts |
| Workflow | Next step is obvious without a playbook |
| Assessment UX | Start from a recommended plan, not an empty form |
| Empty states | Explain the first action |

### Drata

**Public lesson (2026 New Experience):** Two-level navigation, standardized tables, object pages instead of endless drawers, utilities (notes/tasks) beside the object.

| Area | Lesson |
|---|---|
| Navigation | Group by job (work vs administration) |
| Tables | One table grammar: search, filter, inline action |
| Detail views | Full page with tabs, not a skinny admin drawer as the only view |
| Dashboard | Readiness + alerts + tasks, each linking into work |

Supreme will not copy Drata’s compliance-control IA. Supreme’s IA is Third Party lifecycle.

### OneTrust

**Public lesson:** Very high capability, high training cost. Nested admin taxonomies, dense configuration, implementation-heavy.

| Area | Lesson |
|---|---|
| What to avoid | Enum dumps, configuration-first screens, dropdown → dropdown → submit as the product |
| Information hierarchy | Do not make every object equally loud |

**Supreme will be easier than OneTrust.** Power stays in the backend; the UI shows the next decision.

### AuditBoard / LogicGate

**Public lesson:** Audit/GRC products earn trust with evidence, owners, due dates, and an audit trail. They often feel like a control library first.

| Area | Lesson |
|---|---|
| Workflow | Owner + due + status on every work item |
| Progress | Percent complete only from persisted answers |
| Reports | Named purpose, not a stack of identical cards |

### ServiceNow

**Public lesson:** Enterprise scale, ticket/queue mental model. Powerful, often heavy.

| Area | Lesson |
|---|---|
| What to take | Attention queues and assignment |
| What to reject | Platform-admin chrome in the customer workspace |

### Stripe Dashboard

**Public lesson:** Inspection-grade trust. Every number is live. Errors explain the next action. Density is high because every row is actionable.

| Area | Lesson |
|---|---|
| Tables | Dense, sortable, no decorative cards for tabular work |
| Empty / error | Say what happened and what to do |
| Reports | Generate → processing → file. No fake success |

### Ramp

**Public lesson:** Role-metric-density-action. Open on the question the user came to answer; attach a primary action.

| Area | Lesson |
|---|---|
| Dashboard | Lead with attention, then distribution, then personal work |
| Actions | One obvious create action per list |

### Rippling

**Public lesson:** Broad admin surface grouped by domain; people/access is a first-class product, not an email box.

| Area | Lesson |
|---|---|
| Team | Members vs invitations vs roles, with human role names |
| Forms | Invite is a short explained workflow |

### Linear

**Public lesson:** Quiet chrome, dense work, keyboard, predictable headers. Inbox is for things that need a person.

| Area | Lesson |
|---|---|
| Visual density | Recede nav; spend pixels on the current task |
| Progress | Honest, countable |
| Microinteractions | Save/saved, no theatrical motion |

### Notion

**Public lesson:** Contextual help in place. Pages feel like a workspace, not a CRUD admin.

| Area | Lesson |
|---|---|
| Help | Explain the current step beside the work |
| Empty states | Short title, one sentence, one action |

---

## What Supreme will do better

1. **Workflow over objects.** New assessment is a recommended plan, not vendor + template dropdowns as the page.
2. **Easier than OneTrust.** Enterprise power (residual risk, evidence, decisions, reports) with modern SaaS simplicity.
3. **Honest data.** No fake monitoring, AI, or readiness scores. Empty means empty.
4. **Separated entitlements.** Private-testing access is not a paid plan and never shows billing standing errors to designated testers. RBAC still applies.
5. **Readable work surface.** Light workspace for questionnaires and tables; navy only on chrome.
6. **One visual system.** Navy + neutral + restrained gold. Purple is not a default CTA.
7. **Invitation truth.** Invitation state ≠ email state. Never claim “delivered” from a database row.
8. **Flagship questionnaire.** Section rail, current question, why-we-ask, real progress.
9. **Vendor detail as a product.** Overview, work tabs, attention, timeline — not a property sheet.
10. **No dead ends.** Every failure says what happened, whether work was saved, and what to do next.

---

## Sources (public)

- Drata Help Center: New Experience, navigation changes, dashboard overview (2026)
- Public Vanta vs Drata operator comparisons (2026)
- Linear design notes: UI redesign and calmer interface refresh
- Linear Inbox documentation
- Public SaaS navigation pattern writing (sidebar + top bar)
- Public fintech dashboard writing covering Stripe and Ramp inspection vs action density

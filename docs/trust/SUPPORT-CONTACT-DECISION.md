# Support contact — Product Leadership decision sheet

**Decision ID:** TR-CONTACT-SUPPORT-002  
**Status:** USER ACTION REQUIRED  
**Public status:** SUPPORT CONTACT NOT CONFIGURED  
**Spend assumption:** $0.00 in this phase.  
**Rule:** Do not invent `support@`. Do **not** assume `support@sinfosecurity.com` is active merely because it appears in `user-guide.md` or backend notes.

Any public sentence that names a support email or customer support intake stays **CONTACT_CONFIGURATION_REQUIRED** until a real monitored destination is confirmed.

---

## Option A — Dedicated support mailbox

A new mailbox on the real company domain. This document does not invent the address.

| Field | Value |
| --- | --- |
| Advantages | Clear customer channel; separable from security reports |
| Operational requirements | Domain control; mailbox created; named reader; distinction from security intake |
| Monitoring owner | USER ACTION REQUIRED — Operations (unassigned) |
| After-hours expectation | None promised. Do not publish a response-time SLA |
| Legal dependency | If printed on `/trust` `/privacy` `/terms`, legal review of those pages still applies |
| Cost assumption | $0.00 if existing domain mail is available; do not buy a helpdesk product for Phase 2 |

## Option B — Existing monitored mailbox

Use a mailbox that is already monitored. References in code/docs are **not** confirmation.

| Field | Value |
| --- | --- |
| Advantages | No new address if one is already live and monitored |
| Operational requirements | Written confirmation of monitoring; inbox-receipt test (Queued ≠ Delivered is not enough); named backup |
| Monitoring owner | USER ACTION REQUIRED — named person |
| After-hours expectation | Actual coverage only |
| Legal dependency | Same as Option A if the address is published |
| Cost assumption | $0.00 |

Staging invitation mail remains Queued ≠ Delivered. A published support address on a host that cannot reliably receive mail is a false operational claim.

## Option C — Ticket intake / form

In-product or web form routed to operators.

| Field | Value |
| --- | --- |
| Advantages | Avoids publishing an unconfirmed mailbox |
| Operational requirements | Working form; owner; no invented response-hour SLA; separate security path |
| Monitoring owner | USER ACTION REQUIRED — Operations (unassigned) |
| After-hours expectation | None unless on-call exists |
| Legal dependency | Form copy if linked from legal/trust pages |
| Cost assumption | $0.00 on existing product; do not buy support SaaS |

---

## Publication rule

Until Product Leadership chooses A, B, or C **and** delivery is confirmed:

- public copy: **Customer support address is not configured.**
- do not promote `support@sinfosecurity.com`

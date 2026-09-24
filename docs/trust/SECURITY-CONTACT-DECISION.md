# Security contact — Product Leadership decision sheet

**Decision ID:** TR-CONTACT-SECURITY-002  
**Status:** USER ACTION REQUIRED  
**Public status:** SECURITY CONTACT NOT CONFIGURED  
**Spend assumption:** $0.00 in this phase. Do not purchase a mailbox product.  
**Rule:** Do not create or publish an address in this document.

Any public sentence that names a security report address or vulnerability submission channel stays **CONTACT_CONFIGURATION_REQUIRED** until a real monitored destination is confirmed.

---

## Option A — Dedicated security mailbox

A new mailbox on the real company domain (for example a future `security@` on that domain). This document does **not** invent the local-part or domain.

| Field | Value |
| --- | --- |
| Advantages | Clear security-only channel; easier legal/disclosure wording; separates vuln reports from product support |
| Operational requirements | Domain control; mailbox created; spam/abuse filtering; documented intake; backup reader |
| Monitoring owner | USER ACTION REQUIRED — Security (unassigned) |
| After-hours expectation | Honest: none promised until coverage exists. Do not publish an acknowledgement SLA |
| Legal dependency | Vulnerability disclosure wording must be reviewed before the address is public |
| Cost assumption | $0.00 if the existing domain already includes mailboxes; do not buy a new mail product for Phase 2 |

## Option B — Existing monitored mailbox

Use a mailbox that already exists and is already read by a named person. Do not assume any address in code or docs is monitored.

| Field | Value |
| --- | --- |
| Advantages | Fastest if a real monitored box already exists; no new address to provision |
| Operational requirements | Written confirmation it is monitored; routing rule so security mail is not lost in general inbox; named backup |
| Monitoring owner | USER ACTION REQUIRED — must be a named person, not “the company” |
| After-hours expectation | Whatever that mailbox actually has today — do not invent 24×7 |
| Legal dependency | Same disclosure-policy review before publication |
| Cost assumption | $0.00 |

## Option C — Ticket intake / form

A web form or ticket queue that creates a security ticket. No public email required.

| Field | Value |
| --- | --- |
| Advantages | Avoids publishing a mailbox; can require fields (URL, impact, contact) |
| Operational requirements | Working form or queue; owner who reads it; fail-closed if the form is down; no invented response hours |
| Monitoring owner | USER ACTION REQUIRED — Operations / Security (unassigned) |
| After-hours expectation | None unless a real on-call exists |
| Legal dependency | Form copy and disclosure policy need legal review |
| Cost assumption | $0.00 if built on existing product/docs; do not buy a Trust Center or ticketing SaaS |

---

## Publication rule

Until Product Leadership chooses A, B, or C **and** the destination is confirmed working:

- public copy: **Security reporting address is not configured.**
- vulnerability disclosure remains DRAFT
- no bounty, no reward, no unsupported safe harbor

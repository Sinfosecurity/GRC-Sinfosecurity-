# Contact readiness — program decision record

**Status:** USER ACTION REQUIRED  
**Spend:** $0.00. Do not purchase a mailbox product for this phase.  
**Rule:** Do not invent an email address. Do not publish a mailbox that does not exist and is not monitored.

Public trust publication is blocked until real working destinations exist and are approved.

---

## Security contact

**Decision ID:** TR-CONTACT-SECURITY-001  
**Current status:** SECURITY CONTACT NOT CONFIGURED — USER ACTION REQUIRED  
**Public copy today:** Do not publish a `security@…` address.  
**Vulnerability disclosure:** remains DRAFT until a real reporting channel exists and legal wording is reviewed.

Phase 0 correctly recorded SECURITY CONTACT NOT CONFIGURED. Phase 1 does not change that fact.

### Suggested destinations (choose one later)

These are options for Product Leadership. None is configured by this document.

| Option | What it would be | Blocker until chosen |
| --- | --- | --- |
| `security@` on the real company domain | Dedicated security mailbox | Domain, mailbox, monitoring owner, legal review of disclosure policy |
| Support / security ticket intake | Existing ticketing path with a security queue | Working intake URL or mailbox, SLA honesty (no invented hours), routing owner |
| Named operational mailbox | An already-monitored human mailbox | Confirmation it is monitored, written owner, after-hours coverage honesty |

### Must be true before the address is public

1. A real working destination exists (mailbox or ticket intake).
2. A named owner monitors it.
3. Vulnerability disclosure wording is legally reviewed.
4. Product Leadership approves publication on `/security` and the customer package.
5. No bug bounty, payment promise, or unsupported safe-harbor language is attached.

Until then: **USER ACTION REQUIRED.** Acknowledgement SLAs are not operationally supportable.

---

## Support contact

**Decision ID:** TR-CONTACT-SUPPORT-001  
**Current status:** SUPPORT CONTACT — USER ACTION REQUIRED  
**Public copy today:** Do not publish a public support mailbox.

`user-guide.md` and some backend notes mention `support@sinfosecurity.com`. Production go/no-go and this Trust Program treat that mailbox as **unconfirmed for public use**. Phase 1 does not promote it.

### Suggested destinations (choose one later)

| Option | What it would be | Blocker until chosen |
| --- | --- | --- |
| `support@` on the real company domain | Public customer support mailbox | Domain, mailbox, monitoring owner |
| Support ticket intake | In-product or web form routed to operators | Working form, owner, no invented response-hour SLA |
| Named operational mailbox | Already-monitored human mailbox | Confirmation it is monitored |

### Must be configured before public trust publication

| Requirement | Status |
| --- | --- |
| Working support destination | USER ACTION REQUIRED |
| Named support owner | USER ACTION REQUIRED |
| Distinction between security reports and product support | USER ACTION REQUIRED |
| No invented response-time SLA | REQUIRED (keep honest) |
| Legal review if the address appears on `/trust` `/security` `/privacy` `/terms` | NOT STARTED |
| Email delivery itself reliable enough to receive mail | DEGRADED / UNCONFIRMED on staging (invitation Queued ≠ Delivered) |

A published support address on a host that cannot reliably receive mail is a false operational claim. Do not publish until delivery is confirmed.

---

## Publication dependency

| Surface | Security contact | Support contact |
| --- | --- | --- |
| `/trust` | SAFE ONLY AFTER CONTACT CONFIGURATION if a report address is shown | SAFE ONLY AFTER CONTACT CONFIGURATION if a support address is shown |
| `/security` | Same | Same |
| `/status` | NOT_CONFIGURED — no contact implied | NOT_CONFIGURED |
| Customer security package | Record “not configured” until chosen | Record “not configured” until chosen |
| Vulnerability disclosure | Blocked | N/A |

See `PUBLIC-CONTENT-MAPPING.md`.

# Trust claim review workflow

**Status:** PROCESS ONLY — no runtime automation added in Phase 1  
**Owner:** Product Leadership  
**Approver for public use:** Product Leadership (Legal for LEGAL_REVIEW_REQUIRED claims)  
**Related:** `ASSURANCE-CLAIMS-REGISTER.md`

This is a human workflow. It does not create a second trust engine and does not change application code.

## Allowed claim statuses

| Status | Meaning | Public use |
| --- | --- | --- |
| SUPPORTED | Evidence exists and a human has approved the wording | Only status that may be used publicly |
| PARTIAL | Some evidence exists; wording is incomplete or environment-limited | Internal / NDA pack only, with limitations |
| DEFERRED | Capability exists as architecture or later work; live proof is not claimed | Public only as “SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED” when that exact wording is already approved |
| NOT_SUPPORTED | False, unproven, or certification-class claim | Never public as a positive claim |
| LEGAL_REVIEW_REQUIRED | Legal document or binding language is not counsel-approved | Draft pages only; not binding |

Allowed statuses remain exactly these five. Do not invent CERTIFIED as a claim status. Strength labels (IMPLEMENTED CONTROL / TESTED CONTROL / PENETRATION TESTED / CERTIFIED / ATTESTED) stay separate from claim status. No claim is CERTIFIED / ATTESTED.

## Required fields on every claim

| Field | Purpose |
| --- | --- |
| `claimId` | Stable identifier (C-01 …) |
| `claim` | Precise statement being governed |
| `visibility` | public / private / never public |
| `status` | One of the five allowed statuses |
| `evidence source` | Authoritative punch-list item, hosted pack, or doc |
| `owner` | Person/role who maintains the claim |
| `approver` | Person/role who may mark APPROVED |
| `lastReviewed` | Last human review date |
| `reviewBy` | Next required human review date |
| `publicCopy` | Exact customer-safe sentence, or “DO NOT PUBLISH” |
| `internalNotes` | Limitations, history, what not to say |

## Review states

```
DRAFT
  → OWNER REVIEW
    → APPROVED
      → PUBLICLY USABLE   (SUPPORTED claims only)

Expired (today > reviewBy, no re-approval)
  → REVIEW REQUIRED
    → OWNER REVIEW
      → APPROVED
        → PUBLICLY USABLE
```

### DRAFT

New or rewritten claim. Not usable publicly. Owner drafts `claim`, `publicCopy`, evidence, and limitations.

### OWNER REVIEW

Owner checks evidence still matches the wording. Owner may keep SUPPORTED, downgrade to PARTIAL / DEFERRED / NOT_SUPPORTED / LEGAL_REVIEW_REQUIRED, or return to DRAFT.

### APPROVED

Approver (Product Leadership, or Legal for legal claims) records `lastReviewed` and a new `reviewBy`. Approval of a PARTIAL or NOT_SUPPORTED claim is approval of **that status**, not permission to publish a stronger statement.

### PUBLICLY USABLE

Only when **all** of the following are true:

1. Status is SUPPORTED
2. Review state is APPROVED
3. `reviewBy` has not passed
4. `publicCopy` is the sentence to use
5. Publication class in `PUBLIC-CONTENT-MAPPING.md` is SAFE TO PUBLISH NOW for that surface

If any condition fails, the claim is not publicly usable.

### REVIEW REQUIRED (expired)

If `reviewBy` passes without human re-approval, the claim is **REVIEW REQUIRED**. Public pages must treat it as not currently usable. Internally it is treated as PARTIAL for public use until re-reviewed. Do not automatically claim continued compliance.

## Who does what

| Role | Duty |
| --- | --- |
| Owner | Draft, gather evidence, propose status, watch `reviewBy` |
| Approver | Approve or reject public wording |
| Legal | Required for LEGAL_REVIEW_REQUIRED and any binding document |
| Product Leadership | Final public-publication decision |

Default owners and approvers are recorded on each claim. Named people are **USER ACTION REQUIRED** until Product Leadership assigns them. Role names are sufficient for Phase 1.

## #20 reminders (no new code)

Phase 1 does **not** add automation code.

Existing #20 Supreme Automation already has scheduled-review primitives (`scheduled.review`, idempotent scan, task + notification + audit). Product Leadership may later map claim `reviewBy` dates onto those primitives **without** a new reminder engine. Until that mapping is explicitly authorized:

- reminders are a human calendar / punch-list review
- no claim is auto-republished
- no claim status is auto-upgraded

Do not create a Trust scheduler.

## What must never happen

- Public pages using PARTIAL, DEFERRED (except the approved #21/#22 architecture sentence), NOT_SUPPORTED, or LEGAL_REVIEW_REQUIRED as positive assurance
- Auto-upgrade from IMPLEMENTED / TESTED / PENETRATION TESTED to CERTIFIED / ATTESTED
- SOC 2 / ISO / FedRAMP / HIPAA / PCI claimed as certified
- Expired SUPPORTED claims left on `/trust` or `/security`
- Invented security or support mailboxes used as evidence

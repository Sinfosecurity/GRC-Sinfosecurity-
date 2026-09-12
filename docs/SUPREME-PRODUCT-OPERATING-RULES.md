# Supreme product operating rules

These rules apply to Product Leadership, engineering, and Cursor sessions. They do not authorize production release.

Trivial typo or comment edits do not require a full program-state recitation. Features, architecture, security, production, product modules, infrastructure, and major GTM implementation do.

## RULE 1 — Read program state first

Before starting any substantial Supreme work, read:

- `docs/SUPREME-MASTER-PUNCH-LIST.md`
- `docs/SUPREME-PROGRAM-STATE.md`
- `docs/SUPREME-PRODUCT-OPERATING-RULES.md`
- any **ACCEPTED** ADR relevant to the work

## RULE 2 — State current position

Before implementing a substantial new workstream, state:

- CURRENT PUNCH-LIST ITEM
- CURRENT STATUS
- CURRENT VERIFIED SHA
- DEPENDENCIES
- NEXT AUTHORIZED ITEM

## RULE 3 — No silent skipping

Do not skip a numbered gate. If requested work jumps ahead of an unfinished dependency, say so before implementation.

## RULE 4 — No silent reordering

Do not renumber, delete, or reorder the master punch list without explicit Product Leadership approval.

## RULE 5 — Evidence-based status

Do not change PASS, PARTIAL, FAIL, or BLOCKED without objective evidence. Code existing is not sufficient for PASS.

Distinguish **implementation result** from **program acceptance**. Cursor may report “Evidence supports PASS.” For major numbered gates, do not silently accept PASS and start the next gate in the same sprint when the task says to stop for Product Leadership review.

## RULE 6 — Hosted certification

Where a gate requires hosted proof, local tests cannot substitute for it.

## RULE 7 — Production truth

Do not claim production ready, certified, connected, or implemented unless evidence supports the claim. Marketing preview pages are not implementation.

## RULE 8 — ADR authority

Accepted architecture decision records are controlling. If requested implementation conflicts with an ACCEPTED ADR, stop and identify the conflict.

## RULE 9 — End-of-sprint update

Every implementation sprint must end with:

ITEM, STARTING SHA, FINAL SHA, STATUS, COMPLETED, REMAINING, HOSTED RESULT, CI RESULT, SECURITY RESULT, CUSTOMER READY, COMPETITIVE POSITION, BLOCKERS, NEXT ITEM

Then update `docs/SUPREME-PROGRAM-STATE.md`.

## RULE 10 — Master list update

Update the master list only when new evidence changes status, a gate is formally completed, or Product Leadership approves an intentional roadmap change.

## RULE 11 — No unauthorized production

Never merge `main`, deploy production, change production DNS, or declare production-ready unless the controlling program state explicitly authorizes it.

## RULE 12 — Competitive objective

Supreme’s strategic objective is not merely parity with OneTrust. The program aims to outperform category leaders on measurable customer outcomes while remaining truthful about current capability. Do not copy proprietary competitor code, content, or UI.

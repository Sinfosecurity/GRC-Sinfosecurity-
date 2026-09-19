# #12 Wave 1 persona-isolation correction — evidence

Starting evidence HEAD `fd2b5d9e704f633c81d0b089cf606f362d8e0cb3`  
Wave 1 foundation preserved `778b870d01e0946b93c14e5d10d19e2f04cbb79f`  
Phase 0 lock `e0784550abf7c806de74993baa5a73386702ef81`

This is **not** a #12 PASS. Wave 1 is **not accepted**. Wave 2 is **not started**.

## Local / CI proofs

Requester participant: own workspace and own intake PASS; GRC workspace DENY.  
GRC participant: GRC workspace PASS; requester identity visible on Intake PASS; Requester Workspace DENY.  
Vendor plane: requester and GRC intake APIs DENY.  
Information-request round-trip uses requester APIs for the response and GRC Intake APIs for visibility. Neither participant uses the other workspace.

## Hosted golden walk

**SKIP.** Staging frontend/API remain on the prior hosted SHA and do not yet run this correction. A hosted walk of the old dual-role switcher would not prove this isolation. Requester-only hosted login remains SKIP because staging invite `delivery=sent` still does not return an activation token. Activation secrets were not taken from email and were not weakened.

## Responsive

**SKIP** for changed surfaces until this SHA is hosted. Prior Wave 1 screenshots were not redone.

## Confirmations

No workspace switching. GRC cannot enter Requester Workspace. Requester cannot enter GRC Workspace. Vendor cannot enter either internal workspace. TPRM still sees requester information in Intake. IRA scoring unchanged. Wave 1 backend models preserved. #23 preserved. `main` not merged. Production untouched. Commercial GO not declared.

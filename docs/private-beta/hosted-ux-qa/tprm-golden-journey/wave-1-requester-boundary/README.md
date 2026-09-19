# #12 Wave 1 requester-experience boundary — hosted evidence

Correction SHA `1168f8e5e0203b1972bb9b7dbf2b089da7d4ba51`  
Docs / hosted runtime `5a159b474f44960c528d2249f4c2fc308eb16a08`  
Wave 1 foundation preserved `778b870d01e0946b93c14e5d10d19e2f04cbb79f`  
Phase 0 lock `e0784550abf7c806de74993baa5a73386702ef81`

This is **not** a #12 PASS and **not** Wave 1 accepted.

## What was proved on staging

Dual-role ORG_ADMIN lead created `INT-2026-0001` Microsoft Corporation / Azure Hosting through `/api/v1/tprm/requester/intakes`. Lead assigned, requested information, requester API responded, analyst created Third Party + `ENG-2026-0001`. Requester minimized payload never included assignment history or match candidates. Browser session on `/request` showed `RequesterLayout` only: Home, New Request, My Requests, Actions Required, Help. No Findings / Assessments / Intake sidebar.

## Requester-only hosted login

**SKIP.** Staging invite `delivery=sent` does not return an activation token. Activation secrets were not taken from email and were not weakened to produce a BUSINESS_OWNER session. CI `tprm-requester-workspace.integration.test.ts` remains the requester-only denial proof.

## Screenshots

Automation-browser webfonts add combining marks. Use accessibility / DOM text as the source of truth.

- `screenshots/requester-home-375.png`
- `screenshots/requester-home-768.png`
- `screenshots/requester-home-1024.png`
- `screenshots/requester-home-1440.png`
- `screenshots/requester-home-1920.png`
- `screenshots/requester-new-375.png`
- `screenshots/requester-new-1440.png`
- `screenshots/requester-my-requests-375.png`
- `screenshots/requester-my-requests-1440.png`
- `screenshots/requester-actions-375.png`
- `screenshots/requester-actions-1440.png`

768 / 1024 / 1920 captures for My Requests and Actions Required were not separately filed. Those pages share `RequesterLayout`; overflow measured `false` on home at those widths. 1920 screenshot is visually cropped by the browser tool; `scrollWidth` was 1910 at `innerWidth` 1920.

See `results.json`.

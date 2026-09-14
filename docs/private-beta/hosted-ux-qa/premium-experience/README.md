# Premium experience hosted visual QA

**Sprint:** Supreme Governance Platform — Premium Experience & Brand Closure — Hosted Finalization  
**Starting SHA:** `10746ea4f76aeccc6ee27cb62e5760910aad53fe`  
**Prior implementation SHA:** `380228df5886f32b4214d2de64b0edd3d54a8eb0`  
**Finalization implementation SHA:** `d9f9afcde9b276224d943fd2c8370cb7ab5e6627`  
**Hosted frontend SHA:** `d9f9afcde9b276224d943fd2c8370cb7ab5e6627`  
**Hosted API SHA:** `164dbd22f03c914d6ae2e0e96f9f2cfdcef2a7fe`  
**Do not cite** Phase C frontend `7810ac7` as premium proof.

This folder is hosted proof. It is not Product Leadership acceptance.

## Descendant notes

`d9f9afc` is a documented descendant of `380228d` / `646e2ee` / `164dbd2`.

| SHA | What changed |
|---|---|
| `646e2ee` | Home domain attention, history layers, reassessment comparison, approval brief, evidence language, notifications inbox, branded emails, marketing radius, QA script |
| `164dbd2` | Customer history keeps human titles only (no raw `vendor.*` action codes) |
| `d9f9afc` | PageHeader wraps at tablet width; notification inbox shows unread first (25 of N). Frontend-only. Hosted API remained `164dbd2` at capture time. |

## Capture

Script: `scripts/hosted-premium-experience-qa.py`  
Tenant: Elite Claims (`report-proof-20260913@staging.supremerisk.test`)  
Results: `results.json`  
74 first-pass shots plus after-header-fix shots for Home, Privacy, AI, Notifications.

## Public

`/` `public-home-{375,768,1024,1440,1920}.png`  
`/connected-platform` `public-connected-1440.png`  
`/products/third-party` `public-third-party-1440.png`  
`/products/risk` `public-risk-1440.png`  
`/products/compliance` `public-compliance-1440.png`  
`/products/privacy` `public-privacy-1440.png`  
`/products/ai-governance` `public-ai-1440.png`  
`/pricing` `public-pricing-1440.png`  
`/trust` `public-trust-1440.png`  
`/security` `public-security-1440.png`  
`/login` `public-login-1440.png`

Homepage automated copy check found Supreme, Who it is for, Request a Demo, and private testing.

## Customer

Home, notifications, third parties, onboard, lifecycle (`VND-2026-0013`), assessments, findings, monitoring, risk, compliance, privacy, AI, controls, evidence, graph, reports, administration.

Primary viewports 375 / 768 / 1024 / 1440 / 1920 for homepage, Home, lifecycle, vendor activate, Risk, Compliance, Privacy, AI, Evidence, Reports.

After `d9f9afc`: `privacy-1024-after-header-fix.png`, `ai-1024-after-header-fix.png` — overflow cleared.

## External / platform

`vendor-activate-*.png` — activate page only. Live questionnaire not walked in this run.  
`platform-login-1440.png` — admin plane login. No platform-owner session in this run.

## Reports

`reports/*.pdf` and `reports/board-pptx.pptx` generated from the hosted API on 2026-09-14.

Text-extracted. Not rasterized in PowerPoint desktop. Covers still say **SUPREME RISK CONFIDENTIAL**. PPTX has 10 slides; grammar on slide 1 is imperfect.

## Honest leftover gaps

- Notification overlines still show dotted event names (`assessment.assigned`).
- Some Privacy attention strings still say CLEAN.
- Report covers were not rebranded in this closure.
- Vendor portal questionnaire / evidence upload / submission not re-walked with a fresh invitation.
- Single-use activation / revoked token not re-executed in this finalization.
- Home fires nine live APIs; no performance budget was recorded.

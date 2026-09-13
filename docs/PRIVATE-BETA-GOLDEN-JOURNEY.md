# Private-beta golden journey

Synthetic company only. Do not use real customer data. Do not invite external testers until Product Leadership accepts this journey in a real browser.

## Hosted Elite Claims run (2026-09-13)

Organization: Elite Claims evaluation tenant. Vendor: Supreme Investigation.

| Step | Hosted browser result |
|---|---|
| Login | PASS — no API unreachable, no billing block |
| Dashboard | PASS |
| Select third party | PASS |
| Vendor detail | PASS as drawer — UX-P2 versus full-page standard |
| Risk tier | PASS — recorded on vendor |
| Recommended assessment plan | PASS |
| Start assessment | PASS |
| Questionnaire workspace | PASS after opening an existing assessment (Information Security) |
| Save / resume | PASS — Saved, workspace reopened |
| Conditional questions | PARTIAL — present in library; not isolated as a dedicated hosted toggle in this run |
| Evidence / malware | PASS — scan status visible |
| Finding / remediation | PASS — controlled finding created |
| Residual risk | PASS — persistable explanation on vendor Risk tab |
| Decision / monitoring | PASS — pages open; monitoring does not invent success |
| Executive PDF | PASS — HTTP download, PDF opened, Elite Claims tenant |
| Team | PASS |
| Invite activation | FAIL — USER ACTION REQUIRED for a real controlled inbox |

Hosted screenshots: `docs/private-beta/hosted-ux-qa/`.

## Company

**Acme Financial Services** (tester organization)  
**Vendor:** CloudPay Systems — payment / SaaS, HIGH or CRITICAL tier.

## Steps

1. Platform Owner creates a unique tester (Organization Admin). Tester activates and signs in.
2. Add CloudPay Systems. Record contact, services, and tier.
3. Complete **Inherent Risk Questionnaire**. Confirm residual risk is still calculated by the explainable engine after later assessments.
4. Start the recommended Information Security, Privacy, and Cloud / SaaS assessments. Complete sections, attach CLEAN synthetic evidence where required.
5. Create a finding (for example missing MFA evidence), assign remediation and a due date.
6. Generate a Decision Brief. Record a human decision.
7. Open Monitoring. Confirm unavailable intelligence is not shown as success.
8. Download Executive PDF, CloudPay scorecard, assessment PDF, findings (PDF/CSV/XLSX), monitoring (PDF/CSV), board (PDF/PPTX if role allows), and the Decision Brief PDF.
9. Open each file. Confirm only Acme data. Confirm empty sections stay empty.
10. Start a reassessment or offboard CloudPay. History remains.

## Other vendor personas

| Vendor | Type | Expected emphasis |
|---|---|---|
| North Office Supply | Low-risk office supplier | Inherent + baseline security |
| LedgerSaaS | SaaS provider | Security + privacy + cloud |
| Stackhost | Cloud infrastructure | Cloud + identity + BCDR |
| CloudPay Systems | Payment processor | Resilience + regulatory + SOC 2 review |
| Harbor Counsel | Professional services | Inherent + security, lighter cloud |
| VaultData Processing | Critical data processor | Critical scope including fourth-party |

## Personas

Repeat report downloads as Organization Admin, Risk Manager, Assessor, Approver, and Viewer. Viewer buttons must stay disabled. Assessor cannot download the board pack.

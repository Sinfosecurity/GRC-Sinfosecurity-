# Private-beta test plan

**Environment:** PRIVATE BETA / TEST  
**Not:** production, commercial launch, external pentest, SOC 2, or ISO 27001  
**Data:** synthetic / test only  
**Shared tester passwords:** forbidden  

Testers should use ordinary product language. You do not need to know the database.

This plan is internal / invited-human testing. It is **not** an independent penetration test and must not be described as one.

## How testers are created

A Platform Owner (or Support Admin) opens **Platform console → Private testers**, creates one organization per tester, and sends the one-time activation link to a unique email. Disable the organization when testing ends.

Do not reuse an email. Do not share an activation link. Do not put real customer data in the tenant.

## Severity

| Code | Meaning |
|---|---|
| P0 | Security, data loss, cross-tenant leak, or system unusable |
| P1 | Major workflow broken or security weakness |
| P2 | Material problem with a workaround |
| P3 | Cosmetic / minor usability |

#12 cannot PASS with a known open P0 or P1. Report P0/P1 immediately through **Help & Support** as Critical / High.

---

## Scenario A — Happy path (one vendor lifecycle)

1. Activate your unique invitation and set your own password.
2. Sign in. If MFA is required for your role, enroll it.
3. On Home, follow Getting started.
4. Add a vendor (name, type, category, tier, contact, services).
5. Open the vendor. Confirm inherent / residual risk language. If no score yet, complete an assessment first.
6. Start an assessment from the vendor. Complete the questionnaire. Attach evidence only through the evidence upload path.
7. Create a finding, assign a remediation plan and due date, then close it or accept residual risk as a governance disposition. Acceptance must not silently change the calculated score.
8. Generate a Decision Brief. Approve, approve with conditions, escalate, reject, or accept residual risk. The decision must remain visible.
9. Open Monitoring. If the provider is not connected, the page must not invent successful signals.
10. Generate an executive report and a vendor scorecard. Empty reports must say they are empty.
11. Offboard the vendor. Confirm assessments, evidence, findings, and audit history remain.
12. Send feedback (bug / UX / feature / security / performance / documentation).

---

## Scenario B — First-run and account controls

- Open the activation link twice. The second use should fail or be clearly invalid.
- Try a weak password. The product should refuse it.
- Use Forgot password with your tester email and with an unknown email. Unknown email must not reveal whether an account exists if that is the product policy.
- Sign out, then use Back to return to a protected page.
- Wait until the session expires, then continue a form.
- Enter the wrong password several times and note rate-limit / lockout behavior.

---

## Scenario C — Unexpected product behavior

Do these on purpose:

- Invalid emails, blank required fields, duplicate vendor names
- Submit the same form twice
- Browser Back / Refresh mid-assessment
- Open another tester’s vendor URL if you can guess an ID
- Upload EICAR, a fake PDF, an executable, an oversized file, an archive
- Try to download non-CLEAN evidence
- Strange filenames (`../../`, emoji, very long names)
- Mobile widths (320 / 375 / 390) and desktop (768 / 1024 / 1280 / 1440 / 1920)
- Slow network / interrupted upload
- Keyboard-only navigation
- Another browser if available
- Zoom to 200% and confirm dialogs remain usable

---

## Scenario D — Tenant boundary (required)

1. Tester A creates a vendor and uploads a file.
2. Tester B must not see Tester A’s vendor, finding, assessment, report, or evidence by browsing, searching, or guessing IDs.
3. If you can see another organization’s data, stop and report a P0 security concern.

---

## Scenario E — Evidence and malware

Expected outcomes:

| File / condition | Expected |
|---|---|
| Ordinary PDF / PNG from a test document | Stored; download only after CLEAN |
| EICAR | Not CLEAN; download blocked |
| Fake PDF / renamed executable | Rejected or not CLEAN |
| Oversized file | Rejected |
| Archive | Rejected or scanned per policy |
| Scanner unavailable | Downloads stay fail-closed; CLEAN is not invented |

---

## Scenario F — Decision and reporting honesty

- A Decision Brief must show enough to decide: inherent risk, residual risk, findings, evidence confidence, and prior decision if one exists.
- Risk acceptance must remain visible as a disposition.
- Reports must come from this tenant only.
- An empty portfolio must produce a truthful empty report, not invented vendors.

---

## Scenario G — Offboarding

- Start offboarding while findings are still open. The product should show outstanding work and require acknowledgement.
- After termination, open the vendor, findings, evidence, and audit history. Records must still exist.
- Offboarding must not look like a successful commercial production cutover.

---

## Scenario H — Feedback

Submit one of each feedback type from **Help & Support**. Include the page or workflow. If you attach a screenshot, use a CLEAN evidence object ID from this tenant only.

---

## Internal adversarial checks (staff only)

Staff may continue OWASP-style web/API checks, IDOR, tenant isolation, privilege escalation, JWT/session, MFA, rate limits, malicious uploads, injection, XSS, SSRF where applicable, CORS, formula injection, error disclosure, support-access boundaries, and break-glass.

Record results as internal testing. Do not label the work an independent pentest, SOC 2 assessment, or certification.

# Product Leadership manual checklist

Use `INT-2026-0001` — Microsoft Corporation QA / Azure Hosting QA. Do not start a second case unless resetting first.

## Wave 1

1. Login as QA Requester. Confirm only Requester Workspace.
2. Open `/request/new` only if you need a second case. The seeded case is already `INT-2026-0001`.
3. Confirm the request appears under My Requests.
4. Sign out.
5. Login as QA TPRM Lead. Open Intake Queue. Assign QA TPRM Analyst.
6. Sign out.
7. Login as QA TPRM Analyst. Open My Work. Start triage. Request more information.
8. Requester: Actions Required. Respond.
9. Analyst: see the response. Search/create Microsoft Corporation QA. Create Azure Hosting QA Engagement.

## Wave 2

10. Requester: complete and submit the Engagement IRA.
11. Analyst: Tier Review. Request clarification on one question.
12. Requester: respond from Actions Required.
13. Analyst: confirm or override tier with rationale.

## Wave 3

14. Analyst: confirm Due-Diligence Plan.
15. Select QA Vendor Contact / `qa.vendor@supremegrc.test`.
16. Copy or Send the normal invitation.
17. Vendor: activate at `/vendor-assessment/activate` once.
18. Complete questionnaire, evidence, one clarification, attest, submit.
19. Specialist review.

## Wave 4

Only if Wave 4 is on the hosted SHA:

20. Confirm one Finding. Dismiss a separate candidate.
21. Record control effectiveness and any compensating control.
22. Calculate and inspect Engagement residual risk.
23. Stop. Do not start Wave 5.

## Reset

`APP_ENVIRONMENT=staging ALLOW_STAGING_QA_PERSONAS=true` plus `reset-test-data`, then `seed-manual-case`.

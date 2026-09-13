# Hosted UX QA — SHA `ea0cd6751a916d3906eb1b795bb4b38ff1e6e079`

Captured from the live staging application after deploy. These are not mocks.

**Frontend:** `https://supreme-risk-staging.onrender.com`  
**API:** `https://supreme-risk-staging-api.onrender.com`  
**Baked API base:** `https://supreme-risk-staging-api.onrender.com/api/v1`

Dashboard did **not** show “API unreachable” after login as an Organization Admin.

Cursor cannot declare visual PASS. Product Leadership review is required.

## Screenshots

| File | Viewport |
|---|---|
| 01-dashboard-1440.png | 1440 |
| 01-dashboard-375.png | 375 |
| 02-third-parties-1440.png | 1440 |
| 02-third-parties-375.png | 375 |
| 04-assessment-center-1440.png | 1440 |
| 04-assessment-center-375.png | 375 |
| 05-new-assessment-wizard-1440.png | 1440 |
| 07-evidence-1440.png | 1440 |
| 08-findings-1440.png | 1440 |
| 09-monitoring-1440.png | 1440 |
| 10-decisions-1440.png | 1440 |
| 11-reports-1440.png | 1440 |
| 12-team-1440.png | 1440 |
| 12-team-375.png | 375 |
| 13-assessment-library-1440.png | 1440 |
| 14-help-1440.png | 1440 |

Vendor detail, questionnaire workspace, and Platform Console captures remain outstanding on this pass.

## Known follow-ups visible in first capture

- Empty-state panel used a leftover dark fill; patched after this SHA and queued for the next staging deploy.
- Elite Claims remains `PAST_DUE` in Stripe standing while `isDemo` / testing access is true. Assessment create still returned 201.

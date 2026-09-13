# Report authorization matrix

Report downloads require **both** organization product entitlement **and** individual user authorization. Both must pass.

- **Organization product entitlement:** a purchased plan that includes reporting, **or** evaluation access designated by Platform Owner / support via **Platform → Private testers** or the organization record (`POST /platform/organizations/:id/testing-access`). Designation does not invent a paid plan and does not use live Stripe.
- **Individual user authorization:** the signed-in role must be allowed to export that report kind. A viewer does not gain export rights because the organization is designated.

Commercial STARTER does not include advanced reporting unless evaluation access is designated.

| Role | View catalog | Operational reports | Board pack |
|---|---|---|---|
| Organization Admin | Yes | Yes | Yes |
| Risk Manager | Yes | Yes | Yes |
| Approver | Yes | Yes | Yes |
| Assessor | Yes | Yes | No |
| Viewer | Yes | No | No |

Operational reports: Executive PDF, Vendor Scorecard PDF, Assessment PDF, Findings PDF/CSV/XLSX, Monitoring PDF/CSV, Decision Brief PDF.

Board pack: Board PDF, Board PPTX.

A download button must stay disabled when the current role or plan cannot use it, with a plain-language reason.

# Report authorization matrix

Private-beta report downloads require **both** a permitted role and a reporting entitlement.

Commercial STARTER does not include advanced reporting. **Private-beta tester organizations (`isDemo`)** may export reports for evaluation without pretending they purchased Professional.

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

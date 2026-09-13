# Hosted Graph Explorer QA

Captured from live staging after the 429 / ordinary-use remediation. These are not mocks.

**Frontend:** https://supreme-risk-staging.onrender.com  
**API:** https://supreme-risk-staging-api.onrender.com  
**Frontend SHA:** `1d4bf1bb54f220fafb1db32e2e742ca4a9f9ab85`  
**API SHA:** `b9daaf57a309846dab025a8abd50520d3a4685ae`

#13 remains PARTIAL until Product Leadership reviews this hosted experience. Cursor cannot declare visual PASS. #14 was not started.

## Ordinary session

Open Graph Explorer, search several terms, apply filters, select Northwind Cloud, view direct relationships, impact, and lineage, then back/forward and search again.

Result: **zero unexpected 429s**. See `session.json`.

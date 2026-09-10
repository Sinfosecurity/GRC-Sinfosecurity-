# Supreme Risk enterprise roadmap

Product promise: make Supreme Risk the easiest enterprise-grade TPRM platform to adopt, with explainable risk decisions, evidence-driven assessments, and intelligent continuous monitoring.

TPRM remains the commercial spearhead. Broader GRC grows around shared objects. This is not a OneTrust clone.

## CURRENT

Phase A foundation on `supreme-risk-transformation`:

- Explainable risk engine with named factors, methodology version `supreme-risk-1.1.0`, persisted `ScoreCalculation.factors`
- Risk Decision Brief (generate, human decision, immutable decided snapshots, AI summary status honesty)
- What Needs Attention Today dashboard from live tenant records
- AI Evidence Analyst UI wired to `/ai` with `NOT_CONFIGURED` when no key
- Evidence vault list from `StoredObject` with real scan status
- Monitoring page shows recorded `VendorMonitoring` signals only
- Grouped navigation: Home, Third Party, Intelligence, Administration

## NEXT

- Assessment wizard wired to questionnaire templates and evidence-required questions
- Dedicated findings/remediation UI and CAP path alignment
- Vendor-linked evidence upload (StoredObject + VendorDocument atomically)
- Org-configurable scoring weights with versioned methodologies
- PDF export of Risk Decision Brief
- External monitoring provider adapters (CONNECTED only after a live test)

## LATER

Phase B: automation engine, vendor portal, fourth-party graph, SSO/SCIM, public API keys, webhooks.

Phase C: enterprise risk, controls, framework content system, policy attestations, incidents as risk inputs.

Phase D: privacy, AI governance, data governance. Not started.

## Honesty rules

Never fake AI output, monitoring events, malware scan CLEAN, integrations, or risk scores.
If a provider is missing, the product shows `NOT_CONFIGURED`, `DEGRADED`, or `FAILED`.

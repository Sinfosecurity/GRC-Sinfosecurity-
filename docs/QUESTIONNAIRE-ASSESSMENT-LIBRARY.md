# Supreme assessment library

Platform-owned templates. Tenants may **clone** a copy. Cloning does not change historical assessments or the Supreme original.

Supreme does **not** claim NIST, CMMC, ISO, or SOC 2 certification by publishing these templates.

| # | Template | Version | Mapping source |
|---|---|---|---|
| 01 | Inherent Risk Questionnaire | 1.0.0 | Supreme inherent-exposure intake |
| 02 | Information Security Assessment | 1.0.0 | Supreme security domains |
| 03 | Privacy & Data Protection Assessment | 1.0.0 | Privacy processing themes |
| 04 | Business Continuity / Disaster Recovery Assessment | 1.0.0 | Continuity / backup themes |
| 05 | Access Control & Identity Assessment | 1.0.0 | Identity and MFA themes |
| 06 | Cloud / SaaS Security Assessment | 1.0.0 | Cloud responsibility themes |
| 07 | Incident Response & Breach Management Assessment | 1.0.0 | Incident notification themes |
| 08 | Fourth-Party / Subcontractor Risk Assessment | 1.0.0 | Subprocessor themes |
| 09 | Financial & Operational Resilience Assessment | 1.0.0 | Concentration / exit themes |
| 10 | Regulatory / Compliance Assessment | 1.0.0 | Obligation inventory |
| 11 | NIST CSF-Aligned Cybersecurity Assessment | 1.0.0 | NIST CSF 2.0 functions (aligned, not official) |
| 12 | NIST SP 800-171-Aligned Assessment | 1.0.0 | NIST SP 800-171 Rev. 2 family themes (aligned, not official) |
| 13 | CMMC Readiness Assessment | 1.0.0 | CMMC 2.0 Level 2 themes (readiness, not certification) |
| 14 | ISO 27001-Aligned Security Assessment | 1.0.0 | ISO/IEC 27001:2022 Annex A themes (aligned, not certification) |
| 15 | SOC 2 Evidence / Assurance Review | 1.0.0 | AICPA TSC review categories (not a SOC 2 exam) |

## Scoring

Each answered question scores 9 (satisfactory), 5 (partial), 2 (weak), or is excluded when the answer is Not applicable. Category and overall assessment scores are averages of scored answers. This is **assessment scoring**, separate from the certified residual-risk engine.

## Inherent-risk scoping

Vendor tier recommends templates. LOW: inherent + security. MEDIUM: adds privacy and cloud. HIGH: adds BCDR and incident. CRITICAL: adds identity, fourth-party, and SOC 2 review. Payment-like vendor types also recommend resilience and regulatory. Recommendations do not change residual risk.

## Versioning

Each template is stored as name + version. Historical assessments store `templateId` and `templateVersion`. Seeding skips an existing name+version, so v1 assessments stay v1.

## Customization

Organization administrators can clone a Supreme template. The original remains platform-owned. A full in-app question editor is not included in this remediation.

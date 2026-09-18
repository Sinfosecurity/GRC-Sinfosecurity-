import {
    CommonControlDomain,
    CommonControlType,
    MappingStrength,
} from '@prisma/client';

export type CatalogControl = {
    controlKey: string;
    title: string;
    description: string;
    objective: string;
    domain: CommonControlDomain;
    category: string;
    controlType: CommonControlType;
};

export type CatalogRequirement = {
    requirementKey: string;
    supremeSummary: string;
    sourceUrl?: string;
    maps: Array<{ controlKey: string; strength: MappingStrength }>;
};

export type CatalogFramework = {
    frameworkKey: string;
    name: string;
    publisher: string;
    sourceUrl?: string;
    version: string;
    versionStatus?: 'ACTIVE' | 'SUPERSEDED';
    requirements: CatalogRequirement[];
};

export const SUPREME_COMMON_CONTROLS: CatalogControl[] = [
    { controlKey: 'GOV-01', title: 'Governance roles and accountability', description: 'Name the people who own security, risk, and third-party decisions, and keep that assignment current.', objective: 'Decisions have a recorded human owner.', domain: 'GOVERNANCE', category: 'Accountability', controlType: 'DIRECTIVE' },
    { controlKey: 'GOV-02', title: 'Policy exception register', description: 'Record approved exceptions to security or vendor policy with an expiry and an owner.', objective: 'Exceptions are time-bounded and visible.', domain: 'GOVERNANCE', category: 'Exceptions', controlType: 'DIRECTIVE' },
    { controlKey: 'RSK-01', title: 'Inherent risk recorded before residual risk', description: 'Score inherent risk from facts that exist before treating controls as effective.', objective: 'Residual risk is never invented from a missing inherent score.', domain: 'RISK_MANAGEMENT', category: 'Scoring', controlType: 'DIRECTIVE' },
    { controlKey: 'RSK-02', title: 'Human decision required for risk acceptance', description: 'Risk acceptance is a recorded human decision and does not lower the scored residual.', objective: 'Acceptance is disposition, not a score change.', domain: 'RISK_MANAGEMENT', category: 'Decisions', controlType: 'DIRECTIVE' },
    { controlKey: 'AST-01', title: 'Inventory of systems that process customer data', description: 'Keep a current list of systems and vendors that store or process customer data for this organization.', objective: 'Data-handling systems are known.', domain: 'ASSET_MANAGEMENT', category: 'Inventory', controlType: 'PREVENTIVE' },
    { controlKey: 'IAM-01', title: 'Unique user identity for production access', description: 'People do not share production credentials. Each account maps to one person or one approved service identity.', objective: 'Actions can be attributed.', domain: 'IDENTITY_ACCESS', category: 'Identity', controlType: 'PREVENTIVE' },
    { controlKey: 'IAM-02', title: 'Access removed when role or employment ends', description: 'Access reviews and offboarding remove production and vendor-portal access that is no longer required.', objective: 'Stale access is not left open.', domain: 'IDENTITY_ACCESS', category: 'Joiner-mover-leaver', controlType: 'PREVENTIVE' },
    { controlKey: 'AUTH-01', title: 'Multi-factor authentication for privileged access', description: 'Privileged console, production, and administrator access requires a second factor. Shared passwords are not an accepted factor.', objective: 'Stolen passwords alone cannot use privileged access.', domain: 'AUTHENTICATION', category: 'MFA', controlType: 'PREVENTIVE' },
    { controlKey: 'AUTH-02', title: 'Multi-factor authentication for remote workforce access', description: 'Remote access to internal applications requires MFA when those applications can reach customer or production data.', objective: 'Remote sessions are not password-only.', domain: 'AUTHENTICATION', category: 'MFA', controlType: 'PREVENTIVE' },
    { controlKey: 'PAM-01', title: 'Privileged access is time-bounded and reviewed', description: 'Standing admin rights are avoided. Elevations have an owner, a reason, and an end time.', objective: 'Privilege is exceptional and recorded.', domain: 'PRIVILEGED_ACCESS', category: 'Elevation', controlType: 'PREVENTIVE' },
    { controlKey: 'DAT-01', title: 'Customer data classified before sharing with a vendor', description: 'Before a vendor receives data, the organization records the data types and the reason for sharing.', objective: 'Sharing is intentional.', domain: 'DATA_PROTECTION', category: 'Classification', controlType: 'PREVENTIVE' },
    { controlKey: 'ENC-01', title: 'Encryption in transit for customer data', description: 'Customer data leaving the organization or a contracted processor uses a current encrypted transport.', objective: 'Cleartext customer data is not sent over public networks.', domain: 'ENCRYPTION', category: 'Transit', controlType: 'PREVENTIVE' },
    { controlKey: 'ENC-02', title: 'Encryption at rest for stored customer data', description: 'Stored customer data uses encryption provided by the hosting platform or an equivalent control that is actually enabled.', objective: 'Stored customer data is not left unencrypted by default.', domain: 'ENCRYPTION', category: 'Rest', controlType: 'PREVENTIVE' },
    { controlKey: 'KEY-01', title: 'Cryptographic keys have an owner and rotation rule', description: 'Keys used to protect customer data have a named owner and a documented rotation or retirement rule.', objective: 'Keys are not anonymous or immortal.', domain: 'KEY_MANAGEMENT', category: 'Keys', controlType: 'PREVENTIVE' },
    { controlKey: 'LOG-01', title: 'Security-relevant events are retained and reviewable', description: 'Authentication, privilege use, and evidence download events are retained long enough to investigate an incident.', objective: 'Investigations have records to read.', domain: 'LOGGING_MONITORING', category: 'Retention', controlType: 'DETECTIVE' },
    { controlKey: 'VUL-01', title: 'Known vulnerabilities have an owner and a target date', description: 'Open vulnerabilities that affect production or a critical vendor are tracked to an owner and a target date.', objective: 'Findings do not sit unowned.', domain: 'VULNERABILITY_MANAGEMENT', category: 'Tracking', controlType: 'CORRECTIVE' },
    { controlKey: 'CFG-01', title: 'Production baselines are recorded', description: 'Production systems follow a recorded baseline. Exceptions are listed in the exception register.', objective: 'Configuration drift is visible.', domain: 'SECURE_CONFIGURATION', category: 'Baseline', controlType: 'PREVENTIVE' },
    { controlKey: 'CHG-01', title: 'Production changes are approved before release', description: 'Changes that can affect customer data or residual risk are approved by someone other than the implementer when the change is material.', objective: 'Material change is not silent.', domain: 'CHANGE_MANAGEMENT', category: 'Approval', controlType: 'PREVENTIVE' },
    { controlKey: 'DEV-01', title: 'Secrets are not stored in application source', description: 'Production secrets are injected at runtime. They are not committed to source control.', objective: 'Source repositories are not a secret store.', domain: 'SECURE_DEVELOPMENT', category: 'Secrets', controlType: 'PREVENTIVE' },
    { controlKey: 'INC-01', title: 'Security incidents have a recorded response owner', description: 'When a security incident is opened, an owner, a start time, and a next action are recorded.', objective: 'Incidents are not ownerless.', domain: 'INCIDENT_RESPONSE', category: 'Response', controlType: 'CORRECTIVE' },
    { controlKey: 'BC-01', title: 'Critical vendor disruption has a continuity action', description: 'For critical vendors, the organization records what it will do if the vendor is unavailable beyond an agreed period.', objective: 'Critical dependency outages have a plan.', domain: 'BUSINESS_CONTINUITY', category: 'Vendor continuity', controlType: 'DIRECTIVE' },
    { controlKey: 'DR-01', title: 'Authoritative data restore has been exercised', description: 'Restore of the authoritative database and evidence objects is exercised in an isolated environment, not against live production.', objective: 'Restore is proven, not assumed.', domain: 'DISASTER_RECOVERY', category: 'Restore', controlType: 'DETECTIVE' },
    { controlKey: 'TPR-01', title: 'Vendors are inventoried before they receive data', description: 'A vendor record exists before the organization shares customer data or relies on the vendor for a critical service.', objective: 'Shadow vendors are not the path to data.', domain: 'THIRD_PARTY_RISK', category: 'Intake', controlType: 'PREVENTIVE' },
    { controlKey: 'TPR-02', title: 'Inherent vendor risk is scored from recorded facts', description: 'Vendor inherent risk uses recorded data types, footprint, and criticality. It is not a marketing badge.', objective: 'Vendor risk starts from facts.', domain: 'THIRD_PARTY_RISK', category: 'Scoring', controlType: 'DIRECTIVE' },
    { controlKey: 'TPR-03', title: 'Due diligence evidence is retained for the vendor relationship', description: 'Assessments and files used to accept a vendor remain linked to that vendor for the life of the relationship and its required retention.', objective: 'Acceptance can be explained later.', domain: 'THIRD_PARTY_RISK', category: 'Evidence', controlType: 'DETECTIVE' },
    { controlKey: 'TPR-04', title: 'Critical vendors have a next review date', description: 'Critical and high-tier vendors have a next review date. Overdue reviews are visible on the operating dashboard.', objective: 'Reviews do not disappear after onboarding.', domain: 'THIRD_PARTY_RISK', category: 'Review', controlType: 'DETECTIVE' },
    { controlKey: 'PRI-01', title: 'Personal data shared with a vendor is recorded', description: 'When a vendor can access personal data, the organization records that fact on the vendor record.', objective: 'Personal-data sharing is not implicit.', domain: 'PRIVACY', category: 'Sharing', controlType: 'PREVENTIVE' },
    { controlKey: 'PHY-01', title: 'Physical access to sensitive workspaces is restricted', description: 'Workspaces that can reach production administration or evidence stores restrict physical entry to people who need it.', objective: 'Physical presence is not open by default.', domain: 'PHYSICAL_SECURITY', category: 'Premises', controlType: 'PREVENTIVE' },
    { controlKey: 'NET-01', title: 'Administrative interfaces are not exposed to the public internet without control', description: 'Production admin interfaces require an approved access path such as VPN, private link, or equivalent restriction.', objective: 'Admin ports are not casually public.', domain: 'NETWORK_SECURITY', category: 'Exposure', controlType: 'PREVENTIVE' },
    { controlKey: 'CLD-01', title: 'Cloud tenant isolation is confirmed for this organization', description: 'The organization can show that its cloud tenant or account is separated from other customers of the same provider.', objective: 'Cloud tenancy is not assumed.', domain: 'CLOUD_SECURITY', category: 'Tenancy', controlType: 'DETECTIVE' },
    { controlKey: 'BKP-01', title: 'Evidence objects are included in backup scope', description: 'Object-store evidence is in the same backup/restore scope as the authoritative database, or the gap is recorded as an exception.', objective: 'Files are not silently omitted from restore.', domain: 'BACKUP', category: 'Scope', controlType: 'PREVENTIVE' },
    { controlKey: 'AWR-01', title: 'People who handle vendor risk receive role-specific instruction', description: 'Assessors and approvers receive instruction on residual-risk honesty, evidence reuse, and malware download rules before they act in production.', objective: 'Operators know the honesty rules.', domain: 'SECURITY_AWARENESS', category: 'Role instruction', controlType: 'DIRECTIVE' },
    { controlKey: 'PER-01', title: 'Access is not granted before identity is verified', description: 'New workforce or contractor access to this platform or to a critical vendor portal waits until the person’s identity and role are confirmed.', objective: 'Access follows identity, not the other way around.', domain: 'PERSONNEL_SECURITY', category: 'Vetting', controlType: 'PREVENTIVE' },
    { controlKey: 'AIG-01', title: 'AI systems are inventoried before production use', description: 'Each AI system in use has a recorded identity, owner, purpose, and lifecycle state. A recorded row is not an approval.', objective: 'Shadow AI is visible.', domain: 'AI_GOVERNANCE', category: 'Inventory', controlType: 'PREVENTIVE' },
    { controlKey: 'AIG-02', title: 'Human oversight is recorded for material AI uses', description: 'Material AI uses record whether a human can review, override, and stop the system.', objective: 'Authority stays human.', domain: 'AI_GOVERNANCE', category: 'Oversight', controlType: 'DIRECTIVE' },
    { controlKey: 'AIG-03', title: 'AI tests are recorded by a human, not invented', description: 'Accuracy, bias, security, or red-team results exist only when a person records method, date, and result.', objective: 'No fake evaluation.', domain: 'AI_GOVERNANCE', category: 'Testing', controlType: 'DETECTIVE' },
    { controlKey: 'AIG-04', title: 'AI approval is a human decision', description: 'Approved, restricted, suspended, or retired states require a named decision maker and rationale.', objective: 'AI cannot approve itself.', domain: 'AI_GOVERNANCE', category: 'Approval', controlType: 'DIRECTIVE' },
    { controlKey: 'INS-GOV-01', title: 'Insurance accountability is named', description: 'Each insurance entity has a recorded owner for licensing, claims authority, and outsourcing decisions.', objective: 'Insurance decisions have a human owner.', domain: 'GOVERNANCE', category: 'Licensing governance', controlType: 'DIRECTIVE' },
    { controlKey: 'INS-CLM-01', title: 'Claims authority is bounded', description: 'Claims settlement authority, delegated authority, and exceptions are recorded with limits and an owner. This is governance, not a claims system.', objective: 'Claims authority is not implicit.', domain: 'GOVERNANCE', category: 'Claims authority governance', controlType: 'DIRECTIVE' },
    { controlKey: 'INS-UW-01', title: 'Underwriting authority is recorded', description: 'Who may bind, price, or deviate from guideline is named. This is not a rating engine.', objective: 'Underwriting authority is explicit.', domain: 'GOVERNANCE', category: 'Underwriting authority', controlType: 'DIRECTIVE' },
    { controlKey: 'INS-DEL-01', title: 'Delegated authority is inventoried', description: 'MGAs, brokers, and other delegates with binding or claims authority are linked to an insurance entity and a review date.', objective: 'Delegation is visible.', domain: 'THIRD_PARTY_RISK', category: 'Delegated authority', controlType: 'DIRECTIVE' },
    { controlKey: 'INS-BRK-01', title: 'Broker and intermediary oversight', description: 'Intermediaries that place or service business have an owner, a classification, and recorded review.', objective: 'Distribution partners are governed.', domain: 'THIRD_PARTY_RISK', category: 'Broker/intermediary oversight', controlType: 'DIRECTIVE' },
    { controlKey: 'INS-RE-01', title: 'Reinsurance counterparty is recorded', description: 'Treaty or facultative relationships are recorded as metadata with jurisdiction, criticality, and review date. This is not reinsurance accounting.', objective: 'Reinsurance dependency is known.', domain: 'THIRD_PARTY_RISK', category: 'Reinsurance governance', controlType: 'DIRECTIVE' },
    { controlKey: 'INS-MOD-01', title: 'Insurance models have human oversight', description: 'Models that influence underwriting, pricing, claims, or fraud have a recorded owner, last review, and human-oversight statement. AI system records are not duplicated.', objective: 'Model influence is visible.', domain: 'AI_GOVERNANCE', category: 'Model governance', controlType: 'DIRECTIVE' },
    { controlKey: 'INS-COND-01', title: 'Policyholder treatment has an owner', description: 'Complaints, market-conduct, and customer-treatment procedures have a named owner and evidence category. No fake compliance score.', objective: 'Conduct ownership is recorded.', domain: 'GOVERNANCE', category: 'Policyholder/customer treatment', controlType: 'DIRECTIVE' },
    { controlKey: 'INS-OUT-01', title: 'Material insurance outsourcing is classified', description: 'Vendors that perform a regulated insurance function or hold claims/underwriting authority are classified on the existing vendor record.', objective: 'Outsourcing is not anonymous.', domain: 'THIRD_PARTY_RISK', category: 'Outsourcing governance', controlType: 'PREVENTIVE' },
    { controlKey: 'INS-CAT-01', title: 'Catastrophe readiness is evidenced', description: 'Catastrophe or BCP plans exist as shared evidence with a test date. Missing evidence is unknown, not failed.', objective: 'Readiness is not invented.', domain: 'BUSINESS_CONTINUITY', category: 'Catastrophe readiness', controlType: 'DETECTIVE' },
    { controlKey: 'INS-LIC-01', title: 'Licenses are registered with provenance', description: 'License records name entity, authority, jurisdiction, and dates. An expired record is not automatically a legal finding of unlicensed status.', objective: 'Licensing state is honest.', domain: 'GOVERNANCE', category: 'Regulatory licensing governance', controlType: 'DIRECTIVE' },
];

export const SUPREME_FRAMEWORK_PACKS: CatalogFramework[] = [
    {
        frameworkKey: 'NIST_CSF',
        name: 'NIST Cybersecurity Framework',
        publisher: 'NIST',
        sourceUrl: 'https://www.nist.gov/cyberframework',
        version: '2.0-ref',
        requirements: [
            { requirementKey: 'GV.RR', supremeSummary: 'Supreme summary: roles for cyber risk and third-party decisions are assigned and kept current.', sourceUrl: 'https://www.nist.gov/cyberframework', maps: [{ controlKey: 'GOV-01', strength: 'PRIMARY' }, { controlKey: 'TPR-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'GV.OC', supremeSummary: 'Supreme summary: the organization records what it must protect and why those outcomes matter.', sourceUrl: 'https://www.nist.gov/cyberframework', maps: [{ controlKey: 'GOV-01', strength: 'CONTRIBUTING' }, { controlKey: 'DAT-01', strength: 'RELATED' }] },
            { requirementKey: 'ID.AM', supremeSummary: 'Supreme summary: systems and vendors that handle customer data are inventoried.', sourceUrl: 'https://www.nist.gov/cyberframework', maps: [{ controlKey: 'AST-01', strength: 'PRIMARY' }, { controlKey: 'TPR-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'PR.AA', supremeSummary: 'Supreme summary: identity, authentication, and privileged access are controlled.', sourceUrl: 'https://www.nist.gov/cyberframework', maps: [{ controlKey: 'AUTH-01', strength: 'PRIMARY' }, { controlKey: 'IAM-01', strength: 'CONTRIBUTING' }, { controlKey: 'PAM-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'PR.DS', supremeSummary: 'Supreme summary: customer data is protected in transit and at rest when stored.', sourceUrl: 'https://www.nist.gov/cyberframework', maps: [{ controlKey: 'ENC-01', strength: 'PRIMARY' }, { controlKey: 'ENC-02', strength: 'PRIMARY' }] },
            { requirementKey: 'DE.CM', supremeSummary: 'Supreme summary: security-relevant activity can be reviewed after the fact.', sourceUrl: 'https://www.nist.gov/cyberframework', maps: [{ controlKey: 'LOG-01', strength: 'PRIMARY' }] },
            { requirementKey: 'RS.MA', supremeSummary: 'Supreme summary: security incidents have an owner and a recorded next action.', sourceUrl: 'https://www.nist.gov/cyberframework', maps: [{ controlKey: 'INC-01', strength: 'PRIMARY' }] },
            { requirementKey: 'RC.RP', supremeSummary: 'Supreme summary: restore of authoritative data has been exercised in isolation.', sourceUrl: 'https://www.nist.gov/cyberframework', maps: [{ controlKey: 'DR-01', strength: 'PRIMARY' }, { controlKey: 'BKP-01', strength: 'CONTRIBUTING' }] },
        ],
    },
    {
        frameworkKey: 'NIST_800_171',
        name: 'NIST SP 800-171',
        publisher: 'NIST',
        sourceUrl: 'https://csrc.nist.gov/publications/detail/sp/800-171/rev-3/final',
        version: 'r3-ref',
        requirements: [
            { requirementKey: '3.5', supremeSummary: 'Supreme summary: identification and authentication protect access to controlled information.', maps: [{ controlKey: 'AUTH-01', strength: 'PRIMARY' }, { controlKey: 'AUTH-02', strength: 'CONTRIBUTING' }] },
            { requirementKey: '3.1', supremeSummary: 'Supreme summary: access is limited to people and services that need it.', maps: [{ controlKey: 'IAM-02', strength: 'PRIMARY' }, { controlKey: 'PAM-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: '3.13', supremeSummary: 'Supreme summary: communications and system information remain protected in transit.', maps: [{ controlKey: 'ENC-01', strength: 'PRIMARY' }, { controlKey: 'NET-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: '3.6', supremeSummary: 'Supreme summary: incident handling includes a recorded owner and next action.', maps: [{ controlKey: 'INC-01', strength: 'PRIMARY' }] },
        ],
    },
    {
        frameworkKey: 'CMMC',
        name: 'CMMC',
        publisher: 'U.S. DoD CIO',
        sourceUrl: 'https://dodcio.defense.gov/CMMC/',
        version: '2.0-ref',
        requirements: [
            { requirementKey: 'IA', supremeSummary: 'Supreme summary: identification and authentication practices are in place for systems that handle controlled information.', maps: [{ controlKey: 'AUTH-01', strength: 'PRIMARY' }] },
            { requirementKey: 'AC', supremeSummary: 'Supreme summary: access control limits who can reach controlled information.', maps: [{ controlKey: 'IAM-01', strength: 'PRIMARY' }, { controlKey: 'IAM-02', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'AU', supremeSummary: 'Supreme summary: security-relevant events can be reviewed after the fact.', maps: [{ controlKey: 'LOG-01', strength: 'PRIMARY' }] },
            { requirementKey: 'IR', supremeSummary: 'Supreme summary: incidents affecting controlled information have an owner.', maps: [{ controlKey: 'INC-01', strength: 'PRIMARY' }] },
        ],
    },
    {
        frameworkKey: 'ISO_27001',
        name: 'ISO/IEC 27001',
        publisher: 'ISO',
        sourceUrl: 'https://www.iso.org/standard/27001',
        version: '2022-ref',
        requirements: [
            { requirementKey: 'A.5', supremeSummary: 'Supreme summary: organizational controls assign ownership and keep policies usable.', maps: [{ controlKey: 'GOV-01', strength: 'PRIMARY' }, { controlKey: 'GOV-02', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'A.5.7', supremeSummary: 'Supreme summary: threat information that affects this organization is recorded and assigned.', maps: [{ controlKey: 'VUL-01', strength: 'CONTRIBUTING' }, { controlKey: 'INC-01', strength: 'RELATED' }] },
            { requirementKey: 'A.5.19', supremeSummary: 'Supreme summary: supplier relationships are identified and governed.', maps: [{ controlKey: 'TPR-01', strength: 'PRIMARY' }, { controlKey: 'TPR-03', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'A.5.23', supremeSummary: 'Supreme summary: cloud services used for customer data have a recorded owner and isolation check.', maps: [{ controlKey: 'CLD-01', strength: 'PRIMARY' }, { controlKey: 'TPR-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'A.8', supremeSummary: 'Supreme summary: technological controls protect systems, crypto, and logging.', maps: [{ controlKey: 'ENC-01', strength: 'CONTRIBUTING' }, { controlKey: 'ENC-02', strength: 'CONTRIBUTING' }, { controlKey: 'LOG-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'A.8.3', supremeSummary: 'Supreme summary: information is protected according to its recorded classification before sharing.', maps: [{ controlKey: 'DAT-01', strength: 'PRIMARY' }] },
        ],
    },
    {
        frameworkKey: 'SOC2',
        name: 'SOC 2 Trust Services Criteria',
        publisher: 'AICPA',
        sourceUrl: 'https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2',
        version: '2017-ref',
        requirements: [
            { requirementKey: 'CC1', supremeSummary: 'Supreme summary: control environment includes assigned security and risk ownership.', maps: [{ controlKey: 'GOV-01', strength: 'PRIMARY' }] },
            { requirementKey: 'CC3', supremeSummary: 'Supreme summary: risk assessment records inherent risk before residual risk.', maps: [{ controlKey: 'RSK-01', strength: 'PRIMARY' }, { controlKey: 'RSK-02', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'CC6', supremeSummary: 'Supreme summary: logical and physical access is restricted to authorized people and services.', maps: [{ controlKey: 'AUTH-01', strength: 'PRIMARY' }, { controlKey: 'IAM-02', strength: 'CONTRIBUTING' }, { controlKey: 'PHY-01', strength: 'PARTIAL' }] },
            { requirementKey: 'CC7', supremeSummary: 'Supreme summary: system operation includes monitoring and response to anomalies.', maps: [{ controlKey: 'LOG-01', strength: 'PRIMARY' }, { controlKey: 'INC-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'CC9', supremeSummary: 'Supreme summary: risk mitigation includes vendor and recovery considerations.', maps: [{ controlKey: 'TPR-02', strength: 'CONTRIBUTING' }, { controlKey: 'DR-01', strength: 'RELATED' }] },
        ],
    },
    {
        frameworkKey: 'CIS',
        name: 'CIS Controls',
        publisher: 'Center for Internet Security',
        sourceUrl: 'https://www.cisecurity.org/controls',
        version: 'v8-ref',
        requirements: [
            { requirementKey: 'CIS-06', supremeSummary: 'Supreme summary: access control includes MFA for administrative access.', maps: [{ controlKey: 'AUTH-01', strength: 'PRIMARY' }, { controlKey: 'PAM-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'CIS-05', supremeSummary: 'Supreme summary: account management removes access when a role ends.', maps: [{ controlKey: 'IAM-02', strength: 'PRIMARY' }] },
            { requirementKey: 'CIS-03', supremeSummary: 'Supreme summary: data protection includes knowing where customer data lives.', maps: [{ controlKey: 'DAT-01', strength: 'PRIMARY' }, { controlKey: 'AST-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'CIS-08', supremeSummary: 'Supreme summary: audit logs are retained long enough to investigate an incident.', maps: [{ controlKey: 'LOG-01', strength: 'PRIMARY' }] },
        ],
    },
    {
        frameworkKey: 'PCI_DSS',
        name: 'PCI DSS',
        publisher: 'PCI SSC',
        sourceUrl: 'https://www.pcisecuritystandards.org/',
        version: '4.0-ref',
        requirements: [
            { requirementKey: 'REQ-8', supremeSummary: 'Supreme summary: identify users and authenticate access to system components.', maps: [{ controlKey: 'AUTH-01', strength: 'PRIMARY' }, { controlKey: 'IAM-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'REQ-3', supremeSummary: 'Supreme summary: protect stored account data, including encryption where applicable.', maps: [{ controlKey: 'ENC-02', strength: 'PRIMARY' }, { controlKey: 'KEY-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'REQ-10', supremeSummary: 'Supreme summary: log and review access to system components that handle account data.', maps: [{ controlKey: 'LOG-01', strength: 'PRIMARY' }] },
            { requirementKey: 'REQ-12', supremeSummary: 'Supreme summary: maintain an information-security policy with a named owner.', maps: [{ controlKey: 'GOV-01', strength: 'PRIMARY' }, { controlKey: 'GOV-02', strength: 'CONTRIBUTING' }] },
        ],
    },
    {
        frameworkKey: 'HIPAA_SAFEGUARDS',
        name: 'HIPAA Security Rule safeguards',
        publisher: 'HHS',
        sourceUrl: 'https://www.hhs.gov/hipaa/for-professionals/security/index.html',
        version: 'safeguards-ref',
        requirements: [
            { requirementKey: 'A.164.312', supremeSummary: 'Supreme summary: technical safeguards include access control and transmission security for electronic protected health information when that data is in scope.', maps: [{ controlKey: 'AUTH-01', strength: 'CONTRIBUTING' }, { controlKey: 'ENC-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'A.164.308', supremeSummary: 'Supreme summary: administrative safeguards include assigned security responsibility and vendor oversight when PHI is involved.', maps: [{ controlKey: 'GOV-01', strength: 'CONTRIBUTING' }, { controlKey: 'TPR-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'A.164.310', supremeSummary: 'Supreme summary: physical safeguards restrict workspaces that can reach electronic protected health information systems when those systems are in scope.', maps: [{ controlKey: 'PHY-01', strength: 'CONTRIBUTING' }] },
        ],
    },
    {
        frameworkKey: 'NYDFS_500',
        name: 'NYDFS cybersecurity requirements',
        publisher: 'NYDFS',
        sourceUrl: 'https://www.dfs.ny.gov/industry_guidance/cybersecurity',
        version: '500-ref',
        requirements: [
            { requirementKey: '500.02', supremeSummary: 'Supreme summary: a cybersecurity program has a named owner and recorded scope.', maps: [{ controlKey: 'GOV-01', strength: 'PRIMARY' }] },
            { requirementKey: '500.07', supremeSummary: 'Supreme summary: access privileges are limited and periodically reviewed.', maps: [{ controlKey: 'IAM-02', strength: 'PRIMARY' }, { controlKey: 'PAM-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: '500.12', supremeSummary: 'Supreme summary: multi-factor authentication is used for privileged and remote access where required.', maps: [{ controlKey: 'AUTH-01', strength: 'PRIMARY' }, { controlKey: 'AUTH-02', strength: 'CONTRIBUTING' }] },
            { requirementKey: '500.11', supremeSummary: 'Supreme summary: third-party service providers are inventoried and overseen.', maps: [{ controlKey: 'TPR-01', strength: 'PRIMARY' }, { controlKey: 'TPR-04', strength: 'CONTRIBUTING' }] },
            { requirementKey: '500.14', supremeSummary: 'Supreme summary: training is provided to people who operate cybersecurity or vendor-risk processes.', maps: [{ controlKey: 'AWR-01', strength: 'PRIMARY' }] },
        ],
    },
    {
        frameworkKey: 'ISO_27001',
        name: 'ISO/IEC 27001',
        publisher: 'ISO',
        sourceUrl: 'https://www.iso.org/standard/27001',
        version: '2013-ref',
        versionStatus: 'SUPERSEDED',
        requirements: [
            { requirementKey: 'A.5', supremeSummary: 'Supreme summary (2013-ref): information security policy ownership is recorded. This identifier belongs to a superseded pack.', maps: [{ controlKey: 'GOV-01', strength: 'PRIMARY' }] },
            { requirementKey: 'A.9', supremeSummary: 'Supreme summary (2013-ref): access control includes unique identity and removal when a role ends.', maps: [{ controlKey: 'IAM-01', strength: 'PRIMARY' }, { controlKey: 'IAM-02', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'A.15', supremeSummary: 'Supreme summary (2013-ref): supplier relationships are identified before data is shared.', maps: [{ controlKey: 'TPR-01', strength: 'PRIMARY' }] },
        ],
    },
    {
        frameworkKey: 'NIST_AI_RMF',
        name: 'NIST AI Risk Management Framework',
        publisher: 'NIST',
        sourceUrl: 'https://www.nist.gov/itl/ai-risk-management-framework',
        version: '1.0-ref',
        requirements: [
            { requirementKey: 'GOVERN', supremeSummary: 'Supreme summary: AI roles, policies, and human authority are assigned and kept current. This is readiness language, not a NIST certification.', sourceUrl: 'https://www.nist.gov/itl/ai-risk-management-framework', maps: [{ controlKey: 'AIG-01', strength: 'PRIMARY' }, { controlKey: 'AIG-02', strength: 'CONTRIBUTING' }, { controlKey: 'GOV-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'MAP', supremeSummary: 'Supreme summary: AI systems, uses, data, and context are inventoried before they are treated as understood.', maps: [{ controlKey: 'AIG-01', strength: 'PRIMARY' }, { controlKey: 'AST-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: 'MEASURE', supremeSummary: 'Supreme summary: tests and evaluations are recorded by humans. Missing tests stay Not tested.', maps: [{ controlKey: 'AIG-03', strength: 'PRIMARY' }] },
            { requirementKey: 'MANAGE', supremeSummary: 'Supreme summary: residual AI risk, incidents, and restrictions are governed by human decisions.', maps: [{ controlKey: 'AIG-04', strength: 'PRIMARY' }, { controlKey: 'RSK-02', strength: 'CONTRIBUTING' }] },
        ],
    },
    {
        frameworkKey: 'ISO_42001',
        name: 'ISO/IEC 42001',
        publisher: 'ISO',
        sourceUrl: 'https://www.iso.org/standard/81230.html',
        version: '2023-ref',
        requirements: [
            { requirementKey: '4', supremeSummary: 'Supreme summary: the organization records the context and scope of its AI management system. Readiness only. Not ISO 42001 certified.', sourceUrl: 'https://www.iso.org/standard/81230.html', maps: [{ controlKey: 'AIG-01', strength: 'PRIMARY' }, { controlKey: 'GOV-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: '5', supremeSummary: 'Supreme summary: leadership assigns AI accountability and does not treat inventory as approval.', maps: [{ controlKey: 'AIG-04', strength: 'PRIMARY' }, { controlKey: 'AIG-02', strength: 'CONTRIBUTING' }] },
            { requirementKey: '8', supremeSummary: 'Supreme summary: AI operation includes recorded use cases, data, and human oversight.', maps: [{ controlKey: 'AIG-02', strength: 'PRIMARY' }, { controlKey: 'AIG-01', strength: 'CONTRIBUTING' }] },
            { requirementKey: '9', supremeSummary: 'Supreme summary: performance evaluation uses recorded tests. Results are never invented.', maps: [{ controlKey: 'AIG-03', strength: 'PRIMARY' }] },
        ],
    },
];

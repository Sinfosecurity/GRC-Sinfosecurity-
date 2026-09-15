import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import {
    PLATFORM_SCOPE,
    pickCanonicalTemplate,
    presentQuestionnaireTemplate,
    templateScopeKey,
} from './questionnairePresentation';

export type LibraryQuestion = {
    id: string;
    question: string;
    category: string;
    weight: number;
    options: string[];
    questionType?: string;
    evidenceRequired?: boolean;
    guidance?: string;
    conditionalOnKey?: string;
    conditionalValue?: string;
};

export type LibraryTemplate = {
    key: string;
    name: string;
    framework: string;
    version: string;
    purpose: string;
    mappingSource?: string;
    sections: Array<{ title: string; questions: LibraryQuestion[] }>;
};

const YN = ['Yes', 'Partial', 'No', 'Not applicable', 'Unknown'];
const YN_DOC = ['Yes — current document available', 'Yes — document exists but outdated', 'In progress', 'No', 'Not applicable'];
const IR_RATING = ['High', 'Moderate', 'Low', 'Unknown'];

function q(
    id: string,
    question: string,
    category: string,
    options: string[],
    extras: Partial<LibraryQuestion> = {}
): LibraryQuestion {
    return { id, question, category, weight: extras.weight ?? 8, options, ...extras };
}

export const SUPREME_LIBRARY: LibraryTemplate[] = [
    {
        key: 'inherent-risk',
        name: 'Inherent Risk Questionnaire',
        framework: 'Supreme Inherent Risk',
        version: '3.0.0',
        purpose: 'Internal intake and inherent exposure before due diligence is scoped. Completed by the business owner, not the vendor. Canonical IR-01 to IR-15 from the approved Vendor Risk Assessment Workbook.',
        sections: [
            {
                title: 'Engagement details',
                questions: [
                    q('ir_eng_what', 'What will this third party do for the organization?', 'Engagement', [], { weight: 0, questionType: 'TEXT', guidance: 'Describe the service or product in business language.' }),
                    q('ir_eng_category', 'What is the service category?', 'Engagement', ['SaaS', 'Professional services', 'Hosting or cloud', 'Staffing', 'Hardware', 'Payment or financial operations', 'Software or API', 'Other'], { weight: 0, guidance: 'Used to derive Cloud Hosting and Software and API packs. Unknown is not allowed at Ready to Send.' }),
                    q('ir_eng_data', 'What types of organization data will the vendor access, store, or process?', 'Engagement', ['None', 'Internal only', 'Confidential', 'Personal data', 'PHI / highly sensitive', 'Cardholder (PCI)'], { weight: 0, guidance: 'Commercial and floor context. Hard floors apply for PHI and cardholder data.' }),
                    q('ir_physical', 'Does the service depend on vendor facilities, physical records, on-site access, or physical protection of systems or media?', 'Engagement', ['No', 'Yes', 'Unknown'], { weight: 0, guidance: 'Workbook Physical Delivery pack trigger. Not a sixteenth inherent-risk score factor.' }),
                    q('ir_eng_contract', 'What contract type or term is expected?', 'Engagement', ['Master services agreement', 'Statement of work', 'Subscription', 'Purchase order only', 'Not yet known'], { weight: 0 }),
                    q('ir_spend', 'What is the estimated annual spend?', 'Engagement', ['Under $25k', '$25k–$250k', 'More than $250k'], { weight: 0, guidance: 'Commercial context only. Not part of inherent-risk scoring.' }),
                    q('ir_eng_contact', 'Who is the primary vendor contact?', 'Engagement', [], { weight: 0, questionType: 'TEXT' }),
                    q('ir_eng_security', 'Who is the vendor security or privacy contact, if known?', 'Engagement', [], { weight: 0, questionType: 'TEXT' }),
                ],
            },
            {
                title: 'Inherent risk',
                questions: [
                    q('ir_01', 'Would an outage materially disrupt critical operations or customer commitments?', 'Service criticality', IR_RATING, { weight: 4, guidance: 'Workbook IR-01.' }),
                    q('ir_02', 'Will the vendor store or process confidential, regulated, authentication, payment, or health information?', 'Sensitive data', IR_RATING, { weight: 4, guidance: 'Workbook IR-02.' }),
                    q('ir_03', 'Will the vendor process a large or rapidly growing volume of organizational or customer records?', 'Data volume', IR_RATING, { weight: 4, guidance: 'Workbook IR-03.' }),
                    q('ir_04', 'Will the vendor have administrative or privileged access to systems, networks, or cloud environments?', 'Privileged access', IR_RATING, { weight: 4, guidance: 'Workbook IR-04.' }),
                    q('ir_05', 'Will the service connect directly to production systems or trusted networks?', 'System integration', IR_RATING, { weight: 4, guidance: 'Workbook IR-05.' }),
                    q('ir_06', 'Is the service directly used by customers or embedded in a customer-facing product?', 'Customer-facing', IR_RATING, { weight: 4, guidance: 'Workbook IR-06.' }),
                    q('ir_07', 'Could service failure, fraud, or misuse create material financial loss?', 'Financial impact', IR_RATING, { weight: 4, guidance: 'Workbook IR-07.' }),
                    q('ir_08', 'Could the service affect compliance with a law, regulation, license, or supervisory commitment?', 'Regulatory impact', IR_RATING, { weight: 4, guidance: 'Workbook IR-08.' }),
                    q('ir_09', 'Will data or service delivery depend on higher-risk or legally complex jurisdictions?', 'Geographic exposure', IR_RATING, { weight: 4, guidance: 'Workbook IR-09.' }),
                    q('ir_10', 'Will important service components or data processing be delegated to other providers?', 'Subcontracting', IR_RATING, { weight: 4, guidance: 'Workbook IR-10.' }),
                    q('ir_11', 'Would replacement be difficult because of unique technology, data, skills, or market concentration?', 'Concentration', IR_RATING, { weight: 4, guidance: 'Workbook IR-11.' }),
                    q('ir_12', 'Is the vendor required for time-sensitive or high-volume operations?', 'Operational dependency', IR_RATING, { weight: 4, guidance: 'Workbook IR-12.' }),
                    q('ir_13', 'Will the service train, operate, or make decisions using machine-learning or generative-AI capabilities?', 'Artificial intelligence', IR_RATING, { weight: 4, guidance: 'Workbook IR-13.' }),
                    q('ir_14', 'Is the service reachable from the public internet or responsible for externally accessible infrastructure?', 'Public exposure', IR_RATING, { weight: 4, guidance: 'Workbook IR-14.' }),
                    q('ir_15', 'Could failure or misuse create significant customer harm or reputational damage?', 'Brand impact', IR_RATING, { weight: 4, guidance: 'Workbook IR-15.' }),
                ],
            },
        ],
    },
    {
        key: 'information-security',
        name: 'Information Security Assessment',
        framework: 'Supreme Information Security',
        version: '1.0.0',
        purpose: 'Baseline security program review for third parties.',
        sections: [
            { title: 'Governance', questions: [
                q('is_1', 'Is there a documented information security policy approved by management?', 'Governance', YN_DOC, { weight: 8, evidenceRequired: true, guidance: 'Request the current policy or a dated attestation.' }),
                q('is_2', 'Is a named security owner accountable for this service?', 'Security organization', YN, { weight: 7 }),
            ]},
            { title: 'Identity and access', questions: [
                q('is_3', 'Is multi-factor authentication required for privileged access?', 'Authentication/MFA', YN, { weight: 10, evidenceRequired: true }),
                q('is_4', 'Are privileged accounts reviewed at least quarterly?', 'Privileged access', YN, { weight: 8 }),
                q('is_5', 'Is access provisioned using least privilege?', 'Identity/access', YN, { weight: 8 }),
            ]},
            { title: 'Protection and operations', questions: [
                q('is_6', 'Is customer or confidential data encrypted in transit and at rest?', 'Encryption', YN, { weight: 10, evidenceRequired: true }),
                q('is_7', 'Is there a vulnerability management process with defined remediation times?', 'Vulnerability management', YN_DOC, { weight: 9, evidenceRequired: true }),
                q('is_8', 'Are security events logged and reviewed?', 'Logging/monitoring', YN, { weight: 8 }),
                q('is_9', 'Are production systems patched on a defined schedule?', 'Patch management', YN, { weight: 8 }),
            ]},
            { title: 'Assurance', questions: [
                q('is_10', 'Has an independent security assessment been completed in the last 12 months?', 'Independent assurance', ['Yes — third-party test', 'Yes — internal only', 'In progress', 'No', 'Unknown'], { weight: 8, evidenceRequired: true, guidance: 'Accept an executive summary, not a full exploitable report.' }),
            ]},
        ],
    },
    {
        key: 'privacy',
        name: 'Privacy & Data Protection Assessment',
        framework: 'Supreme Privacy',
        version: '1.0.0',
        purpose: 'Privacy and processing review when personal data is in scope.',
        sections: [
            { title: 'Processing', questions: [
                q('pr_1', 'Does the vendor process personal information for this engagement?', 'Privacy', YN, { weight: 10 }),
                q('pr_2', 'What data subjects are in scope?', 'Privacy', ['Employees', 'Customers', 'Both', 'None', 'Unknown'], { conditionalOnKey: 'pr_1', conditionalValue: 'Yes', weight: 8 }),
                q('pr_3', 'Where is personal data stored and processed?', 'Privacy', ['Same country only', 'Documented regions with residency controls', 'Multiple regions without residency choice', 'Unknown'], { conditionalOnKey: 'pr_1', conditionalValue: 'Yes', weight: 9 }),
                q('pr_4', 'Is a data processing agreement in place?', 'Privacy', YN_DOC, { conditionalOnKey: 'pr_1', conditionalValue: 'Yes', evidenceRequired: true, weight: 10 }),
            ]},
            { title: 'Transfers and subprocessors', questions: [
                q('pr_5', 'Are cross-border transfers documented with a lawful mechanism?', 'Privacy', YN, { conditionalOnKey: 'pr_1', conditionalValue: 'Yes', weight: 9 }),
                q('pr_6', 'Are subprocessors disclosed and flow-down obligations required?', 'Third/fourth parties', YN, { conditionalOnKey: 'pr_1', conditionalValue: 'Yes', weight: 8, evidenceRequired: true }),
                q('pr_7', 'Is a personal-data breach notification process defined?', 'Incident response', YN_DOC, { conditionalOnKey: 'pr_1', conditionalValue: 'Yes', weight: 9 }),
            ]},
        ],
    },
    {
        key: 'bcdr',
        name: 'Business Continuity / Disaster Recovery Assessment',
        framework: 'Supreme BCDR',
        version: '1.0.0',
        purpose: 'Resilience of the vendor service that the organization depends on.',
        sections: [
            { title: 'Continuity', questions: [
                q('bc_1', 'Is there a documented business continuity plan for this service?', 'Business continuity', YN_DOC, { evidenceRequired: true, weight: 9 }),
                q('bc_2', 'Has the continuity plan been tested in the last 12 months?', 'Disaster recovery', ['Yes — full test', 'Yes — tabletop only', 'No test', 'Unknown'], { evidenceRequired: true, weight: 9 }),
                q('bc_3', 'What recovery time is committed for this service?', 'Disaster recovery', ['4 hours or less', '24 hours', '72 hours', 'No commitment', 'Unknown'], { weight: 9 }),
            ]},
            { title: 'Backup', questions: [
                q('bc_4', 'Are backups taken for data required to restore this service?', 'Backup', YN, { weight: 10 }),
                q('bc_5', 'Are backups stored separately from production and periodically restored?', 'Backup', YN, { weight: 8, evidenceRequired: true }),
            ]},
        ],
    },
    {
        key: 'identity',
        name: 'Access Control & Identity Assessment',
        framework: 'Supreme Identity',
        version: '1.0.0',
        purpose: 'Identity, authentication, and access administration.',
        sections: [
            { title: 'Authentication', questions: [
                q('id_1', 'Is SSO or federated authentication available for this service?', 'Authentication/MFA', YN, { weight: 8 }),
                q('id_2', 'Is MFA required for all administrative users?', 'Authentication/MFA', YN, { weight: 10, evidenceRequired: true }),
                q('id_3', 'Are shared or generic admin accounts prohibited?', 'Privileged access', YN, { weight: 8 }),
            ]},
            { title: 'Lifecycle', questions: [
                q('id_4', 'Is joiner-mover-leaver access handled within a defined SLA?', 'Identity/access', YN, { weight: 8 }),
                q('id_5', 'Are access reviews documented for privileged roles?', 'Privileged access', YN_DOC, { evidenceRequired: true, weight: 8 }),
            ]},
        ],
    },
    {
        key: 'cloud-saas',
        name: 'Cloud / SaaS Security Assessment',
        framework: 'Supreme Cloud',
        version: '1.0.0',
        purpose: 'Cloud and SaaS control responsibilities.',
        sections: [
            { title: 'Hosting', questions: [
                q('cl_1', 'Does the vendor host customer data in a cloud or SaaS environment?', 'Cloud security', YN, { weight: 10 }),
                q('cl_2', 'Which cloud model is used for this service?', 'Cloud security', ['SaaS', 'PaaS', 'IaaS', 'Hybrid', 'On-premises only', 'Unknown'], { conditionalOnKey: 'cl_1', conditionalValue: 'Yes', weight: 7 }),
                q('cl_3', 'Are tenant isolation controls documented?', 'Cloud security', YN_DOC, { conditionalOnKey: 'cl_1', conditionalValue: 'Yes', evidenceRequired: true, weight: 10 }),
                q('cl_4', 'Can the customer choose data region?', 'Data protection', YN, { conditionalOnKey: 'cl_1', conditionalValue: 'Yes', weight: 7 }),
            ]},
            { title: 'Configuration', questions: [
                q('cl_5', 'Are secure configuration baselines used for cloud resources?', 'Secure configuration', YN, { conditionalOnKey: 'cl_1', conditionalValue: 'Yes', weight: 8 }),
                q('cl_6', 'Is customer-managed encryption key support available if required?', 'Key management', YN, { conditionalOnKey: 'cl_1', conditionalValue: 'Yes', weight: 7 }),
            ]},
        ],
    },
    {
        key: 'incident',
        name: 'Incident Response & Breach Management Assessment',
        framework: 'Supreme Incident Response',
        version: '1.0.0',
        purpose: 'Ability to detect, contain, and notify.',
        sections: [
            { title: 'Capability', questions: [
                q('irsp_1', 'Is there a documented incident-response plan for this service?', 'Incident response', YN_DOC, { evidenceRequired: true, weight: 10 }),
                q('irsp_2', 'Is a 24x7 contact path available for security incidents?', 'Incident response', YN, { weight: 8 }),
                q('irsp_3', 'What is the committed customer-notification time after confirmed material incident?', 'Incident response', ['8 hours or less', '24 hours', '72 hours', 'No commitment', 'Unknown'], { weight: 9 }),
                q('irsp_4', 'Are incidents reviewed after resolution?', 'Incident response', YN, { weight: 6 }),
            ]},
        ],
    },
    {
        key: 'fourth-party',
        name: 'Fourth-Party / Subcontractor Risk Assessment',
        framework: 'Supreme Fourth Party',
        version: '1.0.0',
        purpose: 'Downstream parties that can affect this vendor service.',
        sections: [
            { title: 'Subcontractors', questions: [
                q('fp_1', 'Does the vendor use subcontractors or subprocessors for this service?', 'Third/fourth parties', YN, { weight: 9 }),
                q('fp_2', 'Is a current subprocessor list available?', 'Third/fourth parties', YN_DOC, { conditionalOnKey: 'fp_1', conditionalValue: 'Yes', evidenceRequired: true, weight: 8 }),
                q('fp_3', 'Are material subcontractors assessed before use?', 'Third/fourth parties', YN, { conditionalOnKey: 'fp_1', conditionalValue: 'Yes', weight: 8 }),
                q('fp_4', 'Can the organization object to or be notified of material subcontractor changes?', 'Third/fourth parties', YN, { conditionalOnKey: 'fp_1', conditionalValue: 'Yes', weight: 7 }),
            ]},
        ],
    },
    {
        key: 'resilience',
        name: 'Financial & Operational Resilience Assessment',
        framework: 'Supreme Resilience',
        version: '1.0.0',
        purpose: 'Going-concern and concentration risk.',
        sections: [
            { title: 'Resilience', questions: [
                q('re_1', 'Has the vendor operated this service for at least 24 months?', 'Financial & operational', YN, { weight: 6 }),
                q('re_2', 'Is cyber insurance in force for this service?', 'Financial & operational', YN_DOC, { evidenceRequired: true, weight: 7 }),
                q('re_3', 'Is there a documented exit or data-return plan?', 'Business continuity', YN_DOC, { evidenceRequired: true, weight: 8 }),
                q('re_4', 'Does a single facility or region create a material concentration?', 'Financial & operational', YN, { weight: 7 }),
            ]},
        ],
    },
    {
        key: 'regulatory',
        name: 'Regulatory / Compliance Assessment',
        framework: 'Supreme Regulatory',
        version: '1.0.0',
        purpose: 'Compliance obligations relevant to the engagement — not a certification claim.',
        sections: [
            { title: 'Obligations', questions: [
                q('rg_1', 'Which regulatory regimes are relevant to this service?', 'Compliance', ['None identified', 'Privacy', 'Financial services', 'Healthcare', 'Public sector', 'Multiple', 'Unknown'], { weight: 8 }),
                q('rg_2', 'Is a current compliance owner named for this service?', 'Compliance', YN, { weight: 7 }),
                q('rg_3', 'Are material regulatory findings from the last 24 months disclosed?', 'Compliance', YN, { weight: 8 }),
                q('rg_4', 'Can the organization audit or receive equivalent assurance?', 'Independent assurance', YN, { weight: 8 }),
            ]},
        ],
    },
    {
        key: 'nist-csf',
        name: 'NIST CSF-Aligned Cybersecurity Assessment',
        framework: 'NIST CSF 2.0 aligned',
        version: '1.0.0',
        purpose: 'Original questions organized by NIST CSF 2.0 functions. Not an official NIST product.',
        mappingSource: 'NIST Cybersecurity Framework 2.0 functions: Govern, Identify, Protect, Detect, Respond, Recover.',
        sections: [
            { title: 'Govern and Identify', questions: [
                q('csf_1', 'Are cybersecurity roles and risk appetite documented for this service?', 'Governance', YN_DOC, { weight: 8 }),
                q('csf_2', 'Is an inventory of assets supporting this service maintained?', 'Asset management', YN, { weight: 8 }),
                q('csf_3', 'Are supplier cybersecurity requirements defined?', 'Third/fourth parties', YN, { weight: 7 }),
            ]},
            { title: 'Protect and Detect', questions: [
                q('csf_4', 'Are access, encryption, and secure-configuration controls applied to this service?', 'Secure configuration', YN, { weight: 9 }),
                q('csf_5', 'Is security monitoring in place for this service?', 'Logging/monitoring', YN, { weight: 8 }),
            ]},
            { title: 'Respond and Recover', questions: [
                q('csf_6', 'Can the vendor execute an incident-response process for this service?', 'Incident response', YN_DOC, { evidenceRequired: true, weight: 9 }),
                q('csf_7', 'Can the vendor restore this service from backup within the stated recovery objective?', 'Disaster recovery', YN, { evidenceRequired: true, weight: 9 }),
            ]},
        ],
    },
    {
        key: 'nist-800-171',
        name: 'NIST SP 800-171-Aligned Assessment',
        framework: 'NIST SP 800-171 Rev. 2 aligned',
        version: '1.0.0',
        purpose: 'Original questions covering 800-171 family themes for CUI-like data. Not a government assessment.',
        mappingSource: 'NIST SP 800-171 Revision 2 family themes (access control, awareness, audit, configuration, identification, incident, maintenance, media, personnel, physical, risk, security assessment, system integrity).',
        sections: [
            { title: 'Access and identification', questions: [
                q('n171_1', 'Is access to sensitive engagement data limited to authorized users?', 'Identity/access', YN, { weight: 10 }),
                q('n171_2', 'Are users uniquely identified before access is granted?', 'Identity/access', YN, { weight: 8 }),
            ]},
            { title: 'Audit and configuration', questions: [
                q('n171_3', 'Are audit logs retained for security-relevant events on this service?', 'Logging/monitoring', YN, { weight: 8 }),
                q('n171_4', 'Are systems configured to reduce unnecessary services and default accounts?', 'Secure configuration', YN, { weight: 8 }),
            ]},
            { title: 'Integrity and personnel', questions: [
                q('n171_5', 'Are malicious-code protections used on systems handling engagement data?', 'Endpoint security', YN, { weight: 8 }),
                q('n171_6', 'Are personnel with access screened and trained commensurate with the data?', 'Personnel security', YN, { weight: 7 }),
            ]},
        ],
    },
    {
        key: 'cmmc',
        name: 'CMMC Readiness Assessment',
        framework: 'CMMC 2.0 aligned',
        version: '1.0.0',
        purpose: 'Readiness discussion aligned to CMMC 2.0 practice themes. Not a CMMC certification.',
        mappingSource: 'CMMC 2.0 Level 2 practice themes published by the U.S. DoD CIO.',
        sections: [
            { title: 'Readiness', questions: [
                q('cmmc_1', 'Has the vendor mapped this service to CMMC 2.0 Level 2 practice themes?', 'Compliance', YN, { weight: 8 }),
                q('cmmc_2', 'Is controlled unclassified or equivalent government data in scope?', 'Compliance', YN, { weight: 10 }),
                q('cmmc_3', 'Are access control, logging, and incident practices documented for that data?', 'Governance', YN_DOC, { conditionalOnKey: 'cmmc_2', conditionalValue: 'Yes', evidenceRequired: true, weight: 9 }),
                q('cmmc_4', 'Has an independent CMMC assessment been completed? If yes, this is a vendor claim, not Supreme certification.', 'Independent assurance', ['Yes — claimed by vendor', 'In progress', 'No', 'Not applicable'], { weight: 7 }),
            ]},
        ],
    },
    {
        key: 'iso27001',
        name: 'ISO 27001-Aligned Security Assessment',
        framework: 'ISO/IEC 27001:2022 aligned',
        version: '1.0.0',
        purpose: 'Original questions by Annex A themes. Not an ISO certification.',
        mappingSource: 'ISO/IEC 27001:2022 Annex A theme groups: organizational, people, physical, technological.',
        sections: [
            { title: 'Organizational', questions: [
                q('iso_1', 'Is an information security management system, or equivalent, operated for this service?', 'Governance', YN, { weight: 8 }),
                q('iso_2', 'Are supplier security requirements defined and reviewed?', 'Third/fourth parties', YN, { weight: 7 }),
            ]},
            { title: 'People and physical', questions: [
                q('iso_3', 'Is security awareness training required for personnel on this service?', 'Personnel security', YN, { weight: 6 }),
                q('iso_4', 'Are physical or equivalent hosting controls applied to systems storing engagement data?', 'Physical security', YN, { weight: 7 }),
            ]},
            { title: 'Technological', questions: [
                q('iso_5', 'Are access control, cryptography, and operations controls documented for this service?', 'Encryption', YN_DOC, { evidenceRequired: true, weight: 9 }),
                q('iso_6', 'Is a current ISO 27001 certificate claimed for the in-scope service? Supreme does not certify this.', 'Independent assurance', ['Yes — certificate available', 'Yes — different scope', 'In progress', 'No', 'Not applicable'], { evidenceRequired: true, weight: 7 }),
            ]},
        ],
    },
    {
        key: 'soc2',
        name: 'SOC 2 Evidence / Assurance Review',
        framework: 'SOC 2 assurance review',
        version: '1.0.0',
        purpose: 'Review of vendor-supplied SOC 2 evidence. Not a SOC 2 examination.',
        mappingSource: 'AICPA SOC 2 Trust Services Criteria themes used only as review categories.',
        sections: [
            { title: 'Report intake', questions: [
                q('soc_1', 'Has the vendor provided a SOC 2 Type II report covering this service?', 'Independent assurance', ['Yes — Type II', 'Yes — Type I only', 'Bridge letter only', 'No', 'Not applicable'], { evidenceRequired: true, weight: 10, guidance: 'Upload only CLEAN evidence. Supreme does not issue SOC 2 reports.' }),
                q('soc_2', 'Is the report period current (ended within 15 months)?', 'Independent assurance', YN, { conditionalOnKey: 'soc_1', conditionalValue: 'Yes — Type II', weight: 8 }),
                q('soc_3', 'Does the report scope include the service used by this organization?', 'Independent assurance', YN, { conditionalOnKey: 'soc_1', conditionalValue: 'Yes — Type II', weight: 9 }),
            ]},
            { title: 'Exceptions', questions: [
                q('soc_4', 'Are qualified opinions or relevant exceptions present?', 'Independent assurance', ['No exceptions', 'Exceptions with remediation', 'Qualified / material exceptions', 'Unknown', 'Not applicable'], { weight: 8 }),
                q('soc_5', 'Is a complementary user-entity control list reviewed by this organization?', 'Compliance', YN, { weight: 7 }),
            ]},
        ],
    },
    {
        key: 'software-api',
        name: 'Software and API Assessment',
        framework: 'Supreme Software and API',
        version: '1.0.0',
        purpose: 'Secure development and API controls when the vendor supplies software, a hosted application, or an API. Complements Information Security; does not duplicate it.',
        sections: [
            { title: 'Software delivery', questions: [
                q('sa_1', 'Is a secure software-development lifecycle used for code delivered to this organization?', 'Application security', YN_DOC, { weight: 9, evidenceRequired: true }),
                q('sa_2', 'Are open-source and third-party components inventoried and monitored for vulnerabilities?', 'Application security', YN, { weight: 8 }),
                q('sa_3', 'Are material code or API changes reviewed before production release?', 'Change management', YN, { weight: 8 }),
            ]},
            { title: 'API controls', questions: [
                q('sa_4', 'Are APIs authenticated, authorized, and rate-limited for this service?', 'Application security', YN, { weight: 9, evidenceRequired: true }),
                q('sa_5', 'Is customer data in APIs limited to the fields required for the engagement?', 'Data protection', YN, { weight: 7 }),
            ]},
        ],
    },
    {
        key: 'physical-delivery',
        name: 'Physical Delivery Assessment',
        framework: 'Supreme Physical Delivery',
        version: '1.0.0',
        purpose: 'Facility, media, and on-site controls when the workbook Physical Delivery pack applies.',
        sections: [
            { title: 'Facilities and media', questions: [
                q('pd_1', 'Are vendor facilities used for this service access-controlled and monitored?', 'Physical security', YN_DOC, { weight: 8, evidenceRequired: true }),
                q('pd_2', 'Are visitors and on-site personnel logged and escorted in sensitive areas?', 'Physical security', YN, { weight: 7 }),
                q('pd_3', 'Is physical media containing organization data encrypted or equivalently protected in transit and storage?', 'Physical security', YN, { weight: 8 }),
                q('pd_4', 'Is secure destruction used for physical records or media at end of life?', 'Physical security', YN, { weight: 7 }),
            ]},
        ],
    },
];

function isUniqueViolation(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002';
}

export async function reconcileDuplicateTemplates() {
    const rows = await prisma.questionnaireTemplate.findMany({
        where: { isActive: true },
        select: { id: true, name: true, version: true, scopeKey: true, organizationId: true, createdAt: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
        const key = `${row.scopeKey || templateScopeKey(row.organizationId)}::${row.name}::${row.version}`;
        groups.set(key, [...(groups.get(key) || []), row]);
    }
    for (const group of groups.values()) {
        if (group.length < 2) continue;
        const { canonical, duplicates } = pickCanonicalTemplate(group);
        for (const duplicate of duplicates) {
            await prisma.vendorAssessment.updateMany({
                where: { templateId: duplicate.id },
                data: { templateId: canonical.id },
            });
            const stillReferenced = await prisma.vendorAssessment.count({ where: { templateId: duplicate.id } });
            if (stillReferenced === 0) {
                await prisma.questionnaireTemplate.delete({ where: { id: duplicate.id } });
            } else {
                await prisma.questionnaireTemplate.update({
                    where: { id: duplicate.id },
                    data: {
                        isActive: false,
                        libraryKey: null,
                        name: `${duplicate.name} (archived duplicate)`,
                    },
                });
            }
        }
    }
}

async function replaceSupremeTemplate(existingId: string, template: LibraryTemplate) {
    await prisma.questionnaireSection.deleteMany({ where: { templateId: existingId } });
    await prisma.questionnaireTemplate.update({
        where: { id: existingId },
        data: {
            name: template.name,
            framework: template.framework,
            version: template.version,
            source: 'SUPREME',
            libraryKey: template.key,
            scopeKey: PLATFORM_SCOPE,
            isActive: true,
            sections: {
                create: template.sections.map((section, sectionIndex) => ({
                    title: section.title,
                    sortOrder: sectionIndex,
                    questions: {
                        create: section.questions.map((item, qIndex) => ({
                            questionKey: item.id,
                            questionText: item.guidance ? `${item.question}\n\nGuidance: ${item.guidance}` : item.question,
                            questionType: item.questionType || 'SINGLE_CHOICE',
                            category: item.category,
                            weight: item.weight,
                            required: true,
                            evidenceRequired: Boolean(item.evidenceRequired),
                            options: item.options,
                            conditionalOnKey: item.conditionalOnKey,
                            conditionalValue: item.conditionalValue,
                            sortOrder: qIndex,
                        })),
                    },
                })),
            },
        },
    });
}

async function createSupremeTemplate(template: LibraryTemplate) {
    await prisma.questionnaireTemplate.create({
        data: {
            name: template.name,
            framework: template.framework,
            version: template.version,
            source: 'SUPREME',
            libraryKey: template.key,
            scopeKey: PLATFORM_SCOPE,
            isActive: true,
            sections: {
                create: template.sections.map((section, sectionIndex) => ({
                    title: section.title,
                    sortOrder: sectionIndex,
                    questions: {
                        create: section.questions.map((item, qIndex) => ({
                            questionKey: item.id,
                            questionText: item.guidance ? `${item.question}\n\nGuidance: ${item.guidance}` : item.question,
                            questionType: item.questionType || 'SINGLE_CHOICE',
                            category: item.category,
                            weight: item.weight,
                            required: true,
                            evidenceRequired: Boolean(item.evidenceRequired),
                            options: item.options,
                            conditionalOnKey: item.conditionalOnKey,
                            conditionalValue: item.conditionalValue,
                            sortOrder: qIndex,
                        })),
                    },
                })),
            },
        },
    });
}

async function ensureSupremeLibraryOnce() {
    await reconcileDuplicateTemplates();
    for (const template of SUPREME_LIBRARY) {
        const existing = await prisma.questionnaireTemplate.findFirst({
            where: {
                OR: [
                    { scopeKey: PLATFORM_SCOPE, libraryKey: template.key },
                    { scopeKey: PLATFORM_SCOPE, name: template.name, version: template.version },
                    { organizationId: null, name: template.name, version: template.version },
                ],
            },
            orderBy: { createdAt: 'asc' },
        });
        if (existing) {
            if (existing.version !== template.version) {
                await replaceSupremeTemplate(existing.id, template);
            }
            if (existing.source !== 'SUPREME' || existing.libraryKey !== template.key || existing.scopeKey !== PLATFORM_SCOPE) {
                await prisma.questionnaireTemplate.update({
                    where: { id: existing.id },
                    data: {
                        source: 'SUPREME',
                        libraryKey: template.key,
                        scopeKey: PLATFORM_SCOPE,
                        isActive: true,
                    },
                });
            }
            continue;
        }
        try {
            await createSupremeTemplate(template);
        } catch (error) {
            if (!isUniqueViolation(error)) throw error;
        }
    }
}

let ensureInFlight: Promise<void> | null = null;

export async function ensureSupremeLibrary() {
    if (!ensureInFlight) {
        ensureInFlight = ensureSupremeLibraryOnce().finally(() => {
            ensureInFlight = null;
        });
    }
    await ensureInFlight;
}

const PLAN_REASON: Record<string, string> = {
    'inherent-risk': 'Determines due-diligence scope before controls are credited.',
    'information-security': 'Workbook Baseline pack — required for every vendor.',
    privacy: 'Personal and Sensitive Data pack — confidential, personal, regulated, payment, or health data.',
    'software-api': 'Software and API pack — vendor supplies software, a hosted application, or an API.',
    'cloud-saas': 'Cloud Hosting pack — vendor-hosted, cloud, or platform delivery.',
    identity: 'Privileged and Network Access pack — administrative, remote, or production-network access.',
    bcdr: 'Critical Operations pack — material outage or critical dependency.',
    regulatory: 'Regulated Service pack — regulated activity or legal/audit obligation.',
    'physical-delivery': 'Physical Delivery pack — facilities, physical records, on-site access, or media.',
    incident: 'Recommended because incident notice may be required for this engagement.',
    'fourth-party': 'Recommended because subcontracting was recorded.',
    soc2: 'Optional assurance review. Not a SOC 2 examination.',
    resilience: 'Optional resilience review.',
};

function reasonFor(key: string, _vendor: { vendorType?: string | null; tier?: string | null }, signals?: IntakeAwareSignals) {
    const packWhy = signals?.packReasons?.[key];
    if (packWhy?.length) return packWhy.join(' ');
    return PLAN_REASON[key] || 'Derived from recorded intake facts.';
}

export type IntakeAwareSignals = {
    personalData?: boolean;
    privilegedAccess?: boolean;
    systemAccess?: boolean;
    fourthParty?: boolean;
    aiInvolved?: boolean;
    criticalDependency?: boolean;
    softwareOrApi?: boolean;
    cloudHosted?: boolean;
    physicalDelivery?: boolean;
    regulatedProcess?: boolean;
    requiredTemplateKeys?: string[];
    recommendedTemplateKeys?: string[];
    packReasons?: Record<string, string[]>;
};

export async function getLibraryTemplateByKey(key: string) {
    await ensureSupremeLibrary();
    const library = SUPREME_LIBRARY.find((item) => item.key === key);
    if (!library) return null;
    return prisma.questionnaireTemplate.findFirst({
        where: { scopeKey: PLATFORM_SCOPE, libraryKey: key, version: library.version, isActive: true },
        include: { sections: { include: { questions: true }, orderBy: { sortOrder: 'asc' } } },
        orderBy: { createdAt: 'desc' },
    });
}

export async function recommendAssessments(organizationId: string, vendorId: string, signals?: IntakeAwareSignals, tierOverride?: string) {
    const vendor = await prisma.vendor.findFirst({
        where: { id: vendorId, organizationId },
        select: { id: true, name: true, tier: true, inherentRiskScore: true, vendorType: true },
    });
    if (!vendor) throw new ApiError(404, 'Vendor not found');
    await ensureSupremeLibrary();
    const tier = tierOverride || vendor.tier;
    const requiredKeys = new Set<string>(['inherent-risk', 'information-security', ...(signals?.requiredTemplateKeys || [])]);
    const recommendedKeys = new Set<string>([...(signals?.recommendedTemplateKeys || [])].filter((key) => !requiredKeys.has(key)));
    if (!signals?.requiredTemplateKeys?.length) {
        if (signals?.personalData) requiredKeys.add('privacy');
        if (signals?.softwareOrApi) requiredKeys.add('software-api');
        if (signals?.cloudHosted) requiredKeys.add('cloud-saas');
        if (signals?.privilegedAccess || signals?.systemAccess) requiredKeys.add('identity');
        if (signals?.criticalDependency) requiredKeys.add('bcdr');
        if (signals?.regulatedProcess) requiredKeys.add('regulatory');
        if (signals?.physicalDelivery) requiredKeys.add('physical-delivery');
        if (signals?.fourthParty) recommendedKeys.add('fourth-party');
        if (signals?.aiInvolved) recommendedKeys.add('incident');
    }
    const wanted = new Set([...requiredKeys, ...recommendedKeys]);
    const optionalKeys = SUPREME_LIBRARY.map((item) => item.key).filter((key) => !wanted.has(key));
    const allKeys = [...requiredKeys, ...recommendedKeys, ...optionalKeys];
    const names = SUPREME_LIBRARY.filter((item) => allKeys.includes(item.key)).map((item) => item.name);
    const templates = await prisma.questionnaireTemplate.findMany({
        where: { organizationId: null, isActive: true, source: 'SUPREME', name: { in: names } },
        include: { sections: { include: { questions: { select: { evidenceRequired: true } } } } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const byName: Record<string, (typeof templates)[number]> = {};
    for (const row of templates) {
        if (!byName[row.name] || String(row.version) > String(byName[row.name].version)) {
            byName[row.name] = row;
        }
    }
    const toItems = (keysToMap: string[]) =>
        keysToMap
            .map((key) => {
                const library = SUPREME_LIBRARY.find((item) => item.key === key);
                const template = library ? byName[library.name] : undefined;
                if (!library || !template) return null;
                const presented = presentQuestionnaireTemplate(template, { purpose: library.purpose });
                return {
                    id: template.id,
                    key,
                    name: template.name,
                    version: template.version,
                    framework: template.framework,
                    purpose: library.purpose,
                    reason: reasonFor(key, vendor, signals),
                    requirement: requiredKeys.has(key) ? 'Required' : recommendedKeys.has(key) ? 'Recommended' : 'Optional',
                    expectedEvidence: presented.evidenceRequired
                        ? 'Current policy, report, or dated attestation for the controls in this assessment.'
                        : 'Recorded answers. Evidence only if a later reviewer asks for it.',
                    source: presented.source,
                    sourceLabel: presented.sourceLabel,
                    category: presented.category,
                    questionCount: presented.questionCount,
                    domainCount: presented.domainCount,
                    estimatedMinutes: presented.estimatedMinutes,
                    evidenceRequired: presented.evidenceRequired,
                };
            })
            .filter(Boolean);

    const required = toItems([...requiredKeys]);
    const recommended = toItems([...recommendedKeys]);
    const optional = toItems(optionalKeys);
    return {
        vendor,
        rationale: `Recommended due-diligence package derived from intake facts. Confirmed vendor tier ${tier} does not replace pack selection. This is assessment scope, not a residual-risk score change.`,
        required,
        recommended,
        optional,
        templates: [...required, ...recommended],
    };
}

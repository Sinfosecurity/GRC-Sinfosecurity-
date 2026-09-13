import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';

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
        version: '1.0.0',
        purpose: 'Establish inherent exposure before controls are credited.',
        sections: [
            {
                title: 'Service criticality',
                questions: [
                    q('ir_1', 'What business services depend on this vendor?', 'Risk management', ['Customer-facing revenue', 'Internal operations', 'Regulated process', 'Non-critical support', 'Unknown'], { weight: 10 }),
                    q('ir_2', 'If the vendor failed for 24 hours, what is the operational impact?', 'Business continuity', ['Severe customer or regulatory impact', 'Material internal disruption', 'Limited inconvenience', 'Negligible', 'Unknown'], { weight: 10 }),
                    q('ir_3', 'How difficult would it be to replace this vendor within 30 days?', 'Fourth-party / concentration', ['Very difficult / unique', 'Difficult', 'Possible with effort', 'Readily replaceable', 'Unknown'], { weight: 8 }),
                ],
            },
            {
                title: 'Data and access',
                questions: [
                    q('ir_4', 'Does the vendor host or process the organization’s data?', 'Data protection', YN, { weight: 10 }),
                    q('ir_5', 'Which data categories can the vendor access?', 'Privacy', ['None', 'Business contact only', 'Confidential business data', 'Personal data', 'Sensitive personal or payment data', 'Unknown'], { weight: 10, conditionalOnKey: 'ir_4', conditionalValue: 'Yes' }),
                    q('ir_6', 'Does the vendor have privileged or production access to systems?', 'Identity/access', YN, { weight: 9 }),
                    q('ir_7', 'Is the vendor connected to the production network or identity provider?', 'Network security', YN, { weight: 8 }),
                ],
            },
            {
                title: 'Regulatory exposure',
                questions: [
                    q('ir_8', 'Does this relationship support a regulated activity?', 'Compliance', YN, { weight: 9 }),
                    q('ir_9', 'Would a vendor incident require customer, regulator, or law-enforcement notice?', 'Incident response', YN, { weight: 9 }),
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
];

export async function ensureSupremeLibrary() {
    for (const template of SUPREME_LIBRARY) {
        const existing = await prisma.questionnaireTemplate.findFirst({
            where: { organizationId: null, name: template.name, version: template.version },
        });
        if (existing) continue;
        await prisma.questionnaireTemplate.create({
            data: {
                name: template.name,
                framework: template.framework,
                version: template.version,
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
}

const SCOPE_BY_TIER: Record<string, string[]> = {
    LOW: ['inherent-risk', 'information-security'],
    MEDIUM: ['inherent-risk', 'information-security', 'privacy', 'cloud-saas'],
    HIGH: ['inherent-risk', 'information-security', 'privacy', 'bcdr', 'cloud-saas', 'incident'],
    CRITICAL: ['inherent-risk', 'information-security', 'privacy', 'bcdr', 'identity', 'cloud-saas', 'incident', 'fourth-party', 'soc2'],
};

export async function recommendAssessments(organizationId: string, vendorId: string) {
    const vendor = await prisma.vendor.findFirst({
        where: { id: vendorId, organizationId },
        select: { id: true, name: true, tier: true, inherentRiskScore: true, vendorType: true },
    });
    if (!vendor) throw new ApiError(404, 'Vendor not found');
    await ensureSupremeLibrary();
    const keys = SCOPE_BY_TIER[vendor.tier] || SCOPE_BY_TIER.MEDIUM;
    const extra: string[] = [];
    if (/PAYMENT|FINANCIAL/i.test(String(vendor.vendorType || ''))) extra.push('resilience', 'regulatory');
    const wanted = new Set([...keys, ...extra]);
    const names = SUPREME_LIBRARY.filter((item) => wanted.has(item.key)).map((item) => item.name);
    const templates = await prisma.questionnaireTemplate.findMany({
        where: { organizationId: null, isActive: true, name: { in: names } },
        select: { id: true, name: true, version: true, framework: true },
    });
    return {
        vendor,
        rationale: `Recommended from vendor tier ${vendor.tier}. This is assessment scope, not a change to the residual-risk score.`,
        templates,
    };
}

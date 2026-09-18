export type Kind = 'AUTHORITATIVE_REQUIREMENT' | 'GUIDANCE_SUPERVISORY_EXPECTATION' | 'INDUSTRY_PRACTICE' | 'SUPREME_CONTROL' | 'SUPREME_PRODUCT_RECOMMENDATION';

export type RegulatoryRequirement = {
    id: string;
    packKey: string;
    kind: Kind;
    regulator: string;
    jurisdiction: string;
    instrument: string;
    officialTitle: string;
    sourceReference: string;
    sourceUrl: string;
    publicationDate?: string;
    effectiveDate?: string;
    version: string;
    requirementText: string;
    applicabilityNotes: string;
    organizationTypes: string[];
    linesOfBusiness?: string[];
    controlKeys: string[];
    evidenceCategories: string[];
    superseded: boolean;
    reviewDate: string;
};

export type RegulatoryPack = {
    key: string;
    label: string;
    version: string;
    family: 'jurisdiction' | 'operations';
    jurisdiction: string;
    regulator: string;
    publicationDate?: string;
    effectiveDate?: string;
    sourceUrl: string;
    overlay: boolean;
    organizationTypes: string[];
    excludeTypes?: string[];
    recommendationTriggers: string[];
    honesty: string;
    status: 'REVIEWED';
};

export const REGULATORY_PACKS: RegulatoryPack[] = [
    {
        key: 'ng-insurer-core',
        label: 'Nigeria insurer — NIIRA 2025 core',
        version: '2025.1',
        family: 'jurisdiction',
        jurisdiction: 'NG',
        regulator: 'NAICOM',
        effectiveDate: '2025-08-01',
        sourceUrl: 'https://naicom.gov.ng/wp-content/uploads/2025/08/NIIRA-2025.pdf',
        overlay: false,
        organizationTypes: ['INSURER', 'REINSURER', 'MICROINSURANCE_OPERATOR', 'TAKAFUL_OPERATOR'],
        excludeTypes: ['BROKER', 'LOSS_ADJUSTER', 'AGENT_INTERMEDIARY'],
        recommendationTriggers: ['NG+INSURER', 'NG+REINSURER', 'NG+MICROINSURANCE_OPERATOR', 'NG+TAKAFUL_OPERATOR'],
        honesty: 'Recommended based on Nigerian insurer/reinsurer configuration. Human applicability review is required. Not a legal determination.',
        status: 'REVIEWED',
    },
    {
        key: 'ng-broker-core',
        label: 'Nigeria broker — NIIRA 2025 intermediary',
        version: '2025.1',
        family: 'jurisdiction',
        jurisdiction: 'NG',
        regulator: 'NAICOM',
        effectiveDate: '2025-08-01',
        sourceUrl: 'https://naicom.gov.ng/wp-content/uploads/2025/08/NIIRA-2025.pdf',
        overlay: false,
        organizationTypes: ['BROKER', 'AGENT_INTERMEDIARY'],
        excludeTypes: ['INSURER', 'REINSURER', 'LOSS_ADJUSTER'],
        recommendationTriggers: ['NG+BROKER', 'NG+AGENT_INTERMEDIARY'],
        honesty: 'Recommended for Nigerian brokers/intermediaries. Does not inherit insurer solvency requirements.',
        status: 'REVIEWED',
    },
    {
        key: 'ng-loss-adjuster-core',
        label: 'Nigeria loss adjuster — NIIRA 2025',
        version: '2025.1',
        family: 'jurisdiction',
        jurisdiction: 'NG',
        regulator: 'NAICOM',
        effectiveDate: '2025-08-01',
        sourceUrl: 'https://naicom.gov.ng/wp-content/uploads/2025/08/NIIRA-2025.pdf',
        overlay: false,
        organizationTypes: ['LOSS_ADJUSTER'],
        excludeTypes: ['INSURER', 'REINSURER', 'BROKER'],
        recommendationTriggers: ['NG+LOSS_ADJUSTER'],
        honesty: 'Recommended for Nigerian loss adjusters. Does not inherit insurer capital or broker remittance duties.',
        status: 'REVIEWED',
    },
    {
        key: 'ng-privacy-ndpa',
        label: 'Nigeria privacy — NDPA 2023',
        version: '2023.1',
        family: 'jurisdiction',
        jurisdiction: 'NG',
        regulator: 'NDPC',
        effectiveDate: '2023-06-12',
        sourceUrl: 'https://ndpc.gov.ng/resources/',
        overlay: false,
        organizationTypes: ['*'],
        recommendationTriggers: ['NG'],
        honesty: 'Recommended when the organization processes personal data of data subjects in Nigeria. Confirm controller/processor role. Not automatically an insurance-license condition.',
        status: 'REVIEWED',
    },
    {
        key: 'us-base',
        label: 'United States insurance base (state-supervised)',
        version: '2026.1',
        family: 'jurisdiction',
        jurisdiction: 'US',
        regulator: 'US-STATE-DOI',
        sourceUrl: 'https://content.naic.org/model-laws',
        overlay: false,
        organizationTypes: ['INSURER', 'REINSURER', 'CAPTIVE'],
        recommendationTriggers: ['US+INSURER', 'US+REINSURER', 'US+CAPTIVE'],
        honesty: 'U.S. insurance is primarily state-supervised. This pack records architecture, not a single national insurance compliance score.',
        status: 'REVIEWED',
    },
    {
        key: 'naic-data-security-model',
        label: 'NAIC Insurance Data Security Model Law (#668) — reference',
        version: '2017.4',
        family: 'jurisdiction',
        jurisdiction: 'US',
        regulator: 'NAIC',
        publicationDate: '2017',
        sourceUrl: 'https://content.naic.org/sites/default/files/model-law-668.pdf',
        overlay: true,
        organizationTypes: ['INSURER', 'REINSURER'],
        recommendationTriggers: ['US'],
        honesty: 'NAIC model law. Not binding in a state unless that state has adopted it. Do not treat as nationwide law.',
        status: 'REVIEWED',
    },
    {
        key: 'naic-ai-bulletin',
        label: 'NAIC Model Bulletin — Use of AI Systems by Insurers',
        version: '2023.12',
        family: 'jurisdiction',
        jurisdiction: 'US',
        regulator: 'NAIC',
        publicationDate: '2023-12-04',
        sourceUrl: 'https://content.naic.org/article/naic-members-approve-model-bulletin-use-ai-insurers',
        overlay: true,
        organizationTypes: ['INSURER', 'REINSURER'],
        recommendationTriggers: ['US+AI_MODELS', 'US'],
        honesty: 'Supervisory expectation / model bulletin. Not a model law and not automatically adopted by every state.',
        status: 'REVIEWED',
    },
    {
        key: 'nydfs-500',
        label: 'New York — 23 NYCRR 500 cybersecurity overlay',
        version: '2023.11',
        family: 'jurisdiction',
        jurisdiction: 'US-NY',
        regulator: 'NYDFS',
        effectiveDate: '2023-11-01',
        sourceUrl: 'https://www.dfs.ny.gov/industry_guidance/cybersecurity',
        overlay: true,
        organizationTypes: ['INSURER', 'REINSURER', 'BROKER', 'MGA', 'TPA'],
        recommendationTriggers: ['US-NY'],
        honesty: 'Recommended only when New York is a recorded domicile or operating jurisdiction. Not applied to all U.S. insurers.',
        status: 'REVIEWED',
    },
];

export const REGULATORY_REQUIREMENTS: RegulatoryRequirement[] = [
    {
        id: 'NG-NIIRA-5-1',
        packKey: 'ng-insurer-core',
        kind: 'AUTHORITATIVE_REQUIREMENT',
        regulator: 'NAICOM',
        jurisdiction: 'NG',
        instrument: 'NIIRA 2025',
        officialTitle: 'Nigerian Insurance Industry Reform Act 2025',
        sourceReference: 's.5(1)',
        sourceUrl: 'https://naicom.gov.ng/wp-content/uploads/2025/08/NIIRA-2025.pdf',
        publicationDate: '2025-08',
        version: '2025.1',
        requirementText: 'A person shall not commence or carry on insurance, or reinsurance or related business in Nigeria unless licensed by the Commission as an insurer or a reinsurer under this Act.',
        applicabilityNotes: 'Applies to insurers and reinsurers. Does not make a broker an insurer.',
        organizationTypes: ['INSURER', 'REINSURER', 'MICROINSURANCE_OPERATOR', 'TAKAFUL_OPERATOR'],
        controlKeys: ['INS-LIC-01', 'INS-GOV-01'],
        evidenceCategories: ['insurance-license', 'regulatory-filing'],
        superseded: false,
        reviewDate: '2026-09-18',
    },
    {
        id: 'NG-NIIRA-15-RBC',
        packKey: 'ng-insurer-core',
        kind: 'AUTHORITATIVE_REQUIREMENT',
        regulator: 'NAICOM',
        jurisdiction: 'NG',
        instrument: 'NIIRA 2025',
        officialTitle: 'Nigerian Insurance Industry Reform Act 2025',
        sourceReference: 's.15(1)–(2)',
        sourceUrl: 'https://naicom.gov.ng/wp-content/uploads/2025/08/NIIRA-2025.pdf',
        publicationDate: '2025-08',
        version: '2025.1',
        requirementText: 'An insurer shall maintain the higher of the statutory minimum capital prescribed for its class of business or the risk-based capital determined by the Commission, considering insurance, market, credit, and operational risk. Supreme does not compute the formula or certify solvency.',
        applicabilityNotes: 'Insurer/reinsurer only. Record governance evidence. Do not treat a missing RBC calculation in Supreme as a legal finding of insolvency.',
        organizationTypes: ['INSURER', 'REINSURER'],
        controlKeys: ['INS-GOV-01', 'INS-LIC-01'],
        evidenceCategories: ['financial-statement', 'regulatory-filing'],
        superseded: false,
        reviewDate: '2026-09-18',
    },
    {
        id: 'NG-NIIRA-7J-RE',
        packKey: 'ng-insurer-core',
        kind: 'AUTHORITATIVE_REQUIREMENT',
        regulator: 'NAICOM',
        jurisdiction: 'NG',
        instrument: 'NIIRA 2025',
        officialTitle: 'Nigerian Insurance Industry Reform Act 2025',
        sourceReference: 's.7(j) (grounds relating to reinsurance arrangements)',
        sourceUrl: 'https://naicom.gov.ng/wp-content/uploads/2025/08/NIIRA-2025.pdf',
        publicationDate: '2025-08',
        version: '2025.1',
        requirementText: 'Failure to maintain adequate reinsurance arrangements and treaties for the authorised category of business is a stated ground for Commission action against an insurer or reinsurer.',
        applicabilityNotes: 'Insurer/reinsurer. Record treaty/facultative metadata. Not reinsurance accounting.',
        organizationTypes: ['INSURER', 'REINSURER'],
        controlKeys: ['INS-RE-01'],
        evidenceCategories: ['reinsurance-agreement'],
        superseded: false,
        reviewDate: '2026-09-18',
    },
    {
        id: 'NG-NIIRA-39-1',
        packKey: 'ng-broker-core',
        kind: 'AUTHORITATIVE_REQUIREMENT',
        regulator: 'NAICOM',
        jurisdiction: 'NG',
        instrument: 'NIIRA 2025',
        officialTitle: 'Nigerian Insurance Industry Reform Act 2025',
        sourceReference: 's.39(1)',
        sourceUrl: 'https://naicom.gov.ng/wp-content/uploads/2025/08/NIIRA-2025.pdf',
        publicationDate: '2025-08',
        version: '2025.1',
        requirementText: 'No person shall transact business in Nigeria as an insurance broker unless licensed under the Act.',
        applicabilityNotes: 'Brokers and intermediaries. Not an insurer solvency duty.',
        organizationTypes: ['BROKER', 'AGENT_INTERMEDIARY'],
        controlKeys: ['INS-LIC-01', 'INS-BRK-01'],
        evidenceCategories: ['broker-license'],
        superseded: false,
        reviewDate: '2026-09-18',
    },
    {
        id: 'NG-NIIRA-44-1',
        packKey: 'ng-broker-core',
        kind: 'AUTHORITATIVE_REQUIREMENT',
        regulator: 'NAICOM',
        jurisdiction: 'NG',
        instrument: 'NIIRA 2025',
        officialTitle: 'Nigerian Insurance Industry Reform Act 2025',
        sourceReference: 's.44(1)',
        sourceUrl: 'https://naicom.gov.ng/wp-content/uploads/2025/08/NIIRA-2025.pdf',
        publicationDate: '2025-08',
        version: '2025.1',
        requirementText: 'An insurance or reinsurance broker shall keep records of all insurance business handled and accounting records in the form and for the period prescribed by the Commission.',
        applicabilityNotes: 'Broker records. Does not create insurer financial-statement duties.',
        organizationTypes: ['BROKER'],
        controlKeys: ['INS-BRK-01', 'INS-COND-01'],
        evidenceCategories: ['market-conduct', 'regulatory-filing'],
        superseded: false,
        reviewDate: '2026-09-18',
    },
    {
        id: 'NG-NIIRA-43',
        packKey: 'ng-broker-core',
        kind: 'AUTHORITATIVE_REQUIREMENT',
        regulator: 'NAICOM',
        jurisdiction: 'NG',
        instrument: 'NIIRA 2025',
        officialTitle: 'Nigerian Insurance Industry Reform Act 2025',
        sourceReference: 's.43',
        sourceUrl: 'https://naicom.gov.ng/wp-content/uploads/2025/08/NIIRA-2025.pdf',
        publicationDate: '2025-08',
        version: '2025.1',
        requirementText: 'The Act requires indemnity cover for insurance or reinsurance brokers. Supreme records whether evidence of cover exists. It does not invent the cover amount.',
        applicabilityNotes: 'Broker. Amounts are as prescribed by the Commission, not by this product.',
        organizationTypes: ['BROKER'],
        controlKeys: ['INS-BRK-01'],
        evidenceCategories: ['broker-license'],
        superseded: false,
        reviewDate: '2026-09-18',
    },
    {
        id: 'NG-NIIRA-48-1',
        packKey: 'ng-loss-adjuster-core',
        kind: 'AUTHORITATIVE_REQUIREMENT',
        regulator: 'NAICOM',
        jurisdiction: 'NG',
        instrument: 'NIIRA 2025',
        officialTitle: 'Nigerian Insurance Industry Reform Act 2025',
        sourceReference: 's.48(1)',
        sourceUrl: 'https://naicom.gov.ng/wp-content/uploads/2025/08/NIIRA-2025.pdf',
        publicationDate: '2025-08',
        version: '2025.1',
        requirementText: 'A person shall not transact business as a loss adjuster in Nigeria unless licensed for that purpose under the Act.',
        applicabilityNotes: 'Loss adjusters only.',
        organizationTypes: ['LOSS_ADJUSTER'],
        controlKeys: ['INS-LIC-01', 'INS-CLM-01'],
        evidenceCategories: ['loss-adjuster-authorization'],
        superseded: false,
        reviewDate: '2026-09-18',
    },
    {
        id: 'NG-NIIRA-51',
        packKey: 'ng-loss-adjuster-core',
        kind: 'AUTHORITATIVE_REQUIREMENT',
        regulator: 'NAICOM',
        jurisdiction: 'NG',
        instrument: 'NIIRA 2025',
        officialTitle: 'Nigerian Insurance Industry Reform Act 2025',
        sourceReference: 's.51',
        sourceUrl: 'https://naicom.gov.ng/wp-content/uploads/2025/08/NIIRA-2025.pdf',
        publicationDate: '2025-08',
        version: '2025.1',
        requirementText: 'A loss adjuster shall keep proper records of its business in the prescribed form, subject to inspection by the Commission.',
        applicabilityNotes: 'Loss adjuster records. Not insurer solvency or broker remittance.',
        organizationTypes: ['LOSS_ADJUSTER'],
        controlKeys: ['INS-CLM-01'],
        evidenceCategories: ['claims-procedure', 'regulatory-filing'],
        superseded: false,
        reviewDate: '2026-09-18',
    },
    {
        id: 'NG-NDPA-SCOPE',
        packKey: 'ng-privacy-ndpa',
        kind: 'AUTHORITATIVE_REQUIREMENT',
        regulator: 'NDPC',
        jurisdiction: 'NG',
        instrument: 'Nigeria Data Protection Act 2023',
        officialTitle: 'Nigeria Data Protection Act, 2023 (Act No. 37)',
        sourceReference: 'ss.1–2; Gazette 1 July 2023',
        sourceUrl: 'https://ndpc.gov.ng/resources/',
        publicationDate: '2023-07-01',
        effectiveDate: '2023-06-12',
        version: '2023.1',
        requirementText: 'The Act applies to processing of personal data where the controller or processor is in Nigeria, processing occurs in Nigeria, or the controller/processor processes personal data of a data subject in Nigeria.',
        applicabilityNotes: 'Confirm whether the organization is a controller or processor. Not an insurance-license substitute.',
        organizationTypes: ['*'],
        controlKeys: ['INS-COND-01'],
        evidenceCategories: ['complaint-procedure'],
        superseded: false,
        reviewDate: '2026-09-18',
    },
    {
        id: 'US-BASE-STATE',
        packKey: 'us-base',
        kind: 'AUTHORITATIVE_REQUIREMENT',
        regulator: 'US-STATE-DOI',
        jurisdiction: 'US',
        instrument: 'State insurance licensing architecture',
        officialTitle: 'State certificate of authority / licensing (generic architecture)',
        sourceReference: 'State insurance law; NAIC coordination only',
        sourceUrl: 'https://content.naic.org/model-laws',
        version: '2026.1',
        requirementText: 'U.S. insurers are licensed by the state of domicile and must consider operating-state authority. Supreme records domicile and operating states. It does not declare a company licensed.',
        applicabilityNotes: 'US carrier architecture. State overlay required for detailed duties. NAIC is not the licensing supervisor.',
        organizationTypes: ['INSURER', 'REINSURER', 'CAPTIVE'],
        controlKeys: ['INS-LIC-01'],
        evidenceCategories: ['insurance-license'],
        superseded: false,
        reviewDate: '2026-09-18',
    },
    {
        id: 'NAIC-668-4',
        packKey: 'naic-data-security-model',
        kind: 'GUIDANCE_SUPERVISORY_EXPECTATION',
        regulator: 'NAIC',
        jurisdiction: 'US',
        instrument: 'Insurance Data Security Model Law #668',
        officialTitle: 'NAIC Insurance Data Security Model Law',
        sourceReference: 's.4 Information Security Program',
        sourceUrl: 'https://content.naic.org/sites/default/files/model-law-668.pdf',
        publicationDate: '2017',
        version: '2017.4',
        requirementText: 'A licensee shall develop, implement, and maintain a comprehensive information security program based on its risk assessment to protect nonpublic information and information systems. This is a model law. It is enforceable only where a state has adopted it.',
        applicabilityNotes: 'Record adoption status per state. Do not mark every U.S. insurer as subject.',
        organizationTypes: ['INSURER', 'REINSURER'],
        controlKeys: ['INS-OUT-01'],
        evidenceCategories: ['soc-iso-cyber'],
        superseded: false,
        reviewDate: '2026-09-18',
    },
    {
        id: 'NAIC-AI-BULLETIN',
        packKey: 'naic-ai-bulletin',
        kind: 'GUIDANCE_SUPERVISORY_EXPECTATION',
        regulator: 'NAIC',
        jurisdiction: 'US',
        instrument: 'Model Bulletin: Use of Artificial Intelligence Systems by Insurers',
        officialTitle: 'NAIC Model Bulletin on Use of AI by Insurers',
        sourceReference: 'Adopted 4 December 2023',
        sourceUrl: 'https://content.naic.org/article/naic-members-approve-model-bulletin-use-ai-insurers',
        publicationDate: '2023-12-04',
        version: '2023.12',
        requirementText: 'The bulletin reminds insurers that consumer-impacting AI decisions must comply with applicable insurance laws, including unfair trade practices, and sets expectations for an AIS program, third-party diligence, and examination documentation. It is not a model law.',
        applicabilityNotes: 'Guidance unless a state has issued its own bulletin/adoption. Human review required.',
        organizationTypes: ['INSURER', 'REINSURER'],
        controlKeys: ['INS-MOD-01'],
        evidenceCategories: ['model-validation', 'ai-fairness'],
        superseded: false,
        reviewDate: '2026-09-18',
    },
    {
        id: 'NYDFS-500.2',
        packKey: 'nydfs-500',
        kind: 'AUTHORITATIVE_REQUIREMENT',
        regulator: 'NYDFS',
        jurisdiction: 'US-NY',
        instrument: '23 NYCRR Part 500',
        officialTitle: 'Cybersecurity Requirements for Financial Services Companies',
        sourceReference: '§500.2 Cybersecurity program',
        sourceUrl: 'https://www.dfs.ny.gov/system/files/documents/2023/11/rf_fs_part500_amend2_20231101_alt.pdf',
        publicationDate: '2023-11-01',
        effectiveDate: '2023-11-01',
        version: '2023.11',
        requirementText: 'Each covered entity shall maintain a cybersecurity program designed to protect the confidentiality, integrity, and availability of its information systems and the nonpublic information stored on those systems.',
        applicabilityNotes: 'Covered entity under Banking, Insurance, or Financial Services Law. Apply only when New York is a recorded domicile or operating jurisdiction and a human confirms applicability. Limited exemptions exist in §500.19.',
        organizationTypes: ['INSURER', 'REINSURER', 'BROKER', 'MGA', 'TPA'],
        controlKeys: ['INS-OUT-01', 'INS-GOV-01'],
        evidenceCategories: ['soc-iso-cyber'],
        superseded: false,
        reviewDate: '2026-09-18',
    },
    {
        id: 'NYDFS-500.11',
        packKey: 'nydfs-500',
        kind: 'AUTHORITATIVE_REQUIREMENT',
        regulator: 'NYDFS',
        jurisdiction: 'US-NY',
        instrument: '23 NYCRR Part 500',
        officialTitle: 'Cybersecurity Requirements for Financial Services Companies',
        sourceReference: '§500.11 Third-party service provider security policy',
        sourceUrl: 'https://www.dfs.ny.gov/system/files/documents/2023/11/rf_fs_part500_amend2_20231101_alt.pdf',
        publicationDate: '2023-11-01',
        effectiveDate: '2023-11-01',
        version: '2023.11',
        requirementText: 'Each covered entity shall implement written policies and procedures designed to ensure the security of information systems and nonpublic information accessible to, or held by, third-party service providers.',
        applicabilityNotes: 'NY overlay only. Uses existing TPRM vendor records. Not a second vendor register.',
        organizationTypes: ['INSURER', 'REINSURER', 'BROKER', 'MGA', 'TPA'],
        controlKeys: ['INS-OUT-01'],
        evidenceCategories: ['delegated-authority', 'soc-iso-cyber'],
        superseded: false,
        reviewDate: '2026-09-18',
    },
    {
        id: 'NYDFS-500.17',
        packKey: 'nydfs-500',
        kind: 'AUTHORITATIVE_REQUIREMENT',
        regulator: 'NYDFS',
        jurisdiction: 'US-NY',
        instrument: '23 NYCRR Part 500',
        officialTitle: 'Cybersecurity Requirements for Financial Services Companies',
        sourceReference: '§500.17 Notices to superintendent',
        sourceUrl: 'https://www.dfs.ny.gov/system/files/documents/2023/11/rf_fs_part500_amend2_20231101_alt.pdf',
        publicationDate: '2023-11-01',
        effectiveDate: '2023-11-01',
        version: '2023.11',
        requirementText: 'Covered entities must provide required notices to the superintendent, including cybersecurity-event notification and the annual certification or acknowledgment of compliance, on the timelines in Part 500.',
        applicabilityNotes: 'NY overlay. Supreme records whether certification evidence exists. It does not file with NYDFS.',
        organizationTypes: ['INSURER', 'REINSURER', 'BROKER', 'MGA', 'TPA'],
        controlKeys: ['INS-GOV-01', 'INS-LIC-01'],
        evidenceCategories: ['regulatory-filing'],
        superseded: false,
        reviewDate: '2026-09-18',
    },
];

export const ASSESSMENT_QUESTIONS = [
    { id: 'IQ-CORE-01', packKey: 'insurance-core', question: 'Is a named human owner recorded for licensing, claims authority, and outsourcing decisions?', reuseControl: 'INS-GOV-01', evidence: ['insurance-license'], riskDomain: 'Regulatory', orgTypes: ['*'] },
    { id: 'IQ-CLM-01', packKey: 'claims-operations', question: 'Are claims settlement limits, delegated authority, and exceptions recorded with an owner?', reuseControl: 'INS-CLM-01', evidence: ['claims-procedure', 'delegated-authority'], riskDomain: 'Claims', orgTypes: ['INSURER', 'TPA', 'CLAIMS_ADMINISTRATOR', 'LOSS_ADJUSTER'] },
    { id: 'IQ-UW-01', packKey: 'underwriting-pricing', question: 'Is who may bind, price, or deviate from guideline named, without treating Supreme as a rating engine?', reuseControl: 'INS-UW-01', evidence: ['underwriting-guideline'], riskDomain: 'Underwriting', orgTypes: ['INSURER', 'MGA', 'MGU'] },
    { id: 'IQ-POL-01', packKey: 'policy-administration', question: 'Is the policy-administration owner recorded, and are issuance/renewal exceptions linked to existing controls rather than a new questionnaire?', reuseControl: 'INS-GOV-01', evidence: ['policy-procedure'], riskDomain: 'Operational', orgTypes: ['INSURER'] },
    { id: 'IQ-BRK-01', packKey: 'broker-intermediary', question: 'Are intermediaries that place or service business classified on existing vendor records with a review date?', reuseControl: 'INS-BRK-01', evidence: ['broker-license'], riskDomain: 'Third Party', orgTypes: ['INSURER', 'BROKER'] },
    { id: 'IQ-ADJ-01', packKey: 'loss-adjuster', question: 'Is independence, report integrity, and claims-file handling recorded for adjusters?', reuseControl: 'INS-CLM-01', evidence: ['loss-adjuster-authorization', 'claims-procedure'], riskDomain: 'Claims', orgTypes: ['LOSS_ADJUSTER', 'INSURER'] },
    { id: 'IQ-RE-01', packKey: 'reinsurance', question: 'Are treaty or facultative relationships recorded with jurisdiction, criticality, and review date?', reuseControl: 'INS-RE-01', evidence: ['reinsurance-agreement'], riskDomain: 'Reinsurance / Counterparty', orgTypes: ['INSURER', 'REINSURER'] },
    { id: 'IQ-AI-01', packKey: 'ai-predictive-models', question: 'Do models that influence underwriting, pricing, claims, or fraud have human oversight and a review date on the existing AI record?', reuseControl: 'INS-MOD-01', evidence: ['model-validation', 'ai-fairness'], riskDomain: 'AI', orgTypes: ['*'] },
    { id: 'IQ-OUT-01', packKey: 'regulatory-outsourcing', question: 'Are vendors that perform a regulated insurance function classified on the existing vendor record?', reuseControl: 'INS-OUT-01', evidence: ['delegated-authority'], riskDomain: 'Outsourcing', orgTypes: ['*'] },
    { id: 'IQ-COND-01', packKey: 'market-conduct', question: 'Do complaints and policyholder-treatment procedures have a named owner and evidence category?', reuseControl: 'INS-COND-01', evidence: ['complaint-procedure', 'market-conduct'], riskDomain: 'Conduct', orgTypes: ['*'] },
    { id: 'IQ-CAT-01', packKey: 'catastrophe-bcp', question: 'Does catastrophe or BCP evidence exist in the shared repository with a test date? Missing evidence is unknown, not failed.', reuseControl: 'INS-CAT-01', evidence: ['catastrophe-plan', 'bcp-test'], riskDomain: 'Catastrophe', orgTypes: ['*'] },
];

export const INSURANCE_DATA_CATEGORIES = [
    'Policyholder', 'Beneficiary', 'Claimant', 'Health/medical', 'Financial', 'Payment',
    'Driver', 'Vehicle', 'Property', 'Telematics', 'Location', 'Fraud/investigation',
    'Third-party consumer data', 'Biometric',
];

export const FUTURE_JURISDICTIONS = ['GB', 'EU', 'AE', 'SA', 'ZA', 'KE', 'GH', 'SG', 'AU'];

export function recommendRegulatoryPacks(input: { organizationType?: string; countries?: string[]; subJurisdictions?: string[]; activities?: string[] }) {
    const type = input.organizationType || '';
    const countries = input.countries || [];
    const subs = input.subJurisdictions || [];
    const activities = input.activities || [];
    const keys = new Set<string>([
        ...countries.flatMap((country) => [`${country}`, `${country}+${type}`, ...activities.map((act) => `${country}+${act}`)]),
        ...subs,
        type,
    ]);
    return REGULATORY_PACKS.filter((pack) => {
        if (pack.excludeTypes?.includes(type)) return false;
        if (pack.organizationTypes[0] !== '*' && type && !pack.organizationTypes.includes(type) && !pack.recommendationTriggers.some((trigger) => keys.has(trigger))) {
            return pack.recommendationTriggers.some((trigger) => keys.has(trigger) || trigger === type);
        }
        return pack.recommendationTriggers.some((trigger) => keys.has(trigger) || (trigger === 'NG' && countries.includes('NG')) || (trigger === 'US' && countries.includes('US')));
    }).filter((pack, index, all) => all.findIndex((row) => row.key === pack.key) === index);
}

export function requirementsForPack(packKey: string) {
    return REGULATORY_REQUIREMENTS.filter((row) => row.packKey === packKey);
}

export function generateAssessmentPlan(input: { organizationType?: string; enabledPacks?: string[]; activities?: string[] }) {
    const type = input.organizationType || '';
    const enabled = new Set(input.enabledPacks || []);
    return ASSESSMENT_QUESTIONS.filter((row) => {
        if (row.orgTypes[0] !== '*' && type && !row.orgTypes.includes(type)) return false;
        if (enabled.size && !enabled.has(row.packKey)) return false;
        return true;
    }).map((row) => ({
        id: row.id,
        question: row.question,
        packKey: row.packKey,
        relatedControls: [row.reuseControl],
        evidenceExpected: row.evidence,
        riskDomain: row.riskDomain,
        organizationType: type || row.orgTypes,
        generatedFrom: 'control-evidence-crosswalk',
        honesty: 'Generated from the insurance control/evidence map. Not a second questionnaire library.',
    }));
}

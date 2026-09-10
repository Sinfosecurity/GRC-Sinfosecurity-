export type CatalogQuestion = {
    id: string;
    question: string;
    category: string;
    weight: number;
    options: string[];
    evidenceRequired?: boolean;
    questionType?: string;
};

export type CatalogSection = {
    title: string;
    questions: CatalogQuestion[];
};

export const DEFAULT_QUESTIONNAIRE_VERSION = '1.0.0';

export const DEFAULT_QUESTIONNAIRE_SECTIONS: CatalogSection[] = [
    {
        title: 'Information Security',
        questions: [
            {
                id: 'sec_1',
                question: 'Does the vendor maintain ISO 27001, SOC 2, or equivalent certification?',
                category: 'Security',
                weight: 10,
                options: ['Yes - ISO 27001', 'Yes - SOC 2 Type II', 'Yes - Both', 'No certification', 'In progress'],
                evidenceRequired: true,
            },
            {
                id: 'sec_2',
                question: 'How does the vendor handle data encryption?',
                category: 'Security',
                weight: 9,
                options: [
                    'Encryption at rest and in transit (AES-256/TLS 1.3)',
                    'Encryption at rest only',
                    'Encryption in transit only',
                    'No encryption',
                    'Unknown',
                ],
            },
            {
                id: 'sec_3',
                question: "What is the vendor's incident response time commitment?",
                category: 'Security',
                weight: 8,
                options: ['< 1 hour (Critical incidents)', '< 4 hours', '< 24 hours', 'No SLA defined', 'Unknown'],
            },
            {
                id: 'sec_4',
                question: 'Does the vendor conduct regular penetration testing?',
                category: 'Security',
                weight: 7,
                options: ['Quarterly by third-party', 'Annually by third-party', 'Internal testing only', 'No testing', 'Unknown'],
                evidenceRequired: true,
            },
        ],
    },
    {
        title: 'Data Privacy & Compliance',
        questions: [
            {
                id: 'priv_1',
                question: 'Is the vendor GDPR compliant (if processing EU data)?',
                category: 'Privacy',
                weight: 10,
                options: [
                    'Yes - Fully compliant with DPA',
                    'Yes - Standard contractual clauses',
                    'Partially compliant',
                    'Not applicable',
                    'No',
                ],
                evidenceRequired: true,
            },
            {
                id: 'priv_2',
                question: 'Where is customer data stored geographically?',
                category: 'Privacy',
                weight: 8,
                options: [
                    'EU/EEA only',
                    'US with Privacy Shield',
                    'Multi-region with data residency options',
                    'Outside EU/US',
                    'Unknown',
                ],
            },
            {
                id: 'priv_3',
                question: 'Does the vendor have a Data Processing Agreement (DPA)?',
                category: 'Privacy',
                weight: 9,
                options: ['Yes - Signed and current', 'Yes - Pending signature', 'Standard terms only', 'No DPA', 'Not required'],
                evidenceRequired: true,
            },
        ],
    },
    {
        title: 'Business Continuity & Availability',
        questions: [
            {
                id: 'bc_1',
                question: "What is the vendor's uptime SLA?",
                category: 'Operational',
                weight: 8,
                options: ['99.99% (4 nines)', '99.9% (3 nines)', '99.5%', 'No SLA', 'Unknown'],
            },
            {
                id: 'bc_2',
                question: 'Does the vendor have a documented Business Continuity Plan (BCP)?',
                category: 'Operational',
                weight: 9,
                options: ['Yes - Tested annually', 'Yes - Tested bi-annually', 'Yes - Not tested', 'No', 'Unknown'],
                evidenceRequired: true,
            },
            {
                id: 'bc_3',
                question: "What is the vendor's Recovery Time Objective (RTO)?",
                category: 'Operational',
                weight: 8,
                options: ['< 1 hour', '< 4 hours', '< 24 hours', '> 24 hours', 'Not defined'],
            },
        ],
    },
    {
        title: 'Vendor Management & Due Diligence',
        questions: [
            {
                id: 'mgmt_1',
                question: 'How long has the vendor been in business?',
                category: 'Compliance',
                weight: 6,
                options: ['10+ years', '5-10 years', '2-5 years', '< 2 years', 'Startup'],
            },
            {
                id: 'mgmt_2',
                question: 'Does the vendor have cyber insurance?',
                category: 'Compliance',
                weight: 7,
                options: ['Yes - $10M+ coverage', 'Yes - $5M-$10M', 'Yes - < $5M', 'No', 'Unknown'],
                evidenceRequired: true,
            },
            {
                id: 'mgmt_3',
                question: 'Has the vendor had any security breaches in the past 3 years?',
                category: 'Security',
                weight: 10,
                options: ['No breaches', 'Minor breach - quickly resolved', 'Major breach - resolved', 'Multiple breaches', 'Unknown'],
            },
            {
                id: 'mgmt_4',
                question: 'Does the vendor conduct third-party security audits?',
                category: 'Compliance',
                weight: 7,
                options: ['Annually', 'Biennially', 'Ad hoc', 'Never', 'Unknown'],
            },
        ],
    },
];

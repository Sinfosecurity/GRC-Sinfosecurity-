export const INSURANCE_EDITION_KEY = 'INSURANCE' as const;

export type CatalogItem = { key: string; label: string; countries?: string[]; note?: string };

export const ORGANIZATION_TYPES: CatalogItem[] = [
    { key: 'INSURER', label: 'Insurer' },
    { key: 'REINSURER', label: 'Reinsurer' },
    { key: 'BROKER', label: 'Broker' },
    { key: 'AGENCY', label: 'Agency' },
    { key: 'MGA', label: 'Managing general agent' },
    { key: 'MGU', label: 'Managing general underwriter' },
    { key: 'TPA', label: 'Third-party administrator' },
    { key: 'CLAIMS_ADMINISTRATOR', label: 'Claims administrator' },
    { key: 'LOSS_ADJUSTER', label: 'Loss adjuster' },
    { key: 'AGENT_INTERMEDIARY', label: 'Agent / intermediary' },
    { key: 'TAKAFUL_OPERATOR', label: 'Takaful operator' },
    { key: 'MICROINSURANCE_OPERATOR', label: 'Microinsurance operator' },
    { key: 'CAPTIVE', label: 'Captive' },
    { key: 'INSURTECH', label: 'Insurtech' },
    { key: 'ACTUARIAL_MODEL_PROVIDER', label: 'Actuarial / model provider' },
    { key: 'INSURANCE_SERVICE_COMPANY', label: 'Insurance service company' },
    { key: 'OTHER', label: 'Other' },
];

export const LINES_OF_BUSINESS: CatalogItem[] = [
    { key: 'MOTOR', label: 'Motor / Auto' },
    { key: 'PROPERTY', label: 'Property' },
    { key: 'CASUALTY', label: 'Casualty' },
    { key: 'WORKERS_COMPENSATION', label: 'Workers compensation' },
    { key: 'MARINE', label: 'Marine' },
    { key: 'AVIATION', label: 'Aviation' },
    { key: 'LIFE', label: 'Life' },
    { key: 'ANNUITY', label: 'Annuity' },
    { key: 'HEALTH', label: 'Health' },
    { key: 'TRAVEL', label: 'Travel' },
    { key: 'AGRICULTURE', label: 'Agriculture' },
    { key: 'CYBER', label: 'Cyber' },
    { key: 'CREDIT', label: 'Credit' },
    { key: 'SURETY', label: 'Surety' },
    { key: 'ENGINEERING', label: 'Engineering' },
    { key: 'ENERGY', label: 'Energy' },
    { key: 'SPECIALTY', label: 'Specialty' },
    { key: 'TAKAFUL', label: 'Takaful classes' },
    { key: 'MICROINSURANCE', label: 'Microinsurance' },
    { key: 'OTHER', label: 'Other' },
];

export const INSURANCE_ACTIVITIES: CatalogItem[] = [
    { key: 'CLAIMS', label: 'Claims' },
    { key: 'UNDERWRITING', label: 'Underwriting' },
    { key: 'PRICING', label: 'Pricing' },
    { key: 'POLICY_ADMINISTRATION', label: 'Policy administration' },
    { key: 'DISTRIBUTION', label: 'Distribution' },
    { key: 'BROKERAGE', label: 'Brokerage' },
    { key: 'REINSURANCE', label: 'Reinsurance' },
    { key: 'ACTUARIAL', label: 'Actuarial' },
    { key: 'INVESTMENTS', label: 'Investments' },
    { key: 'CUSTOMER_SERVICE', label: 'Customer service' },
    { key: 'COMPLAINTS', label: 'Complaints' },
    { key: 'FRAUD_SIU', label: 'Fraud / SIU' },
    { key: 'CATASTROPHE_RESPONSE', label: 'Catastrophe response' },
    { key: 'OUTSOURCING', label: 'Outsourcing' },
    { key: 'AI_MODELS', label: 'AI / predictive models' },
    { key: 'EXTERNAL_DATA', label: 'External data' },
    { key: 'PREMIUM_COLLECTION', label: 'Premium collection' },
    { key: 'PAYMENTS', label: 'Payments' },
    { key: 'OTHER', label: 'Other' },
];

export const DATA_HANDLED: CatalogItem[] = [
    { key: 'POLICYHOLDER', label: 'Policyholder information' },
    { key: 'HEALTH_SENSITIVE', label: 'Health or sensitive information' },
    { key: 'PREMIUMS_FUNDS', label: 'Premiums or customer funds' },
    { key: 'CLAIMS_FILES', label: 'Claims files' },
    { key: 'UNDERWRITING_DATA', label: 'Underwriting data' },
    { key: 'EXTERNAL_SCORES', label: 'External scores or models' },
    { key: 'OTHER', label: 'Other' },
];

export const COUNTRIES: Array<CatalogItem & { iso2: string; firstReference?: boolean }> = [
    { key: 'NG', iso2: 'NG', label: 'Nigeria', firstReference: true },
    { key: 'US', iso2: 'US', label: 'United States', firstReference: true },
    { key: 'GB', iso2: 'GB', label: 'United Kingdom' },
    { key: 'EU', iso2: 'EU', label: 'European Union' },
    { key: 'AE', iso2: 'AE', label: 'United Arab Emirates' },
    { key: 'SA', iso2: 'SA', label: 'Saudi Arabia' },
    { key: 'ZA', iso2: 'ZA', label: 'South Africa' },
    { key: 'KE', iso2: 'KE', label: 'Kenya' },
    { key: 'GH', iso2: 'GH', label: 'Ghana' },
    { key: 'CA', iso2: 'CA', label: 'Canada' },
    { key: 'SG', iso2: 'SG', label: 'Singapore' },
    { key: 'AU', iso2: 'AU', label: 'Australia' },
    { key: 'OTHER', iso2: 'XX', label: 'Other jurisdiction' },
];

export const SUB_JURISDICTIONS: Array<CatalogItem & { country: string }> = [
    { key: 'US-NY', country: 'US', label: 'New York' },
    { key: 'US-CA', country: 'US', label: 'California' },
    { key: 'US-TX', country: 'US', label: 'Texas' },
    { key: 'US-FL', country: 'US', label: 'Florida' },
    { key: 'US-IL', country: 'US', label: 'Illinois' },
    { key: 'US-OTHER', country: 'US', label: 'Other U.S. state or territory' },
];

export const AUTHORITIES = [
    { key: 'NAICOM', label: 'National Insurance Commission (NAICOM)', country: 'NG', kind: 'national', provenance: 'PUBLIC_METADATA', note: 'Nigeria insurance supervisor. No obligations are asserted in Phase A.' },
    { key: 'NG-NDPC', label: 'Nigeria Data Protection Commission (placeholder)', country: 'NG', kind: 'privacy', provenance: 'PLACEHOLDER', note: 'Hook for later authoritative privacy content. Not populated.' },
    { key: 'US-STATE-DOI', label: 'State insurance regulator', country: 'US', kind: 'state', provenance: 'PUBLIC_METADATA', note: 'U.S. insurance is primarily state-supervised. Applicability depends on domicile and operating states.' },
    { key: 'NAIC', label: 'NAIC model-law coordination (placeholder)', country: 'US', kind: 'coordination', provenance: 'PLACEHOLDER', note: 'Not a license-granting supervisor. Do not treat as automatically applicable.' },
    { key: 'NYDFS', label: 'New York Department of Financial Services', country: 'US', kind: 'state_overlay', provenance: 'PUBLIC_METADATA', note: 'Optional New York overlay. Not applied to all U.S. insurers.' },
] as const;

export const LICENSE_TYPE_HOOKS: Array<CatalogItem & { country: string; authorityKey: string }> = [
    { key: 'NG_INSURER', country: 'NG', authorityKey: 'NAICOM', label: 'Insurer authorization (Nigeria hook)' },
    { key: 'NG_REINSURER', country: 'NG', authorityKey: 'NAICOM', label: 'Reinsurer authorization (Nigeria hook)' },
    { key: 'NG_BROKER', country: 'NG', authorityKey: 'NAICOM', label: 'Broker license (Nigeria hook)' },
    { key: 'NG_LOSS_ADJUSTER', country: 'NG', authorityKey: 'NAICOM', label: 'Loss adjuster authorization (Nigeria hook)' },
    { key: 'NG_AGENT', country: 'NG', authorityKey: 'NAICOM', label: 'Agent / intermediary (Nigeria hook)' },
    { key: 'NG_MICROINSURANCE', country: 'NG', authorityKey: 'NAICOM', label: 'Microinsurance operator (Nigeria hook)' },
    { key: 'NG_TAKAFUL', country: 'NG', authorityKey: 'NAICOM', label: 'Takaful operator (Nigeria hook)' },
    { key: 'US_COA', country: 'US', authorityKey: 'US-STATE-DOI', label: 'Certificate of authority (U.S. state hook)' },
];

export type PackDefinition = {
    key: string;
    label: string;
    family: string;
    status: 'METADATA_ONLY';
    recommendationTriggers: string[];
    relatedControlKeys: string[];
    evidenceCategories: string[];
    countries?: string[];
    overlay?: boolean;
    honesty: string;
};

export const INSURANCE_PACKS: PackDefinition[] = [
    { key: 'insurance-core', label: 'Insurance Core', family: 'core', status: 'METADATA_ONLY', recommendationTriggers: ['*'], relatedControlKeys: ['INS-GOV-01', 'INS-OUT-01'], evidenceCategories: ['insurance-license'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'claims-operations', label: 'Claims Operations', family: 'operations', status: 'METADATA_ONLY', recommendationTriggers: ['CLAIMS'], relatedControlKeys: ['INS-CLM-01'], evidenceCategories: ['claims-procedure'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'underwriting-pricing', label: 'Underwriting & Pricing', family: 'operations', status: 'METADATA_ONLY', recommendationTriggers: ['UNDERWRITING', 'PRICING'], relatedControlKeys: ['INS-UW-01'], evidenceCategories: ['underwriting-guideline'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'policy-administration', label: 'Policy Administration', family: 'operations', status: 'METADATA_ONLY', recommendationTriggers: ['POLICY_ADMINISTRATION'], relatedControlKeys: ['INS-GOV-01'], evidenceCategories: ['policy-procedure'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'consumer-data', label: 'Consumer / Policyholder Data', family: 'data', status: 'METADATA_ONLY', recommendationTriggers: ['POLICYHOLDER'], relatedControlKeys: ['INS-COND-01'], evidenceCategories: ['complaint-procedure'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'health-sensitive-data', label: 'Health / Sensitive Data', family: 'data', status: 'METADATA_ONLY', recommendationTriggers: ['HEALTH_SENSITIVE'], relatedControlKeys: ['INS-COND-01'], evidenceCategories: ['health-handling'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'ai-predictive-models', label: 'AI / Predictive Models', family: 'ai', status: 'METADATA_ONLY', recommendationTriggers: ['AI_MODELS'], relatedControlKeys: ['INS-MOD-01'], evidenceCategories: ['model-validation'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'external-data-providers', label: 'External Data Providers', family: 'data', status: 'METADATA_ONLY', recommendationTriggers: ['EXTERNAL_DATA'], relatedControlKeys: ['INS-MOD-01'], evidenceCategories: ['external-data'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'premium-payments', label: 'Premium / Payment Handling', family: 'finance', status: 'METADATA_ONLY', recommendationTriggers: ['PREMIUM_COLLECTION', 'PAYMENTS'], relatedControlKeys: ['INS-GOV-01'], evidenceCategories: ['financial-statement'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'reinsurance', label: 'Reinsurance', family: 'counterparty', status: 'METADATA_ONLY', recommendationTriggers: ['REINSURANCE', 'REINSURER'], relatedControlKeys: ['INS-RE-01'], evidenceCategories: ['reinsurance-agreement'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'broker-intermediary', label: 'Broker / Intermediary', family: 'distribution', status: 'METADATA_ONLY', recommendationTriggers: ['BROKERAGE', 'BROKER', 'AGENT_INTERMEDIARY'], relatedControlKeys: ['INS-BRK-01'], evidenceCategories: ['broker-license'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'loss-adjuster', label: 'Loss Adjuster', family: 'claims', status: 'METADATA_ONLY', recommendationTriggers: ['LOSS_ADJUSTER'], relatedControlKeys: ['INS-CLM-01'], evidenceCategories: ['loss-adjuster-authorization'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'catastrophe-bcp', label: 'Catastrophe / BCP', family: 'resilience', status: 'METADATA_ONLY', recommendationTriggers: ['CATASTROPHE_RESPONSE'], relatedControlKeys: ['INS-CAT-01'], evidenceCategories: ['catastrophe-plan'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'cybersecurity', label: 'Cybersecurity', family: 'security', status: 'METADATA_ONLY', recommendationTriggers: ['CYBER', 'AI_MODELS'], relatedControlKeys: ['INS-OUT-01'], evidenceCategories: ['soc-iso-cyber'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'privacy', label: 'Privacy', family: 'privacy', status: 'METADATA_ONLY', recommendationTriggers: ['POLICYHOLDER', 'HEALTH_SENSITIVE'], relatedControlKeys: ['INS-COND-01'], evidenceCategories: ['complaint-procedure'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'fraud-siu', label: 'Fraud / SIU', family: 'operations', status: 'METADATA_ONLY', recommendationTriggers: ['FRAUD_SIU'], relatedControlKeys: ['INS-CLM-01'], evidenceCategories: ['claims-procedure'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'cloud-technology', label: 'Cloud / Technology', family: 'technology', status: 'METADATA_ONLY', recommendationTriggers: ['INSURTECH'], relatedControlKeys: ['INS-OUT-01'], evidenceCategories: ['soc-iso-cyber'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'regulatory-outsourcing', label: 'Regulatory Outsourcing', family: 'outsourcing', status: 'METADATA_ONLY', recommendationTriggers: ['OUTSOURCING', 'TPA'], relatedControlKeys: ['INS-OUT-01'], evidenceCategories: ['delegated-authority'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'market-conduct', label: 'Market Conduct', family: 'conduct', status: 'METADATA_ONLY', recommendationTriggers: ['COMPLAINTS', 'CUSTOMER_SERVICE'], relatedControlKeys: ['INS-COND-01'], evidenceCategories: ['market-conduct'], honesty: 'Recommended based on your configuration. Not legally required by this product.' },
    { key: 'naicom-placeholder', label: 'NAICOM pack (placeholder)', family: 'jurisdiction', status: 'METADATA_ONLY', recommendationTriggers: ['NG'], relatedControlKeys: ['INS-LIC-01'], evidenceCategories: ['regulatory-filing'], countries: ['NG'], honesty: 'Placeholder for later authoritative NAICOM content. Not a statement of legal applicability.' },
    { key: 'naic-placeholder', label: 'NAIC-related pack (placeholder)', family: 'jurisdiction', status: 'METADATA_ONLY', recommendationTriggers: ['US'], relatedControlKeys: ['INS-LIC-01'], evidenceCategories: ['regulatory-filing'], countries: ['US'], honesty: 'Placeholder for later NAIC-related content. Not automatically applicable.' },
    { key: 'nydfs-overlay', label: 'New York / NYDFS overlay (optional)', family: 'jurisdiction', status: 'METADATA_ONLY', recommendationTriggers: ['US-NY'], relatedControlKeys: ['INS-LIC-01'], evidenceCategories: ['regulatory-filing'], countries: ['US'], overlay: true, honesty: 'Optional overlay. Not applied to all U.S. insurers.' },
];

export const RISK_TAXONOMY = [
    { key: 'UNDERWRITING', label: 'Underwriting', parent: 'OPERATIONAL' },
    { key: 'PRICING', label: 'Pricing', parent: 'FINANCIAL' },
    { key: 'CLAIMS', label: 'Claims', parent: 'OPERATIONAL' },
    { key: 'RESERVING', label: 'Reserving', parent: 'FINANCIAL' },
    { key: 'OPERATIONAL', label: 'Operational', parent: 'OPERATIONAL' },
    { key: 'CYBER', label: 'Cyber', parent: 'CYBERSECURITY' },
    { key: 'PRIVACY', label: 'Privacy', parent: 'PRIVACY' },
    { key: 'MODEL', label: 'Model', parent: 'AI' },
    { key: 'AI', label: 'AI', parent: 'AI' },
    { key: 'THIRD_PARTY', label: 'Third Party', parent: 'THIRD_PARTY' },
    { key: 'OUTSOURCING', label: 'Outsourcing', parent: 'THIRD_PARTY' },
    { key: 'CONCENTRATION', label: 'Concentration', parent: 'THIRD_PARTY' },
    { key: 'CATASTROPHE', label: 'Catastrophe', parent: 'BUSINESS_CONTINUITY' },
    { key: 'FRAUD', label: 'Fraud', parent: 'OPERATIONAL' },
    { key: 'CONDUCT', label: 'Conduct', parent: 'COMPLIANCE' },
    { key: 'REGULATORY', label: 'Regulatory', parent: 'LEGAL_REGULATORY' },
    { key: 'TECHNOLOGY', label: 'Technology', parent: 'TECHNOLOGY' },
    { key: 'DATA_QUALITY', label: 'Data Quality', parent: 'TECHNOLOGY' },
    { key: 'REINSURANCE_COUNTERPARTY', label: 'Reinsurance / Counterparty', parent: 'FINANCIAL' },
    { key: 'LIQUIDITY_FINANCIAL', label: 'Liquidity / Financial', parent: 'FINANCIAL' },
    { key: 'STRATEGIC', label: 'Strategic', parent: 'STRATEGIC' },
    { key: 'REPUTATIONAL', label: 'Reputational', parent: 'REPUTATIONAL' },
] as const;

export const VENDOR_SERVICE_CATEGORIES: CatalogItem[] = [
    { key: 'TPA', label: 'TPA' },
    { key: 'CLAIMS_ADMINISTRATOR', label: 'Claims administrator' },
    { key: 'LOSS_ADJUSTER', label: 'Loss adjuster' },
    { key: 'INDEPENDENT_ADJUSTER', label: 'Independent adjuster' },
    { key: 'REPAIR_NETWORK', label: 'Repair network' },
    { key: 'RESTORATION', label: 'Restoration' },
    { key: 'MEDICAL_IME', label: 'Medical / IME' },
    { key: 'LEGAL', label: 'Legal' },
    { key: 'INVESTIGATOR', label: 'Investigator' },
    { key: 'SIU_FRAUD', label: 'SIU / fraud' },
    { key: 'BROKER', label: 'Broker' },
    { key: 'REINSURER', label: 'Reinsurer' },
    { key: 'MGA_MGU', label: 'MGA / MGU' },
    { key: 'ACTUARIAL', label: 'Actuarial' },
    { key: 'CATASTROPHE_MODEL', label: 'Catastrophe model provider' },
    { key: 'UNDERWRITING_DATA', label: 'Underwriting data provider' },
    { key: 'TELEMATICS', label: 'Telematics' },
    { key: 'PAYMENT', label: 'Payment provider' },
    { key: 'POLICY_ADMINISTRATION', label: 'Policy administration' },
    { key: 'CALL_CENTER', label: 'Call center' },
    { key: 'CLOUD_SAAS', label: 'Cloud / SaaS' },
    { key: 'AI_MODEL_VENDOR', label: 'AI / model vendor' },
    { key: 'DATA_PROVIDER', label: 'Data provider' },
    { key: 'PRINT_MAIL', label: 'Print / mail' },
    { key: 'CATASTROPHE_RESPONSE', label: 'Catastrophe-response provider' },
    { key: 'OTHER', label: 'Other' },
];

export const EVIDENCE_CATEGORIES: CatalogItem[] = [
    { key: 'insurance-license', label: 'Insurance license' },
    { key: 'broker-license', label: 'Broker license' },
    { key: 'loss-adjuster-authorization', label: 'Loss adjuster authorization' },
    { key: 'delegated-authority', label: 'Delegated authority agreement' },
    { key: 'claims-procedure', label: 'Claims procedure' },
    { key: 'underwriting-guideline', label: 'Underwriting guideline' },
    { key: 'reinsurance-agreement', label: 'Reinsurance agreement' },
    { key: 'actuarial-report', label: 'Actuarial report' },
    { key: 'model-validation', label: 'Model validation' },
    { key: 'ai-fairness', label: 'AI fairness/bias assessment' },
    { key: 'bcp-test', label: 'Business continuity test' },
    { key: 'catastrophe-plan', label: 'Catastrophe plan' },
    { key: 'complaint-procedure', label: 'Complaint procedures' },
    { key: 'market-conduct', label: 'Market conduct evidence' },
    { key: 'financial-statement', label: 'Financial statement' },
    { key: 'regulatory-filing', label: 'Regulatory filing evidence' },
    { key: 'soc-iso-cyber', label: 'SOC / ISO / cyber evidence' },
];

export const CONTROL_EXTENSIONS = [
    { controlKey: 'INS-GOV-01', title: 'Insurance accountability', category: 'Licensing governance' },
    { controlKey: 'INS-CLM-01', title: 'Claims authority governance', category: 'Claims authority governance' },
    { controlKey: 'INS-UW-01', title: 'Underwriting authority', category: 'Underwriting authority' },
    { controlKey: 'INS-DEL-01', title: 'Delegated authority', category: 'Delegated authority' },
    { controlKey: 'INS-BRK-01', title: 'Broker and intermediary oversight', category: 'Broker/intermediary oversight' },
    { controlKey: 'INS-RE-01', title: 'Reinsurance governance', category: 'Reinsurance governance' },
    { controlKey: 'INS-MOD-01', title: 'Insurance model governance', category: 'Model governance' },
    { controlKey: 'INS-COND-01', title: 'Policyholder treatment', category: 'Policyholder/customer treatment' },
    { controlKey: 'INS-OUT-01', title: 'Insurance outsourcing governance', category: 'Outsourcing governance' },
    { controlKey: 'INS-CAT-01', title: 'Catastrophe readiness', category: 'Catastrophe readiness' },
    { controlKey: 'INS-LIC-01', title: 'Regulatory licensing register', category: 'Regulatory licensing governance' },
];

export const NIGERIA_TYPES = ['INSURER', 'REINSURER', 'BROKER', 'LOSS_ADJUSTER', 'AGENT_INTERMEDIARY', 'MICROINSURANCE_OPERATOR', 'TAKAFUL_OPERATOR', 'INSURTECH', 'INSURANCE_SERVICE_COMPANY'];
export const US_TYPES = ['INSURER', 'REINSURER', 'BROKER', 'AGENCY', 'MGA', 'MGU', 'TPA', 'CAPTIVE', 'INSURTECH', 'OTHER'];

export function typesForCountry(country?: string) {
    if (country === 'NG') return ORGANIZATION_TYPES.filter((row) => NIGERIA_TYPES.includes(row.key));
    if (country === 'US') return ORGANIZATION_TYPES.filter((row) => US_TYPES.includes(row.key));
    return ORGANIZATION_TYPES;
}

export function recommendPacks(input: { organizationType?: string; activities?: string[]; dataHandled?: string[]; countries?: string[]; subJurisdictions?: string[] }) {
    const haystack = new Set([
        input.organizationType || '',
        ...(input.activities || []),
        ...(input.dataHandled || []),
        ...(input.countries || []),
        ...(input.subJurisdictions || []),
        '*',
    ]);
    return INSURANCE_PACKS.filter((pack) => pack.recommendationTriggers.some((trigger) => haystack.has(trigger))).map((pack) => ({
        key: pack.key,
        label: pack.label,
        reason: pack.honesty,
        overlay: Boolean(pack.overlay),
        status: pack.status,
    }));
}

export function insuranceCatalog() {
    return {
        edition: INSURANCE_EDITION_KEY,
        honesty: 'Recommended regulation is not applicable regulation. Configured packs are not compliance. Unknown is not zero.',
        organizationTypes: ORGANIZATION_TYPES,
        linesOfBusiness: LINES_OF_BUSINESS,
        activities: INSURANCE_ACTIVITIES,
        dataHandled: DATA_HANDLED,
        countries: COUNTRIES,
        subJurisdictions: SUB_JURISDICTIONS,
        authorities: AUTHORITIES,
        licenseTypeHooks: LICENSE_TYPE_HOOKS,
        packs: INSURANCE_PACKS,
        riskTaxonomy: RISK_TAXONOMY,
        vendorServiceCategories: VENDOR_SERVICE_CATEGORIES,
        evidenceCategories: EVIDENCE_CATEGORIES,
        controlExtensions: CONTROL_EXTENSIONS,
    };
}

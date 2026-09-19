export const PRIVACY_HONESTY =
    'A recorded legal basis is not a finding that processing is lawful. A DPIA is not a claim that GDPR is satisfied. A configured deadline is not legal advice. A closed deletion task is not proof the data is gone. Consent collection is not configured unless a real collector exists.';

export const PRIVACY_REGIMES = [
    { key: 'NOT_DETERMINED', name: 'Not determined', region: 'UNSET', summary: 'No privacy regime has been selected. Supreme does not assign GDPR or any other law by default.', sourceUrl: null, endorsement: 'Selecting a regime is a recorded organizational choice, not a legal finding.' },
    { key: 'GDPR', name: 'GDPR', region: 'EU', summary: 'Supreme summary: record purpose, basis, transfers, and rights handling. This is not legal advice.', sourceUrl: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj', endorsement: 'Not an official EU text and not a compliance determination.' },
    { key: 'NDPA', name: 'Nigeria NDPA', region: 'NG', summary: 'Supreme summary: Nigeria Data Protection Act concepts for recorded basis and rights. This is not legal advice.', sourceUrl: null, endorsement: 'Not official NDPC text.' },
    { key: 'UK_GDPR', name: 'UK GDPR', region: 'UK', summary: 'Supreme summary: UK privacy regime concepts for recorded basis and rights. This is not legal advice.', sourceUrl: 'https://www.legislation.gov.uk/eur/2016/679/contents', endorsement: 'Not official ICO guidance.' },
    { key: 'CCPA_CPRA', name: 'CCPA / CPRA', region: 'US-CA', summary: 'Supreme summary: California consumer privacy concepts including opt-out. This is not legal advice.', sourceUrl: 'https://oag.ca.gov/privacy/ccpa', endorsement: 'Not official California text.' },
    { key: 'US_STATE', name: 'US state privacy', region: 'US', summary: 'Supreme summary: state privacy-law concepts that may apply by residency. Applicability is recorded, not auto-declared.', sourceUrl: null, endorsement: 'Not a determination that any state law applies.' },
    { key: 'HIPAA_PRIVACY', name: 'HIPAA privacy-related obligations', region: 'US', summary: 'Supreme summary: health information handling may create privacy obligations. Selecting Health data does not conclude HIPAA applies.', sourceUrl: 'https://www.hhs.gov/hipaa', endorsement: 'Not official HHS text.' },
    { key: 'GLBA', name: 'GLBA privacy concepts', region: 'US', summary: 'Supreme summary: financial privacy notice and sharing concepts. This is not a GLBA assessment.', sourceUrl: null, endorsement: 'Not official regulatory text.' },
    { key: 'NY_PRIVACY', name: 'New York privacy/security obligations', region: 'US-NY', summary: 'Supreme summary: New York privacy and cybersecurity obligations may apply to some processing. Not automatically applicable.', sourceUrl: null, endorsement: 'Not official DFS or AG text.' },
    { key: 'LGPD', name: 'Brazil LGPD', region: 'BR', summary: 'Supreme summary: Brazilian personal-data processing concepts. This is not legal advice.', sourceUrl: null, endorsement: 'Not official ANPD text.' },
    { key: 'CANADA', name: 'Canada privacy regimes', region: 'CA', summary: 'Supreme summary: federal and provincial privacy concepts. Applicability is recorded only.', sourceUrl: null, endorsement: 'Not official OPC text.' },
];

export const DPIA_SCREENING = [
    { key: 'large_scale', label: 'Large-scale processing' },
    { key: 'sensitive_data', label: 'Sensitive or special-category data' },
    { key: 'systematic_monitoring', label: 'Systematic monitoring' },
    { key: 'new_technology', label: 'New technology' },
    { key: 'vulnerable_subjects', label: 'Vulnerable data subjects' },
    { key: 'automated_decision', label: 'Automated decision-making' },
    { key: 'cross_border', label: 'Cross-border processing' },
];

export function humanPrivacyLabel(value: string | null | undefined) {
    if (!value) return 'Not set';
    if (value === 'SPECIAL_CATEGORY' || /^special[_ ]category$/i.test(value)) return 'Special Category Data';
    return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function deletionHonesty(status: string, exception?: string | null) {
    if (/LEGAL_HOLD|EXCEPTION/i.test(status) || exception) {
        return 'Legal hold or exception is recorded. This task is not complete as a deletion, and it is not proof that external-system data is deleted.';
    }
    if (/VERIFIED|CLOSED/i.test(status)) {
        return 'Deletion task completed. Deletion verified by attestation or evidence. This is not proof that external-system data is deleted.';
    }
    return 'A deletion task is not automated deletion across systems. Closed is not proof the data is gone.';
}

export function consentProviderStatus(source?: string | null) {
    if (source === 'IMPORTED') return 'Imported';
    if (source === 'INTEGRATION') return 'Integration not configured';
    return 'Not configured / manual';
}

export function notificationHonesty(status?: string | null) {
    if (/DETERMINED_REQUIRED/i.test(status || '')) {
        return 'Notification determined required is a recorded organizational decision. It is not legal advice.';
    }
    if (/DETERMINED_NOT_REQUIRED/i.test(status || '')) {
        return 'Notification determined not required is a recorded organizational decision, not a legal clearance.';
    }
    return 'Notification assessment required. Supreme does not automatically calculate a breach-notification obligation.';
}

export function neutralizeSpreadsheetCell(value: unknown): string {
    const text = value == null ? '' : String(value);
    if (/^[=+\-@]/.test(text) || text.includes('\t') || text.includes('\r') || text.includes('\n')) {
        return `'${text}`;
    }
    return text;
}

export function configuredDeadline(regime: string, requestType: string, receivedAt: Date) {
    const days = /CCPA|CPRA|US_STATE/i.test(regime) ? 45 : 30;
    const due = new Date(receivedAt.getTime() + days * 86400000);
    return {
        days,
        dueAt: due,
        why: `Configured ${days}-day deadline for ${regime || 'unspecified regime'} ${requestType} requests. This is a configured deadline, not legal advice.`,
    };
}

export function dpiaScreeningAdvice(yesCount: number) {
    if (yesCount >= 2) {
        return 'DPIA may be required / review recommended. This is not a statement that a DPIA is legally required.';
    }
    return 'No screening answers currently recommend a DPIA. This is not a legal clearance.';
}

export function maskRequester(value?: string | null) {
    if (!value) return 'Not shown';
    if (value.includes('@')) {
        const [name, domain] = value.split('@');
        return `${name.slice(0, 1)}•••@${domain}`;
    }
    if (value.length <= 4) return '••••';
    return `${value.slice(0, 2)}•••${value.slice(-2)}`;
}

export function nextPrivacyId(prefix: string, sequence: number) {
    return `${prefix}-${String(sequence).padStart(5, '0')}`;
}

export function daysBetween(from: Date, to = new Date()) {
    return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000));
}

export type PrivacyAttentionItem = {
    type: string;
    why: string;
    related: string | null;
    owner: string | null;
    dueAt: string | null;
    ageDays: number | null;
    severity: string | null;
    href: string;
    publicId: string;
    priority: number;
};

export function rankAttention(items: PrivacyAttentionItem[]) {
    return [...items].sort((a, b) => a.priority - b.priority || (b.ageDays || 0) - (a.ageDays || 0)).slice(0, 24);
}

const FORBIDDEN = /this processing is (gdpr )?compliant|this transfer is lawful|this dpia satisfies|deadline is legally (correct|required)|you must notify (the )?regulator/i;

export function containsForbiddenClaim(text: string) {
    return FORBIDDEN.test(text);
}

import { VendorTier } from '@prisma/client';

export type IntakeAnswer = { questionKey: string; response?: string | null };

export type TierFactor = {
    code: string;
    label: string;
    points: number;
    rationale: string;
};

export type HardFloor = {
    code: string;
    label: string;
    applies: boolean;
    rationale: string;
};

export type IntakeSignals = {
    personalData: boolean;
    sensitiveData: boolean;
    cardholder: boolean;
    phi: boolean;
    privilegedAccess: boolean;
    systemAccess: boolean;
    onsiteAccess: boolean;
    fourthParty: boolean;
    aiInvolved: boolean;
    criticalDependency: boolean;
    regulatedProcess: boolean;
    geographicExposure: boolean;
    dataTypes: string[];
};

export type InherentTierResult = {
    score: number;
    maxScore: number;
    inherentRisk: number;
    recommendedTier: VendorTier;
    factors: TierFactor[];
    hardFloors: HardFloor[];
    signals: IntakeSignals;
    explanation: string;
};

const DATA_POINTS: Record<string, number> = {
    none: 0,
    'internal only': 1,
    confidential: 2,
    'personal data': 3,
    pii: 3,
    'sensitive personal or payment data': 5,
    'highly sensitive': 5,
    phi: 5,
    'cardholder (pci)': 5,
    cardholder: 5,
    pci: 5,
};

const VOLUME_POINTS: Record<string, number> = {
    '<1k': 0,
    'fewer than 1,000': 0,
    '1k–10k': 1,
    '1,000 to 10,000': 1,
    '10k–100k': 2,
    '10,000 to 100,000': 2,
    '>100k': 3,
    'more than 100,000': 3,
};

const ACCESS_POINTS: Record<string, number> = {
    no: 0,
    'read-only api': 2,
    'read-write': 3,
    'privileged or network access': 4,
    privileged: 4,
};

const AVAIL_POINTS: Record<string, number> = {
    negligible: 0,
    '1 month': 1,
    minor: 1,
    '1 week': 3,
    significant: 3,
    '1 day': 4,
    severe: 4,
};

function norm(value?: string | null) {
    return String(value || '').trim().toLowerCase();
}

function lookup(table: Record<string, number>, value?: string | null, fallback = 0) {
    const key = norm(value);
    if (!key) return fallback;
    if (table[key] !== undefined) return table[key];
    const hit = Object.keys(table).find((entry) => key.includes(entry));
    return hit ? table[hit] : fallback;
}

function yes(value?: string | null) {
    const key = norm(value);
    return key === 'yes' || key.startsWith('yes ') || key === 'unknown';
}

function answer(answers: IntakeAnswer[], ...keys: string[]) {
    const found = answers.find((row) => keys.includes(row.questionKey));
    return found?.response || '';
}

export function addBusinessDays(from: Date, days: number) {
    const date = new Date(from);
    let remaining = days;
    while (remaining > 0) {
        date.setDate(date.getDate() + 1);
        const weekday = date.getDay();
        if (weekday !== 0 && weekday !== 6) remaining -= 1;
    }
    return date;
}

export function extractVendorDomain(website?: string | null) {
    if (!website) return null;
    const raw = String(website).trim();
    if (!raw) return null;
    try {
        const host = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname.toLowerCase();
        return host.replace(/^www\./, '') || null;
    } catch {
        return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase() || null;
    }
}

export function normalizeVendorName(name: string) {
    return String(name || '')
        .toLowerCase()
        .replace(/[.,/#'"]/g, ' ')
        .replace(/\b(inc|llc|ltd|llp|corp|corporation|company|co|plc)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function namesLikelyDuplicate(a: string, b: string) {
    const left = normalizeVendorName(a);
    const right = normalizeVendorName(b);
    if (!left || !right) return false;
    return left === right || left.includes(right) || right.includes(left);
}

export function formatVendorPublicId(year: number, sequence: number) {
    return `VND-${year}-${String(sequence).padStart(4, '0')}`;
}

export function recommendTierFromIntake(answers: IntakeAnswer[]): InherentTierResult {
    const data = answer(answers, 'ir_data', 'ir_5');
    const volume = answer(answers, 'ir_volume');
    const access = answer(answers, 'ir_access', 'ir_6', 'ir_7');
    const onsite = answer(answers, 'ir_onsite');
    const geo = answer(answers, 'ir_geo');
    const regulated = answer(answers, 'ir_regulated', 'ir_8', 'ir_1');
    const fourth = answer(answers, 'ir_fourth', 'ir_3');
    const availability = answer(answers, 'ir_availability', 'ir_2');
    const spend = answer(answers, 'ir_spend');
    const ai = answer(answers, 'ir_ai');

    const dataPoints = lookup(DATA_POINTS, data);
    const volumePoints = lookup(VOLUME_POINTS, volume);
    const accessPoints = lookup(ACCESS_POINTS, access);
    const onsitePoints = /yes/i.test(onsite) ? 2 : 0;
    const geoPoints = /outside/i.test(geo) ? 3 : /same region/i.test(geo) ? 1 : 0;
    const regulatedPoints = /yes|customer-facing|regulated/i.test(regulated) ? 3 : 0;
    const fourthPoints = /yes/i.test(fourth) ? 2 : /unknown/i.test(fourth) ? 1 : 0;
    const availabilityPoints = lookup(AVAIL_POINTS, availability);
    const spendPoints = />\s*\$?250k|more than \$250/i.test(spend) ? 2 : /25k|\$25/i.test(spend) ? 1 : 0;
    const aiPoints = yes(ai) && !/^no\b/i.test(norm(ai)) ? 2 : 0;

    const factors: TierFactor[] = [
        { code: 'sensitive_data', label: 'Sensitive data', points: dataPoints, rationale: data || 'No data type recorded.' },
        { code: 'data_volume', label: 'Individuals or records affected', points: volumePoints, rationale: volume || 'Volume not recorded.' },
        { code: 'privileged_access', label: 'System or privileged access', points: accessPoints, rationale: access || 'Access not recorded.' },
        { code: 'onsite_access', label: 'Onsite or device access', points: onsitePoints, rationale: onsite || 'Onsite access not recorded.' },
        { code: 'geographic_exposure', label: 'Geographic exposure', points: geoPoints, rationale: geo || 'Location not recorded.' },
        { code: 'regulated_process', label: 'Customer-facing or regulated process', points: regulatedPoints, rationale: regulated || 'Regulatory exposure not recorded.' },
        { code: 'fourth_party', label: 'Fourth-party use', points: fourthPoints, rationale: fourth || 'Subcontractor use not recorded.' },
        { code: 'business_criticality', label: 'Business availability impact', points: availabilityPoints, rationale: availability || 'Availability impact not recorded.' },
        { code: 'annual_spend', label: 'Annual spend', points: spendPoints, rationale: spend || 'Spend not recorded.' },
        { code: 'ai_processing', label: 'AI processing', points: aiPoints, rationale: ai || 'AI involvement not recorded.' },
    ];

    const score = factors.reduce((sum, factor) => sum + factor.points, 0);
    const cardholder = /cardholder|pci/i.test(data);
    const phi = /\bphi\b|highly sensitive|sensitive personal/i.test(data);
    const privilegedAccess = accessPoints >= 4 || /privileged/i.test(access);
    const hardFloors: HardFloor[] = [
        {
            code: 'privileged_access',
            label: 'Privileged or network access',
            applies: privilegedAccess,
            rationale: 'Privileged or production access requires the Critical floor.',
        },
        {
            code: 'cardholder',
            label: 'Cardholder data',
            applies: cardholder,
            rationale: 'Cardholder data requires the Critical floor.',
        },
        {
            code: 'phi',
            label: 'PHI or highly sensitive information',
            applies: phi,
            rationale: 'PHI or highly sensitive information requires the Critical floor.',
        },
    ];

    let recommendedTier: VendorTier = VendorTier.LOW;
    if (score >= 8) recommendedTier = VendorTier.MEDIUM;
    if (score >= 14) recommendedTier = VendorTier.HIGH;
    if (score >= 20) recommendedTier = VendorTier.CRITICAL;
    if (hardFloors.some((floor) => floor.applies)) recommendedTier = VendorTier.CRITICAL;

    const inherentRisk = Math.min(100, Math.max(hardFloors.some((floor) => floor.applies) ? 80 : 0, Math.round((score / 30) * 100)));
    const appliedFloors = hardFloors.filter((floor) => floor.applies).map((floor) => floor.label);
    const explanation = appliedFloors.length
        ? `Supreme recommends ${recommendedTier.toLowerCase()} because a minimum floor applies: ${appliedFloors.join(', ')}. Intake score ${score} of 30.`
        : `Supreme recommends ${recommendedTier.toLowerCase()} from the recorded intake score of ${score} of 30.`;

    const signals: IntakeSignals = {
        personalData: /personal|pii|phi|cardholder|payment/i.test(data),
        sensitiveData: /phi|cardholder|pci|highly sensitive|sensitive personal/i.test(data),
        cardholder,
        phi,
        privilegedAccess,
        systemAccess: accessPoints >= 2 || /api|sso|network|privileged|read-write/i.test(access),
        onsiteAccess: /yes/i.test(onsite),
        fourthParty: /yes/i.test(fourth),
        aiInvolved: yes(ai) && !/^no\b/i.test(norm(ai)),
        criticalDependency: availabilityPoints >= 3 || /1 day|1 week|severe|significant/i.test(availability),
        regulatedProcess: regulatedPoints > 0,
        geographicExposure: geoPoints > 0,
        dataTypes: [data].filter(Boolean),
    };

    return {
        score,
        maxScore: 30,
        inherentRisk,
        recommendedTier,
        factors,
        hardFloors,
        signals,
        explanation,
    };
}

import { VendorTier } from '@prisma/client';
import {
    deriveQuestionnairePlan,
    confirmScopeBlockMessage,
} from '../tprm/packDerivation';
import { WORKBOOK_PACK_KEYS, loadWorkbookCatalog, workbookPackCounts } from '../tprm/workbookCatalog';

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
    softwareOrApi: boolean;
    cloudHosted: boolean;
    physicalDelivery: boolean;
    dataTypes: string[];
};

export type ScopeFact = {
    code: string;
    packKey: string;
    packName: string;
    question: string;
    answer: string;
    resolved: boolean;
};

export type DueDiligencePack = {
    key: string;
    name: string;
    templateKey: string;
    requirement: 'Required' | 'Recommended';
    why: string[];
};

export type PackRecommendation = {
    required: DueDiligencePack[];
    recommended: DueDiligencePack[];
    unresolved: ScopeFact[];
    selectedKeys: string[];
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
    unresolved: ScopeFact[];
    packs: PackRecommendation;
};

export const IR_RATING = ['High', 'Moderate', 'Low', 'Unknown'] as const;
export const CANONICAL_IR_KEYS = [
    'ir_01', 'ir_02', 'ir_03', 'ir_04', 'ir_05', 'ir_06', 'ir_07',
    'ir_08', 'ir_09', 'ir_10', 'ir_11', 'ir_12', 'ir_13', 'ir_14', 'ir_15',
] as const;

export const WORKBOOK_PACKS = WORKBOOK_PACK_KEYS.map((pack) => ({
    key: pack.key,
    name: pack.name,
    templateKey: pack.templateKey,
}));

const RATING_POINTS: Record<string, number> = {
    high: 4,
    critical: 4,
    severe: 4,
    moderate: 3,
    medium: 3,
    significant: 3,
    low: 1,
    negligible: 1,
    no: 1,
    yes: 4,
};

const DATA_RATING: Record<string, string> = {
    none: 'Low',
    'internal only': 'Low',
    confidential: 'High',
    'personal data': 'High',
    pii: 'High',
    'phi / highly sensitive': 'High',
    'cardholder (pci)': 'High',
    cardholder: 'High',
};

function norm(value?: string | null) {
    return String(value || '').trim().toLowerCase();
}

function answer(answers: IntakeAnswer[], ...keys: string[]) {
    const found = answers.find((row) => keys.includes(row.questionKey));
    return found?.response || '';
}

function ratingOf(value?: string | null): 'High' | 'Moderate' | 'Low' | 'Unknown' | '' {
    const key = norm(value);
    if (!key || key === 'not recorded') return '';
    if (key === 'unknown' || key === 'not yet known' || key === 'not answered') return 'Unknown';
    if (RATING_POINTS[key] === 4 || key.startsWith('yes') || /high|severe|within 1 day|privileged|cardholder|phi|personal|confidential/.test(key)) {
        if (/low|no\b|none|domestic|negligible|under/.test(key) && !/high/.test(key)) return 'Low';
        return 'High';
    }
    if (RATING_POINTS[key] === 3 || /moderate|medium|significant|1 week|same region|read-write|1,000 to 10,000|10,000/.test(key)) return 'Moderate';
    if (RATING_POINTS[key] === 1 || /low|no\b|none|domestic|negligible|fewer than|read-only/.test(key)) return 'Low';
    return 'Unknown';
}

function pointsFor(rating: string) {
    if (rating === 'High' || rating === 'Unknown') return 3;
    if (rating === 'Moderate') return 2;
    if (rating === 'Low') return 1;
    return 0;
}

function isUnknown(rating: string) {
    return rating === 'Unknown' || rating === '';
}

function affirmative(rating: string) {
    return rating === 'High' || rating === 'Moderate';
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

function irRating(answers: IntakeAnswer[], key: string, aliases: string[], inferred?: string) {
    const direct = answer(answers, key, ...aliases);
    if (direct) return { rating: ratingOf(direct), raw: direct };
    if (inferred) return { rating: ratingOf(inferred), raw: inferred };
    return { rating: '', raw: '' };
}

function dataType(answers: IntakeAnswer[]) {
    return answer(answers, 'ir_eng_data', 'ir_data', 'ir_5');
}

function category(answers: IntakeAnswer[]) {
    return answer(answers, 'ir_eng_category');
}

function physical(answers: IntakeAnswer[]) {
    return answer(answers, 'ir_physical', 'ir_onsite');
}

function historicalPackFallback(answers: IntakeAnswer[], signals: IntakeSignals) {
    const facts: ScopeFact[] = [];
    const why: Record<string, string[]> = {};

    const add = (packKey: string, fact: string) => {
        why[packKey] = [...(why[packKey] || []), fact];
    };

    const ir01 = irRating(answers, 'ir_01', ['ir_availability', 'ir_2']);
    const ir02 = irRating(answers, 'ir_02', ['ir_data', 'ir_5'], DATA_RATING[norm(dataType(answers))] || dataType(answers));
    const ir04 = irRating(answers, 'ir_04', ['ir_access', 'ir_6', 'ir_7']);
    const ir05 = irRating(answers, 'ir_05', ['ir_access', 'ir_6', 'ir_7']);
    const ir08 = irRating(answers, 'ir_08', ['ir_regulated', 'ir_8', 'ir_1']);
    const cat = category(answers);
    const phys = physical(answers);
    const data = dataType(answers);

    const record = (code: string, packKey: string, packName: string, question: string, rating: string, raw: string) => {
        facts.push({
            code,
            packKey,
            packName,
            question,
            answer: raw || rating || 'Unknown',
            resolved: !isUnknown(rating),
        });
    };

    record('IR-01', 'critical-operations', 'Critical Operations', 'Would an outage materially disrupt critical operations or customer commitments?', ir01.rating, ir01.raw);
    record('IR-02', 'personal-sensitive-data', 'Personal and Sensitive Data', 'Will the vendor store or process confidential, regulated, authentication, payment, or health information?', ir02.rating, ir02.raw || data);
    record('IR-04', 'privileged-network', 'Privileged and Network Access', 'Will the vendor have administrative or privileged access to systems, networks, or cloud environments?', ir04.rating, ir04.raw);
    record('IR-05', 'privileged-network', 'Privileged and Network Access', 'Will the service connect directly to production systems or trusted networks?', ir05.rating, ir05.raw);
    record('IR-08', 'regulated-service', 'Regulated Service', 'Could the service affect compliance with a law, regulation, license, or supervisory commitment?', ir08.rating, ir08.raw);
    record('SCOPE-CATEGORY', 'cloud-hosting', 'Cloud Hosting', 'What is the service category?', ratingOf(cat) === '' ? (cat ? 'Low' : 'Unknown') : ratingOf(cat), cat);
    record('SCOPE-SOFTWARE', 'software-api', 'Software and API', 'What is the service category?', cat ? 'Low' : 'Unknown', cat);
    record('SCOPE-PHYSICAL', 'physical-delivery', 'Physical Delivery', 'Does the service depend on vendor facilities, physical records, on-site access, or physical media?', ratingOf(phys), phys);

    if (affirmative(ir02.rating) || /confidential|personal|phi|cardholder|regulated|payment|health/i.test(data)) {
        add('personal-sensitive-data', `Sensitive data fact: ${ir02.raw || data || ir02.rating}.`);
    }
    if (/saas|software|application|api/i.test(cat) || signals.softwareOrApi) {
        add('software-api', `Service category is ${cat || 'software / API / hosted application'}.`);
    }
    if (/saas|host|cloud|platform/i.test(cat) || signals.cloudHosted) {
        add('cloud-hosting', `Service category is ${cat || 'cloud or vendor-hosted'}.`);
    }
    if (affirmative(ir04.rating) || signals.privilegedAccess || /privileged|admin|remote|network/i.test(ir04.raw)) {
        add('privileged-network', `Privileged access fact: ${ir04.raw || ir04.rating}.`);
    }
    if (affirmative(ir05.rating) || signals.systemAccess || /production|trusted|read-write|network/i.test(ir05.raw)) {
        add('privileged-network', `System integration fact: ${ir05.raw || ir05.rating}.`);
    }
    if (affirmative(ir01.rating) || signals.criticalDependency) {
        add('critical-operations', `Service criticality fact: ${ir01.raw || ir01.rating}.`);
    }
    if (affirmative(ir08.rating) || signals.regulatedProcess || /yes|regulated/i.test(ir08.raw)) {
        add('regulated-service', `Regulatory impact fact: ${ir08.raw || ir08.rating}.`);
    }
    if (affirmative(ratingOf(phys)) || signals.physicalDelivery || /yes|on.?site|facilit|physical/i.test(phys)) {
        add('physical-delivery', `Physical delivery fact: ${phys || ratingOf(phys)}.`);
    }

    const unresolvedFacts = facts.filter((fact) => {
        if (fact.resolved) return false;
        if (fact.packKey === 'cloud-hosting' || fact.packKey === 'software-api') return !cat;
        if (fact.packKey === 'physical-delivery') return isUnknown(ratingOf(phys));
        return true;
    }).filter((fact, index, rows) => rows.findIndex((row) => row.code === fact.code) === index);

    return WORKBOOK_PACKS.filter((pack) => pack.key !== 'baseline').map((pack) => ({
        key: pack.key,
        included: Boolean(why[pack.key]?.length),
        unresolved: unresolvedFacts.some((fact) => fact.packKey === pack.key && !why[pack.key]?.length),
        reason: why[pack.key]?.join(' ') || unresolvedFacts.find((fact) => fact.packKey === pack.key)?.question || 'Confirm whether this pack applies.',
        raw: unresolvedFacts.find((fact) => fact.packKey === pack.key)?.answer,
    }));
}

export function recommendDueDiligencePacks(answers: IntakeAnswer[], signals: IntakeSignals): PackRecommendation {
    const plan = deriveQuestionnairePlan(
        answers,
        [],
        workbookPackCounts(loadWorkbookCatalog()),
        loadWorkbookCatalog().catalogVersion,
        historicalPackFallback(answers, signals),
    );
    const required: DueDiligencePack[] = plan.packs
        .filter((pack) => pack.state === 'INCLUDED' || pack.state === 'INCLUDED_REQUIRED')
        .map((pack) => ({
            key: pack.key,
            name: pack.name,
            templateKey: pack.templateKey,
            requirement: 'Required',
            why: [pack.reason],
        }));
    const unresolved: ScopeFact[] = plan.packs
        .filter((pack) => pack.state === 'CONFIRM_SCOPE')
        .map((pack) => ({
            code: pack.key.toUpperCase(),
            packKey: pack.key,
            packName: pack.name,
            question: pack.reason,
            answer: pack.scopeAnswer || 'Unknown',
            resolved: false,
        }));
    return {
        required,
        recommended: [],
        unresolved,
        selectedKeys: plan.includedTemplateKeys,
    };
}

const SCOPE_CUSTOMER_MESSAGES: Record<string, string> = {
    'IR-01': 'We still need to know whether an outage would disrupt critical operations or customer commitments before Supreme can finalize the due-diligence package.',
    'IR-02': 'We still need to know whether this vendor will store or process confidential, regulated, payment, or health information before Supreme can finalize the due-diligence package.',
    'IR-04': 'We still need to know whether this vendor will have privileged administrative access before Supreme can finalize the due-diligence package.',
    'IR-05': 'We still need to know whether this service will connect directly to production systems or trusted networks before Supreme can finalize the due-diligence package.',
    'IR-08': 'We still need to know whether this service could affect a legal, regulatory, or supervisory commitment before Supreme can finalize the due-diligence package.',
    'SCOPE-CATEGORY': 'We still need to know the service category before Supreme can recommend the right due-diligence packs.',
    'SCOPE-SOFTWARE': 'We still need to know the service category before Supreme can recommend the right due-diligence packs.',
    'SCOPE-PHYSICAL': 'We still need to know whether this service depends on vendor facilities, physical records, or on-site access before Supreme can finalize the due-diligence package.',
};

export function describeUnresolvedScope(unresolved: ScopeFact[]) {
    return unresolved.map((row) => ({
        ...row,
        message: SCOPE_CUSTOMER_MESSAGES[row.code] || `We still need to know: ${row.question}`,
    }));
}

export function unresolvedScopeBlockMessage(unresolved: ScopeFact[]) {
    if (!unresolved.length) return '';
    return confirmScopeBlockMessage(unresolved.length);
}

export function recommendTierFromIntake(answers: IntakeAnswer[]): InherentTierResult {
    const data = dataType(answers);
    const spend = answer(answers, 'ir_spend');
    const ratings = {
        ir_01: irRating(answers, 'ir_01', ['ir_availability', 'ir_2']),
        ir_02: irRating(answers, 'ir_02', ['ir_data', 'ir_5'], DATA_RATING[norm(data)] || data),
        ir_03: irRating(answers, 'ir_03', ['ir_volume']),
        ir_04: irRating(answers, 'ir_04', ['ir_access', 'ir_6', 'ir_7']),
        ir_05: irRating(answers, 'ir_05', ['ir_access', 'ir_6', 'ir_7']),
        ir_06: irRating(answers, 'ir_06', ['ir_1', 'ir_regulated']),
        ir_07: irRating(answers, 'ir_07', []),
        ir_08: irRating(answers, 'ir_08', ['ir_regulated', 'ir_8', 'ir_1']),
        ir_09: irRating(answers, 'ir_09', ['ir_geo']),
        ir_10: irRating(answers, 'ir_10', ['ir_fourth', 'ir_3']),
        ir_11: irRating(answers, 'ir_11', []),
        ir_12: irRating(answers, 'ir_12', ['ir_availability', 'ir_2']),
        ir_13: irRating(answers, 'ir_13', ['ir_ai']),
        ir_14: irRating(answers, 'ir_14', []),
        ir_15: irRating(answers, 'ir_15', []),
    };

    const labels: Record<string, string> = {
        ir_01: 'Service criticality',
        ir_02: 'Sensitive data',
        ir_03: 'Data volume',
        ir_04: 'Privileged access',
        ir_05: 'System integration',
        ir_06: 'Customer-facing',
        ir_07: 'Financial impact',
        ir_08: 'Regulatory impact',
        ir_09: 'Geographic exposure',
        ir_10: 'Subcontracting',
        ir_11: 'Concentration',
        ir_12: 'Operational dependency',
        ir_13: 'Artificial intelligence',
        ir_14: 'Public exposure',
        ir_15: 'Brand impact',
    };

    const factors: TierFactor[] = CANONICAL_IR_KEYS.map((key) => {
        const item = ratings[key];
        return {
            code: key.toUpperCase().replace('_', '-'),
            label: labels[key],
            points: pointsFor(item.rating),
            rationale: item.raw ? `${item.rating || 'Recorded'}: ${item.raw}` : item.rating || 'Not recorded.',
        };
    });
    factors.push({
        code: 'annual_spend',
        label: 'Estimated annual spend',
        points: 0,
        rationale: spend ? `${spend} (commercial context only; not scored)` : 'Spend not recorded. Commercial context only; not scored.',
    });

    const scored = factors.filter((factor) => factor.code.startsWith('IR-') && factor.points > 0);
    const score = scored.length
        ? Math.round((scored.reduce((sum, factor) => sum + factor.points, 0) / scored.length) * 100) / 100
        : 0;
    const cardholder = /cardholder|pci/i.test(data);
    const phi = /\bphi\b|highly sensitive|health/i.test(data);
    const privilegedAccess = ratings.ir_04.rating === 'High' || /privileged|admin/i.test(ratings.ir_04.raw);
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

    let recommendedTier: VendorTier = VendorTier.HIGH;
    if (score < 1.5) recommendedTier = VendorTier.LOW;
    else if (score < 2.4) recommendedTier = VendorTier.MEDIUM;
    if (hardFloors.some((floor) => floor.applies)) recommendedTier = VendorTier.CRITICAL;

    const inherentRisk = Math.min(100, Math.max(hardFloors.some((floor) => floor.applies) ? 80 : 0, Math.round((score / 3) * 100)));
    const appliedFloors = hardFloors.filter((floor) => floor.applies).map((floor) => floor.label);
    const explanation = appliedFloors.length
        ? `Supreme recommends ${recommendedTier.toLowerCase()} because a minimum floor applies: ${appliedFloors.join(', ')}. Inherent-risk average ${score} of 3.`
        : `Supreme recommends ${recommendedTier.toLowerCase()} from the recorded inherent-risk average of ${score} of 3.`;

    const cat = category(answers);
    const phys = physical(answers);
    const signals: IntakeSignals = {
        personalData: affirmative(ratings.ir_02.rating) || /personal|pii|phi|cardholder|payment|confidential/i.test(data),
        sensitiveData: /phi|cardholder|pci|highly sensitive|health|authentication/i.test(data) || ratings.ir_02.rating === 'High',
        cardholder,
        phi,
        privilegedAccess,
        systemAccess: affirmative(ratings.ir_05.rating) || /api|sso|network|privileged|read-write|production/i.test(ratings.ir_05.raw),
        onsiteAccess: /yes/i.test(phys),
        fourthParty: affirmative(ratings.ir_10.rating) || /yes/i.test(ratings.ir_10.raw),
        aiInvolved: affirmative(ratings.ir_13.rating) || (/yes/i.test(ratings.ir_13.raw) && !/^no\b/i.test(norm(ratings.ir_13.raw))),
        criticalDependency: affirmative(ratings.ir_01.rating) || /1 day|1 week|severe|significant/i.test(ratings.ir_01.raw),
        regulatedProcess: affirmative(ratings.ir_08.rating) || /yes|regulated/i.test(ratings.ir_08.raw),
        geographicExposure: affirmative(ratings.ir_09.rating) || /outside|complex|higher-risk/i.test(ratings.ir_09.raw),
        softwareOrApi: /saas|software|application|api/i.test(cat),
        cloudHosted: /saas|host|cloud|platform/i.test(cat),
        physicalDelivery: /yes|on.?site|facilit|physical/i.test(phys),
        dataTypes: [data].filter(Boolean),
    };
    const packs = recommendDueDiligencePacks(answers, signals);

    return {
        score,
        maxScore: 3,
        inherentRisk,
        recommendedTier,
        factors,
        hardFloors,
        signals,
        explanation,
        unresolved: packs.unresolved,
        packs,
    };
}

export const TIER_RANK: Record<VendorTier, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
};

export function minTierFromFloors(floors: Array<{ applies?: boolean }> | null | undefined): VendorTier | null {
    return floors?.some((floor) => floor.applies) ? VendorTier.CRITICAL : null;
}

export function criticalFloorAppliesFromFacts(dataTypes: string[] = [], privilegedAccess = false): boolean {
    const blob = dataTypes.join(' ');
    return (
        privilegedAccess
        || /cardholder|pci/i.test(blob)
        || /\bphi\b|highly sensitive/i.test(blob)
    );
}

export function missingCanonicalIntake(answers: IntakeAnswer[]) {
    return CANONICAL_IR_KEYS.filter((key) => {
        const aliases = {
            ir_01: ['ir_availability', 'ir_2'],
            ir_02: ['ir_data', 'ir_5'],
            ir_03: ['ir_volume'],
            ir_04: ['ir_access', 'ir_6', 'ir_7'],
            ir_05: ['ir_access', 'ir_6', 'ir_7'],
            ir_06: ['ir_1', 'ir_regulated'],
            ir_07: [] as string[],
            ir_08: ['ir_regulated', 'ir_8', 'ir_1'],
            ir_09: ['ir_geo'],
            ir_10: ['ir_fourth', 'ir_3'],
            ir_11: [] as string[],
            ir_12: ['ir_availability', 'ir_2'],
            ir_13: ['ir_ai'],
            ir_14: [] as string[],
            ir_15: [] as string[],
        }[key];
        const item = irRating(answers, key, aliases || []);
        return !item.raw && !item.rating;
    });
}

export function workbookControlGap(rows: Array<{ weight?: number | null; response?: string | null }>) {
    let risk = 0;
    let max = 0;
    for (const row of rows) {
        const weight = Number(row.weight || 0) || 0;
        const value = norm(row.response);
        if (!value || value === 'not answered' || value === 'unknown') continue;
        if (value === 'n/a' || value === 'not applicable' || value.startsWith('not applicable')) continue;
        max += 4 * weight;
        if (value.startsWith('partial') || value.startsWith('in progress')) risk += 2 * weight;
        else if (value.startsWith('no') || value.startsWith('qualified')) risk += 4 * weight;
    }
    if (!max) return { percent: null as number | null, band: 'Not rated' as const, formula: 'Workbook residual % = (Partial×2 + No×4) / (4 × applicable weights). Not Answered excluded. N/A adds 0.' };
    const percent = Math.round((risk / max) * 1000) / 10;
    const band = percent < 15 ? 'Low' : percent < 35 ? 'Medium' : percent < 60 ? 'High' : 'Critical';
    return {
        percent,
        band: band as 'Low' | 'Medium' | 'High' | 'Critical',
        formula: 'Workbook residual % = (Partial×2 + No×4) / (4 × applicable weights). Not Answered excluded. N/A adds 0.',
    };
}

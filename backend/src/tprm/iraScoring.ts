import { VendorTier } from '@prisma/client';
import { isDontKnow, splitValues, type IraQuestion } from './iraCatalog';
import { IRA_QUESTIONS } from './iraCatalog';
import { persistIraJurisdictions } from './iraJurisdiction';
import { presentCountryCatalog } from './countryCatalog';
import {
    confirmScopeBlockMessage,
    type PackState,
    type QuestionnairePlan,
} from './packDerivation';
import { loadWorkbookCatalog, workbookPackCounts } from './workbookCatalog';
import { insuranceIraFloors } from '../insurance/iraOverlay';

export type IraAnswer = { questionKey: string; response?: string | null };

export type IraFloor = {
    code: string;
    label: string;
    tier: VendorTier;
    applies: boolean;
    rationale: string;
};

export type IraFactor = {
    code: string;
    points: number;
    weight: number;
    contribution: number;
    rationale: string;
};

export type IraRating = {
    ready: boolean;
    unknownKeys: string[];
    unknownCount: number;
    message: string;
    percent: number | null;
    recommendedTier: VendorTier | null;
    factors: IraFactor[];
    floors: IraFloor[];
    packs: QuestionnairePlan;
    signals: {
        personalData: boolean;
        highVolumePersonal: boolean;
        aiInvolved: boolean;
        dpaRequired: boolean;
        privacyPack: boolean;
    };
    autoConfirmEligible: boolean;
    autoConfirmBlockedReason: string | null;
    explanation: string;
    methodologyGap?: string | null;
};

const WEIGHTS: Record<string, number> = {
    'IR-01': 3, 'IR-02': 3, 'IR-04': 3, 'IR-08': 3,
    'IR-03': 2, 'IR-05': 2, 'IR-07': 2, 'IR-12': 2, 'IR-15': 2,
    'IR-06': 1, 'IR-09': 1, 'IR-10': 1, 'IR-11': 1, 'IR-13': 1, 'IR-14': 1,
};

const TIER_RANK: VendorTier[] = [VendorTier.LOW, VendorTier.MEDIUM, VendorTier.HIGH, VendorTier.CRITICAL];

function answer(answers: IraAnswer[], key: string) {
    return String(answers.find((row) => row.questionKey === key)?.response || '').trim();
}

function has(values: string[], ...needles: string[]) {
    return values.some((value) => needles.includes(value));
}

function maxTier(a: VendorTier | null, b: VendorTier): VendorTier {
    if (!a) return b;
    return TIER_RANK.indexOf(b) > TIER_RANK.indexOf(a) ? b : a;
}

function raiseOne(tier: VendorTier): VendorTier {
    const index = TIER_RANK.indexOf(tier);
    return TIER_RANK[Math.min(index + 1, TIER_RANK.length - 1)];
}

function band(percent: number): VendorTier {
    if (percent < 20) return VendorTier.LOW;
    if (percent < 40) return VendorTier.MEDIUM;
    if (percent < 65) return VendorTier.HIGH;
    return VendorTier.CRITICAL;
}

export function scoreIra(
    answers: IraAnswer[],
    input: {
        externalRating?: { provider?: string; grade?: string; score?: number | null; assessedAt?: string | Date | null } | null;
        now?: Date;
        organizationCountry?: string | null;
    } = {}
): IraRating {
    const asRecord = Object.fromEntries(answers.map((row) => [row.questionKey, String(row.response || '')]));
    const jurisdictions = persistIraJurisdictions(asRecord, input.organizationCountry);
    if (jurisdictions.methodologyGap) {
        return {
            ready: false,
            unknownKeys: ['a6'],
            unknownCount: 1,
            message: jurisdictions.gapMessage || 'Geographic risk cannot be scored from the selected jurisdictions.',
            percent: null,
            recommendedTier: null,
            factors: [],
            floors: [],
            packs: {
                catalogVersion: '',
                packs: [],
                includedPackKeys: [],
                includedTemplateKeys: [],
                includedQuestionCount: 0,
                confirmScopeCount: 0,
                sendBlocked: true,
                sendBlockMessage: jurisdictions.gapMessage || 'Geographic methodology gap.',
            },
            signals: { personalData: false, highVolumePersonal: false, aiInvolved: false, dpaRequired: false, privacyPack: false },
            autoConfirmEligible: false,
            autoConfirmBlockedReason: jurisdictions.gapMessage,
            explanation: jurisdictions.gapMessage || 'No geographic score was invented.',
            methodologyGap: jurisdictions.methodologyGap,
        };
    }
    const derivedAnswers = jurisdictions.derived
        ? answers.map((row) => (row.questionKey === 'a6' ? { ...row, response: jurisdictions.derived } : row)).concat(
            answers.some((row) => row.questionKey === 'a6') ? [] : [{ questionKey: 'a6', response: jurisdictions.derived }]
        )
        : answers;
    const unknownKeys = IRA_QUESTIONS.filter((question) => isDontKnow(answer(derivedAnswers, question.key))).map((question) => question.key);
    const a1 = splitValues(answer(derivedAnswers, 'a1'));
    const a2 = splitValues(answer(derivedAnswers, 'a2'));
    const a3 = answer(derivedAnswers, 'a3');
    const a4 = answer(derivedAnswers, 'a4');
    const a5 = answer(derivedAnswers, 'a5');
    const a6 = answer(derivedAnswers, 'a6');
    const a7 = answer(derivedAnswers, 'a7');
    const a8 = answer(derivedAnswers, 'a8');
    const a9 = answer(derivedAnswers, 'a9');
    const b1 = answer(derivedAnswers, 'b1');
    const b2 = answer(derivedAnswers, 'b2');
    const b3 = answer(derivedAnswers, 'b3');
    const b4 = answer(derivedAnswers, 'b4');
    const b5 = answer(derivedAnswers, 'b5');

    const personal = has(a2, 'personal');
    const sensitive = has(a2, 'card', 'health', 'credentials', 'regulated');
    const confidential = has(a2, 'confidential') || personal;
    const highVolumePersonal = personal && a3 === 'over_100k';
    const aiInvolved = a8 === 'yes';

    const points: Record<string, number> = {
        'IR-01': b1 === 'day' || b1 === 'week' ? 2 : b1 === 'workaround' ? 1 : 0,
        'IR-02': sensitive ? 2 : personal || has(a2, 'confidential') ? 1 : 0,
        'IR-03': a3 === 'over_100k' || a3 === '10k_100k' ? 2 : a3 === '1k_10k' ? 1 : 0,
        'IR-04': a4 === 'admin' ? 2 : 0,
        'IR-05': a4 === 'write' ? 2 : a4 === 'read' ? 1 : 0,
        'IR-06': a5 === 'customer' || a5 === 'both' ? 2 : 0,
        'IR-07': b2 === 'material' ? 2 : b2 === 'noticeable' ? 1 : 0,
        'IR-08': b3 === 'yes' ? 2 : 0,
        'IR-09': a6 === 'outside' ? 2 : a6 === 'region' ? 1 : 0,
        'IR-10': a7 === 'yes' ? 2 : 0,
        'IR-11': b5 === 'hard' ? 2 : b5 === 'months' ? 1 : 0,
        'IR-12': b1 === 'day' || b1 === 'week' ? 2 : 0,
        'IR-13': aiInvolved ? 2 : 0,
        'IR-14': a5 === 'internet' || a5 === 'both' ? 2 : 0,
        'IR-15': b4 === 'significant' ? 2 : b4 === 'noticeable' ? 1 : 0,
    };

    const factors: IraFactor[] = Object.entries(points).map(([code, value]) => ({
        code,
        points: value,
        weight: WEIGHTS[code],
        contribution: value * WEIGHTS[code],
        rationale: `${code} mapped from the requester IRA.`,
    }));
    const earned = factors.reduce((sum, row) => sum + row.contribution, 0);
    const maximum = Object.values(WEIGHTS).reduce((sum, weight) => sum + (2 * weight), 0);
    const percent = maximum ? Math.round((earned / maximum) * 1000) / 10 : 0;

    const floors: IraFloor[] = [
        { code: 'personal-medium', label: 'Any personal data', tier: VendorTier.MEDIUM, applies: personal, rationale: 'GDPR Art. 28 requires documented review.' },
        { code: 'personal-volume-high', label: 'Personal data over 100,000 records', tier: VendorTier.HIGH, applies: highVolumePersonal, rationale: 'Volume raises the personal-data floor to High.' },
        { code: 'sensitive-critical', label: 'Card, health, credentials or regulated data', tier: VendorTier.CRITICAL, applies: sensitive, rationale: 'Direct-to-Critical data floor.' },
        { code: 'admin-critical', label: 'Admin or network access', tier: VendorTier.CRITICAL, applies: a4 === 'admin', rationale: 'Privileged access floor.' },
        { code: 'stop-day-critical', label: 'Operations stop within a day', tier: VendorTier.CRITICAL, applies: b1 === 'day', rationale: 'Critical operations floor.' },
        { code: 'regulatory-high', label: 'Regulatory or contractual obligation', tier: VendorTier.HIGH, applies: b3 === 'yes', rationale: 'Regulated-service floor.' },
        { code: 'write-api-high', label: 'Automated connection that changes our data', tier: VendorTier.HIGH, applies: a4 === 'write', rationale: 'Write integration floor.' },
        { code: 'financial-high', label: 'Material financial loss', tier: VendorTier.HIGH, applies: b2 === 'material', rationale: 'Financial-impact floor.' },
        ...insuranceIraFloors(derivedAnswers),
    ];

    const catalog = loadWorkbookCatalog();
    const counts = workbookPackCounts(catalog);
    const include = (on: boolean): PackState => (on ? 'INCLUDED' : 'EXCLUDED');
    const packsList = [
        { key: 'baseline', name: 'Baseline', templateKey: 'tprm-baseline', state: 'INCLUDED_REQUIRED' as PackState, reason: 'Required for every third party', count: counts.baseline },
        { key: 'personal-sensitive-data', name: 'Personal and Sensitive Data', templateKey: 'tprm-personal-sensitive-data', state: include(confidential || personal || sensitive), reason: 'Part A information types', count: counts['personal-sensitive-data'] },
        { key: 'software-api', name: 'Software and API', templateKey: 'tprm-software-api', state: include(has(a1, 'software') || a4 === 'read' || a4 === 'write'), reason: 'Software, app, API or automated connection', count: counts['software-api'] },
        { key: 'cloud-hosting', name: 'Cloud Hosting', templateKey: 'tprm-cloud-hosting', state: include(has(a1, 'cloud')), reason: 'Vendor hosts our data or systems', count: counts['cloud-hosting'] },
        { key: 'privileged-network', name: 'Privileged and Network Access', templateKey: 'tprm-privileged-network', state: include(a4 === 'admin'), reason: 'Admin, remote or network access', count: counts['privileged-network'] },
        { key: 'physical-delivery', name: 'Physical Delivery', templateKey: 'tprm-physical-delivery', state: include(has(a1, 'physical') || a9 === 'yes'), reason: 'On-site work or physical records', count: counts['physical-delivery'] },
        { key: 'critical-operations', name: 'Critical Operations', templateKey: 'tprm-critical-operations', state: include(b1 === 'week' || b1 === 'day'), reason: 'Serious disruption within a week or worse', count: counts['critical-operations'] },
        { key: 'regulated-service', name: 'Regulated Service', templateKey: 'tprm-regulated-service', state: include(b3 === 'yes'), reason: 'Legal, licence, audit or contract obligation', count: counts['regulated-service'] },
    ];
    const included = packsList.filter((row) => row.state === 'INCLUDED' || row.state === 'INCLUDED_REQUIRED');
    const packs: QuestionnairePlan = {
        catalogVersion: catalog.catalogVersion,
        packs: packsList.map((row) => ({
            key: row.key,
            name: row.name,
            templateKey: row.templateKey,
            questionCount: row.key === 'baseline' && !floors.some((floor) => floor.applies) && band(percent) === VendorTier.LOW
                ? 14
                : Number(row.count) || 0,
            state: row.state,
            scopeAnswer: row.state === 'EXCLUDED' ? 'NO' : 'YES',
            originalScopeAnswer: row.state === 'EXCLUDED' ? 'NO' : 'YES',
            analystDecision: null,
            reason: row.reason,
            overridable: row.key !== 'baseline',
        })),
        includedPackKeys: included.map((row) => row.key),
        includedTemplateKeys: included.map((row) => row.templateKey),
        includedQuestionCount: included.reduce((sum, row) => sum + (row.key === 'baseline' ? 14 : Number(row.count) || 0), 0),
        confirmScopeCount: 0,
        sendBlocked: unknownKeys.length > 0,
        sendBlockMessage: unknownKeys.length
            ? `Not yet rated — ${unknownKeys.length} answer${unknownKeys.length === 1 ? '' : 's'} need confirmation.`
            : confirmScopeBlockMessage(0),
    };

    if (unknownKeys.length) {
        return {
            ready: false,
            unknownKeys,
            unknownCount: unknownKeys.length,
            message: `Not yet rated — ${unknownKeys.length} answer${unknownKeys.length === 1 ? '' : 's'} need confirmation.`,
            percent: null,
            recommendedTier: null,
            factors,
            floors,
            packs,
            signals: { personalData: personal, highVolumePersonal, aiInvolved, dpaRequired: confidential || personal || sensitive, privacyPack: confidential || personal || sensitive },
            autoConfirmEligible: false,
            autoConfirmBlockedReason: 'Answers still marked Don\'t know.',
            explanation: 'No tier is stored while any IRA answer is Don\'t know.',
            methodologyGap: null,
        };
    }

    let tier: VendorTier = band(percent);
    for (const floor of floors.filter((row) => row.applies)) tier = maxTier(tier, floor.tier);

    const rating = input.externalRating;
    const assessedAt = rating?.assessedAt ? new Date(rating.assessedAt) : null;
    const now = input.now || new Date();
    const ratingCurrent = Boolean(assessedAt && (now.getTime() - assessedAt.getTime()) <= 90 * 86400000);
    const lowExternal = Boolean(
        rating
        && (
            (Number(rating.score) > 0 && Number(rating.score) < 80)
            || Number(rating.score) > 0 && Number(rating.score) < 650 && String(rating.provider || '').toLowerCase().includes('bitsight')
            || /^(c|d|f|c\+|c-|d\+|d-)$/i.test(String(rating.grade || ''))
            || (String(rating.provider || '').toLowerCase().includes('bitsight') && Number(rating.score) < 650)
            || (String(rating.provider || '').toLowerCase().includes('securityscorecard') && (Number(rating.score) < 80 || /^[c-f]/i.test(String(rating.grade || ''))))
        )
    );
    if (lowExternal) tier = raiseOne(tier);

    const floorApplies = floors.some((row) => row.applies);
    let blocked: string | null = null;
    if (tier !== VendorTier.LOW) blocked = 'Medium and above always wait for GRC.';
    else if (floorApplies) blocked = 'A floor is in force.';
    else if (aiInvolved) blocked = 'Vendor uses AI with our data — review before send.';
    else if (!ratingCurrent) blocked = 'A current external rating (90 days) is required to auto-confirm Low.';
    else if (lowExternal) blocked = 'External rating raised the tier.';

    return {
        ready: true,
        unknownKeys: [],
        unknownCount: 0,
        message: '',
        percent,
        recommendedTier: tier,
        factors,
        floors,
        packs: {
            ...packs,
            packs: packs.packs.map((row) => row.key === 'baseline' && tier === VendorTier.LOW
                ? { ...row, questionCount: 14, reason: 'Baseline-Lite for Low-tier engagements' }
                : row),
            includedQuestionCount: packs.packs.reduce((sum, row) => {
                const count = row.key === 'baseline' && tier === VendorTier.LOW ? 14 : row.questionCount;
                return row.state === 'INCLUDED' || row.state === 'INCLUDED_REQUIRED' ? sum + count : sum;
            }, 0),
            sendBlocked: false,
            sendBlockMessage: '',
        },
        signals: { personalData: personal, highVolumePersonal, aiInvolved, dpaRequired: confidential || personal || sensitive, privacyPack: confidential || personal || sensitive },
        autoConfirmEligible: !blocked,
        autoConfirmBlockedReason: blocked,
        explanation: `Inherent risk ${percent}% maps to ${tier}${floorApplies ? ' after floors' : ''}${lowExternal ? ', then raised one level by the external rating' : ''}.`,
        methodologyGap: null,
    };
}

export function iraForm(questions: IraQuestion[] = IRA_QUESTIONS) {
    return {
        parts: [
            { id: 'A', title: 'What will this vendor do?', questions: questions.filter((row) => row.part === 'A') },
            { id: 'B', title: 'How bad if it fails?', questions: questions.filter((row) => row.part === 'B') },
        ],
        countries: presentCountryCatalog(),
    };
}

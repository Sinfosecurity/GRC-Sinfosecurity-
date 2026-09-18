import type { IraQuestion } from '../tprm/iraCatalog';
import { IRA_QUESTIONS, splitValues } from '../tprm/iraCatalog';
import { VendorTier } from '@prisma/client';

type OverlayAnswer = { questionKey: string; response?: string | null };

export const INSURANCE_IRA_QUESTIONS: IraQuestion[] = [
    { key: 'ins1', part: 'B', question: 'Does the provider perform a regulated insurance function?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'dont_know', label: "Don't know" }] },
    { key: 'ins2', part: 'B', question: 'Does the provider have claims authority?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'dont_know', label: "Don't know" }] },
    { key: 'ins3', part: 'B', question: 'Does the provider influence underwriting?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'dont_know', label: "Don't know" }] },
    { key: 'ins4', part: 'B', question: 'Does it influence pricing?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'dont_know', label: "Don't know" }] },
    { key: 'ins5', part: 'B', question: 'Does it process policyholder information?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'dont_know', label: "Don't know" }] },
    { key: 'ins6', part: 'B', question: 'Does it process health or sensitive information?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'dont_know', label: "Don't know" }] },
    { key: 'ins7', part: 'B', question: 'Does it handle premiums or customer funds?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'dont_know', label: "Don't know" }] },
    { key: 'ins8', part: 'B', question: 'Does it interact directly with policyholders?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'dont_know', label: "Don't know" }] },
    { key: 'ins9', part: 'B', question: 'Could failure stop claims processing?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'dont_know', label: "Don't know" }] },
    { key: 'ins10', part: 'B', question: 'Could failure stop policy issuance or renewal?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'dont_know', label: "Don't know" }] },
    { key: 'ins11', part: 'B', question: 'Does it provide predictive or AI models?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'dont_know', label: "Don't know" }] },
    { key: 'ins12', part: 'B', question: 'Does it provide underwriting or claims data?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'dont_know', label: "Don't know" }] },
    { key: 'ins13', part: 'B', question: 'Does it subcontract material insurance services?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'dont_know', label: "Don't know" }] },
    { key: 'ins14', part: 'B', question: 'Does it require an insurance license or authorization?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'dont_know', label: "Don't know" }] },
];

export function iraQuestionsForEdition(insuranceActive: boolean): IraQuestion[] {
    return insuranceActive ? [...IRA_QUESTIONS, ...INSURANCE_IRA_QUESTIONS] : IRA_QUESTIONS;
}

function yes(answers: OverlayAnswer[], key: string) {
    return splitValues(answers.find((row) => row.questionKey === key)?.response).includes('yes');
}

export function insuranceIraFloors(answers: OverlayAnswer[]) {
    const present = answers.some((row) => String(row.questionKey).startsWith('ins'));
    if (!present) return [];
    return [
        { code: 'ins-regulated-function', label: 'Regulated insurance function', tier: VendorTier.HIGH, applies: yes(answers, 'ins1'), rationale: 'Insurance overlay: regulated function raises the floor. Baseline scoring is unchanged.' },
        { code: 'ins-claims-authority', label: 'Claims authority', tier: VendorTier.HIGH, applies: yes(answers, 'ins2'), rationale: 'Insurance overlay: claims authority.' },
        { code: 'ins-underwriting', label: 'Underwriting influence', tier: VendorTier.HIGH, applies: yes(answers, 'ins3'), rationale: 'Insurance overlay: underwriting influence.' },
        { code: 'ins-pricing', label: 'Pricing influence', tier: VendorTier.HIGH, applies: yes(answers, 'ins4'), rationale: 'Insurance overlay: pricing influence.' },
        { code: 'ins-health', label: 'Health or sensitive insurance data', tier: VendorTier.CRITICAL, applies: yes(answers, 'ins6'), rationale: 'Insurance overlay: sensitive policyholder health data.' },
        { code: 'ins-funds', label: 'Premiums or customer funds', tier: VendorTier.CRITICAL, applies: yes(answers, 'ins7'), rationale: 'Insurance overlay: customer funds.' },
        { code: 'ins-stop-claims', label: 'Failure stops claims', tier: VendorTier.CRITICAL, applies: yes(answers, 'ins9'), rationale: 'Insurance overlay: claims-processing criticality.' },
        { code: 'ins-stop-issuance', label: 'Failure stops issuance or renewal', tier: VendorTier.CRITICAL, applies: yes(answers, 'ins10'), rationale: 'Insurance overlay: policy issuance criticality.' },
        { code: 'ins-license', label: 'Insurance license or authorization required', tier: VendorTier.HIGH, applies: yes(answers, 'ins14'), rationale: 'Insurance overlay: licensing dependency.' },
    ];
}

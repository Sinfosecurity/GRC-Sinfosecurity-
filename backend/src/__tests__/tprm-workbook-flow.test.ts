import {
    assertWorkbookCatalogShape,
    loadWorkbookCatalog,
    workbookControlIdsForPacks,
    workbookPackCounts,
} from '../tprm/workbookCatalog';
import {
    deriveQuestionnairePlan,
    analystDecisionsFromCustomization,
    confirmScopeBlockMessage,
} from '../tprm/packDerivation';
import { presentVendorQuestion, sanitizeVendorPayload, assertVendorBoundary } from '../tprm/vendorPayload';
import { workbookLibraryTemplates } from '../tprm/workbookLibrary';
import { workbookControlGap } from '../services/vendorOnboardingScoring';

describe('TPRM workbook catalog', () => {
    it('imports the authoritative 8-pack 102-question workbook', () => {
        const shape = assertWorkbookCatalogShape();
        expect(shape.catalogVersion).toBe('workbook-1.0.0');
        expect(shape.inherentRiskCount).toBe(15);
        expect(shape.packCount).toBe(8);
        expect(shape.questionCount).toBe(102);
        expect(shape.packCounts).toEqual({
            baseline: 45,
            'personal-sensitive-data': 13,
            'software-api': 7,
            'cloud-hosting': 13,
            'privileged-network': 6,
            'critical-operations': 6,
            'regulated-service': 6,
            'physical-delivery': 6,
        });
        expect(shape.weights.every((weight) => weight >= 1 && weight <= 5)).toBe(true);
        expect(shape.evidenceCount).toBe(16);
        expect(shape.evidenceDomains).toHaveLength(16);
    });

    it('exposes workbook packs as catalog templates without replacing specialized library keys', () => {
        const templates = workbookLibraryTemplates();
        expect(templates).toHaveLength(8);
        expect(templates.every((row) => row.key.startsWith('tprm-'))).toBe(true);
        expect(templates.reduce((sum, row) => sum + row.sections.reduce((inner, section) => inner + section.questions.length, 0), 0)).toBe(102);
    });
});

describe('TPRM pack derivation', () => {
    const counts = workbookPackCounts();

    it('always includes Baseline and maps Yes/No/Unknown', () => {
        const plan = deriveQuestionnairePlan([
            { questionKey: 'scope_personal_sensitive', response: 'Yes' },
            { questionKey: 'scope_software_api', response: 'No' },
            { questionKey: 'scope_cloud_hosting', response: 'Unknown' },
            { questionKey: 'scope_privileged_network', response: 'No' },
            { questionKey: 'scope_critical_operations', response: 'No' },
            { questionKey: 'scope_regulated_service', response: 'No' },
            { questionKey: 'scope_physical_delivery', response: 'No' },
        ], [], counts);
        expect(plan.packs.find((row) => row.key === 'baseline')?.state).toBe('INCLUDED_REQUIRED');
        expect(plan.packs.find((row) => row.key === 'personal-sensitive-data')?.state).toBe('INCLUDED');
        expect(plan.packs.find((row) => row.key === 'software-api')?.state).toBe('EXCLUDED');
        expect(plan.packs.find((row) => row.key === 'cloud-hosting')?.state).toBe('CONFIRM_SCOPE');
        expect(plan.includedQuestionCount).toBe(58);
        expect(plan.sendBlocked).toBe(true);
        expect(plan.sendBlockMessage).toBe(confirmScopeBlockMessage(1));
    });

    it('calculates question totals from selected pack records', () => {
        const answers = [
            { questionKey: 'scope_personal_sensitive', response: 'No' },
            { questionKey: 'scope_software_api', response: 'No' },
            { questionKey: 'scope_cloud_hosting', response: 'No' },
            { questionKey: 'scope_privileged_network', response: 'No' },
            { questionKey: 'scope_critical_operations', response: 'No' },
            { questionKey: 'scope_regulated_service', response: 'No' },
            { questionKey: 'scope_physical_delivery', response: 'No' },
        ];
        expect(deriveQuestionnairePlan(answers, [], counts).includedQuestionCount).toBe(45);
        const withSensitive = answers.map((row) => row.questionKey === 'scope_personal_sensitive' ? { ...row, response: 'Yes' } : row);
        expect(deriveQuestionnairePlan(withSensitive, [], counts).includedQuestionCount).toBe(58);
        const withCloud = withSensitive.map((row) => row.questionKey === 'scope_cloud_hosting' ? { ...row, response: 'Yes' } : row);
        expect(deriveQuestionnairePlan(withCloud, [], counts).includedQuestionCount).toBe(71);
        const allYes = answers.map((row) => ({ ...row, response: 'Yes' }));
        expect(deriveQuestionnairePlan(allYes, [], counts).includedQuestionCount).toBe(102);
    });

    it('keeps original scope answers when the analyst resolves Confirm scope', () => {
        const answers = [
            { questionKey: 'scope_personal_sensitive', response: 'Yes' },
            { questionKey: 'scope_software_api', response: 'No' },
            { questionKey: 'scope_cloud_hosting', response: 'Unknown' },
            { questionKey: 'scope_privileged_network', response: 'No' },
            { questionKey: 'scope_critical_operations', response: 'No' },
            { questionKey: 'scope_regulated_service', response: 'No' },
            { questionKey: 'scope_physical_delivery', response: 'No' },
        ];
        const decisions = analystDecisionsFromCustomization({
            packDecisions: [{ key: 'cloud-hosting', state: 'INCLUDED', reason: 'Vendor hosts the payroll platform' }],
            reason: 'Vendor hosts the payroll platform',
        });
        const plan = deriveQuestionnairePlan(answers, decisions, counts);
        const cloud = plan.packs.find((row) => row.key === 'cloud-hosting');
        expect(cloud?.originalScopeAnswer).toBe('UNKNOWN');
        expect(cloud?.state).toBe('INCLUDED');
        expect(cloud?.analystDecision?.reason).toMatch(/hosts the payroll platform/);
        expect(plan.sendBlocked).toBe(false);
        expect(plan.includedQuestionCount).toBe(71);
        expect(workbookControlIdsForPacks(plan.includedPackKeys)).toHaveLength(71);
    });
});

describe('TPRM vendor payload boundary', () => {
    it('exposes only approved vendor-facing question fields', () => {
        const question = presentVendorQuestion({
            key: 'VRA-001',
            question: 'Has management assigned owners?\n\nGuidance: Provide the role.\n\nExpected evidence: Charter\n\nTopic: Governance',
            domain: 'Governance and Risk',
            response: 'Yes',
        });
        expect(question.controlId).toBe('VRA-001');
        expect(question.domain).toBe('Governance and Risk');
        expect(question.options).toEqual(['Yes', 'Partial', 'No', 'N/A']);
        const payload = sanitizeVendorPayload({
            questions: [question],
            weight: 4,
            score: 12,
            recommendedTier: 'HIGH',
            scopeAnswers: { cloud: 'Unknown' },
        });
        expect(payload).not.toHaveProperty('weight');
        expect(payload).not.toHaveProperty('score');
        expect(payload).not.toHaveProperty('recommendedTier');
        expect(payload).not.toHaveProperty('scopeAnswers');
        assertVendorBoundary(payload);
    });
});

describe('TPRM residual scoring still uses the existing explainable engine', () => {
    it('excludes N/A from the maximum and bands Medium at 15%', () => {
        const gap = workbookControlGap([
            { weight: 5, response: 'Yes' },
            { weight: 5, response: 'Partial' },
            { weight: 5, response: 'No' },
            { weight: 5, response: 'N/A' },
            { weight: 5, response: 'Not Answered' },
        ]);
        expect(gap.percent).toBe(50);
        expect(gap.band).toBe('High');
        const medium = workbookControlGap([
            { weight: 3, response: 'No' },
            { weight: 17, response: 'Yes' },
        ]);
        expect(medium.percent).toBe(15);
        expect(medium.band).toBe('Medium');
    });
});

describe('workbook catalog versioning is additive', () => {
    it('does not silently reuse a later catalog version for an already pinned assessment', () => {
        const catalog = loadWorkbookCatalog();
        const pin = {
            catalogVersion: catalog.catalogVersion,
            controlIds: workbookControlIdsForPacks(['baseline', 'personal-sensitive-data']),
        };
        const later = { ...catalog, catalogVersion: 'workbook-2.0.0', questions: [...catalog.questions, {
            controlId: 'VRA-999',
            domain: 'Governance and Risk',
            topic: 'Later edit',
            question: 'Should not appear on a sent assessment',
            guidance: '',
            expectedEvidence: '',
            weight: 2,
            pack: 'Baseline',
        }] };
        expect(pin.catalogVersion).not.toBe(later.catalogVersion);
        expect(pin.controlIds).not.toContain('VRA-999');
        expect(pin.controlIds).toHaveLength(58);
    });
});

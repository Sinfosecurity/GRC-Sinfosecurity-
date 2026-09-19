import { loadWorkbookCatalog, WORKBOOK_PACK_KEYS } from './workbookCatalog';

type LibraryTemplate = {
    key: string;
    name: string;
    framework: string;
    version: string;
    purpose: string;
    mappingSource?: string;
    sections: Array<{
        title: string;
        questions: Array<{
            id: string;
            question: string;
            category: string;
            weight: number;
            options: string[];
            questionType?: string;
            evidenceRequired?: boolean;
            guidance?: string;
        }>;
    }>;
};

const VENDOR_OPTIONS = ['Yes', 'Partial', 'No', 'N/A'];

export function workbookLibraryTemplates(): LibraryTemplate[] {
    const catalog = loadWorkbookCatalog();
    return WORKBOOK_PACK_KEYS.map((pack) => {
        const questions = catalog.questions.filter((row) => row.pack === pack.workbookName);
        const byDomain = new Map<string, typeof questions>();
        for (const question of questions) {
            const list = byDomain.get(question.domain) || [];
            list.push(question);
            byDomain.set(question.domain, list);
        }
        return {
            key: pack.templateKey,
            name: `${pack.name} Questionnaire`,
            framework: 'Supreme TPRM Workbook',
            version: catalog.catalogVersion,
            purpose: pack.key === 'baseline'
                ? 'Required baseline questionnaire for every third party. Generated from the authoritative Vendor Risk Assessment Workbook.'
                : `Workbook pack: ${pack.name}. Included only when internal scope confirms applicability.`,
            mappingSource: catalog.source,
            sections: [...byDomain.entries()].map(([title, rows]) => ({
                title,
                questions: rows.map((row) => ({
                    id: row.controlId,
                    question: row.question,
                    category: row.domain,
                    weight: row.weight,
                    options: VENDOR_OPTIONS,
                    questionType: 'SINGLE_CHOICE',
                    evidenceRequired: false,
                    guidance: [
                        row.guidance,
                        row.expectedEvidence ? `Expected evidence: ${row.expectedEvidence}` : '',
                        row.topic ? `Topic: ${row.topic}` : '',
                    ].filter(Boolean).join('\n\n'),
                })),
            })),
        };
    });
}

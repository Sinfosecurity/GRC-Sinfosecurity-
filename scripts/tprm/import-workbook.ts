/**
 * Idempotent TPRM workbook import.
 * Creates new tprm-* catalog versions. Does not overwrite historical library templates.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { Workbook } from 'exceljs';
import { prisma } from '../../backend/src/config/database';
import { PLATFORM_SCOPE } from '../../backend/src/services/questionnairePresentation';
import {
    TPRM_CATALOG_VERSION,
    WORKBOOK_PACK_KEYS,
    loadWorkbookCatalog,
    type WorkbookCatalog,
} from '../../backend/src/tprm/workbookCatalog';

const VENDOR_OPTIONS = ['Yes', 'Partial', 'No', 'N/A'];

function packTemplate(catalog: WorkbookCatalog, pack: typeof WORKBOOK_PACK_KEYS[number]) {
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
        sections: [...byDomain.entries()].map(([title, rows], sectionIndex) => ({
            title,
            sortOrder: sectionIndex,
            questions: rows.map((row, index) => ({
                questionKey: row.controlId,
                questionText: [
                    row.question,
                    row.guidance ? `Guidance: ${row.guidance}` : '',
                    row.expectedEvidence ? `Expected evidence: ${row.expectedEvidence}` : '',
                    row.topic ? `Topic: ${row.topic}` : '',
                ].filter(Boolean).join('\n\n'),
                questionType: 'SINGLE_CHOICE',
                category: row.domain,
                weight: row.weight,
                required: true,
                evidenceRequired: Boolean(row.expectedEvidence),
                options: VENDOR_OPTIONS,
                sortOrder: index,
            })),
        })),
    };
}

export async function importWorkbookCatalog(catalog = loadWorkbookCatalog()) {
    const results = [];
    for (const pack of WORKBOOK_PACK_KEYS) {
        const template = packTemplate(catalog, pack);
        const existing = await prisma.questionnaireTemplate.findFirst({
            where: { scopeKey: PLATFORM_SCOPE, libraryKey: pack.templateKey, version: catalog.catalogVersion },
        });
        if (existing) {
            results.push({ key: pack.templateKey, action: 'unchanged', id: existing.id, version: existing.version });
            continue;
        }
        const created = await prisma.questionnaireTemplate.create({
            data: {
                name: template.name,
                framework: template.framework,
                version: template.version,
                source: 'SUPREME',
                libraryKey: template.key,
                scopeKey: PLATFORM_SCOPE,
                isActive: true,
                sections: {
                    create: template.sections.map((section) => ({
                        title: section.title,
                        sortOrder: section.sortOrder,
                        questions: {
                            create: section.questions,
                        },
                    })),
                },
            },
        });
        results.push({ key: pack.templateKey, action: 'created', id: created.id, version: created.version });
    }
    return {
        catalogVersion: catalog.catalogVersion,
        results,
    };
}

export async function parseWorkbookXlsx(filePath = join(process.cwd(), 'docs/tprm/Vendor_Risk_Assessment_Workbook.xlsx')): Promise<WorkbookCatalog> {
    const workbook = new Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Questionnaire');
    if (!sheet) throw new Error('Questionnaire sheet missing');
    const questions: WorkbookCatalog['questions'] = [];
    sheet.eachRow((row, index) => {
        if (index === 1 || row.getCell(1).value === 'Control ID') return;
        const controlId = String(row.getCell(1).value || '').trim();
        if (!controlId) return;
        questions.push({
            controlId,
            domain: String(row.getCell(2).value || ''),
            topic: String(row.getCell(3).value || ''),
            question: String(row.getCell(4).value || ''),
            guidance: String(row.getCell(5).value || ''),
            expectedEvidence: String(row.getCell(6).value || ''),
            weight: Number(row.getCell(7).value || 0),
            pack: String(row.getCell(16).value || ''),
        });
    });
    return {
        ...loadWorkbookCatalog(),
        catalogVersion: TPRM_CATALOG_VERSION,
        questions,
    };
}

if (require.main === module) {
    importWorkbookCatalog()
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
            process.exit(0);
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

void readFileSync;

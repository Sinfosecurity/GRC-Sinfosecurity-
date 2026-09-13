import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { DEFAULT_QUESTIONNAIRE_SECTIONS, DEFAULT_QUESTIONNAIRE_VERSION } from './questionnaireCatalog';
import { ensureSupremeLibrary, SUPREME_LIBRARY } from './questionnaireLibrary';
import { PLATFORM_SCOPE, presentQuestionnaireTemplate, templateScopeKey } from './questionnairePresentation';

const DEFAULT_LIBRARY_KEY = 'standard-due-diligence';

function isUniqueViolation(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002';
}

export async function ensureDefaultQuestionnaire(organizationId?: string) {
    const scopeKey = organizationId ? templateScopeKey(organizationId) : PLATFORM_SCOPE;
    const existing = await prisma.questionnaireTemplate.findFirst({
        where: {
            OR: [
                { scopeKey, libraryKey: DEFAULT_LIBRARY_KEY },
                {
                    organizationId: organizationId || null,
                    name: 'Supreme Risk Standard Due Diligence',
                    version: DEFAULT_QUESTIONNAIRE_VERSION,
                },
            ],
        },
        include: { sections: { include: { questions: true }, orderBy: { sortOrder: 'asc' } } },
        orderBy: { createdAt: 'asc' },
    });
    if (existing) {
        if (existing.source !== 'SUPREME' || existing.libraryKey !== DEFAULT_LIBRARY_KEY || existing.scopeKey !== scopeKey) {
            return prisma.questionnaireTemplate.update({
                where: { id: existing.id },
                data: {
                    source: 'SUPREME',
                    libraryKey: DEFAULT_LIBRARY_KEY,
                    scopeKey,
                    isActive: true,
                },
                include: { sections: { include: { questions: true }, orderBy: { sortOrder: 'asc' } } },
            });
        }
        return existing;
    }

    try {
        return await prisma.questionnaireTemplate.create({
            data: {
                organizationId: organizationId || undefined,
                name: 'Supreme Risk Standard Due Diligence',
                framework: 'Custom',
                version: DEFAULT_QUESTIONNAIRE_VERSION,
                source: 'SUPREME',
                libraryKey: DEFAULT_LIBRARY_KEY,
                scopeKey,
                isActive: true,
                sections: {
                    create: DEFAULT_QUESTIONNAIRE_SECTIONS.map((section, sectionIndex) => ({
                        title: section.title,
                        sortOrder: sectionIndex,
                        questions: {
                            create: section.questions.map((q, qIndex) => ({
                                questionKey: q.id,
                                questionText: q.question,
                                questionType: q.questionType || 'SINGLE_CHOICE',
                                category: q.category,
                                weight: q.weight,
                                required: true,
                                evidenceRequired: q.evidenceRequired || false,
                                options: q.options,
                                sortOrder: qIndex,
                            })),
                        },
                    })),
                },
            },
            include: { sections: { include: { questions: true }, orderBy: { sortOrder: 'asc' } } },
        });
    } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const raced = await prisma.questionnaireTemplate.findFirst({
            where: { scopeKey, name: 'Supreme Risk Standard Due Diligence', version: DEFAULT_QUESTIONNAIRE_VERSION },
            include: { sections: { include: { questions: true }, orderBy: { sortOrder: 'asc' } } },
        });
        if (!raced) throw error;
        return raced;
    }
}

export async function getActiveTemplate(organizationId: string, framework = 'Custom') {
    const orgTemplate = await prisma.questionnaireTemplate.findFirst({
        where: { organizationId, framework, isActive: true },
        orderBy: { updatedAt: 'desc' },
        include: { sections: { include: { questions: true }, orderBy: { sortOrder: 'asc' } } },
    });
    if (orgTemplate) {
        return orgTemplate;
    }
    return ensureDefaultQuestionnaire();
}

export async function cloneTemplate(organizationId: string, templateId: string, name?: string) {
    const source = await prisma.questionnaireTemplate.findFirst({
        where: { id: templateId, isActive: true, OR: [{ organizationId }, { organizationId: null }] },
        include: { sections: { include: { questions: true }, orderBy: { sortOrder: 'asc' } } },
    });
    if (!source) throw new ApiError(404, 'Template not found');
    const requested = String(name || `${source.name} — Custom`).trim();
    const taken = await prisma.questionnaireTemplate.findFirst({
        where: { organizationId, name: requested, version: '1.0.0' },
    });
    const cloneName = taken ? `${requested} (${new Date().toISOString().slice(0, 10)})` : requested;
    return prisma.questionnaireTemplate.create({
        data: {
            organizationId,
            name: cloneName,
            framework: source.framework,
            version: '1.0.0',
            source: 'CLONED',
            libraryKey: null,
            scopeKey: templateScopeKey(organizationId),
            isActive: true,
            sections: {
                create: source.sections.map((section) => ({
                    title: section.title,
                    sortOrder: section.sortOrder,
                    questions: {
                        create: section.questions.map((question) => ({
                            questionKey: question.questionKey,
                            questionText: question.questionText,
                            questionType: question.questionType,
                            category: question.category,
                            weight: question.weight,
                            required: question.required,
                            evidenceRequired: question.evidenceRequired,
                            options: question.options ?? undefined,
                            conditionalOnKey: question.conditionalOnKey,
                            conditionalValue: question.conditionalValue,
                            sortOrder: question.sortOrder,
                        })),
                    },
                })),
            },
        },
        include: { sections: { include: { questions: true }, orderBy: { sortOrder: 'asc' } } },
    });
}

export async function listTemplates(organizationId: string) {
    await ensureSupremeLibrary();
    await ensureDefaultQuestionnaire();
    const rows = await prisma.questionnaireTemplate.findMany({
        where: {
            isActive: true,
            OR: [{ organizationId }, { organizationId: null }],
        },
        include: { sections: { include: { questions: true }, orderBy: { sortOrder: 'asc' } } },
        orderBy: [{ name: 'asc' }, { version: 'asc' }],
    });
    return rows.map((row) => {
        const library = SUPREME_LIBRARY.find((item) => item.key === row.libraryKey || item.name === row.name);
        return presentQuestionnaireTemplate(row, { purpose: library?.purpose });
    });
}

export async function getTemplateById(organizationId: string, templateId: string) {
    await ensureSupremeLibrary();
    await ensureDefaultQuestionnaire();
    const row = await prisma.questionnaireTemplate.findFirst({
        where: {
            id: templateId,
            OR: [{ organizationId }, { organizationId: null }],
        },
        include: { sections: { include: { questions: true }, orderBy: { sortOrder: 'asc' } } },
    });
    if (!row) return null;
    const library = SUPREME_LIBRARY.find((item) => item.key === row.libraryKey || item.name === row.name);
    return presentQuestionnaireTemplate(row, { purpose: library?.purpose });
}

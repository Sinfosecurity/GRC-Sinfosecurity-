import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { DEFAULT_QUESTIONNAIRE_SECTIONS, DEFAULT_QUESTIONNAIRE_VERSION } from './questionnaireCatalog';
import { ensureSupremeLibrary } from './questionnaireLibrary';

export async function ensureDefaultQuestionnaire(organizationId?: string) {
    const existing = await prisma.questionnaireTemplate.findFirst({
        where: {
            organizationId: organizationId || null,
            name: 'Supreme Risk Standard Due Diligence',
            version: DEFAULT_QUESTIONNAIRE_VERSION,
        },
        include: { sections: { include: { questions: true }, orderBy: { sortOrder: 'asc' } } },
    });
    if (existing) {
        return existing;
    }

    return prisma.questionnaireTemplate.create({
        data: {
            organizationId: organizationId || undefined,
            name: 'Supreme Risk Standard Due Diligence',
            framework: 'Custom',
            version: DEFAULT_QUESTIONNAIRE_VERSION,
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
    const cloneName = String(name || `${source.name} (organization copy ${new Date().toISOString().slice(0, 10)})`).trim();
    return prisma.questionnaireTemplate.create({
        data: {
            organizationId,
            name: cloneName,
            framework: source.framework,
            version: '1.0.0',
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
    return prisma.questionnaireTemplate.findMany({
        where: {
            OR: [{ organizationId }, { organizationId: null }],
        },
        include: { sections: { include: { questions: true }, orderBy: { sortOrder: 'asc' } } },
        orderBy: { updatedAt: 'desc' },
    });
}

export async function getTemplateById(organizationId: string, templateId: string) {
    await ensureSupremeLibrary();
    await ensureDefaultQuestionnaire();
    return prisma.questionnaireTemplate.findFirst({
        where: {
            id: templateId,
            isActive: true,
            OR: [{ organizationId }, { organizationId: null }],
        },
        include: { sections: { include: { questions: true }, orderBy: { sortOrder: 'asc' } } },
    });
}

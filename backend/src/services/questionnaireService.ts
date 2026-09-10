import { prisma } from '../config/database';
import { DEFAULT_QUESTIONNAIRE_SECTIONS, DEFAULT_QUESTIONNAIRE_VERSION } from './questionnaireCatalog';

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

export async function listTemplates(organizationId: string) {
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

import type { QuestionnaireTemplateSource } from '@prisma/client';

export const PLATFORM_SCOPE = 'platform';

export type TemplateRowLike = {
    id: string;
    name: string;
    framework: string;
    version: string;
    organizationId?: string | null;
    source?: QuestionnaireTemplateSource | string | null;
    libraryKey?: string | null;
    createdAt?: Date;
    sections?: Array<{
        title?: string;
        questions?: Array<{ evidenceRequired?: boolean }>;
    }>;
};

export function templateScopeKey(organizationId?: string | null) {
    return organizationId || PLATFORM_SCOPE;
}

export function templateSourceLabel(source?: string | null, organizationId?: string | null) {
    switch (source) {
        case 'SUPREME':
            return 'Supreme template';
        case 'CLONED':
            return 'Organization template';
        case 'ORGANIZATION':
            return 'Organization template';
        case 'CUSTOM':
            return 'Custom template';
        default:
            return organizationId ? 'Organization template' : 'Supreme template';
    }
}

export function templateCategory(name: string, framework: string) {
    const haystack = `${name} ${framework}`;
    if (/inherent/i.test(haystack)) return 'Inherent risk';
    if (/privacy|data protection/i.test(haystack)) return 'Privacy';
    if (/continuity|disaster|resilience|bcdr/i.test(haystack)) return 'Resilience';
    if (/cmmc|nist|iso|soc/i.test(haystack)) return 'Framework-aligned';
    if (/regulatory|compliance/i.test(haystack)) return 'Compliance';
    if (/security|identity|incident|cloud/i.test(haystack)) return 'Cybersecurity';
    return 'Due diligence';
}

export function questionCountOf(row: TemplateRowLike) {
    return (row.sections || []).reduce((sum, section) => sum + (section.questions?.length || 0), 0);
}

export function domainCountOf(row: TemplateRowLike) {
    return (row.sections || []).length;
}

export function estimatedMinutesOf(questionCount: number) {
    return Math.max(8, Math.round(questionCount * 0.6));
}

export function evidenceRequiredOf(row: TemplateRowLike) {
    return (row.sections || []).some((section) => (section.questions || []).some((question) => question.evidenceRequired));
}

export function pickCanonicalTemplate<T extends { id: string; createdAt: Date }>(rows: T[]) {
    const sorted = [...rows].sort((left, right) => {
        const byDate = left.createdAt.getTime() - right.createdAt.getTime();
        return byDate !== 0 ? byDate : left.id.localeCompare(right.id);
    });
    return {
        canonical: sorted[0],
        duplicates: sorted.slice(1),
    };
}

export function presentQuestionnaireTemplate<T extends TemplateRowLike>(row: T, extras: { purpose?: string } = {}) {
    const questions = questionCountOf(row);
    const source = row.source || (row.organizationId ? 'ORGANIZATION' : 'SUPREME');
    return {
        ...row,
        source,
        sourceLabel: templateSourceLabel(source, row.organizationId),
        category: templateCategory(row.name, row.framework),
        questionCount: questions,
        domainCount: domainCountOf(row),
        estimatedMinutes: estimatedMinutesOf(questions),
        evidenceRequired: evidenceRequiredOf(row),
        purpose: extras.purpose,
    };
}

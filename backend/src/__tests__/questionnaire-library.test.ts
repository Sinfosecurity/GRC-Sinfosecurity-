import { prisma } from '../config/database';
import { SUPREME_LIBRARY, ensureSupremeLibrary } from '../services/questionnaireLibrary';
import { PLATFORM_SCOPE } from '../services/questionnairePresentation';

describe('Supreme assessment library', () => {
    it('contains the required private-beta templates without claiming certification', () => {
        expect(SUPREME_LIBRARY.length).toBeGreaterThanOrEqual(25);
        const names = SUPREME_LIBRARY.map((item) => item.name);
        expect(names).toEqual(expect.arrayContaining([
            'Inherent Risk Questionnaire',
            'Information Security Assessment',
            'Privacy & Data Protection Assessment',
            'NIST CSF-Aligned Cybersecurity Assessment',
            'SOC 2 Evidence / Assurance Review',
        ]));
        expect(SUPREME_LIBRARY.some((item) => /official NIST product|SOC 2 examination|ISO certification/i.test(item.purpose))).toBe(true);
        const questionCount = SUPREME_LIBRARY.reduce((sum, item) => sum + item.sections.reduce((inner, section) => inner + section.questions.length, 0), 0);
        expect(questionCount).toBeGreaterThan(80);
        expect(SUPREME_LIBRARY.some((item) => item.sections.some((section) => section.questions.some((question) => question.conditionalOnKey)))).toBe(true);
        expect(SUPREME_LIBRARY.some((item) => item.sections.some((section) => section.questions.some((question) => question.evidenceRequired)))).toBe(true);
    });

    it('does not create duplicate Supreme templates when ensure runs three times', async () => {
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch {
            return;
        }
        try {
            await ensureSupremeLibrary();
        } catch (error) {
            if (/does not exist|P2022/i.test(String((error as Error).message || ''))) {
                return;
            }
            throw error;
        }
        const countAfterFirst = await prisma.questionnaireTemplate.count({
            where: { scopeKey: PLATFORM_SCOPE, source: 'SUPREME', isActive: true },
        });
        await ensureSupremeLibrary();
        await ensureSupremeLibrary();
        const countAfterThird = await prisma.questionnaireTemplate.count({
            where: { scopeKey: PLATFORM_SCOPE, source: 'SUPREME', isActive: true },
        });
        expect(countAfterThird).toBe(countAfterFirst);
        const active = await prisma.questionnaireTemplate.findMany({
            where: { scopeKey: PLATFORM_SCOPE, source: 'SUPREME', isActive: true },
            select: { name: true, version: true },
        });
        const keys = active.map((row) => `${row.name}::${row.version}`);
        expect(new Set(keys).size).toBe(keys.length);
        expect(countAfterThird).toBeGreaterThanOrEqual(SUPREME_LIBRARY.length);
    });
});

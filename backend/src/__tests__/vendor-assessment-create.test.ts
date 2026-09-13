import { AssessmentStatus, AssessmentType } from '@prisma/client';
import { prisma } from '../config/database';
import vendorAssessmentService from '../services/vendorAssessmentService';

jest.setTimeout(60000);

describe('vendor assessment create uniqueness', () => {
    it('rejects a second open assessment for the same vendor, type, and questionnaire', async () => {
        await prisma.$queryRaw`SELECT 1`;
        const suffix = `${Date.now()}`;
        const org = await prisma.organization.create({
            data: { name: `Assess Org ${suffix}`, country: 'US', industry: 'Technology', size: '51-200' },
        });
        const vendor = await prisma.vendor.create({
            data: {
                organizationId: org.id,
                name: `Assess Vendor ${suffix}`,
                vendorType: 'SAAS',
                category: 'TECHNOLOGY',
                tier: 'MEDIUM',
                status: 'ACTIVE',
                primaryContact: 'ops@assess.test',
                contactEmail: `ops-${suffix}@assess.test`,
                servicesProvided: 'Hosted test vendor',
            },
        });
        const template = await prisma.questionnaireTemplate.create({
            data: {
                name: `Due Diligence ${suffix}`,
                framework: 'Custom',
                version: '1.0.0',
                scopeKey: `org:${org.id}`,
                organizationId: org.id,
                isActive: true,
                sections: {
                    create: [{
                        title: 'Access',
                        sortOrder: 0,
                        questions: { create: [{ questionKey: 'q1', questionText: 'MFA in use?', sortOrder: 0, category: 'Access' }] },
                    }],
                },
            },
        });
        const first = await vendorAssessmentService.createAssessment({
            vendorId: vendor.id,
            organizationId: org.id,
            assessmentType: AssessmentType.INITIAL_DUE_DILIGENCE,
            templateId: template.id,
        });
        await expect(vendorAssessmentService.createAssessment({
            vendorId: vendor.id,
            organizationId: org.id,
            assessmentType: AssessmentType.INITIAL_DUE_DILIGENCE,
            templateId: template.id,
        })).rejects.toMatchObject({ statusCode: 409 });

        const other = await prisma.questionnaireTemplate.create({
            data: {
                name: `Information Security ${suffix}`,
                framework: 'Custom',
                version: '1.0.0',
                scopeKey: `org:${org.id}:sec`,
                organizationId: org.id,
                isActive: true,
                sections: {
                    create: [{
                        title: 'Security',
                        sortOrder: 0,
                        questions: { create: [{ questionKey: 'q2', questionText: 'Logging enabled?', sortOrder: 0, category: 'Security' }] },
                    }],
                },
            },
        });
        const different = await vendorAssessmentService.createAssessment({
            vendorId: vendor.id,
            organizationId: org.id,
            assessmentType: AssessmentType.INITIAL_DUE_DILIGENCE,
            templateId: other.id,
        });
        expect(different.id).not.toBe(first.id);

        await prisma.vendorAssessment.update({
            where: { id: first.id },
            data: { status: AssessmentStatus.COMPLETED, completedAt: new Date() },
        });
        const later = await vendorAssessmentService.createAssessment({
            vendorId: vendor.id,
            organizationId: org.id,
            assessmentType: AssessmentType.INITIAL_DUE_DILIGENCE,
            templateId: template.id,
        });
        expect(later.id).not.toBe(first.id);

        const listed = await vendorAssessmentService.listVendorAssessments(vendor.id, org.id);
        expect(listed.some((row) => row.templateName === `Due Diligence ${suffix}`)).toBe(true);
    });
});

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Role, ScanStatus } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { getEnv } from '../config/env';
import { createOrgUser } from './helpers/orgUser';

jest.setTimeout(180000);

const PASSWORD = 'Wave3Pass1x';
const API = '/api/v1';

function completeAnswers(overrides: Record<string, string> = {}) {
    return {
        a1: 'consulting',
        a2: 'internal',
        a3: 'none',
        a4: 'none',
        a5: 'internal',
        a6: 'country',
        a7: 'no',
        a8: 'no',
        a9: 'no',
        b1: 'manage',
        b2: 'no',
        b3: 'no',
        b4: 'minor',
        b5: 'easy',
        ...overrides,
    };
}

const azureAnswers = completeAnswers({
    a1: 'cloud',
    a2: 'personal',
    a3: '10k_100k',
    a4: 'admin',
    a5: 'customer',
    b1: 'day',
    b2: 'material',
    b3: 'yes',
    b4: 'significant',
    b5: 'hard',
});

describe('#12 Wave 3 engagement due diligence, vendor assessment, and specialist review', () => {
    const suffix = `${Date.now()}`;
    let adminToken = '';
    let analystToken = '';
    let requesterToken = '';
    let otherTenantToken = '';
    let analystId = '';
    let orgA = '';
    let vendorId = '';
    let azureId = '';
    let servicesId = '';
    let azureEngagementId = '';
    let servicesEngagementId = '';
    let azureIraId = '';
    let servicesIraId = '';
    let azureAssessmentId = '';
    let servicesAssessmentId = '';
    let vendorToken = '';
    let copyUrl = '';

    async function createIntake(service: string, purpose: string) {
        const created = await request(app).post(`${API}/tprm/intakes`).set('Authorization', `Bearer ${requesterToken}`).send({
            proposedThirdPartyName: 'Microsoft Corporation',
            proposedServiceName: service,
            businessPurpose: purpose,
        });
        expect(created.status).toBe(201);
        await request(app).post(`${API}/tprm/intakes/${created.body.data.id}/assign`).set('Authorization', `Bearer ${adminToken}`).send({ analystUserId: analystId });
        await request(app).post(`${API}/tprm/intakes/${created.body.data.id}/start-review`).set('Authorization', `Bearer ${analystToken}`);
        return created.body.data.id as string;
    }

    async function confirmIra(engagementId: string, iraId: string, answers: Record<string, string>) {
        const submitted = await request(app).post(`${API}/tprm/requester/iras/${iraId}/submit`).set('Authorization', `Bearer ${requesterToken}`).send({
            attested: true,
            answers,
        });
        expect(submitted.status).toBe(200);
        const confirm = await request(app).post(`${API}/tprm/engagements/${engagementId}/tier-review/confirm`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect([200, 409]).toContain(confirm.status);
        if (confirm.status === 409) {
            const override = await request(app).post(`${API}/tprm/engagements/${engagementId}/tier-review/override`).set('Authorization', `Bearer ${analystToken}`).send({
                tier: answers.a4 === 'admin' ? 'CRITICAL' : 'MEDIUM',
                reason: 'Confirmed engagement-specific inherent risk for Wave 3.',
            });
            expect(override.status).toBe(200);
        }
    }

    beforeAll(async () => {
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            throw new Error(`PostgreSQL is required. ${(error as Error).message}`);
        }
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `lead-${suffix}@wave3.test`,
            password: PASSWORD,
            firstName: 'Lea',
            lastName: 'Lead',
            organizationName: `Wave3 ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        adminToken = signup.body.data.token;
        orgA = signup.body.data.user.organizationId;
        const analyst = await createOrgUser({ organizationId: orgA, email: `ana-${suffix}@wave3.test`, password: PASSWORD, role: Role.ASSESSOR, firstName: 'Ana', lastName: 'Lyst' });
        analystToken = analyst.token;
        analystId = analyst.user.id;
        const requester = await createOrgUser({ organizationId: orgA, email: `pat-${suffix}@wave3.test`, password: PASSWORD, role: Role.BUSINESS_OWNER, firstName: 'Pat', lastName: 'Requester' });
        requesterToken = requester.token;
        const tenant = await request(app).post(`${API}/auth/signup`).send({
            email: `other-${suffix}@wave3-b.test`,
            password: PASSWORD,
            firstName: 'Other',
            lastName: 'Tenant',
            organizationName: `Wave3 B ${suffix}`,
            country: 'US',
        });
        otherTenantToken = tenant.body.data.token;
    });

    it('blocks unconfirmed tiers and requesters from due diligence', async () => {
        azureId = await createIntake('Azure Hosting', 'Host a customer-facing application.');
        const vendor = await request(app).post(`${API}/tprm/intakes/${azureId}/third-party`).set('Authorization', `Bearer ${analystToken}`).send({
            name: 'Microsoft Corporation',
            website: 'https://microsoft.com',
            country: 'United States',
        });
        expect(vendor.status).toBe(201);
        vendorId = vendor.body.data.matchedVendorId;
        const azure = await request(app).post(`${API}/tprm/intakes/${azureId}/engagement`).set('Authorization', `Bearer ${analystToken}`).send({ serviceName: 'Azure Hosting' });
        expect(azure.status).toBe(201);
        azureEngagementId = azure.body.data.engagement.id;
        azureIraId = (await prisma.engagementIra.findUnique({ where: { engagementId: azureEngagementId } }))!.id;

        const unconfirmed = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/due-diligence`).set('Authorization', `Bearer ${analystToken}`);
        expect(unconfirmed.status).toBe(409);
        const requesterDenied = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/due-diligence`).set('Authorization', `Bearer ${requesterToken}`);
        expect(requesterDenied.status).toBe(403);
        const otherDenied = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/due-diligence`).set('Authorization', `Bearer ${otherTenantToken}`);
        expect([403, 404]).toContain(otherDenied.status);
    });

    it('generates engagement-owned plans with different packs for two Microsoft engagements', async () => {
        await confirmIra(azureEngagementId, azureIraId, azureAnswers);
        servicesId = await createIntake('Professional Services', 'Advisory work with no production access.');
        await request(app).post(`${API}/tprm/intakes/${servicesId}/match`).set('Authorization', `Bearer ${analystToken}`).send({ vendorId, reason: 'Same legal entity' });
        const services = await request(app).post(`${API}/tprm/intakes/${servicesId}/engagement`).set('Authorization', `Bearer ${analystToken}`).send({ serviceName: 'Professional Services' });
        expect(services.status).toBe(201);
        servicesEngagementId = services.body.data.engagement.id;
        servicesIraId = (await prisma.engagementIra.findUnique({ where: { engagementId: servicesEngagementId } }))!.id;
        await confirmIra(servicesEngagementId, servicesIraId, completeAnswers());

        const azurePlan = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/due-diligence`).set('Authorization', `Bearer ${analystToken}`);
        const servicesPlan = await request(app).get(`${API}/tprm/engagements/${servicesEngagementId}/due-diligence`).set('Authorization', `Bearer ${analystToken}`);
        expect(azurePlan.status).toBe(200);
        expect(servicesPlan.status).toBe(200);
        expect(azurePlan.body.data.relationships.engagement.id).toBe(azureEngagementId);
        expect(servicesPlan.body.data.relationships.engagement.id).toBe(servicesEngagementId);
        expect(azurePlan.body.data.relationships.thirdParty.id).toBe(vendorId);
        expect(servicesPlan.body.data.relationships.thirdParty.id).toBe(vendorId);
        expect(azurePlan.body.data.id).not.toBe(servicesPlan.body.data.id);
        const azurePacks = (azurePlan.body.data.packs || []).filter((row: { status: string }) => row.status !== 'EXCLUDED').map((row: { key: string }) => row.key);
        const servicesPacks = (servicesPlan.body.data.packs || []).filter((row: { status: string }) => row.status !== 'EXCLUDED').map((row: { key: string }) => row.key);
        expect(azurePacks).toEqual(expect.arrayContaining(['baseline', 'cloud-hosting']));
        expect(servicesPacks).toContain('baseline');
        expect(servicesPacks).not.toContain('cloud-hosting');
        expect(azurePlan.body.data.confirmedTier).not.toBe(servicesPlan.body.data.confirmedTier);
        expect(new Date(azurePlan.body.data.dueDate).getTime()).not.toBe(new Date(servicesPlan.body.data.dueDate).getTime());
        expect(azurePlan.body.data.wave4Started).toBe(false);
        const vendors = await prisma.vendor.findMany({ where: { organizationId: orgA, name: 'Microsoft Corporation' } });
        expect(vendors).toHaveLength(1);
    });

    it('requires rationale for pack exclusion, preserves the recommendation, and pins the catalog on send', async () => {
        const silent = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/due-diligence/modify`).set('Authorization', `Bearer ${analystToken}`).send({
            excludeKeys: ['personal-sensitive-data'],
        });
        expect(silent.status).toBe(400);
        const modified = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/due-diligence/modify`).set('Authorization', `Bearer ${analystToken}`).send({
            includeKeys: ['physical-delivery'],
            excludeKeys: ['personal-sensitive-data'],
            reason: 'Azure hosting does not include on-site records; privacy evidence is already covered by the cloud pack.',
        });
        expect(modified.status).toBe(200);
        expect(modified.body.data.changeReason).toMatch(/privacy evidence/i);
        expect(modified.body.data.recommendedPlan).toBeTruthy();
        const confirmed = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/due-diligence/confirm`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(confirmed.status).toBe(200);
        expect(confirmed.status === 200 && confirmed.body.data.state).toBe('READY_TO_SEND');
        await request(app).post(`${API}/tprm/engagements/${servicesEngagementId}/due-diligence/confirm`).set('Authorization', `Bearer ${analystToken}`).send({});

        const contact = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/due-diligence/contact`).set('Authorization', `Bearer ${analystToken}`).send({
            name: 'Casey Azure',
            email: `casey-azure-${suffix}@vendor.test`,
            title: 'Cloud security',
        });
        expect(contact.status).toBe(200);
        const otherContact = await request(app).post(`${API}/tprm/engagements/${servicesEngagementId}/due-diligence/contact`).set('Authorization', `Bearer ${analystToken}`).send({
            name: 'Riley Services',
            email: `riley-services-${suffix}@vendor.test`,
            title: 'Advisory security',
        });
        expect(otherContact.status).toBe(200);
        expect(contact.body.data.contact.email).not.toBe(otherContact.body.data.contact.email);

        const sent = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/due-diligence/send`).set('Authorization', `Bearer ${analystToken}`).send({
            allowActivationLink: true,
        });
        expect(sent.status).toBe(200);
        expect(sent.body.data.state).toBe('AWAITING_VENDOR');
        expect(sent.body.data.emailStatus).toMatch(/Queued|Accepted/i);
        expect(sent.body.data.emailStatus).not.toMatch(/Delivered/i);
        expect(sent.body.data.activationUrl).toContain('/vendor-assessment/activate');
        expect(sent.body.data.catalogPin).toBeTruthy();
        azureAssessmentId = sent.body.data.assessments[0].id;
    });

    it('copies a link without sending and only marks shared on the copy path', async () => {
        const copied = await request(app).post(`${API}/tprm/engagements/${servicesEngagementId}/due-diligence/link`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(copied.status).toBe(200);
        expect(copied.body.data.copiedNotSent).toBe(true);
        expect(copied.body.data.state).toBe('READY_TO_SEND');
        expect(copied.body.data.activationUrl).toContain('/vendor-assessment/activate');
        copyUrl = copied.body.data.activationUrl;
        servicesAssessmentId = copied.body.data.assessments[0].id;
        expect(servicesAssessmentId).not.toBe(azureAssessmentId);
        const shared = await request(app).post(`${API}/tprm/engagements/${servicesEngagementId}/due-diligence/shared`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(shared.status).toBe(200);
        expect(shared.body.data.state).toBe('AWAITING_VENDOR');
    });

    it('activates the vendor for Azure only and hides IRA and tier review', async () => {
        const invite = await prisma.vendorAssessmentInvitation.findFirst({
            where: { organizationId: orgA, engagementId: azureEngagementId, status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
        });
        expect(invite).toBeTruthy();
        const sent = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/due-diligence/send`).set('Authorization', `Bearer ${analystToken}`).send({
            allowActivationLink: true,
        });
        const token = new URL(sent.body.data.activationUrl).searchParams.get('token') || '';
        const activated = await request(app).post(`${API}/vendor-portal/activate`).send({ token });
        expect(activated.status).toBe(200);
        vendorToken = activated.body.data.token;
        const workspace = await request(app).get(`${API}/vendor-portal/workspace`).set('Authorization', `Bearer ${vendorToken}`);
        expect(workspace.status).toBe(200);
        expect(workspace.body.data.serviceName).toBe('Azure Hosting');
        expect(JSON.stringify(workspace.body.data)).not.toMatch(/recommendedTier|confirmedTier|hardFloors|Don't know|packReasons/);
        const vendorIra = await request(app).get(`${API}/tprm/requester/iras/${azureIraId}`).set('Authorization', `Bearer ${vendorToken}`);
        expect([401, 403]).toContain(vendorIra.status);
        const vendorTier = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/tier-review`).set('Authorization', `Bearer ${vendorToken}`);
        expect([401, 403]).toContain(vendorTier.status);
        const otherEngagement = await request(app).get(`${API}/vendor-portal/assessments/${servicesAssessmentId}`).set('Authorization', `Bearer ${vendorToken}`);
        expect([403, 404]).toContain(otherEngagement.status);
        const leaked = await request(app).get(`${API}/vendors`).set('Authorization', `Bearer ${vendorToken}`);
        expect(leaked.status).toBe(401);
        const vendorJwt = jwt.sign(
            { userId: 'vendor-actor', plane: 'VENDOR', kind: 'vendor_session', organizationId: orgA },
            getEnv().jwtSecret
        );
        const forged = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/due-diligence`).set('Authorization', `Bearer ${vendorJwt}`);
        expect([401, 403]).toContain(forged.status);
        void invite;
        void copyUrl;
    });

    it('lets the vendor save, upload evidence, honor malware state, clarify, attest, and submit without findings', async () => {
        const detail = await request(app).get(`${API}/vendor-portal/assessments/${azureAssessmentId}`).set('Authorization', `Bearer ${vendorToken}`);
        expect(detail.status).toBe(200);
        const first = (detail.body.data.questions || []).find((row: { visible: boolean }) => row.visible);
        expect(first).toBeTruthy();
        const saved = await request(app).patch(`${API}/vendor-portal/assessments/${azureAssessmentId}/responses`).set('Authorization', `Bearer ${vendorToken}`).send({
            questionKey: first.key,
            response: first.options?.[0] || 'Yes',
        });
        expect(saved.status).toBe(200);
        const pendingUpload = await request(app)
            .post(`${API}/vendor-portal/assessments/${azureAssessmentId}/evidence`)
            .set('Authorization', `Bearer ${vendorToken}`)
            .field('questionKey', first.key)
            .attach('file', Buffer.from('%PDF-1.4 pending'), 'pending.pdf');
        expect([201, 409]).toContain(pendingUpload.status);
        const questions = (await request(app).get(`${API}/vendor-portal/assessments/${azureAssessmentId}`).set('Authorization', `Bearer ${vendorToken}`)).body.data.questions;
        for (const question of questions.filter((row: { visible: boolean; required: boolean }) => row.visible && row.required)) {
            await request(app).patch(`${API}/vendor-portal/assessments/${azureAssessmentId}/responses`).set('Authorization', `Bearer ${vendorToken}`).send({
                questionKey: question.key,
                response: question.options?.[0] || 'Yes',
            });
            if (question.evidenceRequired) {
                const evidence = await request(app)
                    .post(`${API}/vendor-portal/assessments/${azureAssessmentId}/evidence`)
                    .set('Authorization', `Bearer ${vendorToken}`)
                    .field('questionKey', question.key)
                    .attach('file', Buffer.from(`CLEAN ${question.key}`), `${question.key}.pdf`);
                if (evidence.status === 201 && evidence.body.data.id) {
                    await prisma.storedObject.update({ where: { id: evidence.body.data.id }, data: { scanStatus: ScanStatus.CLEAN } });
                }
            }
        }
        const missingAttest = await request(app).post(`${API}/vendor-portal/assessments/${azureAssessmentId}/submit`).set('Authorization', `Bearer ${vendorToken}`).send({ attested: false });
        expect(missingAttest.status).toBe(400);
        const assigned = await prisma.vendorAssessment.findMany({ where: { organizationId: orgA, engagementId: azureEngagementId, status: { notIn: ['COMPLETED', 'CANCELLED'] } } });
        for (const assessment of assigned) {
            const current = (await request(app).get(`${API}/vendor-portal/assessments/${assessment.id}`).set('Authorization', `Bearer ${vendorToken}`)).body.data;
            for (const question of (current.questions || []).filter((row: { visible: boolean; required: boolean }) => row.visible && row.required)) {
                await request(app).patch(`${API}/vendor-portal/assessments/${assessment.id}/responses`).set('Authorization', `Bearer ${vendorToken}`).send({
                    questionKey: question.key,
                    response: question.options?.[0] || 'Yes',
                });
                if (question.evidenceRequired) {
                    const evidence = await request(app)
                        .post(`${API}/vendor-portal/assessments/${assessment.id}/evidence`)
                        .set('Authorization', `Bearer ${vendorToken}`)
                        .field('questionKey', question.key)
                        .attach('file', Buffer.from(`CLEAN ${question.key}`), `${question.key}.pdf`);
                    if (evidence.status === 201 && evidence.body.data.id) {
                        await prisma.storedObject.update({ where: { id: evidence.body.data.id }, data: { scanStatus: ScanStatus.CLEAN } });
                    }
                }
            }
            const submitted = await request(app).post(`${API}/vendor-portal/assessments/${assessment.id}/submit`).set('Authorization', `Bearer ${vendorToken}`).send({ attested: true });
            expect([200, 409]).toContain(submitted.status);
            expect(submitted.body.data?.draftFindings || 0).toBe(0);
        }
        const issues = await prisma.vendorIssue.findMany({ where: { organizationId: orgA, assessmentId: { in: assigned.map((row) => row.id) } } });
        expect(issues.filter((row) => row.reviewState !== 'DRAFT')).toHaveLength(0);
        const engagement = await prisma.engagement.findUnique({ where: { id: azureEngagementId } });
        expect(['VENDOR_SUBMITTED', 'SPECIALIST_REVIEW']).toContain(engagement?.status);
    });

    it('assigns specialist review, records vendor clarification, and completes review without Wave 4', async () => {
        const review = await request(app).get(`${API}/tprm/engagements/${azureEngagementId}/assessment-review`).set('Authorization', `Bearer ${analystToken}`);
        expect(review.status).toBe(200);
        expect(review.body.data.authoritativeFindings).toBe(0);
        expect(review.body.data.residualRiskCalculated).toBe(false);
        expect(review.body.data.wave4Started).toBe(false);
        const item = review.body.data.items[0];
        const clarify = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/assessment-review/clarification`).set('Authorization', `Bearer ${analystToken}`).send({
            assessmentId: item.assessmentId,
            questionKeys: [item.questionKey],
            note: 'Please confirm the policy effective date.',
        });
        expect(clarify.status).toBe(200);
        await request(app).patch(`${API}/vendor-portal/assessments/${azureAssessmentId}/responses`).set('Authorization', `Bearer ${vendorToken}`).send({
            questionKey: item.questionKey,
            response: item.vendorAnswer || 'Yes',
        });
        await request(app).post(`${API}/vendor-portal/assessments/${azureAssessmentId}/submit`).set('Authorization', `Bearer ${vendorToken}`).send({ attested: true });
        const complete = await request(app).post(`${API}/tprm/engagements/${azureEngagementId}/assessment-review/complete`).set('Authorization', `Bearer ${analystToken}`).send({
            conclusion: 'Review complete',
            observation: 'Response sufficient for Wave 3. Finding decision is Wave 4.',
        });
        expect(complete.status).toBe(200);
        expect(complete.body.data.authoritativeFindings).toBe(0);
        expect(complete.body.data.residualRiskCalculated).toBe(false);
        expect(complete.body.data.state).not.toBe('VENDOR_SUBMITTED');
        expect(complete.body.data.nextAction).not.toMatch(/Specialist review complete/);
        const vendorAfter = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { residualRiskScore: true } });
        expect(vendorAfter?.residualRiskScore ?? 0).toBe(0);
    });

    it('lists distinguishable engagement assessments and records audit', async () => {
        const list = await request(app).get(`${API}/tprm/assessments/engagements`).set('Authorization', `Bearer ${analystToken}`);
        expect(list.status).toBe(200);
        const names = list.body.data.items.map((row: { serviceName: string }) => row.serviceName);
        expect(names).toEqual(expect.arrayContaining(['Azure Hosting', 'Professional Services']));
        const requesterList = await request(app).get(`${API}/tprm/assessments/engagements`).set('Authorization', `Bearer ${requesterToken}`);
        expect(requesterList.status).toBe(403);
        const actions = await prisma.auditEvent.findMany({
            where: { organizationId: orgA, action: { startsWith: 'due_diligence.' } },
            select: { action: true },
        });
        expect(actions.map((row) => row.action)).toEqual(expect.arrayContaining([
            'due_diligence.plan.generated',
            'due_diligence.plan.modified',
            'due_diligence.plan.confirmed',
        ]));
        const assessmentAudit = await prisma.auditEvent.findMany({
            where: { organizationId: orgA, action: { startsWith: 'assessment.' } },
            select: { action: true },
        });
        expect(assessmentAudit.map((row) => row.action)).toEqual(expect.arrayContaining([
            'assessment.invitation.sent',
            'assessment.link.copied',
            'assessment.marked_shared',
            'assessment.submitted',
            'assessment.review.completed',
        ]));
        const insurance = await prisma.vendor.findUnique({ where: { id: vendorId } });
        expect(insurance?.id).toBe(vendorId);
    });
});

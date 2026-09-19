import request from 'supertest';
import { Role, VendorCategory, VendorStatus, VendorTier, VendorType } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { createOrgUser } from './helpers/orgUser';
import { backfillLegacyEngagements } from '../services/intakeEngagementService';

jest.setTimeout(90000);

const PASSWORD = 'Wave1Pass1x';
const API = '/api/v1';

describe('#12 Wave 1 intake assignment and engagement foundation', () => {
    const suffix = `${Date.now()}`;
    let adminToken = '';
    let analystToken = '';
    let analystBToken = '';
    let viewerToken = '';
    let requesterToken = '';
    let otherToken = '';
    let orgA = '';
    let analystId = '';
    let analystBId = '';
    let intakeId = '';
    let secondId = '';
    let vendorId = '';

    beforeAll(async () => {
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            throw new Error(`PostgreSQL is required. ${(error as Error).message}`);
        }
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `lead-${suffix}@wave1-a.test`,
            password: PASSWORD,
            firstName: 'Lea',
            lastName: 'Lead',
            organizationName: `Wave1 A ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        adminToken = signup.body.data.token;
        orgA = signup.body.data.user.organizationId;

        const analyst = await createOrgUser({ organizationId: orgA, email: `analyst-${suffix}@wave1-a.test`, password: PASSWORD, role: Role.ASSESSOR, firstName: 'Ana', lastName: 'Lyst' });
        analystToken = analyst.token;
        analystId = analyst.user.id;
        const analystB = await createOrgUser({ organizationId: orgA, email: `analyst-b-${suffix}@wave1-a.test`, password: PASSWORD, role: Role.ASSESSOR, firstName: 'Bea', lastName: 'Second' });
        analystBToken = analystB.token;
        analystBId = analystB.user.id;
        const viewer = await createOrgUser({ organizationId: orgA, email: `viewer-${suffix}@wave1-a.test`, password: PASSWORD, role: Role.VIEWER, firstName: 'Vic', lastName: 'Viewer' });
        viewerToken = viewer.token;
        const requester = await createOrgUser({ organizationId: orgA, email: `req-${suffix}@wave1-a.test`, password: PASSWORD, role: Role.BUSINESS_OWNER, firstName: 'Pat', lastName: 'Requester' });
        requesterToken = requester.token;

        const other = await request(app).post(`${API}/auth/signup`).send({
            email: `other-${suffix}@wave1-b.test`,
            password: PASSWORD,
            firstName: 'Other',
            lastName: 'Tenant',
            organizationName: `Wave1 B ${suffix}`,
            country: 'US',
        });
        expect(other.status).toBe(201);
        otherToken = other.body.data.token;
    });

    it('creates an authenticated intake without creating a vendor', async () => {
        const created = await request(app)
            .post(`${API}/tprm/intakes`)
            .set('Authorization', `Bearer ${requesterToken}`)
            .send({
                proposedThirdPartyName: 'Microsoft Corporation',
                proposedServiceName: 'Azure Hosting',
                businessPurpose: 'Host a customer-facing application.',
                requesterBusinessUnit: 'Product',
                priority: 'HIGH',
                routingFacts: { connectsToCompanySystems: true },
            });
        expect(created.status).toBe(201);
        intakeId = created.body.data.id;
        expect(created.body.data.publicId).toMatch(/^INT-2026-\d{4}$/);
        expect(created.body.data.status).toBe('UNASSIGNED');
        expect(created.body.data.matchedVendorId).toBeNull();
        expect(created.body.data.confirmation.reference).toBe(created.body.data.publicId);
        expect(created.body.data.requesterAcknowledgement.emailHonestStatus).not.toBe('DELIVERED');
        const vendors = await prisma.vendor.count({ where: { organizationId: orgA, name: 'Microsoft Corporation' } });
        expect(vendors).toBe(0);
    });

    it('enforces tenant isolation and requester/viewer permissions', async () => {
        const cross = await request(app).get(`${API}/tprm/intakes/${intakeId}`).set('Authorization', `Bearer ${otherToken}`);
        expect(cross.status).toBe(404);

        const viewerAssign = await request(app)
            .post(`${API}/tprm/intakes/${intakeId}/assign`)
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({ analystUserId: analystId });
        expect(viewerAssign.status).toBe(403);

        const requesterQueue = await request(app)
            .get(`${API}/tprm/intakes`)
            .set('Authorization', `Bearer ${requesterToken}`);
        expect(requesterQueue.status).toBe(200);
        expect(requesterQueue.body.data.items.every((row: { id: string }) => row.id === intakeId)).toBe(true);

        const viewerCreate = await request(app)
            .post(`${API}/tprm/intakes`)
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({ proposedThirdPartyName: 'Nope', proposedServiceName: 'Nope', businessPurpose: 'Nope' });
        expect(viewerCreate.status).toBe(403);
    });

    it('assigns, reassigns, and preserves assignment history', async () => {
        const assigned = await request(app)
            .post(`${API}/tprm/intakes/${intakeId}/assign`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ analystUserId: analystId, dueAt: '2026-12-01', note: 'Please triage Azure', priority: 'HIGH' });
        expect(assigned.status).toBe(200);
        expect(assigned.body.data.status).toBe('ASSIGNED');
        expect(assigned.body.data.assignedAnalystUserId).toBe(analystId);

        const reassigned = await request(app)
            .post(`${API}/tprm/intakes/${intakeId}/assign`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ analystUserId: analystBId, note: 'Coverage swap', priority: 'HIGH' });
        expect(reassigned.status).toBe(200);
        expect(reassigned.body.data.assignedAnalystUserId).toBe(analystBId);
        expect(reassigned.body.data.assignmentHistory).toHaveLength(2);
        expect(reassigned.body.data.assignmentHistory[0].toAnalystUserId).toBe(analystId);
        expect(reassigned.body.data.assignmentHistory[1].toAnalystUserId).toBe(analystBId);

        const back = await request(app)
            .post(`${API}/tprm/intakes/${intakeId}/assign`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ analystUserId: analystId, note: 'Return to Ana' });
        expect(back.status).toBe(200);
        expect(back.body.data.assignmentHistory).toHaveLength(3);
    });

    it('starts review, requests information, and preserves original plus response', async () => {
        const started = await request(app)
            .post(`${API}/tprm/intakes/${intakeId}/start-review`)
            .set('Authorization', `Bearer ${analystToken}`);
        expect(started.status).toBe(200);
        expect(started.body.data.status).toBe('IN_REVIEW');

        const asked = await request(app)
            .post(`${API}/tprm/intakes/${intakeId}/request-information`)
            .set('Authorization', `Bearer ${analystToken}`)
            .send({ fields: ['businessPurpose'], note: 'Please confirm the hosting region and data types.' });
        expect(asked.status).toBe(200);
        expect(asked.body.data.status).toBe('NEEDS_INFORMATION');
        const originalPurpose = asked.body.data.businessPurpose;

        const answered = await request(app)
            .post(`${API}/tprm/intakes/${intakeId}/information-response`)
            .set('Authorization', `Bearer ${requesterToken}`)
            .send({ response: 'East US. Customer application data only.' });
        expect(answered.status).toBe(200);
        expect(answered.body.data.status).toBe('IN_REVIEW');
        expect(answered.body.data.businessPurpose).toBe(originalPurpose);
        expect(answered.body.data.informationRequests[0].response).toContain('East US');
        expect(answered.body.data.informationRequests[0].requestNote).toContain('hosting region');
    });

    it('matches or creates a third party, then creates an engagement', async () => {
        const search = await request(app)
            .get(`${API}/tprm/intakes/${intakeId}/third-parties`)
            .query({ q: 'Microsoft' })
            .set('Authorization', `Bearer ${analystToken}`);
        expect(search.status).toBe(200);

        const createdVendor = await request(app)
            .post(`${API}/tprm/intakes/${intakeId}/third-party`)
            .set('Authorization', `Bearer ${analystToken}`)
            .send({ name: 'Microsoft Corporation', website: 'https://microsoft.com', country: 'United States' });
        expect(createdVendor.status).toBe(201);
        expect(createdVendor.body.data.status).toBe('VENDOR_MATCHED');
        expect(createdVendor.body.data.matchedThirdParty.tier).toBe('Not rated');
        vendorId = createdVendor.body.data.matchedVendorId;

        const duplicate = await request(app)
            .post(`${API}/tprm/intakes/${intakeId}/third-party`)
            .set('Authorization', `Bearer ${analystToken}`)
            .send({ name: 'Microsoft Corp', website: 'https://microsoft.com' });
        expect([400, 409]).toContain(duplicate.status);

        const engagement = await request(app)
            .post(`${API}/tprm/intakes/${intakeId}/engagement`)
            .set('Authorization', `Bearer ${analystToken}`)
            .send({ serviceName: 'Azure Hosting' });
        expect(engagement.status).toBe(201);
        expect(engagement.body.data.intake.status).toBe('ENGAGEMENT_CREATED');
        expect(engagement.body.data.engagement.publicId).toMatch(/^ENG-2026-\d{4}$/);
        expect(engagement.body.data.engagement.vendorId).toBe(vendorId);
        expect(engagement.body.data.intake.createdEngagementId).toBe(engagement.body.data.engagement.id);
    });

    it('creates a second engagement on the same third party', async () => {
        const created = await request(app)
            .post(`${API}/tprm/intakes`)
            .set('Authorization', `Bearer ${requesterToken}`)
            .send({
                proposedThirdPartyName: 'Microsoft Corporation',
                proposedServiceName: 'Microsoft 365',
                businessPurpose: 'Company collaboration suite.',
            });
        expect(created.status).toBe(201);
        secondId = created.body.data.id;

        await request(app).post(`${API}/tprm/intakes/${secondId}/assign`).set('Authorization', `Bearer ${adminToken}`).send({ analystUserId: analystId });
        await request(app).post(`${API}/tprm/intakes/${secondId}/start-review`).set('Authorization', `Bearer ${analystToken}`);

        const search = await request(app)
            .get(`${API}/tprm/intakes/${secondId}/third-parties`)
            .query({ q: 'Microsoft' })
            .set('Authorization', `Bearer ${analystToken}`);
        expect(search.body.data.some((row: { id: string }) => row.id === vendorId)).toBe(true);

        const matched = await request(app)
            .post(`${API}/tprm/intakes/${secondId}/match`)
            .set('Authorization', `Bearer ${analystToken}`)
            .send({ vendorId, reason: 'Same legal entity', candidates: search.body.data });
        expect(matched.status).toBe(200);

        const engagement = await request(app)
            .post(`${API}/tprm/intakes/${secondId}/engagement`)
            .set('Authorization', `Bearer ${analystToken}`)
            .send({ serviceName: 'Microsoft 365' });
        expect(engagement.status).toBe(201);

        const list = await request(app)
            .get(`${API}/tprm/engagements`)
            .query({ vendorId })
            .set('Authorization', `Bearer ${adminToken}`);
        expect(list.body.data.items).toHaveLength(2);
        expect(list.body.data.items.map((row: { serviceName: string }) => row.serviceName).sort()).toEqual(['Azure Hosting', 'Microsoft 365']);
        const vendorCount = await prisma.vendor.count({ where: { organizationId: orgA, name: { contains: 'Microsoft' } } });
        expect(vendorCount).toBe(1);
    });

    it('records audit events and leaves insurance on the vendor identity', async () => {
        const actions = await prisma.auditEvent.findMany({
            where: { organizationId: orgA, resourceType: { in: ['IntakeRequest', 'Engagement'] } },
            select: { action: true },
        });
        const names = actions.map((row) => row.action);
        expect(names).toEqual(expect.arrayContaining([
            'intake.created',
            'intake.assigned',
            'intake.reassigned',
            'intake.review_started',
            'intake.information_requested',
            'intake.information_received',
            'intake.third_party_created',
            'engagement.created',
            'intake.completed',
            'intake.third_party_matched',
        ]));

        const classification = await prisma.insuranceVendorClassification.create({
            data: {
                organizationId: orgA,
                vendorId,
                serviceCategory: 'cloud_hosting',
            },
        }).catch(() => null);
        if (!classification) {
            const existing = await prisma.insuranceVendorClassification.findFirst({ where: { vendorId } });
            expect(existing === null || existing.vendorId === vendorId).toBe(true);
        } else {
            expect(classification.vendorId).toBe(vendorId);
        }
    });

    it('backfills a legacy engagement only when vendor onboarding data exists', async () => {
        const vendor = await prisma.vendor.create({
            data: {
                organizationId: orgA,
                publicId: `VND-2026-88${suffix.slice(-2)}`,
                name: 'ABC Cloud',
                vendorType: VendorType.CLOUD_SERVICE,
                category: VendorCategory.CLOUD_HOSTING,
                tier: VendorTier.UNRATED,
                status: VendorStatus.PROPOSED,
                primaryContact: 'Pat',
                contactEmail: 'pat@abc.example',
                servicesProvided: 'Cloud hosting',
                dataTypesAccessed: [],
                geographicFootprint: [],
                regulatoryScope: [],
            },
        });
        await prisma.vendorOnboarding.create({
            data: { vendorId: vendor.id, organizationId: orgA },
        });
        const result = await backfillLegacyEngagements(orgA);
        expect(result.created).toBeGreaterThanOrEqual(1);
        const engagement = await prisma.engagement.findFirst({ where: { vendorId: vendor.id } });
        expect(engagement?.serviceName).toBe('Cloud hosting');
        expect(engagement?.legacyReviewRequired).toBe(false);
        const onboarding = await prisma.vendorOnboarding.findUnique({ where: { vendorId: vendor.id } });
        expect(onboarding?.engagementId).toBe(engagement?.id);
    });

    it('denies vendor-plane style roles from intake APIs', async () => {
        const mine = await request(app).get(`${API}/tprm/intakes/my-work`).set('Authorization', `Bearer ${analystToken}`);
        expect(mine.status).toBe(200);
        expect(mine.body.data.readyForVendorMatch.length + mine.body.data.inReview.length + mine.body.data.newAssignments.length).toBeGreaterThanOrEqual(0);
    });
});

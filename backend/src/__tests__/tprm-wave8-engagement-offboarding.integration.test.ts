import request from 'supertest';
import { EngagementResidualStatus, EngagementStatus, Role, ScanStatus } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { createOrgUser } from './helpers/orgUser';

jest.setTimeout(180000);

const PASSWORD = 'Wave8Pass1x';
const API = '/api/v1';

describe('#12 Wave 8 engagement offboarding', () => {
    const suffix = `${Date.now()}`;
    let analystToken = '';
    let managerToken = '';
    let requesterToken = '';
    let otherTenantToken = '';
    let orgA = '';
    let vendorId = '';
    let azureId = '';
    let m365Id = '';
    let residualId = '';
    let evidenceId = '';
    let analystUserId = '';
    let managerUserId = '';

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `lead-${suffix}@wave8.test`,
            password: PASSWORD,
            firstName: 'Lea',
            lastName: 'Lead',
            organizationName: `Wave8 ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        orgA = signup.body.data.user.organizationId;
        managerUserId = signup.body.data.user.id;
        const analyst = await createOrgUser({ organizationId: orgA, email: `ana-${suffix}@wave8.test`, password: PASSWORD, role: Role.ASSESSOR, firstName: 'Ana', lastName: 'Lyst' });
        analystToken = analyst.token;
        analystUserId = analyst.user.id;
        const manager = await createOrgUser({ organizationId: orgA, email: `rm-${suffix}@wave8.test`, password: PASSWORD, role: Role.RISK_MANAGER, firstName: 'Riley', lastName: 'Manager' });
        managerToken = manager.token;
        const requester = await createOrgUser({ organizationId: orgA, email: `pat-${suffix}@wave8.test`, password: PASSWORD, role: Role.BUSINESS_OWNER, firstName: 'Pat', lastName: 'Requester' });
        requesterToken = requester.token;
        const tenant = await request(app).post(`${API}/auth/signup`).send({
            email: `other-${suffix}@wave8-b.test`,
            password: PASSWORD,
            firstName: 'Other',
            lastName: 'Tenant',
            organizationName: `Wave8 B ${suffix}`,
            country: 'US',
        });
        otherTenantToken = tenant.body.data.token;
        const vendor = await prisma.vendor.create({
            data: {
                organization: { connect: { id: orgA } },
                publicId: `VND-W8-${suffix}`,
                name: 'Microsoft Corporation QA',
                country: 'United States',
                vendorType: 'CLOUD_SERVICE',
                category: 'CLOUD_HOSTING',
                tier: 'CRITICAL',
                primaryContact: 'QA Contact',
                contactEmail: `vendor-${suffix}@wave8.test`,
                servicesProvided: 'Cloud hosting',
            },
        });
        vendorId = vendor.id;
        const azure = await prisma.engagement.create({
            data: {
                organization: { connect: { id: orgA } },
                vendor: { connect: { id: vendorId } },
                publicId: `ENG-W8-A-${suffix}`,
                serviceName: 'Azure Hosting QA',
                businessPurpose: 'Host a customer-facing application.',
                status: EngagementStatus.ACTIVE,
                assignedAnalystUserId: analystUserId,
                requesterUserId: requester.user.id,
            },
        });
        azureId = azure.id;
        const m365 = await prisma.engagement.create({
            data: {
                organization: { connect: { id: orgA } },
                vendor: { connect: { id: vendorId } },
                publicId: `ENG-W8-M-${suffix}`,
                serviceName: 'Microsoft 365 Collaboration QA',
                businessPurpose: 'Collaboration only.',
                status: EngagementStatus.ACTIVE,
                assignedAnalystUserId: analystUserId,
            },
        });
        m365Id = m365.id;
        const residual = await prisma.engagementResidualRiskAssessment.create({
            data: {
                organizationId: orgA,
                engagementId: azureId,
                vendorId,
                status: EngagementResidualStatus.CONFIRMED,
                inherentTier: 'CRITICAL',
                inherentScore: 58,
                inherentSource: 'EngagementIra.confirmedTier',
                methodologyVersion: 'supreme-risk-engagement-1.0.0',
                calculationVersion: 'engagement-1',
                residualScore: 58,
                residualBand: 'MEDIUM',
                explanation: 'Seeded MEDIUM 58 for Wave 8.',
            },
        });
        residualId = residual.id;
        await prisma.engagementMonitoringProfile.create({
            data: {
                organizationId: orgA,
                engagementId: azureId,
                vendorId,
                status: 'ACTIVE',
                whatMonitoring: 'Azure hosting controls',
                whyMonitoring: 'Material cloud dependency.',
                enabledDomains: ['CYBERSECURITY'],
                enabledSources: ['MANUAL_OBSERVATION'],
                createdByUserId: analystUserId,
                updatedByUserId: analystUserId,
            },
        });
        await prisma.engagementReassessment.create({
            data: {
                organizationId: orgA,
                engagementId: azureId,
                vendorId,
                publicId: `RAS-W8-${suffix}`,
                cycleNumber: 2,
                kind: 'TARGETED',
                triggerType: 'MATERIAL_SECURITY_INCIDENT',
                status: 'COMPLETED',
                scopeNote: 'Targeted Wave 7 cycle.',
                whyReassessing: 'Authorized Wave 7 recommendation.',
                priorIraSnapshot: {},
                decision: 'TERMINATION_RECOMMENDED',
                decisionRationale: 'Authorized Wave 7 recommendation. Wave 8 requires a separate decision.',
                wave8Started: false,
                startedByUserId: analystUserId,
            },
        });
        evidenceId = (await prisma.storedObject.create({
            data: {
                organizationId: orgA,
                ownerType: 'organization',
                ownerId: orgA,
                filename: `offboard-${suffix}.pdf`,
                storageKey: `${orgA}/offboard-${suffix}.pdf`,
                contentType: 'application/pdf',
                size: 20,
                checksum: 'wave8-clean',
                uploadedBy: analystUserId,
                scanStatus: ScanStatus.CLEAN,
            },
        })).id;
    });

    it('creates an Engagement case without touching M365 or rewriting residual', async () => {
        const unauth = await request(app).get(`${API}/tprm/engagements/${azureId}/offboarding`);
        expect(unauth.status).toBe(401);
        const other = await request(app).post(`${API}/tprm/engagements/${azureId}/offboarding`).set('Authorization', `Bearer ${otherTenantToken}`).send({ reason: 'Cross-tenant' });
        expect([403, 404]).toContain(other.status);
        const requesterDenied = await request(app).post(`${API}/tprm/engagements/${azureId}/offboarding`).set('Authorization', `Bearer ${requesterToken}`).send({ reason: 'Requester cannot start.' });
        expect(requesterDenied.status).toBe(403);
        const created = await request(app).post(`${API}/tprm/engagements/${azureId}/offboarding`).set('Authorization', `Bearer ${analystToken}`).send({
            reason: 'Azure hosting is being replaced. Microsoft 365 remains in use.',
            effectiveTerminationDate: '2026-10-01',
        });
        expect([200, 201]).toContain(created.status);
        expect(created.body.data.engagement.status).toBe('OFFBOARDING');
        expect(created.body.data.active.publicId).toMatch(/^OFF-/);
        expect(created.body.data.historicalResidual.residualScore).toBe(58);
        expect(created.body.data.thirdPartyAggregate.honesty).toMatch(/Microsoft 365/);
        const duplicate = await request(app).post(`${API}/tprm/engagements/${azureId}/offboarding`).set('Authorization', `Bearer ${analystToken}`).send({ reason: 'Second case' });
        expect(duplicate.status).toBe(409);
        const m365 = await request(app).get(`${API}/tprm/engagements/${m365Id}/offboarding`).set('Authorization', `Bearer ${analystToken}`);
        expect(m365.status).toBe(200);
        expect(m365.body.data.active).toBeNull();
        expect(m365.body.data.engagement.status).toBe('ACTIVE');
        const historical = await prisma.engagementResidualRiskAssessment.findUnique({ where: { id: residualId } });
        expect(historical?.residualScore).toBe(58);
        expect(historical?.residualBand).toBe('MEDIUM');
    });

    it('blocks early closure, then completes Azure only after authorized lead approval', async () => {
        await request(app).post(`${API}/tprm/engagements/${azureId}/offboarding/start`).set('Authorization', `Bearer ${analystToken}`).send({});
        const categories = ['BUSINESS_TRANSITION', 'ACCESS_REVOCATION', 'INTEGRATION_CLOSURE', 'DATA_DELETION', 'CONTRACT_NOTICE'];
        const createdIds: string[] = [];
        for (const category of categories) {
            const added = await request(app).post(`${API}/tprm/engagements/${azureId}/offboarding/obligations`).set('Authorization', `Bearer ${analystToken}`).send({
                category,
                mandatory: true,
            });
            expect([200, 201]).toContain(added.status);
            const row = added.body.data.obligations.find((item: any) => item.category === category);
            createdIds.push(row.id);
        }
        const early = await request(app).post(`${API}/tprm/engagements/${azureId}/offboarding/complete`).set('Authorization', `Bearer ${managerToken}`).send({});
        expect(early.status).toBe(409);
        expect(early.body.error.message).toMatch(/outstanding|not verified|not recorded|incomplete/i);
        const requesterView = await request(app).get(`${API}/tprm/engagements/${azureId}/offboarding`).set('Authorization', `Bearer ${requesterToken}`);
        expect(requesterView.status).toBe(200);
        expect(requesterView.body.data.experience).toBe('requester');
        expect(JSON.stringify(requesterView.body.data)).not.toMatch(/TERMINATION_RECOMMENDED|residualScore/);
        const requesterComplete = await request(app).post(`${API}/tprm/engagements/${azureId}/offboarding/obligations/${createdIds[0]}`).set('Authorization', `Bearer ${requesterToken}`).send({
            status: 'COMPLETED',
            internalVerification: 'Replacement service is live.',
        });
        expect(requesterComplete.status).toBe(200);
        for (const obligationId of createdIds.slice(1)) {
            await request(app).post(`${API}/tprm/engagements/${azureId}/offboarding/obligations/${obligationId}`).set('Authorization', `Bearer ${analystToken}`).send({
                status: 'COMPLETED',
                internalVerification: 'Manual verification recorded. No connected IAM or deletion integration confirmed this action.',
            });
        }
        await request(app).post(`${API}/tprm/engagements/${azureId}/offboarding/evidence`).set('Authorization', `Bearer ${analystToken}`).send({
            obligationId: createdIds[3],
            storedObjectId: evidenceId,
        });
        const analystSelf = await request(app).post(`${API}/tprm/engagements/${azureId}/offboarding/complete`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(analystSelf.status).toBe(403);
        expect(analystSelf.body.error.message).toMatch(/do not have permission to approve final closure/i);
        const gate = await request(app).post(`${API}/tprm/engagements/${azureId}/offboarding/evaluate-gate`).set('Authorization', `Bearer ${analystToken}`).send({});
        expect(gate.status).toBe(200);
        expect(gate.body.data.gate.ready).toBe(true);
        const closed = await request(app).post(`${API}/tprm/engagements/${azureId}/offboarding/complete`).set('Authorization', `Bearer ${managerToken}`).send({});
        expect(closed.status).toBe(200);
        expect(closed.body.data.engagement.status).toBe('OFFBOARDED');
        expect(closed.body.data.dispositions[0].snapshot.historicalResidual.residualScore).toBe(58);
        const azure = await prisma.engagement.findUnique({ where: { id: azureId } });
        const m365 = await prisma.engagement.findUnique({ where: { id: m365Id } });
        const residual = await prisma.engagementResidualRiskAssessment.findUnique({ where: { id: residualId } });
        const monitoring = await prisma.engagementMonitoringProfile.findFirst({ where: { engagementId: azureId } });
        expect(azure?.status).toBe(EngagementStatus.OFFBOARDED);
        expect(m365?.status).toBe(EngagementStatus.ACTIVE);
        expect(residual?.residualScore).toBe(58);
        expect(monitoring?.status).toBe('RETIRED');
        const reopen = await request(app).post(`${API}/tprm/engagements/${azureId}/offboarding`).set('Authorization', `Bearer ${analystToken}`).send({ reason: 'Reopen' });
        expect(reopen.status).toBe(409);
        expect(reopen.body.error.message).toMatch(/new Engagement/);
        const audits = await prisma.auditEvent.findMany({ where: { organizationId: orgA, action: { startsWith: 'offboarding.' } } });
        expect(audits.map((row) => row.action)).toEqual(expect.arrayContaining([
            'offboarding.created',
            'offboarding.started',
            'offboarding.obligation.created',
            'offboarding.evidence.linked',
            'offboarding.closure_gate.evaluated',
            'offboarding.completed',
        ]));
        const unused = managerUserId;
        expect(unused).toBeTruthy();
    });
});

import request from 'supertest';
import { EngagementResidualStatus, EngagementStatus, Role, VendorIssueStatus } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { createOrgUser } from './helpers/orgUser';

jest.setTimeout(180000);

const PASSWORD = 'Wave6Pass1x';
const API = '/api/v1';

describe('#12 Wave 6 engagement monitoring', () => {
    const suffix = `${Date.now()}`;
    let adminToken = '';
    let analystToken = '';
    let managerToken = '';
    let requesterToken = '';
    let otherTenantToken = '';
    let analystId = '';
    let managerId = '';
    let orgA = '';
    let vendorId = '';
    let azureId = '';
    let m365Id = '';
    let residualBefore: { residualBand: string | null; residualScore: number | null } | null = null;
    let signalId = '';
    let tpSignalId = '';

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `lead-${suffix}@wave6.test`,
            password: PASSWORD,
            firstName: 'Lea',
            lastName: 'Lead',
            organizationName: `Wave6 ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        adminToken = signup.body.data.token;
        orgA = signup.body.data.user.organizationId;
        const analyst = await createOrgUser({ organizationId: orgA, email: `ana-${suffix}@wave6.test`, password: PASSWORD, role: Role.ASSESSOR, firstName: 'Ana', lastName: 'Lyst' });
        analystToken = analyst.token;
        analystId = analyst.user.id;
        const manager = await createOrgUser({ organizationId: orgA, email: `rm-${suffix}@wave6.test`, password: PASSWORD, role: Role.RISK_MANAGER, firstName: 'Riley', lastName: 'Manager' });
        managerToken = manager.token;
        managerId = manager.user.id;
        const requester = await createOrgUser({ organizationId: orgA, email: `pat-${suffix}@wave6.test`, password: PASSWORD, role: Role.BUSINESS_OWNER, firstName: 'Pat', lastName: 'Requester' });
        requesterToken = requester.token;
        const tenant = await request(app).post(`${API}/auth/signup`).send({
            email: `other-${suffix}@wave6-b.test`,
            password: PASSWORD,
            firstName: 'Other',
            lastName: 'Tenant',
            organizationName: `Wave6 B ${suffix}`,
            country: 'US',
        });
        otherTenantToken = tenant.body.data.token;
        const vendor = await prisma.vendor.create({
            data: {
                organization: { connect: { id: orgA } },
                publicId: `VND-W6-${suffix}`,
                name: 'Microsoft Corporation QA',
                country: 'United States',
                vendorType: 'CLOUD_SERVICE',
                category: 'CLOUD_HOSTING',
                tier: 'CRITICAL',
                primaryContact: 'QA Contact',
                contactEmail: `vendor-${suffix}@wave6.test`,
                servicesProvided: 'Cloud hosting',
            },
        });
        vendorId = vendor.id;
        const azure = await prisma.engagement.create({
            data: {
                organization: { connect: { id: orgA } },
                vendor: { connect: { id: vendorId } },
                publicId: `ENG-W6-A-${suffix}`,
                serviceName: 'Azure Hosting QA',
                businessPurpose: 'Host a customer-facing application.',
                status: EngagementStatus.ACTIVE,
                assignedAnalystUserId: analystId,
            },
        });
        azureId = azure.id;
        const m365 = await prisma.engagement.create({
            data: {
                organization: { connect: { id: orgA } },
                vendor: { connect: { id: vendorId } },
                publicId: `ENG-W6-M-${suffix}`,
                serviceName: 'Microsoft 365 Collaboration QA',
                businessPurpose: 'Collaboration only.',
                status: EngagementStatus.DUE_DILIGENCE_PLANNING,
                assignedAnalystUserId: analystId,
            },
        });
        m365Id = m365.id;
        await prisma.engagementResidualRiskAssessment.create({
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
                explanation: 'Seeded MEDIUM 58 for Wave 6.',
            },
        });
        await prisma.engagementControlEffectiveness.create({
            data: {
                organizationId: orgA,
                engagementId: azureId,
                vendorId,
                controlId: `ctl-${suffix}`,
                controlKey: 'GOVERNANCE',
                controlTitle: 'Governance',
                domain: 'Governance',
                rating: 'PARTIALLY_EFFECTIVE',
                rationale: 'Partial coverage remains.',
            },
        });
        residualBefore = { residualBand: 'MEDIUM', residualScore: 58 };
    });

    it('keeps the profile on the Engagement and does not auto-create monitoring', async () => {
        const workspace = await request(app).get(`${API}/tprm/engagements/${azureId}/monitoring`).set('Authorization', `Bearer ${analystToken}`);
        expect(workspace.status).toBe(200);
        expect(workspace.body.data.profile).toBeNull();
        expect(workspace.body.data.nextAction).toMatch(/Configure monitoring profile/);
        expect(workspace.body.data.sourceHealth.some((row: any) => row.label === 'BitSight' && row.status === 'NOT_CONFIGURED')).toBe(true);
        const requesterDenied = await request(app).get(`${API}/tprm/engagements/${azureId}/monitoring`).set('Authorization', `Bearer ${requesterToken}`);
        expect(requesterDenied.status).toBe(403);
        const otherDenied = await request(app).get(`${API}/tprm/engagements/${azureId}/monitoring`).set('Authorization', `Bearer ${otherTenantToken}`);
        expect(otherDenied.status).toBe(404);
    });

    it('activates a profile, records an Azure signal, and leaves M365 unchanged', async () => {
        const analystProfile = await request(app).post(`${API}/tprm/engagements/${azureId}/monitoring/profile`).set('Authorization', `Bearer ${analystToken}`).send({
            whatMonitoring: 'Azure hosting security and privileged access.',
            whyMonitoring: 'Confirmed critical hosting Engagement.',
            enabledDomains: ['CYBERSECURITY', 'OPERATIONAL_RESILIENCE'],
            activate: true,
        });
        expect(analystProfile.status).toBe(403);
        const saved = await request(app).post(`${API}/tprm/engagements/${azureId}/monitoring/profile`).set('Authorization', `Bearer ${managerToken}`).send({
            whatMonitoring: 'Azure hosting security and privileged access.',
            whyMonitoring: 'Confirmed critical hosting Engagement.',
            enabledDomains: ['CYBERSECURITY', 'OPERATIONAL_RESILIENCE'],
            enabledSources: ['MANUAL_OBSERVATION', 'INTERNAL_REVIEW'],
            activate: true,
        });
        expect(saved.status).toBe(200);
        expect(saved.body.data.profile.status).toBe('ACTIVE');
        const created = await request(app).post(`${API}/tprm/monitoring/signals/manual`).set('Authorization', `Bearer ${analystToken}`).send({
            vendorId,
            engagementId: azureId,
            sourceType: 'MANUAL_OBSERVATION',
            domain: 'CYBERSECURITY',
            title: 'Privileged access review overdue',
            summary: 'Hosting owner reported the monthly privileged-access review is overdue.',
            rationale: 'Recorded from Azure engagement review.',
            sourceSeverity: 'HIGH',
        });
        expect(created.status).toBe(201);
        signalId = created.body.data.id;
        expect(created.body.data.attentionPriority).toBe('HIGH');
        expect(created.body.data.normalizationExplanation).toMatch(/not residual risk/);
        const inbox = await request(app).get(`${API}/tprm/monitoring/signals`).set('Authorization', `Bearer ${analystToken}`);
        expect(inbox.status).toBe(200);
        expect(inbox.body.data.signals.some((row: any) => row.id === signalId)).toBe(true);
        const again = await request(app).post(`${API}/tprm/monitoring/signals/manual`).set('Authorization', `Bearer ${analystToken}`).send({
            vendorId,
            engagementId: azureId,
            sourceType: 'MANUAL_OBSERVATION',
            domain: 'CYBERSECURITY',
            title: 'Privileged access review overdue',
            summary: 'Hosting owner reported the monthly privileged-access review is overdue.',
            sourceSeverity: 'HIGH',
            sourceRecordRef: created.body.data.sourceRecordRef,
            signalType: created.body.data.signalType,
        });
        expect(again.status).toBe(201);
        expect(again.body.data.id).toBe(signalId);
        const m365Workspace = await request(app).get(`${API}/tprm/engagements/${m365Id}/monitoring`).set('Authorization', `Bearer ${analystToken}`);
        expect(m365Workspace.status).toBe(200);
        expect(m365Workspace.body.data.signals).toHaveLength(0);
        expect(m365Workspace.body.data.profile).toBeNull();
        const residual = await prisma.engagementResidualRiskAssessment.findFirst({ where: { engagementId: azureId }, orderBy: { createdAt: 'desc' } });
        expect(residual?.residualBand).toBe(residualBefore?.residualBand);
        expect(residual?.residualScore).toBe(residualBefore?.residualScore);
        const azure = await prisma.engagement.findUnique({ where: { id: azureId } });
        expect(azure?.status).toBe(EngagementStatus.ACTIVE);
    });

    it('triages, escalates, creates a Finding only from review, and recommends reassessment without starting Wave 7', async () => {
        const assigned = await request(app).post(`${API}/tprm/monitoring/signals/${signalId}/assign`).set('Authorization', `Bearer ${analystToken}`).send({ ownerUserId: analystId });
        expect(assigned.status).toBe(200);
        await request(app).post(`${API}/tprm/monitoring/signals/${signalId}/impact`).set('Authorization', `Bearer ${analystToken}`).send({ engagementId: azureId, decision: 'AFFECTED', rationale: 'Signal is about Azure hosting.' });
        const triage = await request(app).post(`${API}/tprm/monitoring/signals/${signalId}/triage`).set('Authorization', `Bearer ${analystToken}`).send({
            decision: 'ACTION_REQUIRED',
            rationale: 'Privileged access review is material to the Azure Engagement.',
            materiality: 'Material for attention because the source is HIGH and the Engagement is CRITICAL.',
            engagementId: azureId,
        });
        expect(triage.status).toBe(200);
        const findingTooSoon = await request(app).post(`${API}/tprm/monitoring/signals/${signalId}/finding`).set('Authorization', `Bearer ${analystToken}`).send({ engagementId: azureId });
        expect([200, 201, 409]).toContain(findingTooSoon.status);
        const finding = await request(app).post(`${API}/tprm/monitoring/signals/${signalId}/finding`).set('Authorization', `Bearer ${analystToken}`).send({
            engagementId: azureId,
            rationale: 'Reviewed signal warrants a Finding. Residual is not recalculated.',
        });
        expect(finding.status).toBe(201);
        expect(finding.body.data.finding.sourceSignalId).toBe(signalId);
        expect(finding.body.data.residualAfter.residualBand).toBe('MEDIUM');
        expect(finding.body.data.residualAfter.residualScore).toBe(58);
        expect(finding.body.data.controlsAfter[0].rating).toBe('PARTIALLY_EFFECTIVE');
        const escalate = await request(app).post(`${API}/tprm/monitoring/signals/${signalId}/escalate`).set('Authorization', `Bearer ${managerToken}`).send({
            toUserId: managerId,
            reason: 'Needs risk-owner review. Escalation does not change residual.',
            engagementId: azureId,
        });
        expect(escalate.status).toBe(200);
        const recommend = await request(app).post(`${API}/tprm/monitoring/signals/${signalId}/recommend-reassessment`).set('Authorization', `Bearer ${analystToken}`).send({
            engagementId: azureId,
            reason: 'Material privileged-access lapse should be reassessed in Wave 7.',
            recommendedScope: 'Engagement residual and due diligence',
            triggerType: 'MATERIAL_SECURITY_INCIDENT',
        });
        expect(recommend.status).toBe(201);
        expect(recommend.body.data.wave7Started).toBe(false);
        expect(recommend.body.data.newIraCreated).toBe(false);
        const iraCount = await prisma.engagementIra.count({ where: { engagementId: azureId } });
        expect(iraCount).toBe(0);
        const residual = await prisma.engagementResidualRiskAssessment.findFirst({ where: { engagementId: azureId }, orderBy: { createdAt: 'desc' } });
        expect(residual?.residualScore).toBe(58);
        const azure = await prisma.engagement.findUnique({ where: { id: azureId } });
        expect(azure?.status).toBe(EngagementStatus.ACTIVE);
    });

    it('keeps Third Party-level relevance decisions independent', async () => {
        await prisma.engagement.update({ where: { id: m365Id }, data: { status: EngagementStatus.ACTIVE } });
        const created = await request(app).post(`${API}/tprm/monitoring/signals/manual`).set('Authorization', `Bearer ${analystToken}`).send({
            vendorId,
            thirdPartyLevel: true,
            sourceType: 'VENDOR_NOTIFICATION',
            domain: 'CYBERSECURITY',
            title: 'Microsoft-wide security bulletin',
            summary: 'Vendor notified a firm-wide security bulletin.',
            rationale: 'Third Party observation.',
            sourceSeverity: 'MEDIUM',
            sourceRecordRef: `ms-bulletin-${suffix}`,
            signalType: 'VENDOR_BULLETIN',
        });
        expect(created.status).toBe(201);
        tpSignalId = created.body.data.id;
        expect(created.body.data.impacts).toEqual(expect.arrayContaining([
            expect.objectContaining({ engagementId: azureId, decision: 'NEEDS_REVIEW' }),
            expect.objectContaining({ engagementId: m365Id, decision: 'NEEDS_REVIEW' }),
        ]));
        await request(app).post(`${API}/tprm/monitoring/signals/${tpSignalId}/impact`).set('Authorization', `Bearer ${analystToken}`).send({ engagementId: azureId, decision: 'AFFECTED', rationale: 'Azure hosting is in scope.' });
        await request(app).post(`${API}/tprm/monitoring/signals/${tpSignalId}/impact`).set('Authorization', `Bearer ${analystToken}`).send({ engagementId: m365Id, decision: 'NOT_AFFECTED', rationale: 'Collaboration service is out of scope for this bulletin.' });
        const detail = await request(app).get(`${API}/tprm/monitoring/signals/${tpSignalId}`).set('Authorization', `Bearer ${analystToken}`);
        const byEngagement = Object.fromEntries(detail.body.data.impacts.map((row: any) => [row.engagementId, row.decision]));
        expect(byEngagement[azureId]).toBe('AFFECTED');
        expect(byEngagement[m365Id]).toBe('NOT_AFFECTED');
        const audits = await prisma.auditEvent.findMany({ where: { organizationId: orgA, action: { startsWith: 'monitoring.' } } });
        expect(audits.map((row) => row.action)).toEqual(expect.arrayContaining([
            'monitoring.profile.created',
            'monitoring.profile.activated',
            'monitoring.signal.created',
            'monitoring.signal.assigned',
            'monitoring.signal.triaged',
            'monitoring.signal.escalated',
            'monitoring.finding.created_from_signal',
            'monitoring.reassessment_recommended',
        ]));
        expect(await prisma.vendorIssue.count({ where: { organizationId: orgA, engagementId: azureId, status: VendorIssueStatus.OPEN } })).toBeGreaterThan(0);
    });
});

import request from 'supertest';
import { IssueSource, Role, VendorTier } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { hashPassword } from '../services/passwordService';
import { displayTitleFor, nextAction, observedAnswer, sourceKindFor, whyFinding } from '../findings/findingWorkspace';

jest.setTimeout(60000);

describe('Finding workspace helpers', () => {
    it('builds a distinguishable title and preserves no-response honesty', () => {
        const issue = {
            title: 'Response needs review: Is a personal-data breach notification process defined?',
            description: 'No response recorded. Supreme drafted this from the submitted answer.',
            status: 'OPEN',
            category: 'Privacy',
            assessmentId: 'a1',
            draftRuleCode: 'required_control_no',
            source: IssueSource.INTERNAL_ASSESSMENT,
        };
        expect(displayTitleFor(issue)).toMatch(/Privacy — /);
        expect(displayTitleFor(issue)).not.toMatch(/^Response needs review/);
        expect(observedAnswer(issue)).toEqual({ label: 'No response recorded', recorded: false });
        expect(whyFinding(issue)).toMatch(/not Yes/);
        expect(sourceKindFor(issue)).toBe('PRIVACY');
    });

    it('does not treat missing evidence as a control failure in the reason', () => {
        const reason = whyFinding({
            title: 'Evidence still required: Policy',
            status: 'OPEN',
            draftRuleCode: 'required_evidence_missing',
            assessmentId: 'a1',
        });
        expect(reason).toMatch(/not a control failure/i);
    });

    it('surfaces one primary next action', () => {
        expect(nextAction({ title: 'x', status: 'OPEN' }).primary).toBe('plan');
        expect(nextAction({ title: 'x', status: 'IN_PROGRESS', correctiveActionPlan: 'Patch MFA' }).primary).toBe('await');
        expect(nextAction({ title: 'x', status: 'PENDING_VALIDATION', evidenceUrl: 'obj' }).primary).toBe('verify');
        expect(nextAction({ title: 'x', status: 'RESOLVED', validatedAt: new Date() }).primary).toBe('close');
        expect(nextAction({ title: 'x', status: 'CLOSED' }).primary).toBe('none');
    });
});

describe('Finding workspace API', () => {
    it('returns source, observed answer, related records, and requires verification notes', async () => {
        const suffix = `${Date.now()}`;
        const org = await prisma.organization.create({ data: { name: `FindWs ${suffix}`, country: 'US' } });
        const password = await hashPassword('ValidPass1x');
        const admin = await prisma.user.create({
            data: { email: `findws-${suffix}@a.test`, hashedPassword: password, firstName: 'Fay', lastName: 'Find', role: Role.ORGANIZATION_ADMIN, organizationId: org.id },
        });
        const vendor = await prisma.vendor.create({
            data: {
                organizationId: org.id,
                name: `Acme ${suffix}`,
                vendorType: 'SAAS',
                category: 'CLOUD_HOSTING',
                tier: VendorTier.HIGH,
                primaryContact: 'Pat',
                contactEmail: `acme-${suffix}@t.test`,
                servicesProvided: 'Hosting',
            },
        });
        const login = await request(app).post('/api/v1/auth/login').send({ email: admin.email, password: 'ValidPass1x', plane: 'CUSTOMER' });
        expect(login.status).toBe(200);
        const token = login.body.data.token;

        const created = await request(app).post(`/api/v1/tprm/vendors/${vendor.id}/findings`).set('Authorization', `Bearer ${token}`).send({
            title: 'Access review not demonstrated',
            description: 'Quarterly access review is not recorded for privileged accounts.',
            severity: 'HIGH',
            responsibility: 'INTERNAL',
        });
        expect(created.status).toBe(201);
        const id = created.body.data.id;

        const workspace = await request(app).get(`/api/v1/tprm/findings/${id}/workspace`).set('Authorization', `Bearer ${token}`);
        expect(workspace.status).toBe(200);
        expect(workspace.body.data.source.label).toMatch(/Manual finding/i);
        expect(workspace.body.data.observed.answer).toMatch(/Quarterly access review/i);
        expect(workspace.body.data.related.some((row: { type: string }) => row.type === 'Vendor')).toBe(true);
        expect(workspace.body.data.nextAction.primary).toBe('plan');
        expect(JSON.stringify(workspace.body.data)).not.toMatch(/100%/);

        const noNotes = await request(app).post(`/api/v1/tprm/findings/${id}/validate`).set('Authorization', `Bearer ${token}`).send({ approved: true });
        expect(noNotes.status).toBe(400);

        const other = await prisma.organization.create({ data: { name: `FindWs B ${suffix}`, country: 'US' } });
        const otherAdmin = await prisma.user.create({
            data: { email: `findws-b-${suffix}@b.test`, hashedPassword: password, firstName: 'Bea', lastName: 'Find', role: Role.ORGANIZATION_ADMIN, organizationId: other.id },
        });
        const otherLogin = await request(app).post('/api/v1/auth/login').send({ email: otherAdmin.email, password: 'ValidPass1x', plane: 'CUSTOMER' });
        const leaked = await request(app).get(`/api/v1/tprm/findings/${id}/workspace`).set('Authorization', `Bearer ${otherLogin.body.data.token}`);
        expect([403, 404]).toContain(leaked.status);
    });
});

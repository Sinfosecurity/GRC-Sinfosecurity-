import request from 'supertest';
import { Role, UserAccountStatus, VendorType, VendorTier } from '@prisma/client';
import vendorManagementService from '../services/vendorManagementService';
import { app } from '../server';
import { prisma } from '../config/database';
import { authService } from '../services/authService';
import { identityUserService } from '../services/identityUserService';
import { csvEscape, neutralizeSpreadsheetValue } from '../security/spreadsheetSafe';
import { assertSafeAppReturnUrl } from '../security/safeReturnUrl';
import { sanitizeHeaderValue } from '../security/headerSanitize';
import { ApiError } from '../middleware/errorHandler';

jest.setTimeout(60000);

const API = '/api/v1';
const PASSWORD = 'SecurityPass1x';

async function signup(suffix: string, name: string) {
    const response = await request(app).post(`${API}/auth/signup`).send({
        email: `${name}-${suffix}@sec9.test`,
        password: PASSWORD,
        firstName: name,
        lastName: 'User',
        organizationName: `${name} Org ${suffix}`,
        country: 'US',
    });
    expect(response.status).toBe(201);
    return {
        token: response.body.data.token as string,
        userId: response.body.data.user.id as string,
        orgId: response.body.data.user.organizationId as string,
        email: `${name}-${suffix}@sec9.test`,
    };
}

describe('spreadsheet and header hardening', () => {
    it('neutralizes CSV/XLSX formula prefixes', () => {
        expect(neutralizeSpreadsheetValue('=cmd|"/c calc"!A0')).toBe("'=cmd|\"/c calc\"!A0");
        expect(neutralizeSpreadsheetValue('+1+1')).toBe("'+1+1");
        expect(neutralizeSpreadsheetValue('-2+3')).toBe("'-2+3");
        expect(neutralizeSpreadsheetValue('@SUM(A1)')).toBe("'@SUM(A1)");
        expect(csvEscape('=HYPERLINK("http://evil","x")')).toBe(`"'=HYPERLINK(""http://evil"",""x"")"`);
        expect(csvEscape('Acme Vendor')).toBe('Acme Vendor');
    });

    it('strips CR/LF from SMTP header values', () => {
        expect(sanitizeHeaderValue('Hello\r\nBcc: attacker@evil.test')).toBe('Hello Bcc: attacker@evil.test');
    });

    it('rejects hostile billing return URLs', () => {
        process.env.FRONTEND_URL = 'http://localhost:3000';
        process.env.CORS_ORIGIN = 'http://localhost:3000';
        expect(assertSafeAppReturnUrl(undefined, '/billing')).toContain('/billing');
        expect(() => assertSafeAppReturnUrl('https://evil.example/phish', '/billing')).toThrow(ApiError);
        expect(() => assertSafeAppReturnUrl('javascript:alert(1)', '/billing')).toThrow(ApiError);
    });
});

describe('#9 final security review regressions', () => {
    const suffix = `${Date.now()}`;

    it('does not expose in-memory task/workflow/report maps or static uploads', async () => {
        const user = await signup(suffix, 'iso');
        const tasks = await request(app).get(`${API}/tasks`).set('Authorization', `Bearer ${user.token}`);
        const workflows = await request(app).get(`${API}/workflows`).set('Authorization', `Bearer ${user.token}`);
        const reports = await request(app).get(`${API}/reports`).set('Authorization', `Bearer ${user.token}`);
        const uploads = await request(app).get('/uploads/anything.pdf');
        expect(tasks.status).toBe(404);
        expect(workflows.status).toBe(404);
        expect(reports.status).toBe(404);
        expect(uploads.status).toBe(404);
    });

    it('hides metrics without METRICS_TOKEN', async () => {
        delete process.env.METRICS_TOKEN;
        const open = await request(app).get('/metrics');
        expect(open.status).toBe(404);
        process.env.METRICS_TOKEN = 'metrics-review-token';
        const denied = await request(app).get('/metrics').set('Authorization', 'Bearer wrong');
        expect(denied.status).toBe(404);
        const allowed = await request(app).get('/metrics').set('Authorization', 'Bearer metrics-review-token');
        expect(allowed.status).not.toBe(401);
        expect(allowed.status).not.toBe(403);
        delete process.env.METRICS_TOKEN;
    });

    it('rejects checkout success URLs that are not first-party', async () => {
        const user = await signup(`${suffix}-bill`, 'bill');
        const hostile = await request(app)
            .post(`${API}/billing/checkout`)
            .set('Authorization', `Bearer ${user.token}`)
            .send({
                plan: 'PROFESSIONAL',
                successUrl: 'https://evil.example/steal',
                cancelUrl: 'https://evil.example/cancel',
            });
        expect([400, 503]).toContain(hostile.status);
        if (hostile.status === 400) {
            expect(JSON.stringify(hostile.body)).toMatch(/Return URL is not allowed/i);
        }
    });

    it('invalidates access tokens after password change', async () => {
        const user = await signup(`${suffix}-pwd`, 'pwd');
        await new Promise((resolve) => setTimeout(resolve, 1100));
        const changed = await request(app)
            .post(`${API}/auth/change-password`)
            .set('Authorization', `Bearer ${user.token}`)
            .send({ currentPassword: PASSWORD, newPassword: 'SecurityPass2x' });
        expect(changed.status).toBe(200);
        const me = await request(app).get(`${API}/auth/me`).set('Authorization', `Bearer ${user.token}`);
        expect(me.status).toBe(401);
    });

    it('refuses password reset for disabled accounts', async () => {
        const admin = await signup(`${suffix}-dis`, 'dis');
        const requested = await authService.requestPasswordReset(admin.email);
        expect(requested.resetToken).toBeTruthy();
        await prisma.user.update({
            where: { id: admin.userId },
            data: { status: UserAccountStatus.DISABLED, disabledAt: new Date() },
        });
        await expect(authService.resetPassword(requested.resetToken as string, 'SecurityPass3x')).rejects.toMatchObject({
            statusCode: 400,
        });
        const still = await prisma.user.findUnique({ where: { id: admin.userId } });
        expect(still?.status).toBe(UserAccountStatus.DISABLED);
    });

    it('blocks removal of the last organization administrator', async () => {
        const admin = await signup(`${suffix}-last`, 'last');
        const viewer = await prisma.user.create({
            data: {
                email: `viewer-${suffix}-last@sec9.test`,
                hashedPassword: 'x',
                firstName: 'View',
                lastName: 'Er',
                role: Role.VIEWER,
                organizationId: admin.orgId,
                status: UserAccountStatus.ACTIVE,
            },
        });
        await expect(
            identityUserService.updateRole(admin.userId, admin.orgId, Role.VIEWER, viewer.id, Role.ORGANIZATION_ADMIN)
        ).rejects.toMatchObject({ statusCode: 403 });
        await expect(
            identityUserService.setDisabled(admin.userId, admin.orgId, true, viewer.id, Role.ORGANIZATION_ADMIN)
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('binds break-glass incidents to the target organization', async () => {
        const tenantA = await signup(`${suffix}-bga`, 'bga');
        const tenantB = await signup(`${suffix}-bgb`, 'bgb');
        const owner = await signup(`${suffix}-bgo`, 'bgo');
        await prisma.user.update({ where: { id: owner.userId }, data: { role: Role.PLATFORM_OWNER } });
        const incident = await prisma.platformIncident.create({
            data: {
                title: 'Org A only',
                severity: 'P2',
                summary: 'Scoped incident',
                organizations: { create: [{ organizationId: tenantA.orgId }] },
            },
        });
        const { supportAccessService } = await import('../services/supportAccessService');
        await expect(
            supportAccessService.requestBreakGlass({
                actorUserId: owner.userId,
                role: Role.SUPPORT_ADMIN,
                organizationId: tenantB.orgId,
                incidentId: incident.id,
                reason: 'Wrong tenant',
            })
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('escapes formula-bearing vendor names in tenant CSV exports', async () => {
        const user = await signup(`${suffix}-csv`, 'csv');
        await vendorManagementService.createVendor({
            organizationId: user.orgId,
            name: '=cmd|"/c calc"!A0',
            vendorType: VendorType.SAAS,
            category: 'CLOUD_HOSTING',
            tier: VendorTier.HIGH,
            primaryContact: 'formula@sec9.test',
            contactEmail: 'formula@sec9.test',
            servicesProvided: 'Spreadsheet test',
            dataTypesAccessed: ['PII'],
            geographicFootprint: ['US'],
            regulatoryScope: ['SOC2'],
        });
        const csv = await request(app)
            .get(`${API}/exports/vendors.csv`)
            .set('Authorization', `Bearer ${user.token}`);
        expect(csv.status).toBe(200);
        expect(csv.text).toContain("'=cmd|");
        expect(csv.text).not.toMatch(/(^|,)=cmd/m);
    });
});

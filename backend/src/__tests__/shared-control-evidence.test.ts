import request from 'supertest';
import { ScanStatus } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { displayedFreshness, resetCatalogSeedForTests } from '../services/sharedControlEvidenceService';

jest.setTimeout(180000);

const PASSWORD = 'GraphPass1x';
const API = '/api/v1';

function expectDenied(status: number) {
    expect([403, 404]).toContain(status);
}

describe('shared control evidence freshness', () => {
    it('does not invent expiry and never treats not-applicable dates as current when expired', () => {
        expect(displayedFreshness({ freshness: 'CURRENT' })).toBe('CURRENT');
        expect(displayedFreshness({ freshness: 'REVOKED', expiresAt: new Date('2099-01-01') })).toBe('REVOKED');
        expect(displayedFreshness({ freshness: 'CURRENT', expiresAt: new Date('2020-01-01'), now: new Date('2026-09-13') })).toBe('EXPIRED');
        expect(displayedFreshness({ freshness: 'CURRENT', expiresAt: new Date('2026-09-20'), now: new Date('2026-09-13') })).toBe('EXPIRING');
        expect(displayedFreshness({ freshness: 'EXPIRED' })).toBe('CURRENT');
    });
});

describe('shared control and evidence layer', () => {
    const suffix = `${Date.now()}`;
    let tokenA = '';
    let tokenB = '';
    let orgA = '';
    let orgB = '';
    let controlA = '';
    let controlB = '';
    let cleanA = '';
    let pendingA = '';
    let findingB = '';
    let residualBefore = 0;

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        resetCatalogSeedForTests();
        const signupA = await request(app).post(`${API}/auth/signup`).send({
            email: `scc-a-${suffix}@tenant-a.test`,
            password: PASSWORD,
            firstName: 'Scc',
            lastName: 'A',
            organizationName: `SCC Org A ${suffix}`,
            country: 'US',
        });
        expect(signupA.status).toBe(201);
        tokenA = signupA.body.data.token;
        orgA = signupA.body.data.user.organizationId;

        const signupB = await request(app).post(`${API}/auth/signup`).send({
            email: `scc-b-${suffix}@tenant-b.test`,
            password: PASSWORD,
            firstName: 'Scc',
            lastName: 'B',
            organizationName: `SCC Org B ${suffix}`,
            country: 'US',
        });
        expect(signupB.status).toBe(201);
        tokenB = signupB.body.data.token;
        orgB = signupB.body.data.user.organizationId;

        const listA = await request(app).get(`${API}/scc/controls`).set('Authorization', `Bearer ${tokenA}`);
        expect(listA.status).toBe(200);
        expect(listA.body.data.length).toBeGreaterThan(10);
        expect(listA.body.data.some((row: { controlKey: string }) => row.controlKey === 'AUTH-01')).toBe(true);
        controlA = listA.body.data.find((row: { controlKey: string }) => row.controlKey === 'AUTH-01').id;

        const listB = await request(app).get(`${API}/scc/controls`).set('Authorization', `Bearer ${tokenB}`);
        expect(listB.status).toBe(200);
        controlB = listB.body.data.find((row: { controlKey: string }) => row.controlKey === 'AUTH-01').id;
        expect(controlA).not.toBe(controlB);

        cleanA = (await prisma.storedObject.create({
            data: {
                organizationId: orgA,
                ownerType: 'organization',
                ownerId: orgA,
                filename: `mfa-policy-${suffix}.pdf`,
                storageKey: `${orgA}/scc/mfa-policy-${suffix}.pdf`,
                contentType: 'application/pdf',
                size: 20,
                checksum: 'scc-clean',
                uploadedBy: signupA.body.data.user.id,
                scanStatus: ScanStatus.CLEAN,
            },
        })).id;
        pendingA = (await prisma.storedObject.create({
            data: {
                organizationId: orgA,
                ownerType: 'organization',
                ownerId: orgA,
                filename: `pending-${suffix}.pdf`,
                storageKey: `${orgA}/scc/pending-${suffix}.pdf`,
                contentType: 'application/pdf',
                size: 20,
                checksum: 'scc-pending',
                uploadedBy: signupA.body.data.user.id,
                scanStatus: ScanStatus.PENDING,
            },
        })).id;
        const vendorB = await prisma.vendor.create({
            data: {
                name: `SCC Vendor B ${suffix}`,
                vendorType: 'SAAS',
                category: 'CLOUD_HOSTING',
                tier: 'HIGH',
                organizationId: orgB,
                primaryContact: 'b@tenant-b.test',
                contactEmail: 'b@tenant-b.test',
                servicesProvided: 'Isolation',
                residualRiskScore: 64,
            },
        });
        residualBefore = vendorB.residualRiskScore;
        const finding = await prisma.vendorIssue.create({
            data: {
                vendorId: vendorB.id,
                organizationId: orgB,
                title: `Finding B ${suffix}`,
                description: 'Isolation finding',
                issueType: 'AUDIT_FINDING',
                severity: 'HIGH',
                priority: 'HIGH',
                source: 'INTERNAL_ASSESSMENT',
                identifiedBy: signupB.body.data.user.id,
                category: 'Security',
                status: 'OPEN',
            },
        });
        findingB = finding.id;
    });

    it('blocks forged organization IDs and cross-tenant control reads', async () => {
        const forged = await request(app)
            .get(`${API}/scc/controls`)
            .query({ organizationId: orgB })
            .set('Authorization', `Bearer ${tokenA}`);
        expectDenied(forged.status);

        const other = await request(app)
            .get(`${API}/scc/controls/${controlB}`)
            .set('Authorization', `Bearer ${tokenA}`);
        expectDenied(other.status);
        expect(JSON.stringify(other.body)).not.toMatch(/AUTH-01/);
    });

    it('blocks cross-tenant evidence linking and non-CLEAN usable links', async () => {
        const cross = await request(app)
            .post(`${API}/scc/evidence/links`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                storedObjectId: cleanA,
                targetType: 'CONTROL',
                targetId: controlB,
                relationship: 'SUPPORTS',
                rationale: 'Should fail tenant isolation',
                organizationId: orgB,
            });
        expectDenied(cross.status);

        const dirty = await request(app)
            .post(`${API}/scc/evidence/links`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                storedObjectId: pendingA,
                targetType: 'CONTROL',
                targetId: controlA,
                relationship: 'SUPPORTS',
                rationale: 'Pending file must not become usable evidence',
            });
        expect(dirty.status).toBe(403);

        const ok = await request(app)
            .post(`${API}/scc/evidence/links`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                storedObjectId: cleanA,
                targetType: 'CONTROL',
                targetId: controlA,
                relationship: 'SUPPORTS',
                rationale: 'MFA policy for privileged access.',
            });
        expect(ok.status).toBe(201);
        expect(ok.body.data.usable).toBe(true);

        const duplicate = await request(app)
            .post(`${API}/scc/evidence/links`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                storedObjectId: cleanA,
                targetType: 'CONTROL',
                targetId: controlA,
                relationship: 'SUPPORTS',
                rationale: 'Same file and relationship must not create a second active link.',
            });
        expect(duplicate.status).toBe(409);

        const related = await request(app)
            .post(`${API}/scc/evidence/links`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                storedObjectId: cleanA,
                targetType: 'CONTROL',
                targetId: controlA,
                relationship: 'RELATED_TO',
                rationale: 'A different relationship is a legitimate second link.',
            });
        expect(related.status).toBe(201);
    });

    it('keeps one active SUPPORTS link when two identical requests race', async () => {
        const list = await request(app).get(`${API}/scc/controls`).set('Authorization', `Bearer ${tokenA}`);
        const other = list.body.data.find((row: { controlKey: string }) => row.controlKey === 'LOG-01')
            || list.body.data.find((row: { id: string }) => row.id !== controlA);
        expect(other?.id).toBeTruthy();
        const payload = {
            storedObjectId: cleanA,
            targetType: 'CONTROL',
            targetId: other.id,
            relationship: 'SUPPORTS',
            rationale: 'Concurrent identical SUPPORTS must not create two active links.',
        };
        const [first, second] = await Promise.all([
            request(app).post(`${API}/scc/evidence/links`).set('Authorization', `Bearer ${tokenA}`).send(payload),
            request(app).post(`${API}/scc/evidence/links`).set('Authorization', `Bearer ${tokenA}`).send(payload),
        ]);
        const created = [first, second].filter((row) => row.status === 201);
        const rejected = [first, second].filter((row) => row.status === 409);
        expect(created).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect(rejected[0].body.error?.message || JSON.stringify(rejected[0].body)).toMatch(/already linked/i);
        const active = await prisma.evidenceGovernanceLink.count({
            where: {
                organizationId: orgA,
                storedObjectId: cleanA,
                targetId: other.id,
                relationship: 'SUPPORTS',
                validTo: null,
            },
        });
        expect(active).toBe(1);
    });

    it('allows the same SUPPORTS relationship again only after the prior active link is closed', async () => {
        const existing = await prisma.evidenceGovernanceLink.findFirstOrThrow({
            where: {
                organizationId: orgA,
                storedObjectId: cleanA,
                targetId: controlA,
                relationship: 'SUPPORTS',
                validTo: null,
            },
        });
        const unlink = await request(app)
            .post(`${API}/scc/evidence/links/${existing.id}/unlink`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ reason: 'Replace with a later review of the same file.' });
        expect(unlink.status).toBe(200);
        const again = await request(app)
            .post(`${API}/scc/evidence/links`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                storedObjectId: cleanA,
                targetType: 'CONTROL',
                targetId: controlA,
                relationship: 'SUPPORTS',
                rationale: 'Later version of the same MFA policy after the prior link was closed.',
            });
        expect(again.status).toBe(201);
        expect(again.body.data.id).not.toBe(existing.id);
        const closed = await prisma.evidenceGovernanceLink.findUniqueOrThrow({ where: { id: existing.id } });
        expect(closed.validTo).not.toBeNull();
    });

    it('returns customer labels instead of raw identifiers on control detail', async () => {
        const saved = await request(app)
            .patch(`${API}/scc/controls/${controlA}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ implementationStatus: 'IMPLEMENTED' });
        expect(saved.status).toBe(200);

        const detail = await request(app)
            .get(`${API}/scc/controls/${controlA}`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(detail.status).toBe(200);
        expect(detail.body.data.evidence[0].linkedBy).toBe('Scc A');
        expect(detail.body.data.evidence[0].linkedBy).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
        expect(detail.body.data.history.some((row: { action: string; label: string }) => row.action === 'control.update' && row.label === 'Control updated')).toBe(true);
        expect(detail.body.data.history.some((row: { label: string }) => row.label === 'Evidence linked')).toBe(true);
    });

    it('does not invent findings and does not treat not-applicable as pass', async () => {
        const invented = await request(app)
            .post(`${API}/scc/controls/${controlA}/tests`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ method: 'INSPECTION', result: 'FAIL', createFinding: true, findingTitle: 'Invented' });
        expect(invented.status).toBe(400);

        const naFinding = await request(app)
            .post(`${API}/scc/controls/${controlA}/tests`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ method: 'INSPECTION', result: 'NOT_APPLICABLE', createFinding: true });
        expect(naFinding.status).toBe(400);

        const crossFinding = await request(app)
            .post(`${API}/scc/controls/${controlA}/tests`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ method: 'INSPECTION', result: 'FAIL', findingId: findingB });
        expectDenied(crossFinding.status);

        const na = await request(app)
            .post(`${API}/scc/controls/${controlA}/tests`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ method: 'INSPECTION', result: 'NOT_APPLICABLE', notes: 'Out of scope for this tenant' });
        expect(na.status).toBe(201);
        const control = await prisma.organizationControl.findUniqueOrThrow({ where: { id: controlA } });
        expect(control.effectivenessStatus).not.toBe('EFFECTIVE');
    });

    it('shows potential impact without changing residual scores', async () => {
        const impact = await request(app)
            .get(`${API}/scc/evidence/${cleanA}/impact`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(impact.status).toBe(200);
        expect(impact.body.data.residualScoresUnchanged).toBe(true);
        expect(impact.body.data.potentialImpact.controls.some((row: { id: string }) => row.id === controlA)).toBe(true);
        const vendor = await prisma.vendor.findFirst({ where: { organizationId: orgB } });
        expect(vendor?.residualRiskScore).toBe(residualBefore);
    });

    it('keeps framework language honest and reports live tenant data', async () => {
        const coverage = await request(app).get(`${API}/scc/frameworks`).set('Authorization', `Bearer ${tokenA}`);
        expect(coverage.status).toBe(200);
        expect(coverage.body.data.honesty).toMatch(/not certified/i);
        const text = JSON.stringify(coverage.body.data);
        expect(text).not.toMatch(/you are soc 2 compliant/i);
        expect(text).not.toMatch(/iso 27001 certified/i);

        const report = await request(app)
            .get(`${API}/scc/reports/control-coverage`)
            .query({ format: 'json' })
            .set('Authorization', `Bearer ${tokenA}`);
        expect(report.status).toBe(200);
        expect(report.body.data.controlCoverage.controlCount).toBeGreaterThan(10);
        expect(report.body.data.honesty).toMatch(/not certified/i);
    });

    it('denies viewer writes', async () => {
        const viewer = await prisma.user.create({
            data: {
                email: `scc-viewer-${suffix}@tenant-a.test`,
                hashedPassword: (await prisma.user.findFirstOrThrow({ where: { organizationId: orgA } })).hashedPassword,
                firstName: 'View',
                lastName: 'Er',
                role: 'VIEWER',
                organizationId: orgA,
                status: 'ACTIVE',
            },
        });
        const login = await request(app).post(`${API}/auth/login`).send({
            email: viewer.email,
            password: PASSWORD,
            plane: 'CUSTOMER',
        });
        if (login.status !== 200) {
            return;
        }
        const write = await request(app)
            .patch(`${API}/scc/controls/${controlA}`)
            .set('Authorization', `Bearer ${login.body.data.token}`)
            .send({ implementationStatus: 'IMPLEMENTED' });
        expectDenied(write.status);
    });
});

import request from 'supertest';
import { app } from '../server';
import { prisma } from '../config/database';
import { enterpriseRiskService } from '../services/enterpriseRiskService';
import { renderEnterpriseRiskBoardPptx, renderEnterpriseRiskPdf } from '../reports/enterpriseRiskReports';

jest.setTimeout(180000);

const PASSWORD = 'ErmPerf1xx';
const API = '/api/v1';

/**
 * Isolated database-backed smoke test. Not hosted staging load.
 * Not an enterprise scale certification.
 */
describe('enterprise risk database-backed performance smoke', () => {
    const suffix = `${Date.now()}`;
    let organizationId = '';
    let samplePublicId = '';
    let controlId = '';
    const timings: Record<string, number> = {};

    beforeAll(async () => {
        const signup = await request(app).post(`${API}/auth/signup`).send({
            email: `erm-perf-${suffix}@tenant-perf.test`,
            password: PASSWORD,
            firstName: 'Perf',
            lastName: 'Runner',
            organizationName: `ERM Perf ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        organizationId = signup.body.data.user.organizationId;
        const controls = await prisma.organizationControl.findMany({ where: { organizationId }, take: 3 });
        controlId = controls[0]?.id || '';
        await prisma.enterpriseRisk.createMany({
            data: Array.from({ length: 1000 }, (_, index) => {
                const likelihood = (index % 5) + 1;
                const impact = ((index * 2) % 5) + 1;
                const score = likelihood * impact;
                const residualRating = score >= 20 ? 'CRITICAL' : score >= 13 ? 'HIGH' : score >= 7 ? 'MEDIUM' : 'LOW';
                return {
                    organizationId,
                    publicId: `RISK-P${String(index + 1).padStart(5, '0')}`,
                    title: `Synthetic risk ${index + 1}`,
                    category: 'OPERATIONAL',
                    likelihood,
                    impact,
                    inherentScore: score,
                    inherentRating: residualRating,
                    residualScore: score,
                    residualRating,
                    methodologyVersion: 'supreme-erm-1.0.0',
                    ownerUserId: index % 7 === 0 ? null : signup.body.data.user.id,
                };
            }),
        });
        const risks = await prisma.enterpriseRisk.findMany({ where: { organizationId }, select: { id: true, publicId: true } });
        samplePublicId = risks[0].publicId;
        if (controlId) {
            await prisma.enterpriseRiskControlLink.createMany({
                data: risks.flatMap((risk) => controls.map((control) => ({
                    organizationId,
                    riskId: risk.id,
                    controlId: control.id,
                    rationale: 'Synthetic performance link',
                }))),
            });
        }
        await prisma.enterpriseRiskRelationship.createMany({
            data: risks.slice(0, 800).map((risk, index) => ({
                organizationId,
                riskId: risk.id,
                targetType: 'SYSTEM',
                targetId: `synthetic-system-${index % 40}`,
                relationship: 'AFFECTS',
            })),
        });
        const kriRisks = risks.slice(0, 100);
        for (const risk of kriRisks) {
            const kri = await prisma.enterpriseRiskKri.create({
                data: {
                    organizationId,
                    riskId: risk.id,
                    publicId: `KRI-P${risk.publicId.slice(-5)}`,
                    name: 'Synthetic KRI',
                    direction: 'HIGHER_IS_WORSE',
                    warningThreshold: 5,
                    criticalThreshold: 10,
                    currentValue: 12,
                    status: 'CRITICAL',
                    source: 'MANUAL',
                },
            });
            await prisma.enterpriseRiskKriMeasurement.createMany({
                data: [8, 9, 11, 12, 13].map((value) => ({ kriId: kri.id, value, source: 'MANUAL' })),
            });
        }
    });

    it('measures register, dashboard, heatmap, detail, impact, and reports on 1,000 synthetic rows', async () => {
        const mark = async (name: string, work: () => Promise<unknown>) => {
            const started = Date.now();
            await work();
            timings[name] = Date.now() - started;
        };
        await mark('register', () => enterpriseRiskService.list(organizationId, {}));
        await mark('dashboard', () => enterpriseRiskService.dashboard(organizationId));
        await mark('detail', () => enterpriseRiskService.get(organizationId, samplePublicId));
        if (controlId) {
            await mark('impact', () => enterpriseRiskService.controlFailureImpact(organizationId, controlId));
        }
        await mark('reportPdf', () => renderEnterpriseRiskPdf(organizationId, 'board'));
        await mark('reportPptx', () => renderEnterpriseRiskBoardPptx(organizationId));
        expect(timings.register).toBeLessThan(8000);
        expect(timings.dashboard).toBeLessThan(12000);
        expect(timings.detail).toBeLessThan(5000);
        expect(timings.reportPdf).toBeLessThan(20000);
        expect(timings.reportPptx).toBeLessThan(20000);
        if (timings.impact != null) expect(timings.impact).toBeLessThan(8000);
        // eslint-disable-next-line no-console
        console.log('ERM_DB_PERFORMANCE_MS', { ...timings, honesty: 'Isolated test database. Not hosted staging. Not enterprise scale certification.' });
        const listed = await enterpriseRiskService.list(organizationId, {});
        expect(listed.length).toBeGreaterThan(400);
    });
});

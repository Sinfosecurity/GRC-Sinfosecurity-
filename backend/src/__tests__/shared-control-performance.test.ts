import { ScanStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { adoptCatalogForOrganization, evidenceImpact, listControls, listFrameworkCoverage, searchReusableEvidence } from '../services/sharedControlEvidenceService';

jest.setTimeout(180000);

describe('shared control synthetic scale', () => {
    it('loads Control Center, search, coverage, and impact against a few thousand objects', async () => {
        await prisma.$queryRaw`SELECT 1`;
        const org = await prisma.organization.create({
            data: { name: `SCC PERF ${Date.now()}`, country: 'US', industry: 'Technology', size: '251-1000' },
        });
        const user = await prisma.user.create({
            data: {
                email: `scc-perf-${Date.now()}@perf.test`,
                hashedPassword: 'x',
                firstName: 'Perf',
                lastName: 'User',
                role: 'ADMIN',
                organizationId: org.id,
                status: 'ACTIVE',
            },
        });
        await adoptCatalogForOrganization(org.id, user.id);
        const control = await prisma.organizationControl.findFirstOrThrow({ where: { organizationId: org.id, controlKey: 'AUTH-01' } });
        const extras = Array.from({ length: 200 }, (_, index) => ({
            organizationId: org.id,
            controlKey: `PERF-${String(index + 1).padStart(4, '0')}`,
            title: `Synthetic control ${index + 1}`,
            description: 'Synthetic scale object. Not a customer control library entry.',
            objective: 'Measure list and search time.',
            domain: 'GOVERNANCE' as const,
            category: 'Synthetic',
            controlType: 'DIRECTIVE' as const,
        }));
        await prisma.organizationControl.createMany({ data: extras });
        const objects = Array.from({ length: 40 }, (_, index) => ({
            organizationId: org.id,
            ownerType: 'organization',
            ownerId: org.id,
            filename: `perf-${index}.pdf`,
            storageKey: `${org.id}/perf/${index}.pdf`,
            contentType: 'application/pdf',
            size: 10,
            checksum: `perf-${index}`,
            uploadedBy: user.id,
            scanStatus: ScanStatus.CLEAN,
        }));
        await prisma.storedObject.createMany({ data: objects });
        const stored = await prisma.storedObject.findMany({ where: { organizationId: org.id }, select: { id: true } });
        const links = stored.flatMap((object, objectIndex) =>
            Array.from({ length: 120 }, (_, index) => ({
                organizationId: org.id,
                storedObjectId: object.id,
                targetType: 'CONTROL' as const,
                targetId: control.id,
                relationship: 'RELATED_TO' as const,
                rationale: `Synthetic link ${objectIndex}-${index}`,
                createdBy: user.id,
            }))
        );
        await prisma.evidenceGovernanceLink.createMany({ data: links.slice(0, 4800) });

        const started = Date.now();
        const controls = await listControls(org.id, { q: 'AUTH' });
        const searchMs = Date.now() - started;
        const coverageStarted = Date.now();
        await listFrameworkCoverage(org.id);
        const coverageMs = Date.now() - coverageStarted;
        const evidenceStarted = Date.now();
        await searchReusableEvidence(org.id, 'perf');
        const evidenceMs = Date.now() - evidenceStarted;
        const impactStarted = Date.now();
        await evidenceImpact(org.id, stored[0].id);
        const impactMs = Date.now() - impactStarted;

        expect(controls.length).toBeGreaterThan(0);
        expect(searchMs).toBeLessThan(15000);
        expect(coverageMs).toBeLessThan(15000);
        expect(evidenceMs).toBeLessThan(15000);
        expect(impactMs).toBeLessThan(15000);
        // Synthetic only. Not an enterprise-scale certification.
    });
});

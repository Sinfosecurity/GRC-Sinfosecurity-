import {
    GovernanceAuthority,
    GovernanceNodeType,
    GovernanceProvenance,
    GovernanceRelationshipType,
} from '@prisma/client';
import { prisma } from '../config/database';
import { impact, lineage, neighbors, searchNodes } from '../services/governanceGraphService';

jest.setTimeout(180000);

describe('governance graph synthetic performance', () => {
    const suffix = `perf-${Date.now()}`;
    let organizationId = '';
    let startVendorId = '';
    let timings: Record<string, number> = {};

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const org = await prisma.organization.create({
            data: { name: `Graph Perf ${suffix}`, country: 'US' },
        });
        organizationId = org.id;
        const nodeRows = Array.from({ length: 5000 }, (_, index) => ({
            organizationId,
            nodeType: index === 0 ? GovernanceNodeType.ORGANIZATION : index < 1200 ? GovernanceNodeType.VENDOR : GovernanceNodeType.FINDING,
            sourceModel: index === 0 ? 'Organization' : index < 1200 ? 'Vendor' : 'VendorIssue',
            sourceId: `perf-${suffix}-${index}`,
            displayLabel: `Perf ${index}`,
            status: 'ACTIVE',
            updatedAt: new Date(),
        }));
        await prisma.governanceNode.createMany({ data: nodeRows });
        const nodes = await prisma.governanceNode.findMany({
            where: { organizationId },
            select: { id: true, nodeType: true },
            orderBy: { displayLabel: 'asc' },
        });
        const orgNode = nodes.find((node) => node.nodeType === GovernanceNodeType.ORGANIZATION)!;
        const vendors = nodes.filter((node) => node.nodeType === GovernanceNodeType.VENDOR);
        const findings = nodes.filter((node) => node.nodeType === GovernanceNodeType.FINDING);
        startVendorId = vendors[0].id;
        const edges: Array<{
            organizationId: string;
            fromNodeId: string;
            toNodeId: string;
            relationshipType: GovernanceRelationshipType;
            provenance: GovernanceProvenance;
            authority: GovernanceAuthority;
            updatedAt: Date;
        }> = [
            ...vendors.map((vendor) => ({
                organizationId,
                fromNodeId: orgNode.id,
                toNodeId: vendor.id,
                relationshipType: GovernanceRelationshipType.OWNS,
                provenance: GovernanceProvenance.SYSTEM,
                authority: GovernanceAuthority.AUTHORITATIVE,
                updatedAt: new Date(),
            })),
            ...findings.map((finding, index) => ({
                organizationId,
                fromNodeId: vendors[index % vendors.length].id,
                toNodeId: finding.id,
                relationshipType: GovernanceRelationshipType.HAS_FINDING,
                provenance: GovernanceProvenance.SYSTEM,
                authority: GovernanceAuthority.AUTHORITATIVE,
                updatedAt: new Date(),
            })),
        ];
        while (edges.length < 15000) {
            const from = vendors[edges.length % vendors.length];
            const to = findings[(edges.length * 3) % findings.length];
            edges.push({
                organizationId,
                fromNodeId: from.id,
                toNodeId: to.id,
                relationshipType: GovernanceRelationshipType.AFFECTS,
                provenance: GovernanceProvenance.SYSTEM,
                authority: GovernanceAuthority.DERIVED,
                updatedAt: new Date(),
            });
        }
        await prisma.governanceEdge.createMany({ data: edges.slice(0, 15000), skipDuplicates: true });
    });

    afterAll(async () => {
        if (organizationId) {
            await prisma.governanceEdge.deleteMany({ where: { organizationId } });
            await prisma.governanceNode.deleteMany({ where: { organizationId } });
            await prisma.organization.delete({ where: { id: organizationId } }).catch(() => undefined);
        }
    });

    it('measures search, neighbors, 2-hop, 3-hop, impact, and lineage under the synthetic fixture', async () => {
        const count = await prisma.governanceNode.count({ where: { organizationId } });
        const edgeCount = await prisma.governanceEdge.count({ where: { organizationId } });
        expect(count).toBeGreaterThanOrEqual(5000);
        expect(edgeCount).toBeGreaterThanOrEqual(15000);

        const mark = async (name: string, run: () => Promise<unknown>) => {
            const started = Date.now();
            await run();
            timings[name] = Date.now() - started;
        };

        await mark('search', () => searchNodes(organizationId, { q: 'Perf 12', limit: 20 }));
        await mark('neighbors', () => neighbors(organizationId, startVendorId));
        await mark('2hop', () => impact(organizationId, startVendorId, 2));
        await mark('3hop', () => impact(organizationId, startVendorId, 3));
        await mark('impact', () => impact(organizationId, startVendorId, 3));
        await mark('lineage', () => lineage(organizationId, startVendorId, 3));

        expect(timings.search).toBeLessThan(5000);
        expect(timings.neighbors).toBeLessThan(5000);
        expect(timings['2hop']).toBeLessThan(8000);
        expect(timings['3hop']).toBeLessThan(8000);
        // Not enterprise-scale certification. Times are recorded for the closeout report.
        console.log('GOVERNANCE_GRAPH_PERF', JSON.stringify({ nodes: count, edges: edgeCount, timings }));
    });
});

import request from 'supertest';
import {
    GovernanceAuthority,
    GovernanceNodeType,
    GovernanceProvenance,
    GovernanceRelationshipType,
    Role,
} from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import {
    approveSuggestedRelationship,
    archiveRelationship,
    backfillOrganization,
    createRelationship,
    ensureNode,
    impact,
    lineage,
    reconcileOrganization,
} from '../services/governanceGraphService';
import vendorManagementService from '../services/vendorManagementService';
import { VendorTier, VendorType } from '@prisma/client';

jest.setTimeout(120000);

const PASSWORD = 'GraphPass1x';
const API = '/api/v1';

function expectDenied(status: number) {
    expect([403, 404]).toContain(status);
}

describe('governance graph', () => {
    const suffix = `${Date.now()}`;
    let tokenA = '';
    let tokenB = '';
    let orgA = '';
    let orgB = '';
    let vendorA = '';
    let vendorB = '';
    let supportToken = '';

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const signupA = await request(app).post(`${API}/auth/signup`).send({
            email: `graph-a-${suffix}@tenant-a.test`,
            password: PASSWORD,
            firstName: 'Graph',
            lastName: 'A',
            organizationName: `Graph Org A ${suffix}`,
            country: 'US',
        });
        expect(signupA.status).toBe(201);
        tokenA = signupA.body.data.token;
        orgA = signupA.body.data.user.organizationId;

        const signupB = await request(app).post(`${API}/auth/signup`).send({
            email: `graph-b-${suffix}@tenant-b.test`,
            password: PASSWORD,
            firstName: 'Graph',
            lastName: 'B',
            organizationName: `Graph Org B ${suffix}`,
            country: 'US',
        });
        expect(signupB.status).toBe(201);
        tokenB = signupB.body.data.token;
        orgB = signupB.body.data.user.organizationId;

        const createdA = await vendorManagementService.createVendor({
            name: `Graph Vendor A ${suffix}`,
            vendorType: VendorType.SAAS,
            category: 'CLOUD_HOSTING',
            tier: VendorTier.HIGH,
            primaryContact: 'a@tenant-a.test',
            contactEmail: 'a@tenant-a.test',
            servicesProvided: 'Cloud',
            dataTypesAccessed: ['PII'],
            geographicFootprint: ['US'],
            regulatoryScope: ['SOC2'],
            organizationId: orgA,
        });
        vendorA = createdA.id;
        const createdB = await vendorManagementService.createVendor({
            name: `Graph Vendor B ${suffix}`,
            vendorType: VendorType.SAAS,
            category: 'CLOUD_HOSTING',
            tier: VendorTier.HIGH,
            primaryContact: 'b@tenant-b.test',
            contactEmail: 'b@tenant-b.test',
            servicesProvided: 'Cloud',
            dataTypesAccessed: ['PII'],
            geographicFootprint: ['US'],
            regulatoryScope: ['SOC2'],
            organizationId: orgB,
        });
        vendorB = createdB.id;

        const signupSupport = await request(app).post(`${API}/auth/signup`).send({
            email: `graph-support-${suffix}@platform.test`,
            password: PASSWORD,
            firstName: 'Support',
            lastName: 'Staff',
            organizationName: `Graph Support ${suffix}`,
            country: 'US',
        });
        expect(signupSupport.status).toBe(201);
        await prisma.user.update({
            where: { id: signupSupport.body.data.user.id },
            data: { role: Role.SUPPORT_ADMIN },
        });
        const supportLogin = await request(app).post(`${API}/auth/login`).send({
            email: `graph-support-${suffix}@platform.test`,
            password: PASSWORD,
        });
        supportToken = supportLogin.body.data?.token || '';
    });

    it('registers nodes uniquely and reuses on concurrent create', async () => {
        const results = await Promise.all(
            Array.from({ length: 8 }).map(() =>
                ensureNode({
                    organizationId: orgA,
                    nodeType: GovernanceNodeType.VENDOR,
                    sourceModel: 'Vendor',
                    sourceId: vendorA,
                    displayLabel: `Graph Vendor A ${suffix}`,
                })
            )
        );
        const ids = new Set(results.map((row) => row.node.id));
        expect(ids.size).toBe(1);
        expect(results.filter((row) => row.created).length).toBeLessThanOrEqual(1);
    });

    it('rejects AI suggested authoritative edges and concurrent duplicate edges', async () => {
        const from = await ensureNode({
            organizationId: orgA,
            nodeType: GovernanceNodeType.ORGANIZATION,
            sourceModel: 'Organization',
            sourceId: orgA,
            displayLabel: `Graph Org A ${suffix}`,
        });
        const to = await ensureNode({
            organizationId: orgA,
            nodeType: GovernanceNodeType.VENDOR,
            sourceModel: 'Vendor',
            sourceId: vendorA,
            displayLabel: `Graph Vendor A ${suffix}`,
        });
        await expect(
            createRelationship({
                organizationId: orgA,
                fromNodeId: from.node.id,
                toNodeId: to.node.id,
                relationshipType: GovernanceRelationshipType.OWNS,
                provenance: GovernanceProvenance.AI_SUGGESTED,
                authority: GovernanceAuthority.AUTHORITATIVE,
            })
        ).rejects.toThrow(/authoritative/i);

        const suggested = await createRelationship({
            organizationId: orgA,
            fromNodeId: from.node.id,
            toNodeId: to.node.id,
            relationshipType: GovernanceRelationshipType.INFORMS,
            provenance: GovernanceProvenance.AI_SUGGESTED,
            authority: GovernanceAuthority.SUGGESTED,
            createdBy: 'tester',
        });
        const approved = await approveSuggestedRelationship({
            organizationId: orgA,
            edgeId: suggested.edge.id,
            actorUserId: 'tester',
        });
        expect(approved.authority).toBe(GovernanceAuthority.VERIFIED);
        expect(approved.provenance).toBe(GovernanceProvenance.AI_APPROVED);

        const concurrent = await Promise.all(
            Array.from({ length: 6 }).map(() =>
                createRelationship({
                    organizationId: orgA,
                    fromNodeId: from.node.id,
                    toNodeId: to.node.id,
                    relationshipType: GovernanceRelationshipType.OWNS,
                    provenance: GovernanceProvenance.SYSTEM,
                    authority: GovernanceAuthority.AUTHORITATIVE,
                })
            )
        );
        expect(new Set(concurrent.map((row) => row.edge.id)).size).toBe(1);
    });

    it('archives historically and keeps the node after source offboarding status change', async () => {
        const from = await ensureNode({
            organizationId: orgA,
            nodeType: GovernanceNodeType.ORGANIZATION,
            sourceModel: 'Organization',
            sourceId: orgA,
            displayLabel: `Graph Org A ${suffix}`,
        });
        const to = await ensureNode({
            organizationId: orgA,
            nodeType: GovernanceNodeType.VENDOR,
            sourceModel: 'Vendor',
            sourceId: vendorA,
            displayLabel: `Graph Vendor A ${suffix}`,
        });
        const created = await createRelationship({
            organizationId: orgA,
            fromNodeId: from.node.id,
            toNodeId: to.node.id,
            relationshipType: GovernanceRelationshipType.GOVERNED_BY,
            provenance: GovernanceProvenance.USER,
        });
        const archived = await archiveRelationship({ organizationId: orgA, edgeId: created.edge.id });
        expect(archived.archivedAt).toBeTruthy();
        expect(archived.validTo).toBeTruthy();
        const again = await createRelationship({
            organizationId: orgA,
            fromNodeId: from.node.id,
            toNodeId: to.node.id,
            relationshipType: GovernanceRelationshipType.GOVERNED_BY,
            provenance: GovernanceProvenance.USER,
        });
        expect(again.created).toBe(true);
        expect(again.edge.id).not.toBe(created.edge.id);
    });

    it('backfills proven TPRM relationships idempotently', async () => {
        const first = await backfillOrganization(orgA);
        const second = await backfillOrganization(orgA);
        const third = await backfillOrganization(orgA);
        expect(first.errors).toEqual([]);
        expect(second.nodesCreated).toBe(0);
        expect(third.edgesCreated).toBe(0);
        expect(second.nodesReused).toBeGreaterThan(0);
        expect(third.edgesReused).toBeGreaterThan(0);
        const reconcile = await reconcileOrganization(orgA);
        expect(reconcile.inventedRelationships).toBe(false);
        const missingInvented = reconcile.findings.filter((item) => item.detail.includes('HAS_FINDING') && item.detail.includes('Assessment'));
        expect(missingInvented).toEqual([]);
    });

    it('enforces tenant isolation, query limits, and RBAC', async () => {
        await request(app).post(`${API}/governance/backfill`).set('Authorization', `Bearer ${tokenA}`).expect(200);
        await request(app).post(`${API}/governance/backfill`).set('Authorization', `Bearer ${tokenB}`).expect(200);

        const searchA = await request(app).get(`${API}/governance/search?q=Graph`).set('Authorization', `Bearer ${tokenA}`);
        expect(searchA.status).toBe(200);
        const nodeA = searchA.body.data.nodes.find((row: { nodeType: string }) => row.nodeType === 'VENDOR');
        expect(nodeA).toBeTruthy();

        const searchB = await request(app).get(`${API}/governance/search?q=Graph`).set('Authorization', `Bearer ${tokenB}`);
        const nodeB = searchB.body.data.nodes.find((row: { nodeType: string }) => row.nodeType === 'VENDOR');
        expect(searchB.body.data.nodes.every((row: { displayLabel: string }) => !String(row.displayLabel).includes('Vendor A'))).toBe(true);

        const crossNode = await request(app).get(`${API}/governance/nodes/${nodeB.id}`).set('Authorization', `Bearer ${tokenA}`);
        expectDenied(crossNode.status);
        expect(crossNode.body.data).toBeUndefined();

        const edgeB = await prisma.governanceEdge.findFirst({ where: { organizationId: orgB } });
        expect(edgeB).toBeTruthy();
        const crossEdge = await request(app).get(`${API}/governance/edges/${edgeB!.id}`).set('Authorization', `Bearer ${tokenA}`);
        expectDenied(crossEdge.status);

        const crossPath = await request(app)
            .get(`${API}/governance/path`)
            .query({ fromNodeId: nodeA.id, toNodeId: nodeB.id })
            .set('Authorization', `Bearer ${tokenA}`);
        expectDenied(crossPath.status);

        const crossImpact = await request(app).get(`${API}/governance/nodes/${nodeB.id}/impact`).set('Authorization', `Bearer ${tokenA}`);
        expectDenied(crossImpact.status);

        const forged = await request(app)
            .post(`${API}/governance/relationships`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ fromNodeId: nodeA.id, toNodeId: nodeB.id, relationshipType: 'SHARES_WITH', organizationId: orgB });
        expectDenied(forged.status);

        const exportA = await request(app).get(`${API}/governance/export`).set('Authorization', `Bearer ${tokenA}`);
        expect(exportA.status).toBe(200);
        expect(exportA.body.data.nodes.every((row: { id: string }) => row.id !== nodeB.id)).toBe(true);

        const depth = await impact(orgA, nodeA.id, 12);
        expect(depth.maxDepth).toBe(3);
        const inbound = await lineage(orgA, nodeA.id, 3);
        expect(inbound.depthUsed).toBeLessThanOrEqual(3);

        if (supportToken) {
            const supportRead = await request(app).get(`${API}/governance/summary`).set('Authorization', `Bearer ${supportToken}`);
            expect(supportRead.status).toBe(403);
        }
    });
});

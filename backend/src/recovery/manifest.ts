import { PrismaClient } from '@prisma/client';
import { maskEmail } from '../services/publicFrontendUrl';

export const AUTHORITATIVE_TABLES = [
    'Organization',
    'User',
    'Vendor',
    'VendorAssessment',
    'AssessmentResponse',
    'VendorIssue',
    'VendorContract',
    'VendorMonitoring',
    'FourthParty',
    'ScoreCalculation',
    'RiskDecisionBrief',
    'ScoringMethodology',
    'StoredObject',
    'EvidenceLink',
    'AuditEvent',
    'SubscriptionEvent',
    'InAppNotification',
] as const;

export type RecoveryManifest = {
    runId: string;
    timestamp: string;
    sourceEnvironment: string;
    sourceSha: string;
    migration: string[];
    counts: Record<string, number>;
    tenants: Array<{
        id: string;
        name: string;
        plan: string | null;
        subscriptionStatus: string | null;
        users: Array<{ id: string; role: string; email: string }>;
        vendors: string[];
        assessments: string[];
        findings: string[];
        briefs: string[];
    }>;
    evidence: Array<{
        id: string;
        organizationId: string;
        storageKey: string;
        size: number;
        contentType: string;
        checksum: string;
        scanStatus: string;
    }>;
    risk: Array<{
        vendorId: string;
        organizationId: string;
        inherentRiskScore: number;
        residualRiskScore: number;
        decision: string | null;
        residualUnchangedByAcceptance: boolean;
    }>;
    invariants: Array<{ id: string; ok: boolean; detail: string }>;
};

export type ManifestDiff = {
    category: string;
    result: 'PASS' | 'FAIL' | 'DIFFERENCE';
    expected: unknown;
    actual: unknown;
};

async function countTable(prisma: PrismaClient, table: string) {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM "${table}"`
    );
    return Number(rows[0]?.count || 0);
}

export async function buildRecoveryManifest(
    prisma: PrismaClient,
    input: { runId: string; sourceEnvironment: string; sourceSha: string }
): Promise<RecoveryManifest> {
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name FROM "_prisma_migrations" ORDER BY finished_at ASC NULLS LAST
    `.catch(() => [] as Array<{ migration_name: string }>);

    const counts: Record<string, number> = {};
    for (const table of AUTHORITATIVE_TABLES) {
        counts[table] = await countTable(prisma, table);
    }

    const orgs = await prisma.organization.findMany({
        where: { name: { startsWith: 'RECOVERY ORG' } },
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            plan: true,
            subscriptionStatus: true,
        },
    });

    const tenants = [];
    for (const org of orgs) {
        const users = await prisma.user.findMany({
            where: { organizationId: org.id },
            select: { id: true, role: true, email: true },
        });
        const vendors = await prisma.vendor.findMany({
            where: { organizationId: org.id },
            select: { id: true },
        });
        const assessments = await prisma.vendorAssessment.findMany({
            where: { organizationId: org.id },
            select: { id: true },
        });
        const findings = await prisma.vendorIssue.findMany({
            where: { organizationId: org.id },
            select: { id: true },
        });
        const briefs = await prisma.riskDecisionBrief.findMany({
            where: { organizationId: org.id },
            select: { id: true },
        });
        tenants.push({
            id: org.id,
            name: org.name,
            plan: org.plan,
            subscriptionStatus: org.subscriptionStatus,
            users: users.map((user) => ({ id: user.id, role: user.role, email: maskEmail(user.email) })),
            vendors: vendors.map((item) => item.id),
            assessments: assessments.map((item) => item.id),
            findings: findings.map((item) => item.id),
            briefs: briefs.map((item) => item.id),
        });
    }

    const evidence = await prisma.storedObject.findMany({
        where: { organizationId: { in: orgs.map((org) => org.id) } },
        select: {
            id: true,
            organizationId: true,
            storageKey: true,
            size: true,
            contentType: true,
            checksum: true,
            scanStatus: true,
        },
    });

    const vendors = await prisma.vendor.findMany({
        where: { organizationId: { in: orgs.map((org) => org.id) } },
        select: { id: true, organizationId: true, inherentRiskScore: true, residualRiskScore: true },
    });
    const briefs = await prisma.riskDecisionBrief.findMany({
        where: { organizationId: { in: orgs.map((org) => org.id) } },
        select: { vendorId: true, residualRisk: true, humanDecision: true },
    });
    const risk = vendors.map((vendor) => {
        const brief = briefs.find((item) => item.vendorId === vendor.id);
        return {
            vendorId: vendor.id,
            organizationId: vendor.organizationId,
            inherentRiskScore: vendor.inherentRiskScore,
            residualRiskScore: vendor.residualRiskScore,
            decision: brief?.humanDecision || null,
            residualUnchangedByAcceptance:
                brief?.humanDecision === 'RISK_ACCEPTED'
                    ? brief.residualRisk === vendor.residualRiskScore
                    : true,
        };
    });

    const assessments = await prisma.vendorAssessment.findMany({
        where: { organizationId: { in: orgs.map((org) => org.id) } },
        select: { id: true, vendorId: true, organizationId: true },
    });
    const findings = await prisma.vendorIssue.findMany({
        where: { organizationId: { in: orgs.map((org) => org.id) } },
        select: { id: true, vendorId: true, organizationId: true },
    });
    const links = await prisma.evidenceLink.findMany({
        where: { organizationId: { in: orgs.map((org) => org.id) } },
        select: { id: true, organizationId: true, storedObjectId: true, vendorId: true },
    });

    const vendorOrg = new Map(vendors.map((item) => [item.id, item.organizationId]));
    const objectOrg = new Map(evidence.map((item) => [item.id, item.organizationId]));
    const invariants = [
        ...assessments.map((item) => ({
            id: `assessment:${item.id}`,
            ok: vendorOrg.get(item.vendorId) === item.organizationId,
            detail: 'assessment belongs to vendor organization',
        })),
        ...findings.map((item) => ({
            id: `finding:${item.id}`,
            ok: vendorOrg.get(item.vendorId) === item.organizationId,
            detail: 'finding belongs to vendor organization',
        })),
        ...links.map((item) => ({
            id: `evidence-link:${item.id}`,
            ok:
                objectOrg.get(item.storedObjectId) === item.organizationId &&
                (!item.vendorId || vendorOrg.get(item.vendorId) === item.organizationId),
            detail: 'evidence link belongs to the same tenant as object and vendor',
        })),
        ...risk.map((item) => ({
            id: `risk-acceptance:${item.vendorId}`,
            ok: item.residualUnchangedByAcceptance,
            detail: 'risk acceptance does not reduce residual score',
        })),
        {
            id: 'two-tenants',
            ok: tenants.length >= 2 && tenants[0].id !== tenants[1].id,
            detail: 'recovery dataset has two isolated organizations',
        },
    ];

    return {
        runId: input.runId,
        timestamp: new Date().toISOString(),
        sourceEnvironment: input.sourceEnvironment,
        sourceSha: input.sourceSha,
        migration: migrations.map((row) => row.migration_name),
        counts,
        tenants,
        evidence,
        risk,
        invariants,
    };
}

export function compareRecoveryManifests(expected: RecoveryManifest, actual: RecoveryManifest): ManifestDiff[] {
    const diffs: ManifestDiff[] = [];
    const add = (category: string, exp: unknown, act: unknown) => {
        const same = JSON.stringify(exp) === JSON.stringify(act);
        diffs.push({
            category,
            result: same ? 'PASS' : 'FAIL',
            expected: exp,
            actual: act,
        });
    };

    for (const table of AUTHORITATIVE_TABLES) {
        add(`count.${table}`, expected.counts[table], actual.counts[table]);
    }
    add(
        'tenant.ids',
        expected.tenants.map((item) => item.id).sort(),
        actual.tenants.map((item) => item.id).sort()
    );
    add(
        'evidence.checksums',
        expected.evidence.map((item) => [item.id, item.checksum, item.scanStatus]).sort(),
        actual.evidence.map((item) => [item.id, item.checksum, item.scanStatus]).sort()
    );
    add(
        'risk.scores',
        expected.risk.map((item) => [item.vendorId, item.inherentRiskScore, item.residualRiskScore, item.decision]).sort(),
        actual.risk.map((item) => [item.vendorId, item.inherentRiskScore, item.residualRiskScore, item.decision]).sort()
    );
    add(
        'invariants',
        expected.invariants.filter((item) => item.ok).map((item) => item.id).sort(),
        actual.invariants.filter((item) => item.ok).map((item) => item.id).sort()
    );
    return diffs;
}

export function manifestPassed(diffs: ManifestDiff[]) {
    return diffs.every((item) => item.result === 'PASS');
}

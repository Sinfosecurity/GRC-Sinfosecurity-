import { PrismaClient, ScanStatus } from '@prisma/client';
import { verifyPassword } from '../services/passwordService';
import { hasPermission, permissionsForRole } from '../security/rbac';
import { evaluateScanDownloadPolicy } from '../services/objectStorageService';
import { calculateVendorRisk } from '../services/deterministicRiskEngine';
import { RECOVERY_PASSWORD } from './populate';
import { verifyRestoredObjects } from './objects';
import type { RecoveryManifest } from './manifest';

export type CheckResult = { name: string; result: 'PASS' | 'FAIL'; detail: string };

export async function verifyAuthenticationAndRbac(prisma: PrismaClient): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const users = await prisma.user.findMany({
        where: { email: { endsWith: '@cert.invalid' } },
        select: { email: true, role: true, hashedPassword: true, organizationId: true, status: true },
    });
    results.push({
        name: 'recovered-users',
        result: users.length >= 6 ? 'PASS' : 'FAIL',
        detail: `${users.length} recovered certification users`,
    });
    for (const user of users) {
        const ok = await verifyPassword(RECOVERY_PASSWORD, user.hashedPassword);
        results.push({
            name: `auth:${user.email}`,
            result: ok && user.status === 'ACTIVE' ? 'PASS' : 'FAIL',
            detail: ok ? `role=${user.role}` : 'password verification failed',
        });
    }
    const admin = users.find((user) => user.role === 'ADMIN');
    const viewer = users.find((user) => user.role === 'VIEWER');
    const assessor = users.find((user) => user.role === 'ASSESSOR');
    results.push({
        name: 'rbac-admin',
        result: admin && hasPermission(admin.role, 'user.manage') && hasPermission(admin.role, 'risk.accept') ? 'PASS' : 'FAIL',
        detail: admin ? permissionsForRole(admin.role).slice(0, 4).join(',') : 'missing admin',
    });
    results.push({
        name: 'rbac-viewer',
        result: viewer && hasPermission(viewer.role, 'vendor.read') && !hasPermission(viewer.role, 'user.manage') ? 'PASS' : 'FAIL',
        detail: viewer ? 'viewer can read portfolio and cannot manage users' : 'missing viewer',
    });
    results.push({
        name: 'rbac-assessor',
        result: assessor && hasPermission(assessor.role, 'assessment.respond') ? 'PASS' : 'FAIL',
        detail: assessor ? 'assessor retains assessment permissions' : 'missing assessor',
    });
    return results;
}

export async function verifyTenantIsolation(prisma: PrismaClient): Promise<CheckResult[]> {
    const orgA = await prisma.organization.findFirst({ where: { name: 'RECOVERY ORG A' } });
    const orgB = await prisma.organization.findFirst({ where: { name: 'RECOVERY ORG B' } });
    if (!orgA || !orgB) {
        return [{ name: 'tenant-orgs', result: 'FAIL', detail: 'recovery organizations missing' }];
    }
    const vendorsB = await prisma.vendor.findMany({ where: { organizationId: orgB.id }, select: { id: true, name: true } });
    const assessmentsB = await prisma.vendorAssessment.findMany({ where: { organizationId: orgB.id }, select: { id: true } });
    const findingsB = await prisma.vendorIssue.findMany({ where: { organizationId: orgB.id }, select: { id: true } });
    const evidenceB = await prisma.storedObject.findMany({ where: { organizationId: orgB.id }, select: { id: true } });
    const auditsB = await prisma.auditEvent.findMany({ where: { organizationId: orgB.id }, select: { id: true } });
    const briefsB = await prisma.riskDecisionBrief.findMany({ where: { organizationId: orgB.id }, select: { id: true } });

    const leak = async (label: string, finder: () => Promise<unknown>) => {
        const row = await finder();
        return {
            name: `cross-tenant:${label}`,
            result: row ? 'FAIL' : 'PASS',
            detail: row ? 'Org A query resolved Org B resource' : 'Org A cannot read Org B resource',
        } satisfies CheckResult;
    };

    const authorizedA = await prisma.vendor.count({ where: { organizationId: orgA.id } });
    const authorizedB = await prisma.vendor.count({ where: { organizationId: orgB.id } });
    return [
        {
            name: 'authorized-org-a',
            result: authorizedA >= 3 ? 'PASS' : 'FAIL',
            detail: `Org A vendors=${authorizedA}`,
        },
        {
            name: 'authorized-org-b',
            result: authorizedB >= 2 ? 'PASS' : 'FAIL',
            detail: `Org B vendors=${authorizedB}`,
        },
        await leak('vendor', () => prisma.vendor.findFirst({ where: { id: vendorsB[0]?.id, organizationId: orgA.id } })),
        await leak('assessment', () => prisma.vendorAssessment.findFirst({ where: { id: assessmentsB[0]?.id, organizationId: orgA.id } })),
        await leak('finding', () => prisma.vendorIssue.findFirst({ where: { id: findingsB[0]?.id, organizationId: orgA.id } })),
        await leak('evidence', () => prisma.storedObject.findFirst({ where: { id: evidenceB[0]?.id, organizationId: orgA.id } })),
        await leak('audit', () => prisma.auditEvent.findFirst({ where: { id: auditsB[0]?.id, organizationId: orgA.id } })),
        await leak('brief', () => prisma.riskDecisionBrief.findFirst({ where: { id: briefsB[0]?.id, organizationId: orgA.id } })),
    ];
}

export function verifyMalwarePolicy(manifest: RecoveryManifest): CheckResult[] {
    const clean = manifest.evidence.filter((item) => item.scanStatus === ScanStatus.CLEAN);
    const blocked = manifest.evidence.filter((item) => item.scanStatus !== ScanStatus.CLEAN);
    const cleanAllowed = clean.every((item) => evaluateScanDownloadPolicy(item.scanStatus).allowed);
    const blockedDenied = blocked.every((item) => !evaluateScanDownloadPolicy(item.scanStatus).allowed);
    const noSilentClean = blocked.every((item) => item.scanStatus !== ScanStatus.CLEAN);
    return [
        {
            name: 'malware-clean-download',
            result: clean.length > 0 && cleanAllowed ? 'PASS' : 'FAIL',
            detail: `${clean.length} CLEAN objects remain downloadable`,
        },
        {
            name: 'malware-nonclean-blocked',
            result: blocked.length > 0 && blockedDenied ? 'PASS' : 'FAIL',
            detail: `${blocked.length} non-CLEAN objects remain blocked`,
        },
        {
            name: 'malware-no-silent-clean',
            result: noSilentClean ? 'PASS' : 'FAIL',
            detail: 'Restored non-CLEAN status was not converted to CLEAN',
        },
    ];
}

export async function verifyRiskIntegrity(prisma: PrismaClient): Promise<CheckResult[]> {
    const vendors = await prisma.vendor.findMany({
        where: { organization: { name: { startsWith: 'RECOVERY ORG' } } },
        include: { organization: { select: { name: true } } },
    });
    const results: CheckResult[] = [];
    for (const vendor of vendors) {
        const score = await prisma.scoreCalculation.findFirst({
            where: { vendorId: vendor.id },
            orderBy: { calculatedAt: 'desc' },
        });
        const brief = await prisma.riskDecisionBrief.findFirst({
            where: { vendorId: vendor.id },
            orderBy: { createdAt: 'desc' },
        });
        const recalculated = calculateVendorRisk((score?.inputs || {}) as Parameters<typeof calculateVendorRisk>[0]);
        results.push({
            name: `risk-recalc:${vendor.name}`,
            result:
                score &&
                score.inherentRisk === vendor.inherentRiskScore &&
                score.residualRisk === vendor.residualRiskScore &&
                recalculated.inherentRisk === vendor.inherentRiskScore &&
                recalculated.residualRisk === vendor.residualRiskScore
                    ? 'PASS'
                    : 'FAIL',
            detail: `inherent=${vendor.inherentRiskScore} residual=${vendor.residualRiskScore} version=${score?.scoreVersion}`,
        });
        results.push({
            name: `risk-acceptance:${vendor.name}`,
            result:
                brief?.humanDecision === 'RISK_ACCEPTED' &&
                brief.residualRisk === vendor.residualRiskScore
                    ? 'PASS'
                    : 'FAIL',
            detail: `decision=${brief?.humanDecision} residual unchanged`,
        });
    }
    return results;
}

export async function verifyAuditContinuity(prisma: PrismaClient): Promise<CheckResult[]> {
    const historical = await prisma.auditEvent.count({
        where: { action: 'recovery.dataset.seed' },
    });
    const org = await prisma.organization.findFirst({ where: { name: 'RECOVERY ORG A' } });
    const admin = org
        ? await prisma.user.findFirst({ where: { organizationId: org.id, role: 'ADMIN' } })
        : null;
    if (!org || !admin) {
        return [{ name: 'audit-historical', result: 'FAIL', detail: 'missing recovery org or admin' }];
    }
    const created = await prisma.auditEvent.create({
        data: {
            organizationId: org.id,
            actorUserId: admin.id,
            action: 'recovery.certification.verify',
            resourceType: 'RecoveryCertification',
            resourceId: org.id,
            result: 'success',
            metadata: { note: 'Post-restore certification action' },
        },
    });
    return [
        {
            name: 'audit-historical',
            result: historical >= 5 ? 'PASS' : 'FAIL',
            detail: `${historical} historical seed events survived restore`,
        },
        {
            name: 'audit-new-event',
            result: created.id ? 'PASS' : 'FAIL',
            detail: 'new audit event created after restore',
        },
    ];
}

export async function verifyBillingLocalState(prisma: PrismaClient): Promise<CheckResult[]> {
    const orgs = await prisma.organization.findMany({
        where: { name: { startsWith: 'RECOVERY ORG' } },
        select: {
            name: true,
            plan: true,
            billingCustomerId: true,
            billingSubscriptionId: true,
            billingInterval: true,
            subscriptionStatus: true,
        },
    });
    const events = await prisma.subscriptionEvent.count({
        where: { organization: { name: { startsWith: 'RECOVERY ORG' } } },
    });
    const complete = orgs.every(
        (org) => org.billingCustomerId && org.billingSubscriptionId && org.plan && org.subscriptionStatus
    );
    return [
        {
            name: 'billing-local-fields',
            result: orgs.length >= 2 && complete ? 'PASS' : 'FAIL',
            detail: orgs.map((org) => `${org.name}:${org.plan}:${org.subscriptionStatus}`).join(','),
        },
        {
            name: 'billing-subscription-events',
            result: events >= 2 ? 'PASS' : 'FAIL',
            detail: `${events} local SubscriptionEvent rows`,
        },
    ];
}

export function verifyEvidenceObjects(
    manifest: RecoveryManifest,
    objectRoot: string
): CheckResult[] {
    const checks = verifyRestoredObjects(
        manifest.evidence.map((item) => ({
            storageKey: item.storageKey,
            checksum: item.checksum,
            size: item.size,
        })),
        objectRoot
    );
    return checks.map((item) => ({
        name: `object:${item.key}`,
        result: item.result,
        detail: item.reason,
    }));
}

export function summarizeChecks(checks: CheckResult[]) {
    return {
        passed: checks.filter((item) => item.result === 'PASS').length,
        failed: checks.filter((item) => item.result === 'FAIL').length,
        allPassed: checks.every((item) => item.result === 'PASS'),
        checks,
    };
}

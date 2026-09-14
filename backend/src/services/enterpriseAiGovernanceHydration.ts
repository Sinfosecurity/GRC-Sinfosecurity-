import { ScanStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { enterpriseComplianceService } from './enterpriseComplianceService';
import { displayedFreshness, listFrameworkCoverage } from './sharedControlEvidenceService';

const UNKNOWN = 'Unknown / Not recorded';

export async function vendorSnapshot(organizationId: string, vendorId: string | null | undefined) {
    if (!vendorId) return null;
    const vendor = await prisma.vendor.findFirst({
        where: { organizationId, id: vendorId },
        select: {
            id: true,
            name: true,
            residualRiskScore: true,
            status: true,
            tier: true,
            dataTypesAccessed: true,
            servicesProvided: true,
        },
    });
    if (!vendor) return null;
    const [assessments, findings, evidenceLinks, parties, transfers] = await Promise.all([
        prisma.vendorAssessment.findMany({
            where: { organizationId, vendorId },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: { id: true, status: true, assessmentType: true, overallScore: true, createdAt: true },
        }),
        prisma.vendorIssue.findMany({
            where: { organizationId, vendorId },
            orderBy: { identifiedDate: 'desc' },
            take: 8,
            select: { id: true, title: true, status: true, severity: true },
        }),
        prisma.evidenceLink.findMany({
            where: { organizationId, vendorId },
            include: { storedObject: { select: { filename: true, scanStatus: true } } },
            take: 12,
        }),
        prisma.privacyActivityParty.findMany({ where: { organizationId, vendorId }, take: 8 }),
        prisma.privacyTransfer.findMany({ where: { organizationId, vendorId }, take: 8, select: { publicId: true, destinationJurisdiction: true, mechanism: true } }),
    ]);
    return {
        id: vendor.id,
        name: vendor.name,
        residualRiskScore: vendor.residualRiskScore,
        status: vendor.status,
        tier: vendor.tier,
        dataHandling: vendor.dataTypesAccessed.length ? vendor.dataTypesAccessed.join(', ') : UNKNOWN,
        servicesProvided: vendor.servicesProvided || UNKNOWN,
        assessments: assessments.map((row) => ({
            id: row.id,
            type: row.assessmentType,
            status: row.status,
            score: row.overallScore,
            createdAt: row.createdAt,
        })),
        findings: findings.map((row) => ({ id: row.id, title: row.title, status: row.status, severity: row.severity })),
        evidence: evidenceLinks.map((row) => ({
            filename: row.storedObject.filename,
            scanStatus: row.storedObject.scanStatus,
            usable: row.storedObject.scanStatus === ScanStatus.CLEAN,
        })),
        privacyRole: parties[0]?.privacyRole || UNKNOWN,
        transfers: transfers.length
            ? transfers.map((row) => ({ publicId: row.publicId, destination: row.destinationJurisdiction, mechanism: row.mechanism }))
            : [{ publicId: null, destination: UNKNOWN, mechanism: UNKNOWN }],
    };
}

export async function controlEvidenceWorkspace(organizationId: string, controlIds: string[]) {
    if (!controlIds.length) return [];
    const [controls, tests, evidence, mappings, findings] = await Promise.all([
        prisma.organizationControl.findMany({ where: { organizationId, id: { in: controlIds } } }),
        prisma.organizationControlTest.findMany({
            where: { organizationId, controlId: { in: controlIds } },
            orderBy: { testedAt: 'desc' },
        }),
        prisma.evidenceGovernanceLink.findMany({
            where: { organizationId, targetType: 'CONTROL', targetId: { in: controlIds }, validTo: null },
            include: { storedObject: { select: { id: true, filename: true, scanStatus: true, uploadedAt: true } } },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.requirementControlMapping.findMany({
            where: { validTo: null, organizationControlId: { in: controlIds } },
            include: { requirement: { include: { frameworkVersion: { include: { framework: true } } } } },
        }),
        prisma.organizationControlTest.findMany({
            where: { organizationId, controlId: { in: controlIds }, findingId: { not: null } },
            select: { controlId: true, findingId: true, result: true },
        }),
    ]);
    return controls.map((control) => {
        const controlTests = tests.filter((row) => row.controlId === control.id);
        const latestTest = controlTests[0] || null;
        const cleanEvidence = evidence
            .filter((row) => row.targetId === control.id && row.storedObject.scanStatus === ScanStatus.CLEAN)
            .map((row) => ({
                id: row.storedObject.id,
                filename: row.storedObject.filename,
                scanStatus: row.storedObject.scanStatus,
                freshness: displayedFreshness(row),
                relationship: row.relationship,
                uploadedAt: row.storedObject.uploadedAt,
                usable: true,
                honesty: 'CLEAN evidence is present. Presence is not effectiveness.',
            }));
        return {
            id: control.id,
            controlKey: control.controlKey,
            title: control.title,
            implementationStatus: control.implementationStatus,
            effectivenessStatus: control.effectivenessStatus,
            latestTest: latestTest
                ? { result: latestTest.result, testedAt: latestTest.testedAt, findingId: latestTest.findingId }
                : { result: 'NOT_TESTED', testedAt: null, findingId: null },
            cleanEvidence,
            evidenceFreshness: cleanEvidence[0]?.freshness || 'Not recorded',
            relatedFindings: findings.filter((row) => row.controlId === control.id).map((row) => row.findingId),
            relatedRequirements: mappings
                .filter((row) => row.organizationControlId === control.id)
                .map((row) => ({
                    requirementKey: row.requirement.requirementKey,
                    supremeSummary: row.requirement.supremeSummary,
                    frameworkKey: row.requirement.frameworkVersion.framework.frameworkKey,
                    frameworkName: row.requirement.frameworkVersion.framework.name,
                })),
            honesty: 'Only CLEAN evidence counts as supporting evidence. Evidence presence does not imply effectiveness.',
        };
    });
}

export async function frameworkReadiness(organizationId: string, frameworkKey: string) {
    const allowed = ['NIST_AI_RMF', 'ISO_42001'];
    if (!allowed.includes(frameworkKey)) throw new ApiError(404, 'AI readiness view not found');
    const coverage = await listFrameworkCoverage(organizationId, frameworkKey);
    const framework = coverage.frameworks[0] || null;
    const activation = await prisma.complianceActivation.findFirst({
        where: { organizationId, frameworkVersion: { framework: { frameworkKey } }, status: { not: 'CLOSED' } },
        include: { frameworkVersion: { include: { framework: true } } },
        orderBy: { createdAt: 'desc' },
    });
    let compliance: Record<string, unknown> | null = null;
    if (activation) {
        const [readiness, gaps, exceptions] = await Promise.all([
            enterpriseComplianceService.readinessFor(organizationId, activation.id),
            prisma.complianceGap.findMany({ where: { organizationId, activationId: activation.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
            prisma.complianceException.findMany({ where: { organizationId, activationId: activation.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
        ]);
        compliance = {
            activationPublicId: activation.publicId,
            version: activation.frameworkVersion.version,
            readiness,
            gaps: gaps.map((row) => ({ publicId: row.publicId, title: row.title, status: row.status })),
            exceptions: exceptions.map((row) => ({ publicId: row.publicId, status: row.status })),
        };
    }
    return {
        honesty: 'Readiness and mapping only. This is not certified, compliant, or attested. Identifiers and Supreme summaries only.',
        frameworkKey,
        name: framework?.name || (frameworkKey === 'NIST_AI_RMF' ? 'NIST AI Risk Management Framework' : 'ISO/IEC 42001'),
        version: framework?.version || UNKNOWN,
        areas: (framework?.requirements || []).map((row) => ({
            key: row.requirementKey,
            supremeSummary: row.supremeSummary,
            mappedControls: row.mappedControls,
            implementedControls: row.implementedControls,
            testedControls: row.testedControls,
            gap: row.gap,
        })),
        coverage: framework
            ? {
                requirementCount: framework.requirementCount,
                mapped: framework.mapped,
                implemented: framework.implemented,
                tested: framework.tested,
                gaps: framework.gaps,
            }
            : { requirementCount: 0, mapped: 0, implemented: 0, tested: 0, gaps: 0 },
        compliance,
        certified: false,
    };
}

export function versionWindow<T extends { createdAt: Date }>(rows: T[], from: Date, to?: Date | null) {
    const end = to ? to.getTime() : Number.POSITIVE_INFINITY;
    const start = from.getTime();
    return rows.filter((row) => {
        const at = row.createdAt.getTime();
        return at >= start && at <= end;
    });
}

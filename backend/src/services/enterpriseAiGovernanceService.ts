import {
    AiApprovalDecision,
    AiAutonomyLevel,
    AiDeploymentKind,
    AiImpactClass,
    AiIncidentStatus,
    AiLifecycleState,
    AiRegulatoryStatus,
    AiTestKind,
    AiTestResult,
    GovernanceNodeType,
    GovernanceRelationshipType,
    Prisma,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './auditEventService';
import { createRelationship, ensureNode } from './governanceGraphService';
import {
    AI_PROHIBITED_POLICY_EXAMPLES,
    AI_RISK_CATEGORIES,
    AI_SCREENING_QUESTIONS,
    calculateAiScore,
    honestyCopy,
    nextAiId,
    neutralizeSpreadsheetCell,
    screeningRecommendation,
} from './enterpriseAiGovernanceEngine';
import {
    controlEvidenceWorkspace,
    frameworkReadiness,
    vendorSnapshot,
    versionWindow,
} from './enterpriseAiGovernanceHydration';

const SYSTEM_INCLUDE = {
    useCases: true,
    models: { include: { provider: true }, orderBy: { effectiveFrom: 'desc' as const } },
    oversight: true,
    risks: true,
    scores: { orderBy: { createdAt: 'desc' as const }, take: 5 },
    assessments: { include: { screening: true } },
    tests: true,
    incidents: true,
    approvals: { orderBy: { createdAt: 'desc' as const } },
    exceptions: true,
    changes: { orderBy: { createdAt: 'desc' as const }, take: 20 },
    regulatoryReviews: true,
    controlLinks: true,
    privacyLinks: true,
    riskLinks: true,
} satisfies Prisma.AiSystemInclude;

async function nextId(organizationId: string, kind: string) {
    const row = await prisma.aiCounter.upsert({
        where: { organizationId_kind: { organizationId, kind } },
        create: { organizationId, kind, next: 2 },
        update: { next: { increment: 1 } },
    });
    return nextAiId(kind, row.next - 1);
}

async function history(organizationId: string, entityType: string, entityId: string, eventType: string, summary: string, actorUserId?: string | null, change?: string | null) {
    await prisma.aiHistory.create({
        data: { organizationId, entityType, entityId, eventType, summary, change: change || null, actorUserId: actorUserId || null },
    });
}

async function audit(input: { organizationId: string; actorUserId?: string | null; action: string; resourceType: string; resourceId?: string; metadata?: Record<string, unknown> }) {
    await recordAudit({ ...input, result: 'success' });
}

async function systemOrThrow(organizationId: string, publicId: string) {
    const row = await prisma.aiSystem.findFirst({
        where: { organizationId, OR: [{ publicId }, { id: publicId }] },
        include: SYSTEM_INCLUDE,
    });
    if (!row) throw new ApiError(404, 'AI system not found');
    return row;
}

function lifecycleFromApproval(decision: AiApprovalDecision): AiLifecycleState {
    if (decision === 'APPROVED' || decision === 'APPROVED_WITH_CONDITIONS') return AiLifecycleState.APPROVED;
    if (decision === 'RESTRICTED') return AiLifecycleState.RESTRICTED;
    if (decision === 'SUSPENDED') return AiLifecycleState.SUSPENDED;
    if (decision === 'RETIRED') return AiLifecycleState.RETIRED;
    return AiLifecycleState.IN_REVIEW;
}

async function projectSystem(organizationId: string, systemId: string, actorUserId?: string | null) {
    const system = await prisma.aiSystem.findFirst({
        where: { organizationId, id: systemId },
        include: { useCases: true, models: { include: { provider: true } }, tests: true, assessments: true, incidents: true, approvals: true, privacyLinks: true, riskLinks: true, controlLinks: true },
    });
    if (!system) return;
    const systemNode = await ensureNode({
        organizationId,
        nodeType: GovernanceNodeType.AI_SYSTEM,
        sourceModel: 'AiSystem',
        sourceId: system.publicId,
        displayLabel: `${system.publicId} ${system.name}`,
        status: system.lifecycle,
        actorUserId,
    });
    for (const useCase of system.useCases) {
        const node = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.AI_USE_CASE,
            sourceModel: 'AiUseCase',
            sourceId: useCase.publicId,
            displayLabel: `${useCase.publicId} ${useCase.name}`,
            status: useCase.approvalStatus || 'RECORDED',
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: systemNode.node.id,
            toNodeId: node.node.id,
            relationshipType: GovernanceRelationshipType.ASSOCIATED_WITH,
            createdBy: actorUserId,
        });
    }
    for (const model of system.models) {
        const providerNode = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.AI_PROVIDER,
            sourceModel: 'AiModelProvider',
            sourceId: model.provider.publicId,
            displayLabel: `${model.provider.publicId} ${model.provider.providerName}`,
            status: model.provider.availabilityStatus,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: systemNode.node.id,
            toNodeId: providerNode.node.id,
            relationshipType: GovernanceRelationshipType.USES,
            createdBy: actorUserId,
        });
        if (model.provider.vendorId) {
            const vendor = await prisma.vendor.findFirst({ where: { organizationId, id: model.provider.vendorId } });
            if (vendor) {
                const vendorNode = await ensureNode({
                    organizationId,
                    nodeType: GovernanceNodeType.VENDOR,
                    sourceModel: 'Vendor',
                    sourceId: vendor.id,
                    displayLabel: vendor.name,
                    status: vendor.status,
                    actorUserId,
                });
                await createRelationship({
                    organizationId,
                    fromNodeId: systemNode.node.id,
                    toNodeId: vendorNode.node.id,
                    relationshipType: GovernanceRelationshipType.PROVIDES_SERVICE_TO,
                    createdBy: actorUserId,
                });
            }
        }
    }
    for (const test of system.tests) {
        const node = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.AI_TEST,
            sourceModel: 'AiTest',
            sourceId: test.publicId,
            displayLabel: `${test.publicId} ${test.kind}`,
            status: test.result,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: node.node.id,
            toNodeId: systemNode.node.id,
            relationshipType: GovernanceRelationshipType.TESTED_BY,
            createdBy: actorUserId,
        });
    }
    for (const assessment of system.assessments) {
        const node = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.AI_ASSESSMENT,
            sourceModel: 'AiAssessment',
            sourceId: assessment.publicId,
            displayLabel: assessment.publicId,
            status: assessment.decision || 'RECORDED',
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: node.node.id,
            toNodeId: systemNode.node.id,
            relationshipType: GovernanceRelationshipType.ASSESSED_BY,
            createdBy: actorUserId,
        });
    }
    for (const approval of system.approvals) {
        const node = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.DECISION,
            sourceModel: 'AiApproval',
            sourceId: approval.publicId,
            displayLabel: `${approval.publicId} ${approval.decision}`,
            status: approval.decision,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: node.node.id,
            toNodeId: systemNode.node.id,
            relationshipType: GovernanceRelationshipType.GOVERNS,
            createdBy: actorUserId,
        });
    }
    for (const incident of system.incidents) {
        const node = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.INCIDENT,
            sourceModel: 'AiIncident',
            sourceId: incident.publicId,
            displayLabel: `${incident.publicId} ${incident.title}`,
            status: incident.status,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: node.node.id,
            toNodeId: systemNode.node.id,
            relationshipType: GovernanceRelationshipType.AFFECTS,
            createdBy: actorUserId,
        });
    }
    for (const link of system.privacyLinks) {
        const activity = await prisma.privacyProcessingActivity.findFirst({ where: { organizationId, id: link.activityId } });
        if (!activity) continue;
        const node = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.PROCESSING_ACTIVITY,
            sourceModel: 'PrivacyProcessingActivity',
            sourceId: activity.publicId,
            displayLabel: `${activity.publicId} ${activity.name}`,
            status: activity.status,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: systemNode.node.id,
            toNodeId: node.node.id,
            relationshipType: GovernanceRelationshipType.PROCESSES,
            createdBy: actorUserId,
        });
    }
    for (const link of system.riskLinks) {
        const risk = await prisma.enterpriseRisk.findFirst({ where: { organizationId, id: link.enterpriseRiskId } });
        if (!risk) continue;
        const node = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.RISK,
            sourceModel: 'EnterpriseRisk',
            sourceId: risk.publicId,
            displayLabel: `${risk.publicId} ${risk.title}`,
            status: risk.status,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: systemNode.node.id,
            toNodeId: node.node.id,
            relationshipType: GovernanceRelationshipType.HAS_RISK,
            createdBy: actorUserId,
        });
    }
    for (const link of system.controlLinks) {
        const control = await prisma.organizationControl.findFirst({ where: { organizationId, id: link.controlId } });
        if (!control) continue;
        const node = await ensureNode({
            organizationId,
            nodeType: GovernanceNodeType.CONTROL,
            sourceModel: 'OrganizationControl',
            sourceId: control.id,
            displayLabel: control.title || control.controlKey,
            status: control.effectivenessStatus,
            actorUserId,
        });
        await createRelationship({
            organizationId,
            fromNodeId: node.node.id,
            toNodeId: systemNode.node.id,
            relationshipType: GovernanceRelationshipType.MITIGATES,
            createdBy: actorUserId,
        });
    }
}

function publicSystem(row: Awaited<ReturnType<typeof systemOrThrow>>) {
    const latestScore = row.scores[0] || null;
    return {
        ...row,
        vendorId: row.vendorId,
        latestScore,
        monitoring: { status: 'Manual / Not configured', source: 'None' },
        honesty: honestyCopy(),
    };
}

async function hydrateSystem(row: Awaited<ReturnType<typeof systemOrThrow>>) {
    const vendorIds = [...new Set([row.vendorId, ...row.models.map((model) => model.provider.vendorId)].filter(Boolean))] as string[];
    const vendors = (await Promise.all(vendorIds.map((id) => vendorSnapshot(row.organizationId, id)))).filter(Boolean);
    const controls = await controlEvidenceWorkspace(row.organizationId, row.controlLinks.map((link) => link.controlId));
    const [nist, iso] = await Promise.all([
        frameworkReadiness(row.organizationId, 'NIST_AI_RMF').catch(() => null),
        frameworkReadiness(row.organizationId, 'ISO_42001').catch(() => null),
    ]);
    const currentModel = row.models.find((model) => !model.effectiveTo) || row.models[0] || null;
    const priorModel = row.models.find((model) => model.id !== currentModel?.id) || null;
    const modelVersions = row.models.map((model) => ({
        id: model.id,
        providerPublicId: model.provider.publicId,
        providerName: model.provider.providerName,
        modelFamily: model.provider.modelFamily || 'Not recorded',
        modelVersion: model.modelVersion || model.provider.modelVersion || 'Not recorded',
        priorVersion: model.priorVersion || 'Not recorded',
        changeReason: model.changeReason || 'Not recorded',
        effectiveFrom: model.effectiveFrom,
        effectiveTo: model.effectiveTo,
        status: model.effectiveTo ? 'SUPERSEDED' : (model.status || 'CURRENT'),
        tests: versionWindow(row.tests, model.effectiveFrom, model.effectiveTo).map((item) => ({ publicId: item.publicId, kind: item.kind, result: item.result })),
        approvals: versionWindow(row.approvals, model.effectiveFrom, model.effectiveTo).map((item) => ({ publicId: item.publicId, decision: item.decision })),
        risks: versionWindow(row.risks, model.effectiveFrom, model.effectiveTo).map((item) => ({ publicId: item.publicId, category: item.category })),
        evidence: controls.flatMap((control) => control.cleanEvidence),
    }));
    const latestChange = row.changes[0] || null;
    return {
        ...publicSystem(row),
        vendors,
        relatedVendor: vendors[0] || null,
        controlWorkspace: controls,
        compliance: {
            honesty: 'Readiness only. Not certified or legally determined.',
            nistAiRmf: nist,
            iso42001: iso,
        },
        currentModel: currentModel
            ? {
                providerPublicId: currentModel.provider.publicId,
                providerName: currentModel.provider.providerName,
                modelVersion: currentModel.modelVersion || currentModel.provider.modelVersion || 'Not recorded',
                effectiveFrom: currentModel.effectiveFrom,
                vendorId: currentModel.provider.vendorId,
            }
            : null,
        priorModel: priorModel
            ? {
                providerPublicId: priorModel.provider.publicId,
                modelVersion: priorModel.modelVersion || priorModel.provider.modelVersion || 'Not recorded',
                effectiveTo: priorModel.effectiveTo,
            }
            : null,
        modelVersions,
        changeReview: latestChange
            ? {
                publicId: latestChange.publicId,
                whatChanged: latestChange.summary,
                priorVersion: latestChange.priorVersion || priorModel?.modelVersion || 'Not recorded',
                newVersion: latestChange.newVersion || currentModel?.modelVersion || currentModel?.provider.modelVersion || 'Not recorded',
                changeReason: latestChange.changeReason || 'Not recorded',
                reviewRequired: latestChange.reviewRequired,
                reviewQuestion: 'Review required before this AI continues',
                humanDecision: 'No automatic approval. A person must record the decision.',
            }
            : null,
    };
}

export const enterpriseAiGovernanceService = {
    catalog() {
        return {
            honesty: honestyCopy(),
            riskCategories: AI_RISK_CATEGORIES,
            screeningQuestions: AI_SCREENING_QUESTIONS,
            prohibitedPolicyExamples: AI_PROHIBITED_POLICY_EXAMPLES,
            lifecycle: Object.values(AiLifecycleState),
            methodologyVersion: 'supreme-ai-1.0.0',
            monitoring: 'Manual / Not configured',
            providerDefault: 'Unknown / Not recorded',
        };
    },

    async dashboard(organizationId: string) {
        const [systems, useCases, tests, incidents, exceptions, approvals] = await Promise.all([
            prisma.aiSystem.findMany({ where: { organizationId }, include: { approvals: true, tests: true, exceptions: true, assessments: true } }),
            prisma.aiUseCase.count({ where: { organizationId } }),
            prisma.aiTest.findMany({ where: { organizationId } }),
            prisma.aiIncident.findMany({ where: { organizationId } }),
            prisma.aiException.findMany({ where: { organizationId }, include: { system: { select: { publicId: true } } } }),
            prisma.aiApproval.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 8 }),
        ]);
        const now = new Date();
        const attention: Array<{ type: string; why: string; publicId: string; href: string; severity: string }> = [];
        for (const system of systems) {
            const approved = system.approvals.some((row) => row.decision === 'APPROVED' || row.decision === 'APPROVED_WITH_CONDITIONS');
            if ((system.lifecycle === 'PRODUCTION' || system.lifecycle === 'APPROVED') && !approved) {
                attention.push({ type: 'Unapproved production AI', why: `${system.publicId} is recorded as ${system.lifecycle} without a current human approval.`, publicId: system.publicId, href: `/ai-governance/systems/${system.publicId}`, severity: 'high' });
            }
            if (!system.businessOwner && !system.technicalOwner && !system.riskOwner) {
                attention.push({ type: 'AI without owner', why: `${system.publicId} has no recorded owner.`, publicId: system.publicId, href: `/ai-governance/systems/${system.publicId}`, severity: 'medium' });
            }
            if (system.personalData && !system.assessments.length) {
                attention.push({ type: 'Personal data without assessment', why: `${system.publicId} uses personal data and has no recorded AI assessment.`, publicId: system.publicId, href: `/ai-governance/systems/${system.publicId}`, severity: 'high' });
            }
            if (system.reviewAt && system.reviewAt < now) {
                attention.push({ type: 'Review overdue', why: `${system.publicId} review date has passed.`, publicId: system.publicId, href: `/ai-governance/systems/${system.publicId}`, severity: 'medium' });
            }
        }
        for (const test of tests.filter((row) => row.result === 'FAIL')) {
            attention.push({ type: 'Failed test', why: `${test.publicId} ${test.kind} is recorded as fail. This is not an invented result.`, publicId: test.publicId, href: '/ai-governance/testing', severity: 'high' });
        }
        for (const incident of incidents.filter((row) => row.status !== 'CLOSED')) {
            attention.push({ type: 'Open incident', why: `${incident.publicId} remains open.`, publicId: incident.publicId, href: '/ai-governance/incidents', severity: 'high' });
        }
        for (const exception of exceptions.filter((row) => row.status === 'ACTIVE' && row.expiresAt < now)) {
            attention.push({ type: 'Expired exception', why: `${exception.publicId} has expired and still needs review.`, publicId: exception.publicId, href: `/ai-governance/systems/${exception.system.publicId}`, severity: 'medium' });
        }
        const changed = await prisma.aiHistory.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 8 });
        return {
            honesty: honestyCopy(),
            monitoring: 'Manual / Not configured',
            totals: {
                activeSystems: systems.filter((row) => row.lifecycle !== 'RETIRED').length,
                productionSystems: systems.filter((row) => row.lifecycle === 'PRODUCTION').length,
                highRiskUses: systems.filter((row) => row.organizationClass === 'HIGH' || row.residualRating === 'HIGH').length,
                awaitingApproval: systems.filter((row) => ['PROPOSED', 'IN_REVIEW', 'PILOT'].includes(row.lifecycle)).length,
                reviewsOverdue: systems.filter((row) => row.reviewAt && row.reviewAt < now).length,
                testsOverdue: tests.filter((row) => row.result === 'NOT_TESTED').length,
                incidentsOpen: incidents.filter((row) => row.status !== 'CLOSED').length,
                withoutOwners: systems.filter((row) => !row.businessOwner && !row.technicalOwner).length,
                personalData: systems.filter((row) => row.personalData).length,
                externalVendors: new Set([
                    ...systems.map((row) => row.vendorId).filter(Boolean),
                    ...(await prisma.aiModelProvider.findMany({ where: { organizationId, vendorId: { not: null } }, select: { vendorId: true } })).map((row) => row.vendorId),
                ]).size,
                useCases,
            },
            attention,
            changed: changed.map((row) => ({ title: row.summary, change: row.change, createdAt: row.createdAt })),
        };
    },

    async listSystems(organizationId: string, q?: string) {
        const rows = await prisma.aiSystem.findMany({
            where: {
                organizationId,
                ...(q ? {
                    OR: [
                        { publicId: { contains: q, mode: 'insensitive' } },
                        { name: { contains: q, mode: 'insensitive' } },
                        { businessPurpose: { contains: q, mode: 'insensitive' } },
                    ],
                } : {}),
            },
            orderBy: { publicId: 'asc' },
            include: { useCases: true, approvals: { take: 1, orderBy: { createdAt: 'desc' } } },
        });
        return rows.map((row) => ({
            publicId: row.publicId,
            name: row.name,
            lifecycle: row.lifecycle,
            organizationClass: row.organizationClass,
            residualRating: row.residualRating,
            personalData: row.personalData,
            owner: row.businessOwner || row.technicalOwner || 'Unassigned',
            useCases: row.useCases.length,
            latestApproval: row.approvals[0]?.decision || 'None',
        }));
    },

    async getSystem(organizationId: string, publicId: string) {
        return hydrateSystem(await systemOrThrow(organizationId, publicId));
    },

    async createSystem(organizationId: string, body: Record<string, unknown>, actorUserId?: string) {
        const name = String(body.name || '').trim();
        if (!name) throw new ApiError(400, 'Name is required');
        const publicId = await nextId(organizationId, 'AI');
        const row = await prisma.aiSystem.create({
            data: {
                organizationId,
                publicId,
                name,
                description: body.description ? String(body.description) : null,
                businessPurpose: body.businessPurpose ? String(body.businessPurpose) : null,
                businessUnit: body.businessUnit ? String(body.businessUnit) : null,
                businessOwner: body.businessOwner ? String(body.businessOwner) : null,
                technicalOwner: body.technicalOwner ? String(body.technicalOwner) : null,
                riskOwner: body.riskOwner ? String(body.riskOwner) : null,
                vendorId: body.vendorId ? String(body.vendorId) : null,
                modelProviderName: body.modelProviderName ? String(body.modelProviderName) : null,
                modelVersion: body.modelVersion ? String(body.modelVersion) : null,
                deploymentKind: (body.deploymentKind as AiDeploymentKind) || 'UNKNOWN',
                lifecycle: 'PROPOSED',
                decisionInfluence: body.decisionInfluence ? String(body.decisionInfluence) : null,
                autonomy: (body.autonomy as AiAutonomyLevel) || 'NOT_RECORDED',
                dataCategories: Array.isArray(body.dataCategories) ? body.dataCategories.map(String) : [],
                personalData: Boolean(body.personalData),
                sensitiveData: Boolean(body.sensitiveData),
                jurisdictions: Array.isArray(body.jurisdictions) ? body.jurisdictions.map(String) : [],
                criticality: body.criticality ? String(body.criticality) : null,
            },
            include: SYSTEM_INCLUDE,
        });
        await prisma.aiOversight.create({
            data: { organizationId, systemId: row.id },
        });
        await history(organizationId, 'AiSystem', row.publicId, 'created', `AI system ${row.publicId} recorded`, actorUserId, 'Proposed. Not approved.');
        await audit({ organizationId, actorUserId, action: 'ai.system.created', resourceType: 'AiSystem', resourceId: row.publicId });
        await projectSystem(organizationId, row.id, actorUserId);
        return hydrateSystem(await systemOrThrow(organizationId, row.publicId));
    },

    async updateSystem(organizationId: string, publicId: string, body: Record<string, unknown>, actorUserId?: string) {
        const current = await systemOrThrow(organizationId, publicId);
        if (body.lifecycle && ['APPROVED', 'PRODUCTION'].includes(String(body.lifecycle)) && !current.approvals.some((row) => ['APPROVED', 'APPROVED_WITH_CONDITIONS'].includes(row.decision))) {
            throw new ApiError(400, 'Approved or production state requires a recorded human approval.');
        }
        const row = await prisma.aiSystem.update({
            where: { id: current.id },
            data: {
                name: body.name ? String(body.name) : undefined,
                description: body.description !== undefined ? String(body.description || '') : undefined,
                businessPurpose: body.businessPurpose !== undefined ? String(body.businessPurpose || '') : undefined,
                businessOwner: body.businessOwner !== undefined ? String(body.businessOwner || '') : undefined,
                technicalOwner: body.technicalOwner !== undefined ? String(body.technicalOwner || '') : undefined,
                riskOwner: body.riskOwner !== undefined ? String(body.riskOwner || '') : undefined,
                decisionInfluence: body.decisionInfluence !== undefined ? String(body.decisionInfluence || '') : undefined,
                autonomy: body.autonomy ? body.autonomy as AiAutonomyLevel : undefined,
                personalData: body.personalData !== undefined ? Boolean(body.personalData) : undefined,
                sensitiveData: body.sensitiveData !== undefined ? Boolean(body.sensitiveData) : undefined,
                organizationClass: body.organizationClass ? body.organizationClass as AiImpactClass : undefined,
                reviewAt: body.reviewAt ? new Date(String(body.reviewAt)) : undefined,
                lifecycle: body.lifecycle ? body.lifecycle as AiLifecycleState : undefined,
            },
        });
        await history(organizationId, 'AiSystem', row.publicId, 'updated', `AI system ${row.publicId} updated`, actorUserId);
        await audit({ organizationId, actorUserId, action: 'ai.system.updated', resourceType: 'AiSystem', resourceId: row.publicId });
        await projectSystem(organizationId, row.id, actorUserId);
        if (row.reviewAt && row.reviewAt.getTime() <= Date.now() + 14 * 86400000) {
            const { emitSupremeAutomationEvent } = await import('./supremeAutomationBus');
            await emitSupremeAutomationEvent({
                organizationId,
                event: 'ai.approval.due',
                sourceModel: 'AiSystem',
                sourceId: row.id,
                sourcePublicId: row.publicId,
                actorUserId,
            });
        }
        return this.getSystem(organizationId, row.publicId);
    },

    async addUseCase(organizationId: string, systemPublicId: string, body: Record<string, unknown>, actorUserId?: string) {
        const system = await systemOrThrow(organizationId, systemPublicId);
        const name = String(body.name || '').trim();
        if (!name) throw new ApiError(400, 'Use-case name is required');
        const publicId = await nextId(organizationId, 'USE');
        const row = await prisma.aiUseCase.create({
            data: {
                organizationId,
                systemId: system.id,
                publicId,
                name,
                purpose: body.purpose ? String(body.purpose) : null,
                businessProcess: body.businessProcess ? String(body.businessProcess) : null,
                decisionInfluence: body.decisionInfluence ? String(body.decisionInfluence) : null,
                affectedPersons: body.affectedPersons ? String(body.affectedPersons) : null,
                dataSummary: body.dataSummary ? String(body.dataSummary) : null,
                owner: body.owner ? String(body.owner) : null,
                jurisdiction: body.jurisdiction ? String(body.jurisdiction) : null,
                autonomy: (body.autonomy as AiAutonomyLevel) || 'NOT_RECORDED',
            },
        });
        await history(organizationId, 'AiUseCase', row.publicId, 'created', `Use case ${row.publicId} added to ${system.publicId}`, actorUserId);
        await projectSystem(organizationId, system.id, actorUserId);
        return row;
    },

    async getUseCase(organizationId: string, publicId: string) {
        const row = await prisma.aiUseCase.findFirst({
            where: { organizationId, publicId },
            include: { system: true, assessments: true, tests: true, incidents: true, approvals: true },
        });
        if (!row) throw new ApiError(404, 'AI use case not found');
        return row;
    },

    async recordProvider(organizationId: string, body: Record<string, unknown>, actorUserId?: string) {
        const providerName = String(body.providerName || '').trim();
        if (!providerName) throw new ApiError(400, 'Provider name is required');
        if (body.vendorId) {
            const vendor = await prisma.vendor.findFirst({ where: { organizationId, id: String(body.vendorId) } });
            if (!vendor) throw new ApiError(404, 'Vendor not found');
        }
        const publicId = await nextId(organizationId, 'MDL');
        const row = await prisma.aiModelProvider.create({
            data: {
                organizationId,
                publicId,
                vendorId: body.vendorId ? String(body.vendorId) : null,
                providerName,
                modelFamily: body.modelFamily ? String(body.modelFamily) : null,
                modelVersion: body.modelVersion ? String(body.modelVersion) : null,
                hosting: body.hosting ? String(body.hosting) : null,
                deployment: body.deployment ? String(body.deployment) : null,
                trainingDataAssertion: body.trainingDataAssertion ? String(body.trainingDataAssertion) : null,
                retentionAssertion: body.retentionAssertion ? String(body.retentionAssertion) : null,
                availabilityStatus: body.availabilityStatus ? String(body.availabilityStatus) : 'Unknown / Not recorded',
            },
        });
        await history(organizationId, 'AiModelProvider', row.publicId, 'created', `Model/provider ${row.publicId} recorded`, actorUserId);
        return row;
    },

    async listProviders(organizationId: string) {
        const rows = await prisma.aiModelProvider.findMany({
            where: { organizationId },
            include: { systems: { include: { system: { select: { publicId: true, name: true } } } } },
            orderBy: { publicId: 'asc' },
        });
        return Promise.all(rows.map(async (row) => ({
            ...row,
            vendor: await vendorSnapshot(organizationId, row.vendorId),
            systemCount: row.systems.length,
        })));
    },

    async getProvider(organizationId: string, publicId: string) {
        const row = await prisma.aiModelProvider.findFirst({
            where: { organizationId, OR: [{ publicId }, { id: publicId }] },
            include: {
                systems: { include: { system: { include: { useCases: true, incidents: true, regulatoryReviews: true, controlLinks: true, privacyLinks: true } } } },
            },
        });
        if (!row) throw new ApiError(404, 'Model/provider not found');
        const vendor = await vendorSnapshot(organizationId, row.vendorId);
        const systemIds = row.systems.map((item) => item.system.id);
        const controlIds = [...new Set(row.systems.flatMap((item) => item.system.controlLinks.map((link) => link.controlId)))];
        const activityIds = [...new Set(row.systems.flatMap((item) => item.system.privacyLinks.map((link) => link.activityId)))];
        const [controls, activities] = await Promise.all([
            controlEvidenceWorkspace(organizationId, controlIds),
            activityIds.length
                ? prisma.privacyProcessingActivity.findMany({ where: { organizationId, id: { in: activityIds } }, select: { publicId: true, name: true } })
                : Promise.resolve([]),
        ]);
        return {
            ...row,
            availabilityStatus: row.availabilityStatus || 'Unknown / Not recorded',
            trainingDataAssertion: row.trainingDataAssertion || 'Unknown / Not recorded',
            retentionAssertion: row.retentionAssertion || 'Unknown / Not recorded',
            vendor,
            models: [{
                family: row.modelFamily || 'Not recorded',
                version: row.modelVersion || 'Not recorded',
                hosting: row.hosting || 'Unknown / Not recorded',
                deployment: row.deployment || 'Unknown / Not recorded',
            }],
            systems: row.systems.map((item) => ({
                publicId: item.system.publicId,
                name: item.system.name,
                modelVersion: item.modelVersion || row.modelVersion || 'Not recorded',
                status: item.effectiveTo ? 'SUPERSEDED' : 'CURRENT',
                effectiveFrom: item.effectiveFrom,
                effectiveTo: item.effectiveTo,
            })),
            useCases: row.systems.flatMap((item) => item.system.useCases.map((useCase) => ({ publicId: useCase.publicId, name: useCase.name, systemPublicId: item.system.publicId }))),
            privacyActivities: activities,
            transfers: vendor?.transfers || [{ destination: 'Unknown / Not recorded', mechanism: 'Unknown / Not recorded' }],
            vendorResidualRisk: vendor?.residualRiskScore ?? null,
            assessments: vendor?.assessments || [],
            controls,
            evidence: controls.flatMap((item) => item.cleanEvidence),
            findings: vendor?.findings || [],
            incidents: row.systems.flatMap((item) => item.system.incidents.map((incident) => ({ publicId: incident.publicId, title: incident.title, status: incident.status, systemPublicId: item.system.publicId }))),
            regulatoryReviews: row.systems.flatMap((item) => item.system.regulatoryReviews.map((review) => ({ publicId: review.publicId, regime: review.regime, status: review.status }))),
            honesty: 'Unknown / Not recorded until a person enters facts. Nothing is scraped or invented.',
            monitoring: 'Manual / Not configured',
            systemCount: systemIds.length,
        };
    },

    async updateProvider(organizationId: string, publicId: string, body: Record<string, unknown>, actorUserId?: string) {
        const row = await prisma.aiModelProvider.findFirst({ where: { organizationId, OR: [{ publicId }, { id: publicId }] } });
        if (!row) throw new ApiError(404, 'Model/provider not found');
        if (body.vendorId) {
            const vendor = await prisma.vendor.findFirst({ where: { organizationId, id: String(body.vendorId) } });
            if (!vendor) throw new ApiError(404, 'Vendor not found');
        }
        const updated = await prisma.aiModelProvider.update({
            where: { id: row.id },
            data: {
                vendorId: body.vendorId !== undefined ? (body.vendorId ? String(body.vendorId) : null) : undefined,
                modelFamily: body.modelFamily !== undefined ? String(body.modelFamily || '') : undefined,
                modelVersion: body.modelVersion !== undefined ? String(body.modelVersion || '') : undefined,
                hosting: body.hosting !== undefined ? String(body.hosting || '') : undefined,
                deployment: body.deployment !== undefined ? String(body.deployment || '') : undefined,
                trainingDataAssertion: body.trainingDataAssertion !== undefined ? String(body.trainingDataAssertion || '') : undefined,
                retentionAssertion: body.retentionAssertion !== undefined ? String(body.retentionAssertion || '') : undefined,
                notes: body.notes !== undefined ? String(body.notes || '') : undefined,
            },
        });
        if (body.vendorId) {
            await prisma.aiSystem.updateMany({
                where: { organizationId, vendorId: null, models: { some: { providerId: row.id } } },
                data: { vendorId: String(body.vendorId) },
            });
        }
        await history(organizationId, 'AiModelProvider', updated.publicId, 'updated', `Provider ${updated.publicId} updated`, actorUserId);
        return this.getProvider(organizationId, updated.publicId);
    },

    async attachProvider(organizationId: string, systemPublicId: string, providerPublicId: string, actorUserId?: string, body: Record<string, unknown> = {}) {
        const system = await systemOrThrow(organizationId, systemPublicId);
        const provider = await prisma.aiModelProvider.findFirst({ where: { organizationId, publicId: providerPublicId } });
        if (!provider) throw new ApiError(404, 'Model/provider not found');
        const current = system.models.find((model) => !model.effectiveTo);
        const newVersion = body.modelVersion ? String(body.modelVersion) : (provider.modelVersion || 'Not recorded');
        const priorVersion = current?.modelVersion || current?.provider.modelVersion || 'Not recorded';
        if (current?.providerId === provider.id && !body.modelVersion && !body.changeReason) {
            return this.getSystem(organizationId, system.publicId);
        }
        if (current) {
            await prisma.aiSystemModel.update({
                where: { id: current.id },
                data: { effectiveTo: new Date(), status: 'SUPERSEDED' },
            });
        }
        if (body.modelVersion) {
            await prisma.aiModelProvider.update({ where: { id: provider.id }, data: { modelVersion: String(body.modelVersion) } });
        }
        await prisma.aiSystemModel.create({
            data: {
                organizationId,
                systemId: system.id,
                providerId: provider.id,
                modelVersion: newVersion,
                priorVersion,
                changeReason: body.changeReason ? String(body.changeReason) : 'Provider attached',
                status: 'CURRENT',
            },
        });
        if (provider.vendorId && !system.vendorId) {
            await prisma.aiSystem.update({ where: { id: system.id }, data: { vendorId: provider.vendorId } });
        }
        const affected = await this.affected(organizationId, system.publicId);
        await prisma.aiChange.create({
            data: {
                organizationId,
                systemId: system.id,
                publicId: await nextId(organizationId, 'CHG'),
                changeType: current ? 'model_version_changed' : 'provider_attached',
                summary: current
                    ? `${provider.publicId} version changed from ${priorVersion} to ${newVersion}. Review required before this AI continues.`
                    : `${provider.publicId} attached to ${system.publicId}. Review required before this AI continues.`,
                priorVersion,
                newVersion,
                changeReason: body.changeReason ? String(body.changeReason) : (current ? 'Model or provider version changed' : 'Provider attached'),
                reviewRequired: true,
                impact: {
                    useCases: affected.useCases.map((row: { publicId: string }) => row.publicId),
                    people: system.useCases.map((row) => row.affectedPersons).filter(Boolean),
                    personalData: system.personalData,
                    vendorId: provider.vendorId,
                    tests: affected.tests.map((row: { publicId: string }) => row.publicId),
                    approvals: affected.approvals.map((row: { publicId: string }) => row.publicId),
                },
            },
        });
        await history(organizationId, 'AiSystem', system.publicId, 'model.changed', `Provider ${provider.publicId} ${current ? 'version changed' : 'attached'}`, actorUserId);
        await projectSystem(organizationId, system.id, actorUserId);
        return this.getSystem(organizationId, system.publicId);
    },

    async changeVersion(organizationId: string, systemPublicId: string, body: Record<string, unknown>, actorUserId?: string) {
        const system = await systemOrThrow(organizationId, systemPublicId);
        const current = system.models.find((model) => !model.effectiveTo) || system.models[0];
        const providerPublicId = body.providerPublicId ? String(body.providerPublicId) : current?.provider.publicId;
        if (!providerPublicId) throw new ApiError(400, 'A recorded provider is required before a version change.');
        if (!body.modelVersion) throw new ApiError(400, 'New model or provider version is required.');
        return this.attachProvider(organizationId, systemPublicId, providerPublicId, actorUserId, body);
    },

    async listAiControls(organizationId: string) {
        const links = await prisma.aiControlLink.findMany({ where: { organizationId }, include: { system: { select: { publicId: true, name: true } } } });
        const aig = await prisma.organizationControl.findMany({
            where: { organizationId, archivedAt: null, controlKey: { startsWith: 'AIG-' } },
        });
        const ids = [...new Set([...aig.map((row) => row.id), ...links.map((row) => row.controlId)])];
        const workspace = await controlEvidenceWorkspace(organizationId, ids);
        return workspace.map((control) => ({
            ...control,
            relatedSystems: links.filter((link) => link.controlId === control.id).map((link) => ({ publicId: link.system.publicId, name: link.system.name })),
        }));
    },

    async readiness(organizationId: string, frameworkKey: string) {
        return frameworkReadiness(organizationId, frameworkKey);
    },

    async vendorLinks(organizationId: string, vendorId: string) {
        const vendor = await vendorSnapshot(organizationId, vendorId);
        if (!vendor) throw new ApiError(404, 'Vendor not found');
        const providers = await prisma.aiModelProvider.findMany({
            where: { organizationId, vendorId },
            include: { systems: { include: { system: { select: { publicId: true, name: true, lifecycle: true } } } } },
        });
        const systems = providers.flatMap((row) => row.systems.map((item) => ({
            publicId: item.system.publicId,
            name: item.system.name,
            lifecycle: item.system.lifecycle,
            providerPublicId: row.publicId,
            providerName: row.providerName,
        })));
        return {
            vendor,
            providers: providers.map((row) => ({ publicId: row.publicId, providerName: row.providerName, modelVersion: row.modelVersion || 'Not recorded' })),
            systems,
        };
    },

    async setOversight(organizationId: string, systemPublicId: string, body: Record<string, unknown>, actorUserId?: string) {
        const system = await systemOrThrow(organizationId, systemPublicId);
        const row = await prisma.aiOversight.upsert({
            where: { systemId: system.id },
            create: {
                organizationId,
                systemId: system.id,
                humanReviewRequired: body.humanReviewRequired !== false,
                humanCanOverride: body.humanCanOverride !== false,
                humanCanStop: body.humanCanStop !== false,
                reviewPoint: body.reviewPoint ? String(body.reviewPoint) : null,
                approvalThreshold: body.approvalThreshold ? String(body.approvalThreshold) : null,
                escalationPath: body.escalationPath ? String(body.escalationPath) : null,
                oversightOwner: body.oversightOwner ? String(body.oversightOwner) : null,
                evidenceNote: body.evidenceNote ? String(body.evidenceNote) : null,
            },
            update: {
                humanReviewRequired: body.humanReviewRequired !== undefined ? Boolean(body.humanReviewRequired) : undefined,
                humanCanOverride: body.humanCanOverride !== undefined ? Boolean(body.humanCanOverride) : undefined,
                humanCanStop: body.humanCanStop !== undefined ? Boolean(body.humanCanStop) : undefined,
                reviewPoint: body.reviewPoint !== undefined ? String(body.reviewPoint || '') : undefined,
                oversightOwner: body.oversightOwner !== undefined ? String(body.oversightOwner || '') : undefined,
            },
        });
        await history(organizationId, 'AiSystem', system.publicId, 'oversight.updated', `Human oversight updated for ${system.publicId}`, actorUserId);
        return row;
    },

    async addRisk(organizationId: string, systemPublicId: string, body: Record<string, unknown>, actorUserId?: string) {
        const system = await systemOrThrow(organizationId, systemPublicId);
        const category = String(body.category || '').trim();
        if (!category) throw new ApiError(400, 'Risk category is required');
        const row = await prisma.aiRisk.create({
            data: {
                organizationId,
                systemId: system.id,
                publicId: await nextId(organizationId, 'AIR'),
                category,
                applies: body.applies !== false,
                note: body.note ? String(body.note) : null,
            },
        });
        await history(organizationId, 'AiRisk', row.publicId, 'created', `AI risk ${row.publicId} recorded`, actorUserId);
        return row;
    },

    async scoreSystem(organizationId: string, systemPublicId: string, body: Record<string, unknown>, actorUserId?: string) {
        const system = await systemOrThrow(organizationId, systemPublicId);
        const scored = calculateAiScore(body);
        const snapshot = await prisma.aiScoreSnapshot.create({
            data: {
                organizationId,
                systemId: system.id,
                ...scored,
                kind: body.kind === 'INHERENT' ? 'INHERENT' : 'RESIDUAL',
            },
        });
        await prisma.aiSystem.update({
            where: { id: system.id },
            data: body.kind === 'INHERENT'
                ? { inherentRating: scored.rating }
                : { residualRating: scored.rating },
        });
        await history(organizationId, 'AiSystem', system.publicId, 'risk.assessed', `Score ${scored.score} ${scored.rating} recorded`, actorUserId, scored.calculation);
        return snapshot;
    },

    async createAssessment(organizationId: string, body: Record<string, unknown>, actorUserId?: string) {
        const system = await systemOrThrow(organizationId, String(body.systemPublicId || ''));
        const answers = Array.isArray(body.answers) ? body.answers as Array<{ key: string; answer: boolean }> : [];
        const advice = screeningRecommendation(answers);
        const publicId = await nextId(organizationId, 'AIA');
        const row = await prisma.aiAssessment.create({
            data: {
                organizationId,
                systemId: system.id,
                useCaseId: body.useCasePublicId
                    ? (await prisma.aiUseCase.findFirst({ where: { organizationId, publicId: String(body.useCasePublicId) } }))?.id
                    : undefined,
                publicId,
                purpose: body.purpose ? String(body.purpose) : null,
                stakeholders: body.stakeholders ? String(body.stakeholders) : null,
                residualNote: body.residualNote ? String(body.residualNote) : null,
                recommendation: advice.recommendation,
                screening: { create: answers.map((answer) => ({ organizationId, questionKey: answer.key, answer: Boolean(answer.answer) })) },
            },
            include: { screening: true },
        });
        await prisma.aiSystem.update({ where: { id: system.id }, data: { lastAssessedAt: new Date() } });
        await history(organizationId, 'AiAssessment', row.publicId, 'created', `Assessment ${row.publicId} recorded`, actorUserId, advice.recommendation);
        await projectSystem(organizationId, system.id, actorUserId);
        return row;
    },

    async decideAssessment(organizationId: string, publicId: string, body: Record<string, unknown>, actorUserId?: string) {
        const row = await prisma.aiAssessment.findFirst({ where: { organizationId, publicId } });
        if (!row) throw new ApiError(404, 'AI assessment not found');
        const updated = await prisma.aiAssessment.update({
            where: { id: row.id },
            data: {
                decision: String(body.decision || 'Recorded determination'),
                conditions: body.conditions ? String(body.conditions) : null,
                reviewAt: body.reviewAt ? new Date(String(body.reviewAt)) : null,
            },
        });
        await history(organizationId, 'AiAssessment', publicId, 'decided', `Assessment ${publicId} decision recorded`, actorUserId);
        return updated;
    },

    async recordTest(organizationId: string, body: Record<string, unknown>, actorUserId?: string) {
        const system = await systemOrThrow(organizationId, String(body.systemPublicId || ''));
        const row = await prisma.aiTest.create({
            data: {
                organizationId,
                systemId: system.id,
                publicId: await nextId(organizationId, 'TST'),
                kind: (body.kind as AiTestKind) || 'ACCURACY',
                method: body.method ? String(body.method) : null,
                datasetRef: body.datasetRef ? String(body.datasetRef) : null,
                tester: body.tester ? String(body.tester) : null,
                testedAt: body.testedAt ? new Date(String(body.testedAt)) : new Date(),
                result: (body.result as AiTestResult) || 'NOT_TESTED',
                threshold: body.threshold ? String(body.threshold) : null,
                notes: body.notes ? String(body.notes) : null,
            },
        });
        await prisma.aiSystem.update({ where: { id: system.id }, data: { lastTestedAt: row.testedAt } });
        await history(organizationId, 'AiTest', row.publicId, 'recorded', `Test ${row.publicId} ${row.result}`, actorUserId);
        await projectSystem(organizationId, system.id, actorUserId);
        return row;
    },

    async approve(organizationId: string, body: Record<string, unknown>, actorUserId?: string) {
        const system = await systemOrThrow(organizationId, String(body.systemPublicId || ''));
        const decision = body.decision as AiApprovalDecision;
        if (!decision) throw new ApiError(400, 'Decision is required');
        const rationale = String(body.rationale || '').trim();
        if (!rationale) throw new ApiError(400, 'Rationale is required');
        const decisionMaker = String(body.decisionMaker || '').trim();
        if (!decisionMaker) throw new ApiError(400, 'Decision maker is required');
        const row = await prisma.aiApproval.create({
            data: {
                organizationId,
                systemId: system.id,
                publicId: await nextId(organizationId, 'APV'),
                decision,
                decisionMaker,
                authority: body.authority ? String(body.authority) : null,
                rationale,
                conditions: body.conditions ? String(body.conditions) : null,
                reviewAt: body.reviewAt ? new Date(String(body.reviewAt)) : null,
            },
        });
        await prisma.aiSystem.update({
            where: { id: system.id },
            data: { lifecycle: lifecycleFromApproval(decision) },
        });
        await history(organizationId, 'AiApproval', row.publicId, 'recorded', `Human approval ${row.publicId} ${decision}`, actorUserId, rationale);
        await audit({ organizationId, actorUserId, action: 'ai.approval.recorded', resourceType: 'AiApproval', resourceId: row.publicId });
        await projectSystem(organizationId, system.id, actorUserId);
        return row;
    },

    async recordIncident(organizationId: string, body: Record<string, unknown>, actorUserId?: string) {
        const system = await systemOrThrow(organizationId, String(body.systemPublicId || ''));
        const title = String(body.title || '').trim();
        if (!title) throw new ApiError(400, 'Title is required');
        const row = await prisma.aiIncident.create({
            data: {
                organizationId,
                systemId: system.id,
                publicId: await nextId(organizationId, 'AIN'),
                title,
                severity: String(body.severity || 'MEDIUM'),
                impact: body.impact ? String(body.impact) : null,
                owner: body.owner ? String(body.owner) : null,
            },
        });
        await history(organizationId, 'AiIncident', row.publicId, 'opened', `Incident ${row.publicId} opened`, actorUserId);
        await projectSystem(organizationId, system.id, actorUserId);
        return row;
    },

    async closeIncident(organizationId: string, publicId: string, body: Record<string, unknown>, actorUserId?: string) {
        const row = await prisma.aiIncident.findFirst({ where: { organizationId, publicId } });
        if (!row) throw new ApiError(404, 'AI incident not found');
        const decision = String(body.decision || '').trim();
        if (!decision) throw new ApiError(400, 'Human closure decision is required');
        const updated = await prisma.aiIncident.update({
            where: { id: row.id },
            data: { status: AiIncidentStatus.CLOSED, decision, closedAt: new Date() },
        });
        await history(organizationId, 'AiIncident', publicId, 'closed', `Incident ${publicId} closed`, actorUserId, decision);
        return updated;
    },

    async recordException(organizationId: string, body: Record<string, unknown>, actorUserId?: string) {
        const system = await systemOrThrow(organizationId, String(body.systemPublicId || ''));
        const row = await prisma.aiException.create({
            data: {
                organizationId,
                systemId: system.id,
                publicId: await nextId(organizationId, 'AEX'),
                scope: String(body.scope || 'Recorded exception'),
                rationale: String(body.rationale || 'Recorded exception'),
                owner: body.owner ? String(body.owner) : null,
                approver: body.approver ? String(body.approver) : null,
                expiresAt: body.expiresAt ? new Date(String(body.expiresAt)) : new Date(Date.now() + 30 * 86400000),
                conditions: body.conditions ? String(body.conditions) : null,
            },
        });
        await history(organizationId, 'AiException', row.publicId, 'created', `Exception ${row.publicId} recorded`, actorUserId);
        return row;
    },

    async recordRegulatoryReview(organizationId: string, body: Record<string, unknown>, actorUserId?: string) {
        const system = await systemOrThrow(organizationId, String(body.systemPublicId || ''));
        const row = await prisma.aiRegulatoryReview.create({
            data: {
                organizationId,
                systemId: system.id,
                publicId: await nextId(organizationId, 'REG'),
                regime: String(body.regime || 'Organization classification'),
                jurisdiction: body.jurisdiction ? String(body.jurisdiction) : null,
                status: (body.status as AiRegulatoryStatus) || 'IN_REVIEW',
                owner: body.owner ? String(body.owner) : null,
                rationale: body.rationale ? String(body.rationale) : 'Potential applicability. Review required. Not a legal finding.',
                legalReview: body.legalReview ? String(body.legalReview) : null,
                version: body.version ? String(body.version) : null,
            },
        });
        await history(organizationId, 'AiRegulatoryReview', row.publicId, 'recorded', `Regulatory review ${row.publicId} recorded`, actorUserId);
        return row;
    },

    async linkControl(organizationId: string, systemPublicId: string, controlId: string, actorUserId?: string) {
        const system = await systemOrThrow(organizationId, systemPublicId);
        const control = await prisma.organizationControl.findFirst({ where: { organizationId, id: controlId } });
        if (!control) throw new ApiError(404, 'Control not found');
        await prisma.aiControlLink.create({ data: { organizationId, systemId: system.id, controlId: control.id } });
        await projectSystem(organizationId, system.id, actorUserId);
        return { linked: true };
    },

    async linkPrivacy(organizationId: string, systemPublicId: string, activityPublicId: string, actorUserId?: string) {
        const system = await systemOrThrow(organizationId, systemPublicId);
        const activity = await prisma.privacyProcessingActivity.findFirst({ where: { organizationId, publicId: activityPublicId } });
        if (!activity) throw new ApiError(404, 'Processing activity not found');
        await prisma.aiPrivacyLink.create({ data: { organizationId, systemId: system.id, activityId: activity.id } });
        await projectSystem(organizationId, system.id, actorUserId);
        return { linked: true };
    },

    async linkRisk(organizationId: string, systemPublicId: string, riskPublicId: string, actorUserId?: string) {
        const system = await systemOrThrow(organizationId, systemPublicId);
        const risk = await prisma.enterpriseRisk.findFirst({ where: { organizationId, publicId: riskPublicId } });
        if (!risk) throw new ApiError(404, 'Enterprise risk not found');
        await prisma.aiEnterpriseRiskLink.create({ data: { organizationId, systemId: system.id, enterpriseRiskId: risk.id } });
        await projectSystem(organizationId, system.id, actorUserId);
        return { linked: true, note: 'Potential impact only. Residual enterprise risk was not recalculated.' };
    },

    async recordChange(organizationId: string, systemPublicId: string, body: Record<string, unknown>, actorUserId?: string) {
        const system = await systemOrThrow(organizationId, systemPublicId);
        const row = await prisma.aiChange.create({
            data: {
                organizationId,
                systemId: system.id,
                publicId: await nextId(organizationId, 'CHG'),
                changeType: String(body.changeType || 'updated'),
                summary: String(body.summary || 'Recorded change. Review required before this AI continues.'),
                priorVersion: body.priorVersion ? String(body.priorVersion) : null,
                newVersion: body.newVersion ? String(body.newVersion) : null,
                changeReason: body.changeReason ? String(body.changeReason) : null,
                reviewRequired: body.reviewRequired !== false,
            },
        });
        await history(organizationId, 'AiChange', row.publicId, 'recorded', row.summary, actorUserId);
        return row;
    },

    async affected(organizationId: string, systemPublicId: string) {
        const system = await this.getSystem(organizationId, systemPublicId);
        const activities = await prisma.privacyProcessingActivity.findMany({
            where: { organizationId, id: { in: system.privacyLinks.map((row) => row.activityId) } },
        });
        const risks = await prisma.enterpriseRisk.findMany({
            where: { organizationId, id: { in: system.riskLinks.map((row) => row.enterpriseRiskId) } },
        });
        const latestChange = system.changes[0] || null;
        return {
            system: { publicId: system.publicId, name: system.name, lifecycle: system.lifecycle },
            whatChanged: latestChange
                ? {
                    publicId: latestChange.publicId,
                    summary: latestChange.summary,
                    priorVersion: latestChange.priorVersion || system.priorModel?.modelVersion || 'Not recorded',
                    newVersion: latestChange.newVersion || system.currentModel?.modelVersion || 'Not recorded',
                    changeReason: latestChange.changeReason || 'Not recorded',
                }
                : null,
            useCases: system.useCases.map((row) => ({ publicId: row.publicId, name: row.name, affectedPersons: row.affectedPersons || 'Not recorded' })),
            vendors: system.vendors || [],
            models: system.modelVersions,
            dataCategories: system.dataCategories,
            personalData: system.personalData,
            jurisdictions: system.jurisdictions,
            privacyActivities: activities.map((row) => ({ publicId: row.publicId, name: row.name })),
            enterpriseRisks: risks.map((row) => ({ publicId: row.publicId, title: row.title, residualRating: row.residualRating })),
            controls: (system.controlWorkspace || []).map((row: { controlKey: string; title: string; effectivenessStatus: string }) => ({
                controlKey: row.controlKey,
                title: row.title,
                effectiveness: row.effectivenessStatus,
            })),
            cleanEvidence: (system.controlWorkspace || []).flatMap((row: { cleanEvidence: Array<{ filename: string }> }) => row.cleanEvidence),
            tests: system.tests,
            testsRequiringRefresh: system.tests.filter((row) => row.result !== 'NOT_TESTED'),
            incidents: system.incidents,
            approvals: system.approvals,
            approvalsRequiringReview: system.approvals,
            compliance: system.compliance,
            reviewRequired: latestChange?.reviewRequired !== false,
            reviewQuestion: 'What do we need to review before this AI continues?',
            humanDecision: 'Review required before this AI continues. No automatic approval.',
        };
    },

    async importPreview(rows: Array<Record<string, string>>) {
        return rows.map((row, index) => {
            const name = neutralizeSpreadsheetCell(row.name || row.Name || '').trim();
            return {
                row: index + 1,
                name,
                valid: Boolean(name.replace(/^'/, '')),
                error: name.replace(/^'/, '') ? null : 'Name is required',
            };
        });
    },

    async importCommit(organizationId: string, rows: Array<Record<string, string>>, actorUserId?: string) {
        const preview = await this.importPreview(rows);
        const created: string[] = [];
        for (const [index, row] of rows.entries()) {
            if (!preview[index].valid) continue;
            const system = await this.createSystem(organizationId, {
                name: neutralizeSpreadsheetCell(row.name || row.Name).replace(/^'/, '').trim(),
                businessPurpose: neutralizeSpreadsheetCell(row.purpose || row.Purpose || ''),
            }, actorUserId);
            created.push(system.publicId);
        }
        return { created, skipped: preview.filter((row) => !row.valid).length };
    },

    async listExceptions(organizationId: string) {
        return prisma.aiException.findMany({ where: { organizationId }, include: { system: { select: { publicId: true, name: true } } }, orderBy: { publicId: 'asc' } });
    },

    async listTests(organizationId: string) {
        return prisma.aiTest.findMany({ where: { organizationId }, include: { system: { select: { publicId: true, name: true } } }, orderBy: { publicId: 'asc' } });
    },

    async listIncidents(organizationId: string) {
        return prisma.aiIncident.findMany({ where: { organizationId }, include: { system: { select: { publicId: true, name: true } } }, orderBy: { publicId: 'asc' } });
    },

    async listAssessments(organizationId: string) {
        return prisma.aiAssessment.findMany({ where: { organizationId }, include: { system: { select: { publicId: true, name: true } }, screening: true }, orderBy: { publicId: 'asc' } });
    },

    async listApprovals(organizationId: string) {
        return prisma.aiApproval.findMany({ where: { organizationId }, include: { system: { select: { publicId: true, name: true } } }, orderBy: { createdAt: 'desc' } });
    },

    async listRegulatory(organizationId: string) {
        return prisma.aiRegulatoryReview.findMany({ where: { organizationId }, include: { system: { select: { publicId: true, name: true } } }, orderBy: { publicId: 'asc' } });
    },

    async pack(organizationId: string) {
        const org = await prisma.organization.findUnique({ where: { id: organizationId } });
        const systems = await prisma.aiSystem.findMany({ where: { organizationId }, include: SYSTEM_INCLUDE, orderBy: { publicId: 'asc' } });
        const dashboard = await this.dashboard(organizationId);
        return {
            name: org?.name || 'Organization',
            honesty: honestyCopy(),
            dashboard,
            systems,
        };
    },
};

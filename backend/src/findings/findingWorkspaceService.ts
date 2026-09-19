import { GovernanceNodeType, GovernanceProvenance, GovernanceRelationshipType, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { omitForeignParent } from '../security/tenantOwnership';
import { governanceGraphService } from '../services/governanceGraphService';
import {
    FindingSourceSnapshot,
    buildSnapshot,
    displayTitleFor,
    nextAction,
    observedAnswer,
    responsibilityLabel,
    sourceKindFor,
    sourceLabel,
    whyFinding,
} from './findingWorkspace';

function asSnapshot(value: unknown): FindingSourceSnapshot | null {
    if (!value || typeof value !== 'object') return null;
    return value as FindingSourceSnapshot;
}

async function namesFor(organizationId: string, ids: Array<string | null | undefined>) {
    const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    if (!unique.length) return new Map<string, string>();
    const users = await prisma.user.findMany({
        where: { organizationId, id: { in: unique } },
        select: { id: true, firstName: true, lastName: true, email: true },
    });
    return new Map(users.map((row) => [row.id, `${row.firstName} ${row.lastName}`.trim() || row.email]));
}

async function persistSnapshot(issueId: string, snapshot: FindingSourceSnapshot) {
    await prisma.vendorIssue.update({
        where: { id: issueId },
        data: { sourceSnapshot: snapshot as Prisma.InputJsonValue },
    });
}

async function ensureFindingGraph(input: {
    organizationId: string;
    actorUserId?: string | null;
    issueId: string;
    title: string;
    vendorId: string;
    vendorName?: string | null;
    assessmentId?: string | null;
    assessmentLabel?: string | null;
}) {
    const findingNode = await governanceGraphService.ensureNode({
        organizationId: input.organizationId,
        nodeType: GovernanceNodeType.FINDING,
        sourceModel: 'VendorIssue',
        sourceId: input.issueId,
        displayLabel: input.title,
        actorUserId: input.actorUserId,
    });
    const vendorNode = await governanceGraphService.ensureNode({
        organizationId: input.organizationId,
        nodeType: GovernanceNodeType.VENDOR,
        sourceModel: 'Vendor',
        sourceId: input.vendorId,
        displayLabel: input.vendorName || 'Vendor',
        actorUserId: input.actorUserId,
    });
    await governanceGraphService.createRelationship({
        organizationId: input.organizationId,
        fromNodeId: vendorNode.node.id,
        toNodeId: findingNode.node.id,
        relationshipType: GovernanceRelationshipType.HAS_FINDING,
        provenance: GovernanceProvenance.SYSTEM,
        createdBy: input.actorUserId,
    });
    if (input.assessmentId) {
        const assessmentNode = await governanceGraphService.ensureNode({
            organizationId: input.organizationId,
            nodeType: GovernanceNodeType.ASSESSMENT,
            sourceModel: 'VendorAssessment',
            sourceId: input.assessmentId,
            displayLabel: input.assessmentLabel || 'Vendor assessment',
            actorUserId: input.actorUserId,
        });
        await governanceGraphService.createRelationship({
            organizationId: input.organizationId,
            fromNodeId: assessmentNode.node.id,
            toNodeId: findingNode.node.id,
            relationshipType: GovernanceRelationshipType.HAS_FINDING,
            provenance: GovernanceProvenance.ASSESSMENT,
            createdBy: input.actorUserId,
        });
    }
    return findingNode.node;
}

export async function listFindingSummaries(
    organizationId: string,
    filters?: { status?: string; severity?: string; vendorId?: string; sourceKind?: string; owner?: string; overdue?: boolean }
) {
    const rows = await prisma.vendorIssue.findMany({
        where: {
            organizationId,
            ...(filters?.status ? { status: filters.status as never } : {}),
            ...(filters?.severity ? { severity: filters.severity as never } : {}),
            ...(filters?.vendorId ? { vendorId: filters.vendorId } : {}),
            ...(filters?.owner ? { assignedTo: filters.owner } : {}),
        },
        include: { vendor: { select: { id: true, name: true, tier: true, organizationId: true } } },
        orderBy: [{ severity: 'desc' }, { identifiedDate: 'desc' }],
        take: 300,
    });
    const now = Date.now();
    const closed = new Set(['CLOSED', 'RISK_ACCEPTED', 'RESOLVED']);
    return rows
        .map((row) => {
            const snapshot = asSnapshot(row.sourceSnapshot);
            const issue = { ...row, sourceSnapshot: snapshot };
            const kind = sourceKindFor(issue);
            const due = row.targetRemediationDate ? row.targetRemediationDate.getTime() : null;
            return {
                ...row,
                vendor: omitForeignParent(organizationId, row.vendor),
                displayTitle: displayTitleFor(issue),
                sourceKind: kind,
                sourceLabel: sourceLabel(kind, snapshot),
                originalTitle: row.title,
                overdue: Boolean(due && due < now && !closed.has(row.status)),
                nextAction: nextAction(issue),
                responsibility: row.responsibility,
            };
        })
        .filter((row) => {
            if (filters?.sourceKind && row.sourceKind !== filters.sourceKind) return false;
            if (filters?.overdue && !row.overdue) return false;
            return true;
        });
}

export async function getFindingWorkspace(organizationId: string, issueId: string, actorUserId?: string) {
    const issue = await prisma.vendorIssue.findFirst({
        where: { id: issueId, organizationId },
        include: { vendor: true },
    });
    if (!issue) throw new ApiError(404, 'Finding not found.');

    const assessment = issue.assessmentId
        ? await prisma.vendorAssessment.findFirst({
            where: { id: issue.assessmentId, organizationId },
            select: { id: true, assessmentType: true, templateId: true, status: true, completedAt: true, createdAt: true },
        })
        : null;
    const response = issue.assessmentId && issue.questionId
        ? await prisma.assessmentResponse.findFirst({
            where: { assessmentId: issue.assessmentId, questionId: issue.questionId },
        })
        : null;
    const evidenceLinks = issue.assessmentId
        ? await prisma.evidenceLink.findMany({
            where: { organizationId, assessmentId: issue.assessmentId, ...(issue.questionId ? { questionId: issue.questionId } : {}) },
            include: { storedObject: { select: { id: true, filename: true, scanStatus: true } } },
            take: 20,
        }).catch(() => [])
        : [];
    const insurance = await prisma.insuranceVendorClassification.findFirst({
        where: { organizationId, vendorId: issue.vendorId },
    }).catch(() => null);

    let snapshot = asSnapshot(issue.sourceSnapshot);
    if (!snapshot) {
        snapshot = buildSnapshot({
            kind: sourceKindFor({ ...issue, sourceSnapshot: null }),
            questionId: issue.questionId,
            questionText: response?.questionText || issue.title,
            answer: response?.response || null,
            assessmentId: issue.assessmentId,
            assessmentType: assessment?.assessmentType,
            section: response?.questionCategory,
            pack: response?.questionCategory,
            draftRuleCode: issue.draftRuleCode,
            title: issue.title,
            category: issue.category,
            evidenceRefs: evidenceLinks.map((row) => row.storedObject.id),
        });
        await persistSnapshot(issue.id, snapshot);
    }

    const graphNode = await ensureFindingGraph({
        organizationId,
        actorUserId,
        issueId: issue.id,
        title: displayTitleFor({ ...issue, sourceSnapshot: snapshot }),
        vendorId: issue.vendorId,
        vendorName: issue.vendor.name,
        assessmentId: issue.assessmentId,
        assessmentLabel: assessment?.assessmentType || 'Vendor assessment',
    });

    const names = await namesFor(organizationId, [issue.assignedTo, issue.identifiedBy, issue.validatedBy, issue.closedBy]);
    const audits = await prisma.auditEvent.findMany({
        where: { organizationId, resourceType: 'VendorIssue', resourceId: issue.id },
        orderBy: { timestamp: 'asc' },
        take: 40,
        select: { action: true, timestamp: true, actorUserId: true, result: true },
    });
    const history = [
        { at: issue.createdAt, label: 'Finding created', actor: names.get(issue.identifiedBy) || null },
        issue.correctiveActionPlan ? { at: issue.updatedAt, label: 'Plan recorded', actor: null } : null,
        evidenceLinks.length ? { at: evidenceLinks[0].createdAt, label: 'Evidence uploaded', actor: null } : null,
        issue.validatedAt ? { at: issue.validatedAt, label: 'Verification completed', actor: names.get(issue.validatedBy || '') || null } : null,
        issue.closedAt ? { at: issue.closedAt, label: issue.status === 'RISK_ACCEPTED' ? 'Risk accepted' : 'Closed', actor: names.get(issue.closedBy || '') || null } : null,
        ...audits.map((row) => ({ at: row.timestamp, label: row.action.replace(/^.*\./, '').replace(/_/g, ' '), actor: names.get(row.actorUserId || '') || null })),
    ].filter(Boolean);

    const observed = observedAnswer({ ...issue, sourceSnapshot: snapshot });
    const evidenceRequested = Boolean(response?.evidenceRequired || snapshot.draftRuleCode === 'required_evidence_missing');
    const usableEvidence = evidenceLinks.filter((row) => row.storedObject.scanStatus === 'CLEAN');
    const related = [
        { type: 'Vendor', label: issue.vendor.name, href: `/vendors/${issue.vendorId}` },
        assessment ? { type: 'Assessment', label: assessment.assessmentType.replace(/_/g, ' '), href: `/vendors/${issue.vendorId}` } : null,
        snapshot.sourceQuestionId ? { type: 'Question', label: snapshot.sourceQuestionId, href: null } : null,
        snapshot.sourceControlKey ? { type: 'Control', label: snapshot.sourceControlKey, href: '/control-center' } : null,
        usableEvidence[0] ? { type: 'Evidence', label: usableEvidence[0].storedObject.filename, href: '/documents' } : null,
        insurance ? { type: 'Insurance vendor context', label: insurance.serviceCategory, href: '/insurance/third-parties' } : null,
    ].filter(Boolean);

    return {
        honesty: {
            noResponseIsNotNo: 'No response recorded is not the same as No.',
            noEvidenceIsNotFailure: 'No supporting evidence is currently attached is not a control failure.',
            openIsNotVendorFailed: 'An open finding is not a finding that the vendor failed overall.',
            severityIsNotTier: 'Finding severity is not vendor tier.',
            closureIsNotCertification: 'Finding closure is not control certification.',
        },
        header: {
            id: issue.id,
            title: displayTitleFor({ ...issue, sourceSnapshot: snapshot }),
            originalTitle: issue.title,
            severity: issue.severity,
            status: issue.status,
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
            ownerId: issue.assignedTo,
            ownerName: names.get(issue.assignedTo || '') || (issue.assignedTo ? 'Assigned' : 'Unassigned'),
        },
        source: {
            kind: sourceKindFor({ ...issue, sourceSnapshot: snapshot }),
            label: sourceLabel(sourceKindFor({ ...issue, sourceSnapshot: snapshot }), snapshot),
            vendorId: issue.vendorId,
            vendorName: issue.vendor.name,
            assessmentId: issue.assessmentId,
            assessmentType: assessment?.assessmentType || null,
            questionId: snapshot.sourceQuestionId || issue.questionId,
            questionText: snapshot.sourceQuestionTextAtCreation || response?.questionText || null,
            section: snapshot.sourceSection || response?.questionCategory || issue.category,
            pack: snapshot.sourcePack || response?.questionCategory || null,
            observedAt: snapshot.sourceCreatedAt || issue.identifiedDate,
            generated: Boolean(issue.assessmentId || issue.draftRuleCode),
        },
        observed: {
            question: snapshot.sourceQuestionTextAtCreation || response?.questionText || issue.title,
            answer: observed.label,
            recorded: observed.recorded,
        },
        reason: whyFinding({ ...issue, sourceSnapshot: snapshot }),
        control: {
            key: snapshot.sourceControlKey || null,
            href: snapshot.sourceControlKey ? '/control-center' : null,
            expected: snapshot.sourceControlKey
                ? `Mapped control ${snapshot.sourceControlKey}`
                : 'No mapped control is recorded for this finding.',
            riskDomain: issue.category || null,
        },
        evidence: {
            requested: evidenceRequested,
            received: usableEvidence.length,
            missing: evidenceRequested && usableEvidence.length === 0,
            items: evidenceLinks.map((row) => ({
                id: row.storedObject.id,
                filename: row.storedObject.filename,
                status: row.storedObject.scanStatus,
            })),
            empty: usableEvidence.length === 0 ? 'No supporting evidence is currently attached.' : null,
        },
        risk: {
            vendorTier: issue.vendor.tier === 'UNRATED' ? 'Not rated' : issue.vendor.tier,
            residualScoreRecorded: issue.vendor.tier === 'UNRATED' ? null : issue.vendor.residualRiskScore,
            residualHonesty: 'A recorded residual score is vendor metadata. Finding severity is not vendor tier.',
            insuranceContext: insurance ? {
                serviceCategory: insurance.serviceCategory,
                criticality: insurance.criticality,
                jurisdictionCode: insurance.jurisdictionCode,
            } : null,
        },
        remediation: {
            plan: issue.correctiveActionPlan,
            targetDate: issue.targetRemediationDate,
            ownerName: names.get(issue.assignedTo || '') || null,
            responsibility: issue.responsibility,
            responsibilityLabel: responsibilityLabel(issue.responsibility),
            status: issue.status,
        },
        verification: {
            required: true,
            notes: issue.validationNotes,
            verifiedBy: names.get(issue.validatedBy || '') || null,
            verifiedAt: issue.validatedAt,
            canMarkComplete: !issue.validatedAt && issue.status !== 'CLOSED',
        },
        nextAction: nextAction({ ...issue, sourceSnapshot: snapshot }),
        related,
        history,
        graphNodeId: graphNode.id,
        snapshot,
        vendor: omitForeignParent(organizationId, issue.vendor),
    };
}

export { ensureFindingGraph };

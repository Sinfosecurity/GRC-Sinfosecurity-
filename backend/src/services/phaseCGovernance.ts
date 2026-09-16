import { EvidenceReviewStatus, IssueReviewState, ScanStatus, VendorIssueStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';

export const CLOSURE_COPY = {
    noEvidence: 'This finding cannot be closed yet. Validated evidence is still required.',
    pending: 'This finding cannot be closed yet. Evidence is still being scanned.',
    failed: 'This finding cannot be closed yet. Evidence did not pass the security scan.',
    unknown: 'This finding cannot be closed yet. Evidence security status is not acceptable.',
    unvalidated: 'This finding cannot be closed yet. An analyst must validate remediation.',
    unconfirmed: 'Only a confirmed finding can enter remediation close.',
    unrelated: 'This finding cannot be closed yet. The evidence is not linked to this finding.',
    foreign: 'This finding cannot be closed yet. Evidence must belong to this vendor.',
    rejected: 'This finding cannot be closed yet. The evidence was rejected and cannot be used.',
};

const OPEN_GOVERNANCE_STATUSES: VendorIssueStatus[] = [
    VendorIssueStatus.OPEN,
    VendorIssueStatus.IN_PROGRESS,
    VendorIssueStatus.PENDING_VENDOR,
    VendorIssueStatus.PENDING_VALIDATION,
    VendorIssueStatus.REMEDIATED,
    VendorIssueStatus.RESOLVED,
    VendorIssueStatus.ESCALATED,
];

export function openGovernanceStatuses() {
    return OPEN_GOVERNANCE_STATUSES;
}

export async function requireClosableFinding(organizationId: string, findingId: string) {
    const finding = await prisma.vendorIssue.findFirst({
        where: { id: findingId, organizationId },
        include: { vendor: { select: { id: true, organizationId: true } } },
    });
    if (!finding || finding.vendor.organizationId !== organizationId) {
        throw new ApiError(404, 'Finding not found.');
    }
    if (finding.reviewState !== IssueReviewState.CONFIRMED) {
        throw new ApiError(409, CLOSURE_COPY.unconfirmed);
    }
    if (!finding.validatedAt) {
        throw new ApiError(409, CLOSURE_COPY.unvalidated);
    }
    return finding;
}

export async function requireValidClosureEvidence(input: {
    organizationId: string;
    vendorId: string;
    findingId: string;
    evidenceId?: string | null;
    closureEvidence?: string | null;
    evidenceUrl?: string | null;
}) {
    const candidate = input.evidenceId || input.closureEvidence || input.evidenceUrl;
    if (!candidate) {
        throw new ApiError(409, CLOSURE_COPY.noEvidence);
    }

    const stored = await prisma.storedObject.findFirst({
        where: { id: candidate },
    });
    if (!stored || stored.deletedAt) {
        throw new ApiError(409, CLOSURE_COPY.noEvidence);
    }
    if (stored.organizationId !== input.organizationId) {
        throw new ApiError(409, CLOSURE_COPY.foreign);
    }
    if (stored.ownerId !== input.vendorId) {
        throw new ApiError(409, CLOSURE_COPY.foreign);
    }
    if (stored.scanStatus === ScanStatus.PENDING) {
        throw new ApiError(409, CLOSURE_COPY.pending);
    }
    if (stored.scanStatus === ScanStatus.INFECTED || stored.scanStatus === ScanStatus.FAILED) {
        throw new ApiError(409, CLOSURE_COPY.failed);
    }
    if (stored.scanStatus !== ScanStatus.CLEAN) {
        throw new ApiError(409, CLOSURE_COPY.unknown);
    }

    const linkedToFinding = await prisma.evidenceLink.findFirst({
        where: {
            organizationId: input.organizationId,
            storedObjectId: stored.id,
            issueId: input.findingId,
        },
    });
    const linkedToOtherFinding = await prisma.evidenceLink.findFirst({
        where: {
            organizationId: input.organizationId,
            storedObjectId: stored.id,
            issueId: { not: input.findingId },
        },
    });
    const namedOnFinding = input.closureEvidence === stored.id || input.evidenceUrl === stored.id;
    const namedInRequest = input.evidenceId === stored.id;
    if (linkedToOtherFinding && !linkedToFinding && !namedOnFinding) {
        throw new ApiError(409, CLOSURE_COPY.unrelated);
    }
    if (!linkedToFinding && !namedOnFinding && !namedInRequest) {
        throw new ApiError(409, CLOSURE_COPY.unrelated);
    }

    const rejected = await prisma.evidenceGovernanceLink.findFirst({
        where: {
            organizationId: input.organizationId,
            storedObjectId: stored.id,
            reviewStatus: EvidenceReviewStatus.REJECTED,
            validTo: null,
        },
    });
    if (rejected) {
        throw new ApiError(409, CLOSURE_COPY.rejected);
    }

    return stored;
}

export async function assertFindingMayClose(input: {
    organizationId: string;
    findingId: string;
    evidenceId?: string | null;
}) {
    const finding = await requireClosableFinding(input.organizationId, input.findingId);
    const stored = await requireValidClosureEvidence({
        organizationId: input.organizationId,
        vendorId: finding.vendorId,
        findingId: finding.id,
        evidenceId: input.evidenceId,
        closureEvidence: finding.closureEvidence,
        evidenceUrl: finding.evidenceUrl,
    });
    return { finding, stored };
}

export async function openConfirmedFindings(organizationId: string, vendorId: string) {
    return prisma.vendorIssue.findMany({
        where: {
            organizationId,
            vendorId,
            reviewState: IssueReviewState.CONFIRMED,
            status: { in: OPEN_GOVERNANCE_STATUSES },
        },
    });
}

export async function requireVendorApprovalEligibility(organizationId: string, vendorId: string, decision?: string) {
    if (decision === 'REJECT') return;
    const onboarding = await prisma.vendorOnboarding.findFirst({
        where: { organizationId, vendorId },
    });
    if (!onboarding) {
        throw new ApiError(409, 'Final approval must use the governed third-party lifecycle.');
    }
    if (!onboarding.contractAttestedAt) {
        throw new ApiError(409, 'Contract requirements must be attested before approval.');
    }
    if (!onboarding.approvalPreparedBy && !onboarding.contractAttestedBy) {
        throw new ApiError(409, 'The approval package must be prepared before an independent reviewer can decide.');
    }
    const open = await openConfirmedFindings(organizationId, vendorId);
    if (open.length) {
        throw new ApiError(409, `${open.length} confirmed finding${open.length === 1 ? '' : 's'} still require remediation or acceptance.`);
    }
}

export async function requireActivatableVendor(organizationId: string, vendorId: string) {
    const onboarding = await prisma.vendorOnboarding.findFirst({
        where: { organizationId, vendorId },
    });
    if (!onboarding) {
        throw new ApiError(409, 'Activation must use the governed third-party lifecycle.');
    }
    if (!['APPROVE', 'APPROVE_WITH_CONDITIONS'].includes(String(onboarding.approvalDecision))) {
        throw new ApiError(409, 'Activation requires a human approval decision.');
    }
    const open = await openConfirmedFindings(organizationId, vendorId);
    if (open.length) {
        throw new ApiError(409, 'Activation cannot proceed while confirmed findings remain open.');
    }
}

export const GOVERNED_VENDOR_FIELDS = [
    'status',
    'stage',
    'residualRiskScore',
    'inherentRiskScore',
    'approvedBy',
    'approvedAt',
    'closedBy',
    'closedAt',
    'approvalPreparedBy',
    'approvalDecision',
    'contractAttestedAt',
    'lifecycleActivatedAt',
] as const;

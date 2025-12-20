/**
 * Vendor Issue & Remediation Service
 * Corrective Action Plans (CAPs) and issue lifecycle management
 */
import { VendorIssue, VendorIssueStatus, IssueSeverity } from '@prisma/client';
export interface CreateVendorIssueInput {
    vendorId: string;
    organizationId: string;
    title: string;
    description: string;
    issueType: string;
    severity: IssueSeverity;
    priority: string;
    source: string;
    identifiedBy: string;
    category: string;
    riskRating?: string;
    impactDescription?: string;
    assignedTo?: string;
    targetRemediationDate?: Date;
}
declare class VendorIssueService {
    /**
     * Create vendor issue
     */
    createIssue(data: CreateVendorIssueInput): Promise<VendorIssue>;
    /**
     * Get issue by ID
     */
    getIssueById(issueId: string, organizationId: string): Promise<({
        vendor: {
            name: string;
            id: string;
            status: import(".prisma/client").$Enums.VendorStatus;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            legalName: string | null;
            vendorType: import(".prisma/client").$Enums.VendorType;
            category: import(".prisma/client").$Enums.VendorCategory;
            tier: import(".prisma/client").$Enums.VendorTier;
            website: string | null;
            primaryContact: string;
            businessOwner: string | null;
            servicesProvided: string;
            contractValue: import("@prisma/client/runtime/library").Decimal | null;
            nextReviewDate: Date | null;
            currency: string | null;
            inherentRiskScore: number;
            residualRiskScore: number;
            contactEmail: string;
            contactPhone: string | null;
            criticalityLevel: import(".prisma/client").$Enums.CriticalityLevel;
            relationshipOwner: string | null;
            dataTypesAccessed: string[];
            geographicFootprint: string[];
            regulatoryScope: string[];
            hasSubcontractors: boolean;
            fourthParties: import("@prisma/client/runtime/library").JsonValue | null;
            onboardedAt: Date | null;
            lastReviewDate: Date | null;
            terminatedAt: Date | null;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.VendorIssueStatus;
        priority: import(".prisma/client").$Enums.IssuePriority;
        organizationId: string;
        createdAt: Date;
        severity: import(".prisma/client").$Enums.IssueSeverity;
        assignedTo: string | null;
        updatedAt: Date;
        title: string;
        description: string;
        category: string;
        vendorId: string;
        source: import(".prisma/client").$Enums.IssueSource;
        issueType: import(".prisma/client").$Enums.VendorIssueType;
        identifiedDate: Date;
        identifiedBy: string;
        riskRating: string | null;
        impactDescription: string | null;
        correctiveActionPlan: string | null;
        targetRemediationDate: Date | null;
        actualRemediationDate: Date | null;
        validationRequired: boolean;
        validatedBy: string | null;
        validatedAt: Date | null;
        validationNotes: string | null;
        evidenceUrl: string | null;
        closureEvidence: string | null;
        closedAt: Date | null;
        closedBy: string | null;
        closureNotes: string | null;
    }) | null>;
    /**
     * List issues for vendor
     */
    listVendorIssues(vendorId: string, organizationId: string, status?: VendorIssueStatus): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.VendorIssueStatus;
        priority: import(".prisma/client").$Enums.IssuePriority;
        organizationId: string;
        createdAt: Date;
        severity: import(".prisma/client").$Enums.IssueSeverity;
        assignedTo: string | null;
        updatedAt: Date;
        title: string;
        description: string;
        category: string;
        vendorId: string;
        source: import(".prisma/client").$Enums.IssueSource;
        issueType: import(".prisma/client").$Enums.VendorIssueType;
        identifiedDate: Date;
        identifiedBy: string;
        riskRating: string | null;
        impactDescription: string | null;
        correctiveActionPlan: string | null;
        targetRemediationDate: Date | null;
        actualRemediationDate: Date | null;
        validationRequired: boolean;
        validatedBy: string | null;
        validatedAt: Date | null;
        validationNotes: string | null;
        evidenceUrl: string | null;
        closureEvidence: string | null;
        closedAt: Date | null;
        closedBy: string | null;
        closureNotes: string | null;
    }[]>;
    /**
     * Update Corrective Action Plan (CAP)
     */
    updateCorrectiveActionPlan(issueId: string, organizationId: string, correctiveActionPlan: string, targetRemediationDate: Date): Promise<import(".prisma/client").Prisma.BatchPayload>;
    /**
     * Submit remediation evidence
     */
    submitRemediation(issueId: string, organizationId: string, evidenceUrl: string, notes: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    /**
     * Validate remediation
     */
    validateRemediation(issueId: string, organizationId: string, validatedBy: string, validationNotes: string, approved: boolean): Promise<import(".prisma/client").Prisma.BatchPayload>;
    /**
     * Close issue
     */
    closeIssue(issueId: string, organizationId: string, closedBy: string, closureNotes: string, closureEvidence?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    /**
     * Accept risk (close without remediation)
     */
    acceptRisk(issueId: string, organizationId: string, acceptedBy: string, acceptanceRationale: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    /**
     * Escalate issue
     */
    escalateIssue(issueId: string, organizationId: string, escalatedBy: string, escalationReason: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    /**
     * Get overdue issues
     */
    getOverdueIssues(organizationId: string): Promise<({
        vendor: {
            name: string;
            tier: import(".prisma/client").$Enums.VendorTier;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.VendorIssueStatus;
        priority: import(".prisma/client").$Enums.IssuePriority;
        organizationId: string;
        createdAt: Date;
        severity: import(".prisma/client").$Enums.IssueSeverity;
        assignedTo: string | null;
        updatedAt: Date;
        title: string;
        description: string;
        category: string;
        vendorId: string;
        source: import(".prisma/client").$Enums.IssueSource;
        issueType: import(".prisma/client").$Enums.VendorIssueType;
        identifiedDate: Date;
        identifiedBy: string;
        riskRating: string | null;
        impactDescription: string | null;
        correctiveActionPlan: string | null;
        targetRemediationDate: Date | null;
        actualRemediationDate: Date | null;
        validationRequired: boolean;
        validatedBy: string | null;
        validatedAt: Date | null;
        validationNotes: string | null;
        evidenceUrl: string | null;
        closureEvidence: string | null;
        closedAt: Date | null;
        closedBy: string | null;
        closureNotes: string | null;
    })[]>;
    /**
     * Get issue statistics
     */
    getIssueStatistics(organizationId: string): Promise<{
        summary: {
            totalIssues: number;
            openIssues: number;
            criticalIssues: number;
            overdueIssues: number;
            resolvedThisMonth: number;
            avgRemediationDays: number;
        };
        issuesByType: {
            type: import(".prisma/client").$Enums.VendorIssueType;
            count: number;
        }[];
        issuesBySeverity: {
            severity: import(".prisma/client").$Enums.IssueSeverity;
            count: number;
        }[];
    }>;
    /**
     * Auto-assign issue based on severity
     */
    private autoAssignIssue;
    /**
     * Notify stakeholders about new issue
     */
    private notifyIssueStakeholders;
    /**
     * Get issue trends
     */
    getIssueTrends(organizationId: string, months?: number): Promise<unknown[]>;
}
declare const _default: VendorIssueService;
export default _default;
//# sourceMappingURL=vendorIssueService.d.ts.map
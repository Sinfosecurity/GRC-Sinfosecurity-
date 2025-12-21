/**
 * Vendor Management Service (TPRM Core)
 * Enterprise-grade Third-Party Risk Management
 */
import { Vendor, VendorTier, VendorStatus, VendorType } from '@prisma/client';
export interface CreateVendorInput {
    name: string;
    legalName?: string;
    vendorType: VendorType;
    category: string;
    tier: VendorTier;
    primaryContact: string;
    contactEmail: string;
    contactPhone?: string;
    website?: string;
    businessOwner?: string;
    relationshipOwner?: string;
    servicesProvided: string;
    contractValue?: number;
    currency?: string;
    dataTypesAccessed: string[];
    geographicFootprint: string[];
    regulatoryScope: string[];
    hasSubcontractors?: boolean;
    fourthParties?: any;
    organizationId: string;
}
export interface UpdateVendorInput {
    name?: string;
    legalName?: string;
    vendorType?: VendorType;
    category?: string;
    tier?: VendorTier;
    status?: VendorStatus;
    primaryContact?: string;
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
    businessOwner?: string;
    relationshipOwner?: string;
    servicesProvided?: string;
    contractValue?: number;
    currency?: string;
    dataTypesAccessed?: string[];
    geographicFootprint?: string[];
    regulatoryScope?: string[];
    hasSubcontractors?: boolean;
    fourthParties?: any;
    inherentRiskScore?: number;
    residualRiskScore?: number;
    lastReviewDate?: Date;
    nextReviewDate?: Date;
}
export interface VendorFilters {
    tier?: VendorTier;
    status?: VendorStatus;
    vendorType?: VendorType;
    category?: string;
    search?: string;
    hasOverdueReview?: boolean;
    minRiskScore?: number;
    maxRiskScore?: number;
}
declare class VendorManagementService {
    /**
     * Create a new vendor
     */
    createVendor(data: CreateVendorInput): Promise<Vendor>;
    /**
     * Get vendor by ID with all relations
     */
    getVendorById(vendorId: string, organizationId: string): Promise<{
        assessments: {
            id: string;
            status: import(".prisma/client").$Enums.AssessmentStatus;
            organizationId: string;
            createdAt: Date;
            assignedTo: string | null;
            updatedAt: Date;
            dueDate: Date | null;
            completedAt: Date | null;
            vendorId: string;
            assessmentType: import(".prisma/client").$Enums.AssessmentType;
            overallScore: number | null;
            recommendations: import("@prisma/client/runtime/library").JsonValue | null;
            complianceScore: number | null;
            securityScore: number | null;
            reviewer: string | null;
            frameworkUsed: string | null;
            privacyScore: number | null;
            operationalScore: number | null;
            financialScore: number | null;
            identifiedRisks: import("@prisma/client/runtime/library").JsonValue | null;
            gapsIdentified: import("@prisma/client/runtime/library").JsonValue | null;
            approver: string | null;
            approvedAt: Date | null;
            evidenceCollected: boolean;
            evidenceCount: number;
        }[];
        issues: {
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
        }[];
        contracts: {
            id: string;
            status: import(".prisma/client").$Enums.ContractStatus;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string | null;
            contractValue: import("@prisma/client/runtime/library").Decimal;
            vendorId: string;
            contractType: import(".prisma/client").$Enums.ContractType;
            contractNumber: string | null;
            effectiveDate: Date;
            expirationDate: Date;
            autoRenewal: boolean;
            currency: string;
            paymentTerms: string | null;
            approvedAt: Date | null;
            renewalDate: Date | null;
            noticePeriod: number | null;
            slaCommitments: import("@prisma/client/runtime/library").JsonValue | null;
            performanceMetrics: import("@prisma/client/runtime/library").JsonValue | null;
            hasDataProtectionClause: boolean;
            hasRightToAudit: boolean;
            hasBreachNotification: boolean;
            hasInsuranceRequirement: boolean;
            hasSubcontractorControls: boolean;
            hasTerminationRights: boolean;
            hasIPProtection: boolean;
            hasDPA: boolean;
            dpaSignedDate: Date | null;
            dpaExpiryDate: Date | null;
            documentUrl: string | null;
            documentHash: string | null;
            approvedBy: string | null;
            legalReviewedBy: string | null;
            legalReviewedAt: Date | null;
        }[];
        documents: {
            id: string;
            organizationId: string;
            title: string;
            description: string | null;
            category: string | null;
            vendorId: string;
            documentType: import(".prisma/client").$Enums.VendorDocumentType;
            fileName: string;
            uploadedAt: Date;
            assessmentId: string | null;
            fileUrl: string;
            fileSize: number;
            fileType: string;
            confidentiality: import(".prisma/client").$Enums.ConfidentialityLevel;
            uploadedBy: string;
            fileHash: string | null;
            validFrom: Date | null;
            validUntil: Date | null;
            lastAccessedAt: Date | null;
        }[];
        contacts: {
            name: string;
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.ContactRole;
            createdAt: Date;
            updatedAt: Date;
            title: string | null;
            vendorId: string;
            isPrimary: boolean;
            phone: string | null;
        }[];
        monitoringRecords: {
            url: string | null;
            id: string;
            organizationId: string;
            vendorId: string;
            source: string;
            requiresAction: boolean;
            actionTaken: string | null;
            detectedAt: Date;
            monitoringType: import(".prisma/client").$Enums.VendorMonitoringType;
            riskIndicator: string;
            riskLevel: string;
            riskDescription: string;
            currentValue: string | null;
            previousValue: string | null;
            changeDetected: boolean;
            rawData: import("@prisma/client/runtime/library").JsonValue | null;
            actionTakenBy: string | null;
            actionTakenAt: Date | null;
            acknowledgedAt: Date | null;
            resolvedAt: Date | null;
        }[];
        reviews: {
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            nextReviewDate: Date | null;
            vendorId: string;
            recommendations: import("@prisma/client/runtime/library").JsonValue | null;
            reviewType: import(".prisma/client").$Enums.VendorReviewType;
            reviewDate: Date;
            overallRating: number | null;
            findings: import("@prisma/client/runtime/library").JsonValue | null;
            actionItems: import("@prisma/client/runtime/library").JsonValue | null;
            reviewer: string;
            participants: string[];
            decision: import(".prisma/client").$Enums.ReviewDecision;
            tierChange: string | null;
            statusChange: string | null;
            meetingNotes: string | null;
        }[];
    } & {
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
    }>;
    /**
     * List vendors with filtering and pagination
     */
    listVendors(organizationId: string, filters?: VendorFilters, page?: number, pageSize?: number): Promise<{
        vendors: ({
            _count: {
                assessments: number;
                issues: number;
                contracts: number;
            };
        } & {
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
        })[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * Update vendor
     */
    updateVendor(vendorId: string, organizationId: string, data: UpdateVendorInput): Promise<Vendor>;
    /**
     * Delete vendor (soft delete by setting status to TERMINATED)
     */
    deleteVendor(vendorId: string, organizationId: string): Promise<void>;
    /**
     * Get vendor dashboard statistics
     */
    getVendorStatistics(organizationId: string): Promise<{
        summary: {
            totalVendors: number;
            activeVendors: number;
            criticalVendors: number;
            highRiskVendors: number;
            overdueReviews: number;
            activeIssues: number;
            expiringContracts: number;
        };
        averageRiskScore: number;
        averageInherentRisk: number;
        tierDistribution: {
            tier: import(".prisma/client").$Enums.VendorTier;
            count: number;
        }[];
        categoryDistribution: {
            category: import(".prisma/client").$Enums.VendorCategory;
            count: number;
        }[];
    }>;
    /**
     * Get vendors requiring attention
     */
    getVendorsRequiringAttention(organizationId: string): Promise<{
        overdueReviews: {
            name: string;
            id: string;
            tier: import(".prisma/client").$Enums.VendorTier;
            nextReviewDate: Date | null;
            residualRiskScore: number;
        }[];
        upcomingReviews: {
            name: string;
            id: string;
            tier: import(".prisma/client").$Enums.VendorTier;
            nextReviewDate: Date | null;
        }[];
        highRiskWithIssues: ({
            issues: {
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
            }[];
        } & {
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
        })[];
        criticalAlerts: ({
            vendor: {
                name: string;
                id: string;
                tier: import(".prisma/client").$Enums.VendorTier;
            };
        } & {
            url: string | null;
            id: string;
            organizationId: string;
            vendorId: string;
            source: string;
            requiresAction: boolean;
            actionTaken: string | null;
            detectedAt: Date;
            monitoringType: import(".prisma/client").$Enums.VendorMonitoringType;
            riskIndicator: string;
            riskLevel: string;
            riskDescription: string;
            currentValue: string | null;
            previousValue: string | null;
            changeDetected: boolean;
            rawData: import("@prisma/client/runtime/library").JsonValue | null;
            actionTakenBy: string | null;
            actionTakenAt: Date | null;
            acknowledgedAt: Date | null;
            resolvedAt: Date | null;
        })[];
    }>;
    /**
     * Calculate inherent risk score based on multiple factors
     */
    private calculateInherentRisk;
    /**
     * Calculate next review date based on tier
     */
    private calculateNextReviewDate;
    /**
     * Map tier to criticality level
     */
    private mapTierToCriticality;
    /**
     * Approve vendor (change status from PROPOSED to APPROVED)
     */
    approveVendor(vendorId: string, organizationId: string, approvedBy: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    /**
     * Onboard vendor (change status from APPROVED to ACTIVE)
     */
    onboardVendor(vendorId: string, organizationId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    /**
     * Offboard vendor - comprehensive exit process
     */
    offboardVendor(vendorId: string, organizationId: string, offboardingData: {
        dataReturned: boolean;
        dataDestroyed: boolean;
        accessRevoked: boolean;
        exitNotes?: string;
    }): Promise<void>;
}
declare const _default: VendorManagementService;
export default _default;
//# sourceMappingURL=vendorManagementService.d.ts.map
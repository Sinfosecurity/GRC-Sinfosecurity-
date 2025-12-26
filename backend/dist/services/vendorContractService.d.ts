/**
 * Vendor Contract & SLA Management Service
 * Enterprise contract lifecycle and SLA tracking
 */
import { VendorContract, ContractType } from '@prisma/client';
export interface CreateContractInput {
    vendorId: string;
    organizationId: string;
    contractType: ContractType;
    contractNumber?: string;
    title: string;
    description?: string;
    effectiveDate: Date;
    expirationDate: Date;
    renewalDate?: Date;
    autoRenewal?: boolean;
    noticePeriod?: number;
    contractValue: number;
    currency?: string;
    paymentTerms?: string;
    slaCommitments?: any;
    hasDataProtectionClause?: boolean;
    hasRightToAudit?: boolean;
    hasBreachNotification?: boolean;
    hasInsuranceRequirement?: boolean;
    hasSubcontractorControls?: boolean;
    hasTerminationRights?: boolean;
    hasIPProtection?: boolean;
    hasDPA?: boolean;
    dpaSignedDate?: Date;
    documentUrl?: string;
}
declare class VendorContractService {
    /**
     * Create new contract
     */
    createContract(data: CreateContractInput): Promise<VendorContract>;
    /**
     * Get contract by ID
     */
    getContractById(contractId: string, organizationId: string): Promise<{
        vendor: {
            id: string;
            status: import(".prisma/client").$Enums.VendorStatus;
            name: string;
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
        slaTracking: {
            id: string;
            status: import(".prisma/client").$Enums.SLAStatus;
            target: import("@prisma/client/runtime/library").Decimal;
            notes: string | null;
            contractId: string;
            periodStart: Date;
            metricName: string;
            metricType: import(".prisma/client").$Enums.SLAMetricType;
            actual: import("@prisma/client/runtime/library").Decimal | null;
            unit: string;
            period: string;
            periodEnd: Date;
            breachCount: number;
            measuredAt: Date;
        }[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.ContractStatus;
        description: string | null;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
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
    }>;
    /**
     * List contracts for vendor
     */
    listVendorContracts(vendorId: string, organizationId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ContractStatus;
        description: string | null;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
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
    }[]>;
    /**
     * Update contract
     */
    updateContract(contractId: string, organizationId: string, data: Partial<CreateContractInput>): Promise<import(".prisma/client").Prisma.BatchPayload>;
    /**
     * Approve contract
     */
    approveContract(contractId: string, organizationId: string, approvedBy: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    /**
     * Get expiring contracts (within specified days)
     */
    getExpiringContracts(organizationId: string, withinDays?: number): Promise<({
        vendor: {
            name: string;
            tier: import(".prisma/client").$Enums.VendorTier;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.ContractStatus;
        description: string | null;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
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
    })[]>;
    /**
     * Track SLA metric
     */
    trackSLAMetric(data: {
        contractId: string;
        metricName: string;
        metricType: string;
        target: number;
        actual: number;
        unit: string;
        period: string;
        periodStart: Date;
        periodEnd: Date;
        notes?: string;
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.SLAStatus;
        target: import("@prisma/client/runtime/library").Decimal;
        notes: string | null;
        contractId: string;
        periodStart: Date;
        metricName: string;
        metricType: import(".prisma/client").$Enums.SLAMetricType;
        actual: import("@prisma/client/runtime/library").Decimal | null;
        unit: string;
        period: string;
        periodEnd: Date;
        breachCount: number;
        measuredAt: Date;
    }>;
    /**
     * Get SLA compliance report
     */
    getSLAComplianceReport(organizationId: string, period: 'MONTH' | 'QUARTER' | 'YEAR'): Promise<{
        period: "YEAR" | "MONTH" | "QUARTER";
        summary: {
            totalMetrics: number;
            metricsMet: number;
            metricsBreached: number;
            complianceRate: number;
        };
        byVendor: unknown[];
    }>;
    /**
     * Analyze contract risk clauses
     */
    analyzeContractRisk(contractId: string): Promise<{
        contractId: string;
        contractTitle: string;
        riskScore: number;
        riskLevel: string;
        risks: any[];
        recommendations: any[];
        clauseCoverage: {
            dataProtection: boolean;
            rightToAudit: boolean;
            breachNotification: boolean;
            insurance: boolean;
            subcontractorControls: boolean;
            terminationRights: boolean;
            ipProtection: boolean;
            dpa: boolean;
        };
    }>;
    /**
     * Get contract statistics
     */
    getContractStatistics(organizationId: string): Promise<{
        totalContracts: number;
        activeContracts: number;
        expiringContracts: number;
        totalValue: number | import("@prisma/client/runtime/library").Decimal;
        contractsByType: {
            type: import(".prisma/client").$Enums.ContractType;
            count: number;
        }[];
    }>;
    /**
     * Helper: Get period start date
     */
    private getPeriodStartDate;
}
declare const _default: VendorContractService;
export default _default;
//# sourceMappingURL=vendorContractService.d.ts.map
/**
 * Risk Appetite Monitoring Service
 * Tracks and alerts on risk appetite thresholds for SOC 2 / ISO 27001 compliance
 *
 * SOC 2 TSC CC3.3: Entity establishes and monitors risk tolerance
 * ISO 27001 Clause 6.1.2: Risk assessment process includes risk acceptance criteria
 */
interface CreateRiskAppetiteInput {
    organizationId: string;
    category: string;
    subcategory?: string;
    appetiteStatement: string;
    quantitativeThreshold?: number;
    qualitativeThreshold?: string;
    riskTolerance: number;
    earlyWarningThreshold: number;
    approvedBy: string;
    approvalDate: Date;
    reviewFrequency: number;
    rationaleDocument?: string;
    boardApprovalEvidence?: string;
}
interface UpdateRiskAppetiteInput {
    appetiteStatement?: string;
    quantitativeThreshold?: number;
    qualitativeThreshold?: string;
    riskTolerance?: number;
    earlyWarningThreshold?: number;
    reviewFrequency?: number;
    effectiveUntil?: Date;
}
interface RiskAppetiteBreachInput {
    riskAppetiteId: string;
    breachType: string;
    actualRiskLevel: number;
    triggerEvent: string;
    contributingFactors: any[];
    vendorIds?: string[];
}
declare class RiskAppetiteService {
    /**
     * Create a new risk appetite threshold
     */
    createRiskAppetite(data: CreateRiskAppetiteInput): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        nextReviewDate: Date;
        approvedBy: string;
        appetiteStatement: string;
        riskTolerance: number;
        earlyWarningThreshold: number;
        approvalDate: Date;
        subcategory: string | null;
        quantitativeThreshold: number | null;
        qualitativeThreshold: string | null;
        currentRiskLevel: number;
        breachStatus: import(".prisma/client").$Enums.RiskAppetiteStatus;
        lastCalculated: Date;
        effectiveFrom: Date;
        effectiveUntil: Date | null;
        reviewFrequency: number;
        rationaleDocument: string | null;
        boardApprovalEvidence: string | null;
    }>;
    /**
     * Update risk appetite threshold
     */
    updateRiskAppetite(id: string, organizationId: string, data: UpdateRiskAppetiteInput): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        nextReviewDate: Date;
        approvedBy: string;
        appetiteStatement: string;
        riskTolerance: number;
        earlyWarningThreshold: number;
        approvalDate: Date;
        subcategory: string | null;
        quantitativeThreshold: number | null;
        qualitativeThreshold: string | null;
        currentRiskLevel: number;
        breachStatus: import(".prisma/client").$Enums.RiskAppetiteStatus;
        lastCalculated: Date;
        effectiveFrom: Date;
        effectiveUntil: Date | null;
        reviewFrequency: number;
        rationaleDocument: string | null;
        boardApprovalEvidence: string | null;
    }>;
    /**
     * Calculate current risk level for a category
     */
    calculateCurrentRiskLevel(organizationId: string, category: string): Promise<number>;
    /**
     * Get vendor weight based on tier (for risk calculations)
     */
    private getVendorWeight;
    /**
     * Monitor risk appetite and detect breaches
     */
    monitorRiskAppetite(riskAppetiteId: string, organizationId: string): Promise<{
        currentRiskLevel: number;
        breachStatus: import(".prisma/client").$Enums.RiskAppetiteStatus;
    }>;
    /**
     * Monitor all risk appetites for an organization
     */
    monitorAllRiskAppetites(organizationId: string): Promise<{
        currentRiskLevel: number;
        breachStatus: import(".prisma/client").$Enums.RiskAppetiteStatus;
        id: string;
        category: string;
    }[]>;
    /**
     * Record a risk appetite breach
     */
    recordBreach(data: RiskAppetiteBreachInput): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        vendorIds: string[];
        resolvedAt: Date | null;
        mitigationPlan: string | null;
        mitigationOwner: string | null;
        targetResolutionDate: Date | null;
        riskAppetiteId: string;
        breachDate: Date;
        breachType: string;
        actualRiskLevel: number;
        thresholdExceeded: number;
        excessAmount: number;
        triggerEvent: string;
        contributingFactors: import("@prisma/client/runtime/library").JsonValue;
        notifiedPersonnel: string[];
        notificationSent: boolean;
        notificationSentAt: Date | null;
        resolutionNotes: string | null;
        escalatedToBoard: boolean;
        boardNotificationDate: Date | null;
        boardActionRequired: boolean;
    }>;
    /**
     * Get all risk appetites for an organization
     */
    listRiskAppetites(organizationId: string): Promise<({
        breaches: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            vendorIds: string[];
            resolvedAt: Date | null;
            mitigationPlan: string | null;
            mitigationOwner: string | null;
            targetResolutionDate: Date | null;
            riskAppetiteId: string;
            breachDate: Date;
            breachType: string;
            actualRiskLevel: number;
            thresholdExceeded: number;
            excessAmount: number;
            triggerEvent: string;
            contributingFactors: import("@prisma/client/runtime/library").JsonValue;
            notifiedPersonnel: string[];
            notificationSent: boolean;
            notificationSentAt: Date | null;
            resolutionNotes: string | null;
            escalatedToBoard: boolean;
            boardNotificationDate: Date | null;
            boardActionRequired: boolean;
        }[];
    } & {
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        nextReviewDate: Date;
        approvedBy: string;
        appetiteStatement: string;
        riskTolerance: number;
        earlyWarningThreshold: number;
        approvalDate: Date;
        subcategory: string | null;
        quantitativeThreshold: number | null;
        qualitativeThreshold: string | null;
        currentRiskLevel: number;
        breachStatus: import(".prisma/client").$Enums.RiskAppetiteStatus;
        lastCalculated: Date;
        effectiveFrom: Date;
        effectiveUntil: Date | null;
        reviewFrequency: number;
        rationaleDocument: string | null;
        boardApprovalEvidence: string | null;
    })[]>;
    /**
     * Get all breaches for an organization
     */
    listBreaches(organizationId: string, status?: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        vendorIds: string[];
        resolvedAt: Date | null;
        mitigationPlan: string | null;
        mitigationOwner: string | null;
        targetResolutionDate: Date | null;
        riskAppetiteId: string;
        breachDate: Date;
        breachType: string;
        actualRiskLevel: number;
        thresholdExceeded: number;
        excessAmount: number;
        triggerEvent: string;
        contributingFactors: import("@prisma/client/runtime/library").JsonValue;
        notifiedPersonnel: string[];
        notificationSent: boolean;
        notificationSentAt: Date | null;
        resolutionNotes: string | null;
        escalatedToBoard: boolean;
        boardNotificationDate: Date | null;
        boardActionRequired: boolean;
    }[]>;
    /**
     * Resolve a breach
     */
    resolveBreach(breachId: string, mitigationPlan: string, mitigationOwner: string, resolutionNotes?: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        vendorIds: string[];
        resolvedAt: Date | null;
        mitigationPlan: string | null;
        mitigationOwner: string | null;
        targetResolutionDate: Date | null;
        riskAppetiteId: string;
        breachDate: Date;
        breachType: string;
        actualRiskLevel: number;
        thresholdExceeded: number;
        excessAmount: number;
        triggerEvent: string;
        contributingFactors: import("@prisma/client/runtime/library").JsonValue;
        notifiedPersonnel: string[];
        notificationSent: boolean;
        notificationSentAt: Date | null;
        resolutionNotes: string | null;
        escalatedToBoard: boolean;
        boardNotificationDate: Date | null;
        boardActionRequired: boolean;
    }>;
    /**
     * Get risk appetite dashboard
     */
    getDashboard(organizationId: string): Promise<{
        summary: {
            totalAppetites: number;
            withinAppetite: number;
            approachingLimit: number;
            breached: number;
            criticalBreaches: number;
            openBreaches: number;
            boardEscalations: number;
        };
        appetites: ({
            breaches: {
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                vendorIds: string[];
                resolvedAt: Date | null;
                mitigationPlan: string | null;
                mitigationOwner: string | null;
                targetResolutionDate: Date | null;
                riskAppetiteId: string;
                breachDate: Date;
                breachType: string;
                actualRiskLevel: number;
                thresholdExceeded: number;
                excessAmount: number;
                triggerEvent: string;
                contributingFactors: import("@prisma/client/runtime/library").JsonValue;
                notifiedPersonnel: string[];
                notificationSent: boolean;
                notificationSentAt: Date | null;
                resolutionNotes: string | null;
                escalatedToBoard: boolean;
                boardNotificationDate: Date | null;
                boardActionRequired: boolean;
            }[];
        } & {
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            category: string;
            nextReviewDate: Date;
            approvedBy: string;
            appetiteStatement: string;
            riskTolerance: number;
            earlyWarningThreshold: number;
            approvalDate: Date;
            subcategory: string | null;
            quantitativeThreshold: number | null;
            qualitativeThreshold: string | null;
            currentRiskLevel: number;
            breachStatus: import(".prisma/client").$Enums.RiskAppetiteStatus;
            lastCalculated: Date;
            effectiveFrom: Date;
            effectiveUntil: Date | null;
            reviewFrequency: number;
            rationaleDocument: string | null;
            boardApprovalEvidence: string | null;
        })[];
        recentBreaches: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            vendorIds: string[];
            resolvedAt: Date | null;
            mitigationPlan: string | null;
            mitigationOwner: string | null;
            targetResolutionDate: Date | null;
            riskAppetiteId: string;
            breachDate: Date;
            breachType: string;
            actualRiskLevel: number;
            thresholdExceeded: number;
            excessAmount: number;
            triggerEvent: string;
            contributingFactors: import("@prisma/client/runtime/library").JsonValue;
            notifiedPersonnel: string[];
            notificationSent: boolean;
            notificationSentAt: Date | null;
            resolutionNotes: string | null;
            escalatedToBoard: boolean;
            boardNotificationDate: Date | null;
            boardActionRequired: boolean;
        }[];
    }>;
    /**
     * Get appetites requiring review
     */
    getAppetitesRequiringReview(organizationId: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        nextReviewDate: Date;
        approvedBy: string;
        appetiteStatement: string;
        riskTolerance: number;
        earlyWarningThreshold: number;
        approvalDate: Date;
        subcategory: string | null;
        quantitativeThreshold: number | null;
        qualitativeThreshold: string | null;
        currentRiskLevel: number;
        breachStatus: import(".prisma/client").$Enums.RiskAppetiteStatus;
        lastCalculated: Date;
        effectiveFrom: Date;
        effectiveUntil: Date | null;
        reviewFrequency: number;
        rationaleDocument: string | null;
        boardApprovalEvidence: string | null;
    }[]>;
}
declare const _default: RiskAppetiteService;
export default _default;
//# sourceMappingURL=riskAppetite.d.ts.map
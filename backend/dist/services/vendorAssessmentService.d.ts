/**
 * Vendor Assessment Service
 * Due diligence, risk assessments, and questionnaires (SIG, CAIQ, Custom)
 */
import { VendorAssessment, AssessmentType } from '@prisma/client';
export interface QuestionTemplate {
    id: string;
    question: string;
    category: string;
    weight: number;
    options: string[];
    frameworkMappings?: string[];
    evidenceRequired?: boolean;
}
export interface AssessmentTemplate {
    name: string;
    type: string;
    version?: string;
    sections: {
        title: string;
        questions: QuestionTemplate[];
    }[];
}
export interface CreateAssessmentInput {
    vendorId: string;
    organizationId: string;
    assessmentType: AssessmentType;
    frameworkUsed?: string;
    assignedTo?: string;
    dueDate?: Date;
}
export interface SubmitAssessmentResponseInput {
    assessmentId: string;
    questionId: string;
    response: string;
    notes?: string;
    evidenceIds?: string[];
}
declare class VendorAssessmentService {
    /**
     * Create a new vendor assessment
     */
    createAssessment(data: CreateAssessmentInput): Promise<VendorAssessment>;
    /**
     * Get assessment by ID with all responses
     */
    getAssessmentById(assessmentId: string, organizationId: string): Promise<({
        evidence: {
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
        responses: {
            id: string;
            notes: string | null;
            weight: number;
            questionId: string;
            score: number | null;
            assessmentId: string;
            questionText: string;
            questionCategory: string;
            response: string | null;
            maxScore: number;
            hasEvidence: boolean;
            evidenceRequired: boolean;
            respondedBy: string | null;
            respondedAt: Date | null;
        }[];
    } & {
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
    }) | null>;
    /**
     * List assessments for a vendor
     */
    listVendorAssessments(vendorId: string, organizationId: string): Promise<({
        _count: {
            evidence: number;
            responses: number;
        };
    } & {
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
    })[]>;
    /**
     * Submit response to assessment question
     */
    submitResponse(data: SubmitAssessmentResponseInput, respondedBy: string): Promise<void>;
    /**
     * Complete assessment and calculate final scores
     */
    completeAssessment(assessmentId: string, completedBy: string): Promise<{
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
    }>;
    /**
     * Generate assessment questions from template
     */
    private generateAssessmentQuestions;
    /**
     * Calculate assessment scores by category
     */
    private calculateAssessmentScores;
    /**
     * Identify gaps (low-scoring areas)
     */
    private identifyGaps;
    /**
     * Generate AI-powered recommendations
     */
    private generateRecommendations;
    /**
     * Update vendor's residual risk score based on assessment
     */
    private updateVendorRiskScore;
    /**
     * Calculate response score based on answer
     */
    private calculateResponseScore;
    /**
     * Get assessment template (SIG, CAIQ, or Custom)
     */
    private getAssessmentTemplate;
    /**
     * Get overdue assessments
     */
    getOverdueAssessments(organizationId: string): Promise<({
        vendor: {
            name: string;
            tier: import(".prisma/client").$Enums.VendorTier;
        };
    } & {
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
    })[]>;
    /**
     * Get assessment completion rate
     */
    getAssessmentMetrics(organizationId: string): Promise<{
        total: number;
        completed: number;
        overdue: number;
        completionRate: number;
    }>;
}
declare const _default: VendorAssessmentService;
export default _default;
//# sourceMappingURL=vendorAssessmentService.d.ts.map
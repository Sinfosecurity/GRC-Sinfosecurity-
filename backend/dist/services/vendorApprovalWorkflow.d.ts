/**
 * Vendor Approval Workflow Service
 * Enterprise-grade multi-level approval workflows for vendor onboarding, changes, and risk acceptance
 */
import { VendorApprovalWorkflow, WorkflowType, ApprovalDecision } from '@prisma/client';
export interface CreateWorkflowInput {
    vendorId: string;
    organizationId: string;
    workflowType: WorkflowType;
    initiatedBy: string;
    businessJustification?: string;
    riskAssessmentSummary?: string;
    approvalChain: {
        approverRole: string;
        approverUserId?: string;
        approverName?: string;
    }[];
}
export interface ApprovalStepInput {
    workflowId: string;
    stepOrder: number;
    decision: ApprovalDecision;
    decidedBy: string;
    comments?: string;
    conditions?: string[];
    digitalSignature?: string;
    ipAddress?: string;
    userAgent?: string;
}
declare class VendorApprovalWorkflowService {
    /**
     * Create a new approval workflow
     */
    createWorkflow(data: CreateWorkflowInput): Promise<VendorApprovalWorkflow>;
    /**
     * Get workflow by ID with all steps
     */
    getWorkflowById(workflowId: string, organizationId: string): Promise<{
        steps: {
            id: string;
            ipAddress: string | null;
            userAgent: string | null;
            workflowId: string;
            decision: import(".prisma/client").$Enums.ApprovalDecision | null;
            approverRole: string;
            approverUserId: string | null;
            approverName: string | null;
            stepOrder: number;
            comments: string | null;
            conditions: string[];
            requiredAt: Date;
            decidedBy: string | null;
            decidedAt: Date | null;
            digitalSignature: string | null;
        }[];
        vendor: {
            id: string;
            status: import(".prisma/client").$Enums.VendorStatus;
            name: string;
            tier: import(".prisma/client").$Enums.VendorTier;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.WorkflowStatus;
        organizationId: string;
        completedAt: Date | null;
        vendorId: string;
        workflowType: import(".prisma/client").$Enums.WorkflowType;
        businessJustification: string | null;
        riskAssessmentSummary: string | null;
        initiatedBy: string;
        initiatedAt: Date;
        approvalSteps: import("@prisma/client/runtime/library").JsonValue;
        currentStep: number;
    }>;
    /**
     * Submit approval decision for a step
     */
    submitApprovalDecision(data: ApprovalStepInput): Promise<VendorApprovalWorkflow>;
    /**
     * Handle approved workflow actions
     */
    private handleApprovedWorkflow;
    /**
     * List workflows for a vendor
     */
    listVendorWorkflows(vendorId: string, organizationId: string): Promise<({
        steps: {
            id: string;
            ipAddress: string | null;
            userAgent: string | null;
            workflowId: string;
            decision: import(".prisma/client").$Enums.ApprovalDecision | null;
            approverRole: string;
            approverUserId: string | null;
            approverName: string | null;
            stepOrder: number;
            comments: string | null;
            conditions: string[];
            requiredAt: Date;
            decidedBy: string | null;
            decidedAt: Date | null;
            digitalSignature: string | null;
        }[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.WorkflowStatus;
        organizationId: string;
        completedAt: Date | null;
        vendorId: string;
        workflowType: import(".prisma/client").$Enums.WorkflowType;
        businessJustification: string | null;
        riskAssessmentSummary: string | null;
        initiatedBy: string;
        initiatedAt: Date;
        approvalSteps: import("@prisma/client/runtime/library").JsonValue;
        currentStep: number;
    })[]>;
    /**
     * List pending approvals for a user
     */
    listPendingApprovals(userId: string, organizationId: string): Promise<({
        workflow: {
            vendor: {
                id: string;
                status: import(".prisma/client").$Enums.VendorStatus;
                name: string;
                tier: import(".prisma/client").$Enums.VendorTier;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.WorkflowStatus;
            organizationId: string;
            completedAt: Date | null;
            vendorId: string;
            workflowType: import(".prisma/client").$Enums.WorkflowType;
            businessJustification: string | null;
            riskAssessmentSummary: string | null;
            initiatedBy: string;
            initiatedAt: Date;
            approvalSteps: import("@prisma/client/runtime/library").JsonValue;
            currentStep: number;
        };
    } & {
        id: string;
        ipAddress: string | null;
        userAgent: string | null;
        workflowId: string;
        decision: import(".prisma/client").$Enums.ApprovalDecision | null;
        approverRole: string;
        approverUserId: string | null;
        approverName: string | null;
        stepOrder: number;
        comments: string | null;
        conditions: string[];
        requiredAt: Date;
        decidedBy: string | null;
        decidedAt: Date | null;
        digitalSignature: string | null;
    })[]>;
    /**
     * Cancel a workflow
     */
    cancelWorkflow(workflowId: string, organizationId: string, cancelledBy: string, reason?: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.WorkflowStatus;
        organizationId: string;
        completedAt: Date | null;
        vendorId: string;
        workflowType: import(".prisma/client").$Enums.WorkflowType;
        businessJustification: string | null;
        riskAssessmentSummary: string | null;
        initiatedBy: string;
        initiatedAt: Date;
        approvalSteps: import("@prisma/client/runtime/library").JsonValue;
        currentStep: number;
    }>;
    /**
     * Get workflow statistics for organization
     */
    getWorkflowStatistics(organizationId: string, startDate?: Date, endDate?: Date): Promise<{
        total: number;
        byStatus: {
            pending: number;
            inProgress: number;
            approved: number;
            rejected: number;
            cancelled: number;
            escalated: number;
        };
        approvalRate: number;
        rejectionRate: number;
        averageApprovalTimeDays: number;
    }>;
}
declare const _default: VendorApprovalWorkflowService;
export default _default;
//# sourceMappingURL=vendorApprovalWorkflow.d.ts.map
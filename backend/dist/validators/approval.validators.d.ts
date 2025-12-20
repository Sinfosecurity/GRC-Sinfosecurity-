/**
 * Zod Validation Schemas for Vendor Approval Workflows
 */
import { z } from 'zod';
export declare const WorkflowTypeSchema: z.ZodEnum<["ONBOARDING", "CONTRACT_RENEWAL", "TIER_CHANGE", "REASSESSMENT_APPROVAL", "RISK_ACCEPTANCE", "TERMINATION", "FOURTH_PARTY_APPROVAL"]>;
export declare const ApprovalDecisionSchema: z.ZodEnum<["APPROVED", "REJECTED", "CONDITIONALLY_APPROVED", "ESCALATED", "DEFERRED"]>;
export declare const ApprovalStepSchema: z.ZodObject<{
    approverRole: z.ZodString;
    approverUserId: z.ZodOptional<z.ZodString>;
    approverName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    approverRole: string;
    approverUserId?: string | undefined;
    approverName?: string | undefined;
}, {
    approverRole: string;
    approverUserId?: string | undefined;
    approverName?: string | undefined;
}>;
export declare const CreateWorkflowSchema: z.ZodObject<{
    vendorId: z.ZodString;
    workflowType: z.ZodEnum<["ONBOARDING", "CONTRACT_RENEWAL", "TIER_CHANGE", "REASSESSMENT_APPROVAL", "RISK_ACCEPTANCE", "TERMINATION", "FOURTH_PARTY_APPROVAL"]>;
    businessJustification: z.ZodOptional<z.ZodString>;
    riskAssessmentSummary: z.ZodOptional<z.ZodString>;
    approvalChain: z.ZodArray<z.ZodObject<{
        approverRole: z.ZodString;
        approverUserId: z.ZodOptional<z.ZodString>;
        approverName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        approverRole: string;
        approverUserId?: string | undefined;
        approverName?: string | undefined;
    }, {
        approverRole: string;
        approverUserId?: string | undefined;
        approverName?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    vendorId: string;
    workflowType: "CONTRACT_RENEWAL" | "TIER_CHANGE" | "ONBOARDING" | "REASSESSMENT_APPROVAL" | "RISK_ACCEPTANCE" | "TERMINATION" | "FOURTH_PARTY_APPROVAL";
    approvalChain: {
        approverRole: string;
        approverUserId?: string | undefined;
        approverName?: string | undefined;
    }[];
    businessJustification?: string | undefined;
    riskAssessmentSummary?: string | undefined;
}, {
    vendorId: string;
    workflowType: "CONTRACT_RENEWAL" | "TIER_CHANGE" | "ONBOARDING" | "REASSESSMENT_APPROVAL" | "RISK_ACCEPTANCE" | "TERMINATION" | "FOURTH_PARTY_APPROVAL";
    approvalChain: {
        approverRole: string;
        approverUserId?: string | undefined;
        approverName?: string | undefined;
    }[];
    businessJustification?: string | undefined;
    riskAssessmentSummary?: string | undefined;
}>;
export declare const SubmitDecisionSchema: z.ZodObject<{
    stepOrder: z.ZodNumber;
    decision: z.ZodEnum<["APPROVED", "REJECTED", "CONDITIONALLY_APPROVED", "ESCALATED", "DEFERRED"]>;
    comments: z.ZodOptional<z.ZodString>;
    conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    decision: "APPROVED" | "REJECTED" | "ESCALATED" | "CONDITIONALLY_APPROVED" | "DEFERRED";
    stepOrder: number;
    comments?: string | undefined;
    conditions?: string[] | undefined;
}, {
    decision: "APPROVED" | "REJECTED" | "ESCALATED" | "CONDITIONALLY_APPROVED" | "DEFERRED";
    stepOrder: number;
    comments?: string | undefined;
    conditions?: string[] | undefined;
}>;
//# sourceMappingURL=approval.validators.d.ts.map
/**
 * Zod Validation Schemas for Vendor Approval Workflows
 */

import { z } from 'zod';

// Enums
export const WorkflowTypeSchema = z.enum([
    'ONBOARDING',
    'CONTRACT_RENEWAL',
    'TIER_CHANGE',
    'REASSESSMENT_APPROVAL',
    'RISK_ACCEPTANCE',
    'TERMINATION',
    'FOURTH_PARTY_APPROVAL'
]);

export const ApprovalDecisionSchema = z.enum([
    'APPROVED',
    'REJECTED',
    'CONDITIONALLY_APPROVED',
    'ESCALATED',
    'DEFERRED'
]);

// Approval Chain Step Schema
export const ApprovalStepSchema = z.object({
    approverRole: z.string().min(1, 'Approver role is required'),
    approverUserId: z.string().uuid().optional(),
    approverName: z.string().optional()
});

// Create Workflow Schema
export const CreateWorkflowSchema = z.object({
    vendorId: z.string().uuid('Invalid vendor ID'),
    workflowType: WorkflowTypeSchema,
    businessJustification: z.string().max(2000).optional(),
    riskAssessmentSummary: z.string().max(2000).optional(),
    approvalChain: z.array(ApprovalStepSchema).min(1, 'At least one approver is required')
});

// Submit Decision Schema
export const SubmitDecisionSchema = z.object({
    stepOrder: z.number().int().min(1),
    decision: ApprovalDecisionSchema,
    comments: z.string().max(2000).optional(),
    conditions: z.array(z.string().max(500)).optional()
});

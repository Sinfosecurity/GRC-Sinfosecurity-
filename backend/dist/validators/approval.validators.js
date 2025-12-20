"use strict";
/**
 * Zod Validation Schemas for Vendor Approval Workflows
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmitDecisionSchema = exports.CreateWorkflowSchema = exports.ApprovalStepSchema = exports.ApprovalDecisionSchema = exports.WorkflowTypeSchema = void 0;
const zod_1 = require("zod");
// Enums
exports.WorkflowTypeSchema = zod_1.z.enum([
    'ONBOARDING',
    'CONTRACT_RENEWAL',
    'TIER_CHANGE',
    'REASSESSMENT_APPROVAL',
    'RISK_ACCEPTANCE',
    'TERMINATION',
    'FOURTH_PARTY_APPROVAL'
]);
exports.ApprovalDecisionSchema = zod_1.z.enum([
    'APPROVED',
    'REJECTED',
    'CONDITIONALLY_APPROVED',
    'ESCALATED',
    'DEFERRED'
]);
// Approval Chain Step Schema
exports.ApprovalStepSchema = zod_1.z.object({
    approverRole: zod_1.z.string().min(1, 'Approver role is required'),
    approverUserId: zod_1.z.string().uuid().optional(),
    approverName: zod_1.z.string().optional()
});
// Create Workflow Schema
exports.CreateWorkflowSchema = zod_1.z.object({
    vendorId: zod_1.z.string().uuid('Invalid vendor ID'),
    workflowType: exports.WorkflowTypeSchema,
    businessJustification: zod_1.z.string().max(2000).optional(),
    riskAssessmentSummary: zod_1.z.string().max(2000).optional(),
    approvalChain: zod_1.z.array(exports.ApprovalStepSchema).min(1, 'At least one approver is required')
});
// Submit Decision Schema
exports.SubmitDecisionSchema = zod_1.z.object({
    stepOrder: zod_1.z.number().int().min(1),
    decision: exports.ApprovalDecisionSchema,
    comments: zod_1.z.string().max(2000).optional(),
    conditions: zod_1.z.array(zod_1.z.string().max(500)).optional()
});
//# sourceMappingURL=approval.validators.js.map
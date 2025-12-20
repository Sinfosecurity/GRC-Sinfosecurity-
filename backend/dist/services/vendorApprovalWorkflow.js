"use strict";
/**
 * Vendor Approval Workflow Service
 * Enterprise-grade multi-level approval workflows for vendor onboarding, changes, and risk acceptance
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../config/logger"));
class VendorApprovalWorkflowService {
    /**
     * Create a new approval workflow
     */
    async createWorkflow(data) {
        try {
            // Validate vendor exists
            const vendor = await database_1.prisma.vendor.findFirst({
                where: {
                    id: data.vendorId,
                    organizationId: data.organizationId,
                },
            });
            if (!vendor) {
                throw new errors_1.NotFoundError('Vendor', data.vendorId);
            }
            // Validate approval chain
            if (!data.approvalChain || data.approvalChain.length === 0) {
                throw new errors_1.ValidationError('Approval chain must have at least one approver');
            }
            // Create workflow with steps in a transaction
            const workflow = await database_1.prisma.$transaction(async (tx) => {
                // Create workflow
                const newWorkflow = await tx.vendorApprovalWorkflow.create({
                    data: {
                        vendorId: data.vendorId,
                        organizationId: data.organizationId,
                        workflowType: data.workflowType,
                        initiatedBy: data.initiatedBy,
                        businessJustification: data.businessJustification,
                        riskAssessmentSummary: data.riskAssessmentSummary,
                        approvalSteps: data.approvalChain,
                        status: client_1.WorkflowStatus.PENDING,
                        currentStep: 1,
                    },
                });
                // Create approval steps
                const steps = data.approvalChain.map((approver, index) => ({
                    workflowId: newWorkflow.id,
                    stepOrder: index + 1,
                    approverRole: approver.approverRole,
                    approverUserId: approver.approverUserId,
                    approverName: approver.approverName,
                }));
                await tx.vendorApprovalStep.createMany({
                    data: steps,
                });
                return newWorkflow;
            });
            logger_1.default.info('Approval workflow created', {
                workflowId: workflow.id,
                vendorId: data.vendorId,
                workflowType: data.workflowType,
                approvers: data.approvalChain.length,
            });
            return workflow;
        }
        catch (error) {
            logger_1.default.error('Failed to create approval workflow', { error: error.message, data });
            throw error instanceof errors_1.NotFoundError || error instanceof errors_1.ValidationError
                ? error
                : (0, errors_1.handlePrismaError)(error);
        }
    }
    /**
     * Get workflow by ID with all steps
     */
    async getWorkflowById(workflowId, organizationId) {
        try {
            const workflow = await database_1.prisma.vendorApprovalWorkflow.findFirst({
                where: {
                    id: workflowId,
                    organizationId,
                },
                include: {
                    vendor: {
                        select: {
                            id: true,
                            name: true,
                            tier: true,
                            status: true,
                        },
                    },
                    steps: {
                        orderBy: { stepOrder: 'asc' },
                    },
                },
            });
            if (!workflow) {
                throw new errors_1.NotFoundError('Approval Workflow', workflowId);
            }
            return workflow;
        }
        catch (error) {
            logger_1.default.error('Failed to get workflow', { error: error.message, workflowId });
            throw error instanceof errors_1.NotFoundError ? error : (0, errors_1.handlePrismaError)(error);
        }
    }
    /**
     * Submit approval decision for a step
     */
    async submitApprovalDecision(data) {
        try {
            return await database_1.prisma.$transaction(async (tx) => {
                // Get workflow
                const workflow = await tx.vendorApprovalWorkflow.findUnique({
                    where: { id: data.workflowId },
                    include: {
                        steps: {
                            orderBy: { stepOrder: 'asc' },
                        },
                    },
                });
                if (!workflow) {
                    throw new errors_1.NotFoundError('Approval Workflow', data.workflowId);
                }
                // Validate workflow is not already completed
                if (workflow.status === client_1.WorkflowStatus.APPROVED || workflow.status === client_1.WorkflowStatus.REJECTED) {
                    throw new errors_1.BusinessLogicError('Workflow is already completed');
                }
                // Get the current step
                const currentStep = workflow.steps.find(s => s.stepOrder === data.stepOrder);
                if (!currentStep) {
                    throw new errors_1.NotFoundError('Approval Step', data.stepOrder.toString());
                }
                // Validate step hasn't been decided yet
                if (currentStep.decision) {
                    throw new errors_1.BusinessLogicError('This step has already been decided');
                }
                // Update the step with decision
                await tx.vendorApprovalStep.update({
                    where: { id: currentStep.id },
                    data: {
                        decision: data.decision,
                        decidedBy: data.decidedBy,
                        decidedAt: new Date(),
                        comments: data.comments,
                        conditions: data.conditions || [],
                        digitalSignature: data.digitalSignature,
                        ipAddress: data.ipAddress,
                        userAgent: data.userAgent,
                    },
                });
                // Determine workflow status based on decision
                let newWorkflowStatus = workflow.status;
                let currentStepNumber = workflow.currentStep;
                if (data.decision === client_1.ApprovalDecision.REJECTED) {
                    // Workflow is rejected
                    newWorkflowStatus = client_1.WorkflowStatus.REJECTED;
                }
                else if (data.decision === client_1.ApprovalDecision.ESCALATED) {
                    // Workflow is escalated
                    newWorkflowStatus = client_1.WorkflowStatus.ESCALATED;
                }
                else if (data.decision === client_1.ApprovalDecision.APPROVED || data.decision === client_1.ApprovalDecision.CONDITIONALLY_APPROVED) {
                    // Check if this is the last step
                    if (data.stepOrder === workflow.steps.length) {
                        // Workflow is approved
                        newWorkflowStatus = client_1.WorkflowStatus.APPROVED;
                    }
                    else {
                        // Move to next step
                        newWorkflowStatus = client_1.WorkflowStatus.IN_PROGRESS;
                        currentStepNumber = data.stepOrder + 1;
                    }
                }
                // Update workflow
                const updatedWorkflow = await tx.vendorApprovalWorkflow.update({
                    where: { id: data.workflowId },
                    data: {
                        status: newWorkflowStatus,
                        currentStep: currentStepNumber,
                        completedAt: newWorkflowStatus === client_1.WorkflowStatus.APPROVED || newWorkflowStatus === client_1.WorkflowStatus.REJECTED
                            ? new Date()
                            : null,
                    },
                    include: {
                        vendor: true,
                        steps: {
                            orderBy: { stepOrder: 'asc' },
                        },
                    },
                });
                // If workflow is approved, update vendor status based on workflow type
                if (newWorkflowStatus === client_1.WorkflowStatus.APPROVED) {
                    await this.handleApprovedWorkflow(tx, updatedWorkflow);
                }
                logger_1.default.info('Approval decision submitted', {
                    workflowId: data.workflowId,
                    stepOrder: data.stepOrder,
                    decision: data.decision,
                    decidedBy: data.decidedBy,
                    newStatus: newWorkflowStatus,
                });
                return updatedWorkflow;
            });
        }
        catch (error) {
            logger_1.default.error('Failed to submit approval decision', { error: error.message, data });
            throw error instanceof errors_1.NotFoundError || error instanceof errors_1.BusinessLogicError
                ? error
                : (0, errors_1.handlePrismaError)(error);
        }
    }
    /**
     * Handle approved workflow actions
     */
    async handleApprovedWorkflow(tx, workflow) {
        switch (workflow.workflowType) {
            case client_1.WorkflowType.ONBOARDING:
                await tx.vendor.update({
                    where: { id: workflow.vendorId },
                    data: {
                        status: 'APPROVED',
                        onboardedAt: new Date(),
                    },
                });
                break;
            case client_1.WorkflowType.CONTRACT_RENEWAL:
                // Update vendor status or add logic for contract renewal
                break;
            case client_1.WorkflowType.TIER_CHANGE:
                // Tier change approval - actual tier change would be in the workflow metadata
                break;
            case client_1.WorkflowType.TERMINATION:
                await tx.vendor.update({
                    where: { id: workflow.vendorId },
                    data: {
                        status: 'TERMINATED',
                        terminatedAt: new Date(),
                    },
                });
                break;
            default:
                break;
        }
    }
    /**
     * List workflows for a vendor
     */
    async listVendorWorkflows(vendorId, organizationId) {
        try {
            return await database_1.prisma.vendorApprovalWorkflow.findMany({
                where: {
                    vendorId,
                    organizationId,
                },
                include: {
                    steps: {
                        orderBy: { stepOrder: 'asc' },
                    },
                },
                orderBy: { initiatedAt: 'desc' },
            });
        }
        catch (error) {
            logger_1.default.error('Failed to list vendor workflows', { error: error.message, vendorId });
            throw (0, errors_1.handlePrismaError)(error);
        }
    }
    /**
     * List pending approvals for a user
     */
    async listPendingApprovals(userId, organizationId) {
        try {
            return await database_1.prisma.vendorApprovalStep.findMany({
                where: {
                    approverUserId: userId,
                    decision: null,
                    workflow: {
                        organizationId,
                        status: {
                            in: [client_1.WorkflowStatus.PENDING, client_1.WorkflowStatus.IN_PROGRESS],
                        },
                    },
                },
                include: {
                    workflow: {
                        include: {
                            vendor: {
                                select: {
                                    id: true,
                                    name: true,
                                    tier: true,
                                    status: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { requiredAt: 'asc' },
            });
        }
        catch (error) {
            logger_1.default.error('Failed to list pending approvals', { error: error.message, userId });
            throw (0, errors_1.handlePrismaError)(error);
        }
    }
    /**
     * Cancel a workflow
     */
    async cancelWorkflow(workflowId, organizationId, cancelledBy, reason) {
        try {
            const workflow = await database_1.prisma.vendorApprovalWorkflow.findFirst({
                where: {
                    id: workflowId,
                    organizationId,
                },
            });
            if (!workflow) {
                throw new errors_1.NotFoundError('Approval Workflow', workflowId);
            }
            if (workflow.status === client_1.WorkflowStatus.APPROVED || workflow.status === client_1.WorkflowStatus.REJECTED) {
                throw new errors_1.BusinessLogicError('Cannot cancel a completed workflow');
            }
            const updated = await database_1.prisma.vendorApprovalWorkflow.update({
                where: { id: workflowId },
                data: {
                    status: client_1.WorkflowStatus.CANCELLED,
                    completedAt: new Date(),
                },
            });
            logger_1.default.info('Workflow cancelled', {
                workflowId,
                cancelledBy,
                reason,
            });
            return updated;
        }
        catch (error) {
            logger_1.default.error('Failed to cancel workflow', { error: error.message, workflowId });
            throw error instanceof errors_1.NotFoundError || error instanceof errors_1.BusinessLogicError
                ? error
                : (0, errors_1.handlePrismaError)(error);
        }
    }
    /**
     * Get workflow statistics for organization
     */
    async getWorkflowStatistics(organizationId, startDate, endDate) {
        try {
            const where = { organizationId };
            if (startDate || endDate) {
                where.initiatedAt = {};
                if (startDate)
                    where.initiatedAt.gte = startDate;
                if (endDate)
                    where.initiatedAt.lte = endDate;
            }
            const [total, pending, inProgress, approved, rejected, cancelled, escalated] = await Promise.all([
                database_1.prisma.vendorApprovalWorkflow.count({ where }),
                database_1.prisma.vendorApprovalWorkflow.count({ where: { ...where, status: client_1.WorkflowStatus.PENDING } }),
                database_1.prisma.vendorApprovalWorkflow.count({ where: { ...where, status: client_1.WorkflowStatus.IN_PROGRESS } }),
                database_1.prisma.vendorApprovalWorkflow.count({ where: { ...where, status: client_1.WorkflowStatus.APPROVED } }),
                database_1.prisma.vendorApprovalWorkflow.count({ where: { ...where, status: client_1.WorkflowStatus.REJECTED } }),
                database_1.prisma.vendorApprovalWorkflow.count({ where: { ...where, status: client_1.WorkflowStatus.CANCELLED } }),
                database_1.prisma.vendorApprovalWorkflow.count({ where: { ...where, status: client_1.WorkflowStatus.ESCALATED } }),
            ]);
            // Calculate average approval time for completed workflows
            const completedWorkflows = await database_1.prisma.vendorApprovalWorkflow.findMany({
                where: {
                    ...where,
                    status: { in: [client_1.WorkflowStatus.APPROVED, client_1.WorkflowStatus.REJECTED] },
                    completedAt: { not: null },
                },
                select: {
                    initiatedAt: true,
                    completedAt: true,
                },
            });
            const avgApprovalTime = completedWorkflows.length > 0
                ? completedWorkflows.reduce((sum, w) => {
                    const duration = w.completedAt.getTime() - w.initiatedAt.getTime();
                    return sum + duration;
                }, 0) / completedWorkflows.length / (1000 * 60 * 60 * 24) // Convert to days
                : 0;
            return {
                total,
                byStatus: {
                    pending,
                    inProgress,
                    approved,
                    rejected,
                    cancelled,
                    escalated,
                },
                approvalRate: total > 0 ? (approved / total) * 100 : 0,
                rejectionRate: total > 0 ? (rejected / total) * 100 : 0,
                averageApprovalTimeDays: Math.round(avgApprovalTime * 10) / 10,
            };
        }
        catch (error) {
            logger_1.default.error('Failed to get workflow statistics', { error: error.message, organizationId });
            throw (0, errors_1.handlePrismaError)(error);
        }
    }
}
exports.default = new VendorApprovalWorkflowService();
//# sourceMappingURL=vendorApprovalWorkflow.js.map
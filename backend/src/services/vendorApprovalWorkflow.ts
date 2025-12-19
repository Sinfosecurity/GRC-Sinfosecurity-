/**
 * Vendor Approval Workflow Service
 * Enterprise-grade multi-level approval workflows for vendor onboarding, changes, and risk acceptance
 */

import { VendorApprovalWorkflow, WorkflowType, WorkflowStatus, ApprovalDecision } from '@prisma/client';
import { prisma } from '../config/database';
import { handlePrismaError, NotFoundError, ValidationError, BusinessLogicError } from '../utils/errors';
import logger from '../config/logger';

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

class VendorApprovalWorkflowService {
    /**
     * Create a new approval workflow
     */
    async createWorkflow(data: CreateWorkflowInput): Promise<VendorApprovalWorkflow> {
        try {
            // Validate vendor exists
            const vendor = await prisma.vendor.findFirst({
                where: {
                    id: data.vendorId,
                    organizationId: data.organizationId,
                },
            });

            if (!vendor) {
                throw new NotFoundError('Vendor', data.vendorId);
            }

            // Validate approval chain
            if (!data.approvalChain || data.approvalChain.length === 0) {
                throw new ValidationError('Approval chain must have at least one approver');
            }

            // Create workflow with steps in a transaction
            const workflow = await prisma.$transaction(async (tx) => {
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
                        status: WorkflowStatus.PENDING,
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

            logger.info('Approval workflow created', {
                workflowId: workflow.id,
                vendorId: data.vendorId,
                workflowType: data.workflowType,
                approvers: data.approvalChain.length,
            });

            return workflow;
        } catch (error: any) {
            logger.error('Failed to create approval workflow', { error: error.message, data });
            throw error instanceof NotFoundError || error instanceof ValidationError
                ? error
                : handlePrismaError(error);
        }
    }

    /**
     * Get workflow by ID with all steps
     */
    async getWorkflowById(workflowId: string, organizationId: string) {
        try {
            const workflow = await prisma.vendorApprovalWorkflow.findFirst({
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
                throw new NotFoundError('Approval Workflow', workflowId);
            }

            return workflow;
        } catch (error: any) {
            logger.error('Failed to get workflow', { error: error.message, workflowId });
            throw error instanceof NotFoundError ? error : handlePrismaError(error);
        }
    }

    /**
     * Submit approval decision for a step
     */
    async submitApprovalDecision(data: ApprovalStepInput): Promise<VendorApprovalWorkflow> {
        try {
            return await prisma.$transaction(async (tx) => {
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
                    throw new NotFoundError('Approval Workflow', data.workflowId);
                }

                // Validate workflow is not already completed
                if (workflow.status === WorkflowStatus.APPROVED || workflow.status === WorkflowStatus.REJECTED) {
                    throw new BusinessLogicError('Workflow is already completed');
                }

                // Get the current step
                const currentStep = workflow.steps.find(s => s.stepOrder === data.stepOrder);
                if (!currentStep) {
                    throw new NotFoundError('Approval Step', data.stepOrder.toString());
                }

                // Validate step hasn't been decided yet
                if (currentStep.decision) {
                    throw new BusinessLogicError('This step has already been decided');
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

                if (data.decision === ApprovalDecision.REJECTED) {
                    // Workflow is rejected
                    newWorkflowStatus = WorkflowStatus.REJECTED;
                } else if (data.decision === ApprovalDecision.ESCALATED) {
                    // Workflow is escalated
                    newWorkflowStatus = WorkflowStatus.ESCALATED;
                } else if (data.decision === ApprovalDecision.APPROVED || data.decision === ApprovalDecision.CONDITIONALLY_APPROVED) {
                    // Check if this is the last step
                    if (data.stepOrder === workflow.steps.length) {
                        // Workflow is approved
                        newWorkflowStatus = WorkflowStatus.APPROVED;
                    } else {
                        // Move to next step
                        newWorkflowStatus = WorkflowStatus.IN_PROGRESS;
                        currentStepNumber = data.stepOrder + 1;
                    }
                }

                // Update workflow
                const updatedWorkflow = await tx.vendorApprovalWorkflow.update({
                    where: { id: data.workflowId },
                    data: {
                        status: newWorkflowStatus,
                        currentStep: currentStepNumber,
                        completedAt: newWorkflowStatus === WorkflowStatus.APPROVED || newWorkflowStatus === WorkflowStatus.REJECTED
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
                if (newWorkflowStatus === WorkflowStatus.APPROVED) {
                    await this.handleApprovedWorkflow(tx, updatedWorkflow);
                }

                logger.info('Approval decision submitted', {
                    workflowId: data.workflowId,
                    stepOrder: data.stepOrder,
                    decision: data.decision,
                    decidedBy: data.decidedBy,
                    newStatus: newWorkflowStatus,
                });

                return updatedWorkflow;
            });
        } catch (error: any) {
            logger.error('Failed to submit approval decision', { error: error.message, data });
            throw error instanceof NotFoundError || error instanceof BusinessLogicError
                ? error
                : handlePrismaError(error);
        }
    }

    /**
     * Handle approved workflow actions
     */
    private async handleApprovedWorkflow(tx: any, workflow: any) {
        switch (workflow.workflowType) {
            case WorkflowType.ONBOARDING:
                await tx.vendor.update({
                    where: { id: workflow.vendorId },
                    data: {
                        status: 'APPROVED',
                        onboardedAt: new Date(),
                    },
                });
                break;

            case WorkflowType.CONTRACT_RENEWAL:
                // Update vendor status or add logic for contract renewal
                break;

            case WorkflowType.TIER_CHANGE:
                // Tier change approval - actual tier change would be in the workflow metadata
                break;

            case WorkflowType.TERMINATION:
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
    async listVendorWorkflows(vendorId: string, organizationId: string) {
        try {
            return await prisma.vendorApprovalWorkflow.findMany({
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
        } catch (error: any) {
            logger.error('Failed to list vendor workflows', { error: error.message, vendorId });
            throw handlePrismaError(error);
        }
    }

    /**
     * List pending approvals for a user
     */
    async listPendingApprovals(userId: string, organizationId: string) {
        try {
            return await prisma.vendorApprovalStep.findMany({
                where: {
                    approverUserId: userId,
                    decision: null,
                    workflow: {
                        organizationId,
                        status: {
                            in: [WorkflowStatus.PENDING, WorkflowStatus.IN_PROGRESS],
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
        } catch (error: any) {
            logger.error('Failed to list pending approvals', { error: error.message, userId });
            throw handlePrismaError(error);
        }
    }

    /**
     * Cancel a workflow
     */
    async cancelWorkflow(workflowId: string, organizationId: string, cancelledBy: string, reason?: string) {
        try {
            const workflow = await prisma.vendorApprovalWorkflow.findFirst({
                where: {
                    id: workflowId,
                    organizationId,
                },
            });

            if (!workflow) {
                throw new NotFoundError('Approval Workflow', workflowId);
            }

            if (workflow.status === WorkflowStatus.APPROVED || workflow.status === WorkflowStatus.REJECTED) {
                throw new BusinessLogicError('Cannot cancel a completed workflow');
            }

            const updated = await prisma.vendorApprovalWorkflow.update({
                where: { id: workflowId },
                data: {
                    status: WorkflowStatus.CANCELLED,
                    completedAt: new Date(),
                },
            });

            logger.info('Workflow cancelled', {
                workflowId,
                cancelledBy,
                reason,
            });

            return updated;
        } catch (error: any) {
            logger.error('Failed to cancel workflow', { error: error.message, workflowId });
            throw error instanceof NotFoundError || error instanceof BusinessLogicError
                ? error
                : handlePrismaError(error);
        }
    }

    /**
     * Get workflow statistics for organization
     */
    async getWorkflowStatistics(organizationId: string, startDate?: Date, endDate?: Date) {
        try {
            const where: any = { organizationId };
            if (startDate || endDate) {
                where.initiatedAt = {};
                if (startDate) where.initiatedAt.gte = startDate;
                if (endDate) where.initiatedAt.lte = endDate;
            }

            const [total, pending, inProgress, approved, rejected, cancelled, escalated] = await Promise.all([
                prisma.vendorApprovalWorkflow.count({ where }),
                prisma.vendorApprovalWorkflow.count({ where: { ...where, status: WorkflowStatus.PENDING } }),
                prisma.vendorApprovalWorkflow.count({ where: { ...where, status: WorkflowStatus.IN_PROGRESS } }),
                prisma.vendorApprovalWorkflow.count({ where: { ...where, status: WorkflowStatus.APPROVED } }),
                prisma.vendorApprovalWorkflow.count({ where: { ...where, status: WorkflowStatus.REJECTED } }),
                prisma.vendorApprovalWorkflow.count({ where: { ...where, status: WorkflowStatus.CANCELLED } }),
                prisma.vendorApprovalWorkflow.count({ where: { ...where, status: WorkflowStatus.ESCALATED } }),
            ]);

            // Calculate average approval time for completed workflows
            const completedWorkflows = await prisma.vendorApprovalWorkflow.findMany({
                where: {
                    ...where,
                    status: { in: [WorkflowStatus.APPROVED, WorkflowStatus.REJECTED] },
                    completedAt: { not: null },
                },
                select: {
                    initiatedAt: true,
                    completedAt: true,
                },
            });

            const avgApprovalTime = completedWorkflows.length > 0
                ? completedWorkflows.reduce((sum, w) => {
                    const duration = w.completedAt!.getTime() - w.initiatedAt.getTime();
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
        } catch (error: any) {
            logger.error('Failed to get workflow statistics', { error: error.message, organizationId });
            throw handlePrismaError(error);
        }
    }
}

export default new VendorApprovalWorkflowService();

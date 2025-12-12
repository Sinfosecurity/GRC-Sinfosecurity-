/**
 * Workflow Engine
 * Executes workflows, manages state, and automates task assignments
 */

import taskService, { Task, TaskPriority } from './taskService';
import { AuditService } from './auditService';

export type WorkflowType = 'manual' | 'automated' | 'scheduled';
export type WorkflowStatus = 'active' | 'inactive' | 'draft';
export type TriggerType = 'manual' | 'event' | 'schedule';
export type StepType = 'task' | 'notification' | 'approval' | 'automation';

export interface Workflow {
    id: string;
    name: string;
    description: string;
    type: WorkflowType;
    trigger: WorkflowTrigger;
    steps: WorkflowStep[];
    schedule?: ScheduleConfig;
    status: WorkflowStatus;
    createdBy: string;
    createdAt: Date;
    lastExecuted?: Date;
}

export interface WorkflowTrigger {
    type: TriggerType;
    event?: string; // e.g., 'risk.created', 'incident.high'
    conditions?: TriggerCondition[];
}

export interface TriggerCondition {
    field: string;
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
    value: any;
}

export interface WorkflowStep {
    id: string;
    type: StepType;
    name: string;
    description?: string;
    assignTo?: AssignmentRule;
    dueInDays?: number;
    priority?: TaskPriority;
    nextStep?: string;
}

export interface AssignmentRule {
    type: 'user' | 'role' | 'round_robin' | 'least_busy';
    value?: string; // user ID or role name
}

export interface ScheduleConfig {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    month?: number; // 1-12 for yearly
    startDate: Date;
    endDate?: Date;
}

export interface WorkflowExecution {
    id: string;
    workflowId: string;
    startedAt: Date;
    completedAt?: Date;
    status: 'running' | 'completed' | 'failed';
    currentStep?: string;
    tasksCreated: string[];
    error?: string;
}

// In-memory storage
const workflows = new Map<string, Workflow>();
const executions = new Map<string, WorkflowExecution>();

// Initialize with demo workflows
const initializeDemoWorkflows = () => {
    const demoWorkflows: Workflow[] = [
        {
            id: 'wf_1',
            name: 'Quarterly Risk Assessment',
            description: 'Automated quarterly risk assessment workflow',
            type: 'scheduled',
            trigger: {
                type: 'schedule',
            },
            schedule: {
                frequency: 'quarterly',
                startDate: new Date('2024-01-01'),
            },
            steps: [
                {
                    id: 'step_1',
                    type: 'task',
                    name: 'Conduct Risk Assessment',
                    description: 'Identify and assess all risks for the quarter',
                    assignTo: { type: 'role', value: 'COMPLIANCE_OFFICER' },
                    dueInDays: 14,
                    priority: 'high',
                    nextStep: 'step_2',
                },
                {
                    id: 'step_2',
                    type: 'task',
                    name: 'Director Review',
                    description: 'Review completed risk assessment',
                    assignTo: { type: 'role', value: 'ADMIN' },
                    dueInDays: 7,
                    priority: 'high',
                },
            ],
            status: 'active',
            createdBy: 'user_1',
            createdAt: new Date('2024-01-01'),
        },
        {
            id: 'wf_2',
            name: 'Incident Remediation',
            description: 'Standard workflow for high/critical incident remediation',
            type: 'automated',
            trigger: {
                type: 'event',
                event: 'incident.created',
                conditions: [
                    { field: 'severity', operator: 'equals', value: 'high' },
                ],
            },
            steps: [
                {
                    id: 'step_1',
                    type: 'task',
                    name: 'Root Cause Analysis',
                    assignTo: { type: 'role', value: 'ADMIN' },
                    dueInDays: 3,
                    priority: 'critical',
                    nextStep: 'step_2',
                },
                {
                    id: 'step_2',
                    type: 'task',
                    name: 'Remediation Plan',
                    assignTo: { type: 'role', value: 'COMPLIANCE_OFFICER' },
                    dueInDays: 2,
                    priority: 'critical',
                    nextStep: 'step_3',
                },
                {
                    id: 'step_3',
                    type: 'task',
                    name: 'Implementation',
                    assignTo: { type: 'role', value: 'ADMIN' },
                    dueInDays: 7,
                    priority: 'high',
                    nextStep: 'step_4',
                },
                {
                    id: 'step_4',
                    type: 'task',
                    name: 'Verification',
                    assignTo: { type: 'role', value: 'AUDITOR' },
                    dueInDays: 2,
                    priority: 'high',
                },
            ],
            status: 'active',
            createdBy: 'user_1',
            createdAt: new Date('2024-01-15'),
        },
    ];

    demoWorkflows.forEach(wf => workflows.set(wf.id, wf));
};

initializeDemoWorkflows();

class WorkflowEngine {
    /**
     * Get all workflows
     */
    getAllWorkflows(): Workflow[] {
        return Array.from(workflows.values());
    }

    /**
     * Get workflow by ID
     */
    getWorkflowById(workflowId: string): Workflow | undefined {
        return workflows.get(workflowId);
    }

    /**
     * Create new workflow
     */
    createWorkflow(data: Omit<Workflow, 'id' | 'createdAt'>): Workflow {
        const workflow: Workflow = {
            id: `wf_${Date.now()}`,
            ...data,
            createdAt: new Date(),
        };

        workflows.set(workflow.id, workflow);

        AuditService.log({
            userId: data.createdBy,
            userName: 'User',
            action: 'create_workflow',
            resourceType: 'Workflow',
            resourceId: workflow.id,
            resourceName: workflow.name,
            status: 'success',
        });

        return workflow;
    }

    /**
     * Update workflow
     */
    updateWorkflow(workflowId: string, updates: Partial<Workflow>): Workflow | null {
        const workflow = workflows.get(workflowId);

        if (!workflow) {
            return null;
        }

        const updated = { ...workflow, ...updates };
        workflows.set(workflowId, updated);

        AuditService.log({
            userId: 'system',
            userName: 'System',
            action: 'update_workflow',
            resourceType: 'Workflow',
            resourceId: workflowId,
            resourceName: workflow.name,
            changes: updates,
            status: 'success',
        });

        return updated;
    }

    /**
     * Delete workflow
     */
    deleteWorkflow(workflowId: string): boolean {
        const workflow = workflows.get(workflowId);

        if (!workflow) {
            return false;
        }

        workflows.delete(workflowId);

        AuditService.log({
            userId: 'system',
            userName: 'System',
            action: 'delete_workflow',
            resourceType: 'Workflow',
            resourceId: workflowId,
            resourceName: workflow.name,
            status: 'success',
        });

        return true;
    }

    /**
     * Execute workflow manually
     */
    async executeWorkflow(workflowId: string, context?: any): Promise<WorkflowExecution> {
        const workflow = workflows.get(workflowId);

        if (!workflow) {
            throw new Error('Workflow not found');
        }

        const execution: WorkflowExecution = {
            id: `exec_${Date.now()}`,
            workflowId,
            startedAt: new Date(),
            status: 'running',
            tasksCreated: [],
        };

        executions.set(execution.id, execution);

        try {
            // Execute each step
            for (const step of workflow.steps) {
                if (step.type === 'task') {
                    const task = await this.createTaskFromStep(workflow, step, context);
                    execution.tasksCreated.push(task.id);
                }
            }

            execution.status = 'completed';
            execution.completedAt = new Date();

            // Update last executed timestamp
            workflow.lastExecuted = new Date();
            workflows.set(workflowId, workflow);

            AuditService.log({
                userId: 'system',
                userName: 'System',
                action: 'execute_workflow',
                resourceType: 'Workflow',
                resourceId: workflowId,
                resourceName: workflow.name,
                status: 'success',
                details: `Created ${execution.tasksCreated.length} tasks`,
            });

        } catch (error) {
            execution.status = 'failed';
            execution.error = error instanceof Error ? error.message : 'Unknown error';
            execution.completedAt = new Date();
        }

        executions.set(execution.id, execution);
        return execution;
    }

    /**
     * Create task from workflow step
     */
    private async createTaskFromStep(
        workflow: Workflow,
        step: WorkflowStep,
        context?: any
    ): Promise<Task> {
        const assignedTo = this.resolveAssignment(step.assignTo);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (step.dueInDays || 7));

        const task = taskService.createTask({
            workflowId: workflow.id,
            title: step.name,
            description: step.description || workflow.description,
            type: 'other',
            assignedTo,
            assignedBy: workflow.createdBy,
            assignedAt: new Date(),
            dueDate,
            priority: step.priority || 'medium',
            status: 'pending',
            relatedResource: context?.relatedResource,
        });

        return task;
    }

    /**
     * Resolve assignment based on rule
     */
    private resolveAssignment(rule?: AssignmentRule): string {
        if (!rule) {
            return 'user_1'; // Default to admin
        }

        switch (rule.type) {
            case 'user':
                return rule.value || 'user_1';

            case 'role':
                // Simple role to user mapping (in production would query user database)
                const roleMap: Record<string, string> = {
                    'ADMIN': 'user_1',
                    'COMPLIANCE_OFFICER': 'user_2',
                    'AUDITOR': 'user_3',
                    'VIEWER': 'user_4',
                };
                return roleMap[rule.value || ''] || 'user_1';

            case 'round_robin':
                // Simple round-robin (in production would track assignments)
                const users = ['user_1', 'user_2', 'user_3'];
                return users[Math.floor(Math.random() * users.length)];

            case 'least_busy':
                // Assign to user with least tasks (simplified)
                const userTasks = {
                    'user_1': taskService.getUserTasks('user_1').filter(t => t.status !== 'completed').length,
                    'user_2': taskService.getUserTasks('user_2').filter(t => t.status !== 'completed').length,
                    'user_3': taskService.getUserTasks('user_3').filter(t => t.status !== 'completed').length,
                };

                return Object.entries(userTasks).sort((a, b) => a[1] - b[1])[0][0];

            default:
                return 'user_1';
        }
    }

    /**
     * Get workflow execution history
     */
    getExecutionHistory(workflowId: string): WorkflowExecution[] {
        return Array.from(executions.values())
            .filter(exec => exec.workflowId === workflowId)
            .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    }

    /**
     * Get all executions
     */
    getAllExecutions(): WorkflowExecution[] {
        return Array.from(executions.values())
            .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    }
}

// Export singleton instance
export default new WorkflowEngine();

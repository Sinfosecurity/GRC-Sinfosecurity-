"use strict";
/**
 * Workflow Engine
 * Executes workflows, manages state, and automates task assignments
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const taskService_1 = __importDefault(require("./taskService"));
const auditService_1 = require("./auditService");
// In-memory storage
const workflows = new Map();
const executions = new Map();
// Initialize with demo workflows
const initializeDemoWorkflows = () => {
    const demoWorkflows = [
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
    getAllWorkflows() {
        return Array.from(workflows.values());
    }
    /**
     * Get workflow by ID
     */
    getWorkflowById(workflowId) {
        return workflows.get(workflowId);
    }
    /**
     * Create new workflow
     */
    createWorkflow(data) {
        const workflow = {
            id: `wf_${Date.now()}`,
            ...data,
            createdAt: new Date(),
        };
        workflows.set(workflow.id, workflow);
        auditService_1.AuditService.log({
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
    updateWorkflow(workflowId, updates) {
        const workflow = workflows.get(workflowId);
        if (!workflow) {
            return null;
        }
        const updated = { ...workflow, ...updates };
        workflows.set(workflowId, updated);
        auditService_1.AuditService.log({
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
    deleteWorkflow(workflowId) {
        const workflow = workflows.get(workflowId);
        if (!workflow) {
            return false;
        }
        workflows.delete(workflowId);
        auditService_1.AuditService.log({
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
    async executeWorkflow(workflowId, context) {
        const workflow = workflows.get(workflowId);
        if (!workflow) {
            throw new Error('Workflow not found');
        }
        const execution = {
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
            auditService_1.AuditService.log({
                userId: 'system',
                userName: 'System',
                action: 'execute_workflow',
                resourceType: 'Workflow',
                resourceId: workflowId,
                resourceName: workflow.name,
                status: 'success',
                details: `Created ${execution.tasksCreated.length} tasks`,
            });
        }
        catch (error) {
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
    async createTaskFromStep(workflow, step, context) {
        const assignedTo = this.resolveAssignment(step.assignTo);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (step.dueInDays || 7));
        const task = taskService_1.default.createTask({
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
    resolveAssignment(rule) {
        if (!rule) {
            return 'user_1'; // Default to admin
        }
        switch (rule.type) {
            case 'user':
                return rule.value || 'user_1';
            case 'role':
                // Simple role to user mapping (in production would query user database)
                const roleMap = {
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
                    'user_1': taskService_1.default.getUserTasks('user_1').filter(t => t.status !== 'completed').length,
                    'user_2': taskService_1.default.getUserTasks('user_2').filter(t => t.status !== 'completed').length,
                    'user_3': taskService_1.default.getUserTasks('user_3').filter(t => t.status !== 'completed').length,
                };
                return Object.entries(userTasks).sort((a, b) => a[1] - b[1])[0][0];
            default:
                return 'user_1';
        }
    }
    /**
     * Get workflow execution history
     */
    getExecutionHistory(workflowId) {
        return Array.from(executions.values())
            .filter(exec => exec.workflowId === workflowId)
            .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    }
    /**
     * Get all executions
     */
    getAllExecutions() {
        return Array.from(executions.values())
            .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    }
}
// Export singleton instance
exports.default = new WorkflowEngine();
//# sourceMappingURL=workflowEngine.js.map
/**
 * Workflow Engine
 * Executes workflows, manages state, and automates task assignments
 */
import { TaskPriority } from './taskService';
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
    event?: string;
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
    value?: string;
}
export interface ScheduleConfig {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    month?: number;
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
declare class WorkflowEngine {
    /**
     * Get all workflows
     */
    getAllWorkflows(): Workflow[];
    /**
     * Get workflow by ID
     */
    getWorkflowById(workflowId: string): Workflow | undefined;
    /**
     * Create new workflow
     */
    createWorkflow(data: Omit<Workflow, 'id' | 'createdAt'>): Workflow;
    /**
     * Update workflow
     */
    updateWorkflow(workflowId: string, updates: Partial<Workflow>): Workflow | null;
    /**
     * Delete workflow
     */
    deleteWorkflow(workflowId: string): boolean;
    /**
     * Execute workflow manually
     */
    executeWorkflow(workflowId: string, context?: any): Promise<WorkflowExecution>;
    /**
     * Create task from workflow step
     */
    private createTaskFromStep;
    /**
     * Resolve assignment based on rule
     */
    private resolveAssignment;
    /**
     * Get workflow execution history
     */
    getExecutionHistory(workflowId: string): WorkflowExecution[];
    /**
     * Get all executions
     */
    getAllExecutions(): WorkflowExecution[];
}
declare const _default: WorkflowEngine;
export default _default;
//# sourceMappingURL=workflowEngine.d.ts.map
/**
 * Task Service
 * Handles task CRUD operations, assignments, and status tracking
 */
export type TaskType = 'risk_assessment' | 'compliance_review' | 'control_test' | 'remediation' | 'policy_review' | 'other';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
export interface Task {
    id: string;
    workflowId?: string;
    title: string;
    description: string;
    type: TaskType;
    assignedTo: string;
    assignedBy?: string;
    assignedAt: Date;
    dueDate: Date;
    priority: TaskPriority;
    status: TaskStatus;
    relatedResource?: {
        type: 'risk' | 'compliance' | 'control' | 'incident' | 'policy';
        id: string;
        name: string;
    };
    completedAt?: Date;
    completedBy?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare class TaskService {
    /**
     * Get all tasks with optional filters
     */
    getAllTasks(filters?: {
        status?: TaskStatus;
        assignedTo?: string;
        priority?: TaskPriority;
        type?: TaskType;
        overdue?: boolean;
    }): Task[];
    /**
     * Get task by ID
     */
    getTaskById(taskId: string): Task | undefined;
    /**
     * Get tasks assigned to a specific user
     */
    getUserTasks(userId: string): Task[];
    /**
     * Get overdue tasks
     */
    getOverdueTasks(): Task[];
    /**
     * Create a new task
     */
    createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task;
    /**
     * Update task
     */
    updateTask(taskId: string, updates: Partial<Task>): Task | null;
    /**
     * Assign task to user
     */
    assignTask(taskId: string, userId: string, assignedBy?: string): Task | null;
    /**
     * Complete task
     */
    completeTask(taskId: string, completedBy: string, notes?: string): Task | null;
    /**
     * Delete task
     */
    deleteTask(taskId: string): boolean;
    /**
     * Get task statistics
     */
    getTaskStats(): {
        total: number;
        byStatus: {
            pending: number;
            in_progress: number;
            blocked: number;
            completed: number;
            cancelled: number;
        };
        byPriority: {
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
        overdue: number;
    };
}
declare const _default: TaskService;
export default _default;
//# sourceMappingURL=taskService.d.ts.map
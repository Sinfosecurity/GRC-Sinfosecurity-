/**
 * Task Service
 * Handles task CRUD operations, assignments, and status tracking
 */

import { AuditService } from './auditService';

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

// In-memory storage (will be moved to database later)
const tasks = new Map<string, Task>();

// Initialize with demo tasks
const initializeDemoTasks = () => {
    const demoTasks: Task[] = [
        {
            id: 'task_1',
            title: 'Q4 2024 Risk Assessment',
            description: 'Conduct quarterly risk assessment for all critical systems',
            type: 'risk_assessment',
            assignedTo: 'user_2', // Compliance Officer
            assignedBy: 'user_1',
            assignedAt: new Date('2024-12-01'),
            dueDate: new Date('2024-12-31'),
            priority: 'high',
            status: 'in_progress',
            createdAt: new Date('2024-12-01'),
            updatedAt: new Date('2024-12-05'),
        },
        {
            id: 'task_2',
            title: 'ISO 27001 Compliance Review',
            description: 'Review and update ISO 27001 compliance documentation',
            type: 'compliance_review',
            assignedTo: 'user_2',
            assignedBy: 'user_1',
            assignedAt: new Date('2024-12-10'),
            dueDate: new Date('2024-12-20'),
            priority: 'high',
            status: 'pending',
            createdAt: new Date('2024-12-10'),
            updatedAt: new Date('2024-12-10'),
        },
        {
            id: 'task_3',
            title: 'Access Control Testing',
            description: 'Test effectiveness of user access controls',
            type: 'control_test',
            assignedTo: 'user_3', // Auditor
            assignedAt: new Date('2024-12-05'),
            dueDate: new Date('2024-12-15'),
            priority: 'medium',
            status: 'completed',
            completedAt: new Date('2024-12-12'),
            completedBy: 'user_3',
            createdAt: new Date('2024-12-05'),
            updatedAt: new Date('2024-12-12'),
        },
        {
            id: 'task_4',
            title: 'Data Breach Incident Remediation',
            description: 'Implement remediation plan for security incident #42',
            type: 'remediation',
            assignedTo: 'user_1', // Admin
            assignedBy: 'user_1',
            assignedAt: new Date('2024-12-08'),
            dueDate: new Date('2024-12-14'),
            priority: 'critical',
            status: 'in_progress',
            relatedResource: {
                type: 'incident',
                id: 'inc_42',
                name: 'Unauthorized Access Attempt',
            },
            createdAt: new Date('2024-12-08'),
            updatedAt: new Date('2024-12-10'),
        },
        {
            id: 'task_5',
            title: 'Annual Privacy Policy Review',
            description: 'Review and update privacy policy for 2025',
            type: 'policy_review',
            assignedTo: 'user_2',
            assignedAt: new Date('2024-11-15'),
            dueDate: new Date('2024-12-01'),
            priority: 'medium',
            status: 'completed',
            completedAt: new Date('2024-11-28'),
            completedBy: 'user_2',
            createdAt: new Date('2024-11-15'),
            updatedAt: new Date('2024-11-28'),
        },
    ];

    demoTasks.forEach(task => tasks.set(task.id, task));
};

// Initialize demo data
initializeDemoTasks();

class TaskService {
    /**
     * Get all tasks with optional filters
     */
    getAllTasks(filters?: {
        status?: TaskStatus;
        assignedTo?: string;
        priority?: TaskPriority;
        type?: TaskType;
        overdue?: boolean;
    }): Task[] {
        let filteredTasks = Array.from(tasks.values());

        if (filters) {
            if (filters.status) {
                filteredTasks = filteredTasks.filter(t => t.status === filters.status);
            }
            if (filters.assignedTo) {
                filteredTasks = filteredTasks.filter(t => t.assignedTo === filters.assignedTo);
            }
            if (filters.priority) {
                filteredTasks = filteredTasks.filter(t => t.priority === filters.priority);
            }
            if (filters.type) {
                filteredTasks = filteredTasks.filter(t => t.type === filters.type);
            }
            if (filters.overdue) {
                const now = new Date();
                filteredTasks = filteredTasks.filter(t =>
                    t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate < now
                );
            }
        }

        // Sort by priority and due date
        return filteredTasks.sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const aPriority = priorityOrder[a.priority];
            const bPriority = priorityOrder[b.priority];

            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }

            return a.dueDate.getTime() - b.dueDate.getTime();
        });
    }

    /**
     * Get task by ID
     */
    getTaskById(taskId: string): Task | undefined {
        return tasks.get(taskId);
    }

    /**
     * Get tasks assigned to a specific user
     */
    getUserTasks(userId: string): Task[] {
        return this.getAllTasks({ assignedTo: userId });
    }

    /**
     * Get overdue tasks
     */
    getOverdueTasks(): Task[] {
        return this.getAllTasks({ overdue: true });
    }

    /**
     * Create a new task
     */
    createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
        const task: Task = {
            id: `task_${Date.now()}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        tasks.set(task.id, task);

        AuditService.log({
            userId: data.assignedBy || 'system',
            userName: 'System',
            action: 'create_task',
            resourceType: 'Task',
            resourceId: task.id,
            resourceName: task.title,
            status: 'success',
            details: `Created task "${task.title}" assigned to ${task.assignedTo}`,
        });

        return task;
    }

    /**
     * Update task
     */
    updateTask(taskId: string, updates: Partial<Task>): Task | null {
        const task = tasks.get(taskId);

        if (!task) {
            return null;
        }

        const updated = {
            ...task,
            ...updates,
            updatedAt: new Date(),
        };

        tasks.set(taskId, updated);

        AuditService.log({
            userId: 'system',
            userName: 'System',
            action: 'update_task',
            resourceType: 'Task',
            resourceId: taskId,
            resourceName: task.title,
            changes: updates,
            status: 'success',
        });

        return updated;
    }

    /**
     * Assign task to user
     */
    assignTask(taskId: string, userId: string, assignedBy?: string): Task | null {
        const task = tasks.get(taskId);

        if (!task) {
            return null;
        }

        const updated = {
            ...task,
            assignedTo: userId,
            assignedBy,
            assignedAt: new Date(),
            updatedAt: new Date(),
        };

        tasks.set(taskId, updated);

        AuditService.log({
            userId: assignedBy || 'system',
            userName: 'System',
            action: 'assign_task',
            resourceType: 'Task',
            resourceId: taskId,
            resourceName: task.title,
            status: 'success',
            details: `Assigned task to ${userId}`,
        });

        return updated;
    }

    /**
     * Complete task
     */
    completeTask(taskId: string, completedBy: string, notes?: string): Task | null {
        const task = tasks.get(taskId);

        if (!task) {
            return null;
        }

        const updated = {
            ...task,
            status: 'completed' as TaskStatus,
            completedAt: new Date(),
            completedBy,
            notes: notes || task.notes,
            updatedAt: new Date(),
        };

        tasks.set(taskId, updated);

        AuditService.log({
            userId: completedBy,
            userName: 'User',
            action: 'complete_task',
            resourceType: 'Task',
            resourceId: taskId,
            resourceName: task.title,
            status: 'success',
            details: notes,
        });

        return updated;
    }

    /**
     * Delete task
     */
    deleteTask(taskId: string): boolean {
        const task = tasks.get(taskId);

        if (!task) {
            return false;
        }

        tasks.delete(taskId);

        AuditService.log({
            userId: 'system',
            userName: 'System',
            action: 'delete_task',
            resourceType: 'Task',
            resourceId: taskId,
            resourceName: task.title,
            status: 'success',
        });

        return true;
    }

    /**
     * Get task statistics
     */
    getTaskStats() {
        const allTasks = Array.from(tasks.values());
        const now = new Date();

        return {
            total: allTasks.length,
            byStatus: {
                pending: allTasks.filter(t => t.status === 'pending').length,
                in_progress: allTasks.filter(t => t.status === 'in_progress').length,
                blocked: allTasks.filter(t => t.status === 'blocked').length,
                completed: allTasks.filter(t => t.status === 'completed').length,
                cancelled: allTasks.filter(t => t.status === 'cancelled').length,
            },
            byPriority: {
                critical: allTasks.filter(t => t.priority === 'critical').length,
                high: allTasks.filter(t => t.priority === 'high').length,
                medium: allTasks.filter(t => t.priority === 'medium').length,
                low: allTasks.filter(t => t.priority === 'low').length,
            },
            overdue: allTasks.filter(t =>
                t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate < now
            ).length,
        };
    }
}

// Export singleton instance
export default new TaskService();

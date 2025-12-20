import logger from '../config/logger';
/**
 * Issue/Action Item Management Service
 * Enhanced task management with links to risks, controls, audits, and remediation tracking
 */

export interface ActionItem {
    id: string;
    title: string;
    description: string;
    type: 'remediation' | 'improvement' | 'compliance' | 'audit_finding' | 'risk_treatment';
    priority: 'critical' | 'high' | 'medium' | 'low';
    status: 'open' | 'in_progress' | 'blocked' | 'resolved' | 'closed';

    // Links to other entities
    linkedTo?: {
        type: 'risk' | 'control' | 'audit' | 'finding' | 'compliance' | 'incident';
        id: string;
        reference: string;
    };

    assignedTo: string;
    createdBy: string;
    dueDate: Date;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;

    // Remediation tracking
    remediation?: {
        rootCause?: string;
        correctiveActions: string[];
        preventiveActions: string[];
        evidenceUrl?: string;
        verifiedBy?: string;
        verifiedAt?: Date;
    };

    // Workflow
    blockedReason?: string;
    dependencies?: string[];
    tags: string[];
}

export interface IssueWorkflow {
    issueId: string;
    steps: {
        step: string;
        completedAt?: Date;
        completedBy?: string;
        notes?: string;
    }[];
    currentStep: number;
}

// In-memory storage
const actionItems = new Map<string, ActionItem>();
const issueWorkflows = new Map<string, IssueWorkflow>();

// Initialize with demo action items
actionItems.set('action_1', {
    id: 'action_1',
    title: 'Remediate High-Risk SQL Injection Vulnerability',
    description: 'SQL injection vulnerability found in user input validation - immediate remediation required',
    type: 'risk_treatment',
    priority: 'critical',
    status: 'in_progress',
    linkedTo: {
        type: 'risk',
        id: 'risk_001',
        reference: 'RISK-001: SQL Injection Vulnerability',
    },
    assignedTo: 'security@sinfosecurity.com',
    createdBy: 'admin@sinfosecurity.com',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    remediation: {
        rootCause: 'Insufficient input validation in legacy API endpoints',
        correctiveActions: [
            'Implement parameterized queries',
            'Add input sanitization layer',
            'Update security testing procedures',
        ],
        preventiveActions: [
            'Mandatory code review for database interactions',
            'Automated security scanning in CI/CD',
        ],
    },
    tags: ['security', 'critical', 'database'],
});

class IssueActionItemService {
    /**
     * Create action item
     */
    createActionItem(data: Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt'>): ActionItem {
        const item: ActionItem = {
            id: `action_${Date.now()}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        actionItems.set(item.id, item);
        logger.info(`📋 Action item created: ${item.title}`);

        // Create workflow if remediation type
        if (item.type === 'remediation' || item.type === 'audit_finding') {
            this.createWorkflow(item.id);
        }

        return item;
    }

    /**
     * Create workflow for action item
     */
    private createWorkflow(issueId: string): IssueWorkflow {
        const workflow: IssueWorkflow = {
            issueId,
            steps: [
                { step: 'Assess and plan' },
                { step: 'Implement corrective actions' },
                { step: 'Implement preventive actions' },
                { step: 'Verify effectiveness' },
                { step: 'Close and document' },
            ],
            currentStep: 0,
        };

        issueWorkflows.set(issueId, workflow);
        return workflow;
    }

    /**
     * Get action items
     */
    getActionItems(filters?: {
        status?: ActionItem['status'];
        type?: ActionItem['type'];
        priority?: ActionItem['priority'];
        assignedTo?: string;
        linkedType?: 'risk' | 'control' | 'audit' | 'finding';
    }): ActionItem[] {
        let items = Array.from(actionItems.values());

        if (filters?.status) {
            items = items.filter(i => i.status === filters.status);
        }
        if (filters?.type) {
            items = items.filter(i => i.type === filters.type);
        }
        if (filters?.priority) {
            items = items.filter(i => i.priority === filters.priority);
        }
        if (filters?.assignedTo) {
            items = items.filter(i => i.assignedTo === filters.assignedTo);
        }
        if (filters?.linkedType) {
            items = items.filter(i => i.linkedTo?.type === filters.linkedType);
        }

        return items.sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }

    /**
     * Get action items linked to a specific entity
     */
    getLinkedActionItems(entityType: string, entityId: string): ActionItem[] {
        return Array.from(actionItems.values())
            .filter(i => i.linkedTo?.type === entityType && i.linkedTo?.id === entityId);
    }

    /**
     * Update action item status
     */
    updateStatus(itemId: string, status: ActionItem['status'], notes?: string): boolean {
        const item = actionItems.get(itemId);
        if (!item) return false;

        item.status = status;
        item.updatedAt = new Date();

        if (status === 'resolved' || status === 'closed') {
            item.resolvedAt = new Date();
        }

        // Update workflow if exists
        const workflow = issueWorkflows.get(itemId);
        if (workflow && status === 'in_progress') {
            this.advanceWorkflow(itemId, notes);
        }

        return true;
    }

    /**
     * Advance workflow step
     */
    advanceWorkflow(itemId: string, notes?: string): boolean {
        const workflow = issueWorkflows.get(itemId);
        if (!workflow) return false;

        if (workflow.currentStep < workflow.steps.length - 1) {
            // Complete current step
            workflow.steps[workflow.currentStep].completedAt = new Date();
            workflow.steps[workflow.currentStep].notes = notes;

            // Move to next step
            workflow.currentStep++;
            return true;
        }

        return false;
    }

    /**
     * Add remediation details
     */
    addRemediation(itemId: string, remediation: ActionItem['remediation']): boolean {
        const item = actionItems.get(itemId);
        if (!item) return false;

        item.remediation = remediation;
        item.updatedAt = new Date();
        return true;
    }

    /**
     * Link action item to entity
     */
    linkToEntity(itemId: string, entityType: string, entityId: string, reference: string): boolean {
        const item = actionItems.get(itemId);
        if (!item) return false;

        item.linkedTo = {
            type: entityType as any,
            id: entityId,
            reference,
        };
        item.updatedAt = new Date();
        return true;
    }

    /**
     * Get overdue action items
     */
    getOverdueItems(): ActionItem[] {
        const now = new Date();
        return Array.from(actionItems.values())
            .filter(i => i.status !== 'resolved' && i.status !== 'closed' && i.dueDate < now)
            .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    }

    /**
     * Get action item statistics
     */
    getStats() {
        const allItems = Array.from(actionItems.values());

        return {
            total: allItems.length,
            open: allItems.filter(i => i.status === 'open').length,
            inProgress: allItems.filter(i => i.status === 'in_progress').length,
            blocked: allItems.filter(i => i.status === 'blocked').length,
            resolved: allItems.filter(i => i.status === 'resolved').length,
            critical: allItems.filter(i => i.priority === 'critical' && i.status !== 'resolved').length,
            overdue: this.getOverdueItems().length,
            byType: {
                remediation: allItems.filter(i => i.type === 'remediation').length,
                audit_finding: allItems.filter(i => i.type === 'audit_finding').length,
                risk_treatment: allItems.filter(i => i.type === 'risk_treatment').length,
                compliance: allItems.filter(i => i.type === 'compliance').length,
            },
        };
    }

    /**
     * Get workflow for action item
     */
    getWorkflow(itemId: string): IssueWorkflow | undefined {
        return issueWorkflows.get(itemId);
    }
}

export default new IssueActionItemService();

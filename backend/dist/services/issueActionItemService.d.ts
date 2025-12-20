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
    remediation?: {
        rootCause?: string;
        correctiveActions: string[];
        preventiveActions: string[];
        evidenceUrl?: string;
        verifiedBy?: string;
        verifiedAt?: Date;
    };
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
declare class IssueActionItemService {
    /**
     * Create action item
     */
    createActionItem(data: Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt'>): ActionItem;
    /**
     * Create workflow for action item
     */
    private createWorkflow;
    /**
     * Get action items
     */
    getActionItems(filters?: {
        status?: ActionItem['status'];
        type?: ActionItem['type'];
        priority?: ActionItem['priority'];
        assignedTo?: string;
        linkedType?: 'risk' | 'control' | 'audit' | 'finding';
    }): ActionItem[];
    /**
     * Get action items linked to a specific entity
     */
    getLinkedActionItems(entityType: string, entityId: string): ActionItem[];
    /**
     * Update action item status
     */
    updateStatus(itemId: string, status: ActionItem['status'], notes?: string): boolean;
    /**
     * Advance workflow step
     */
    advanceWorkflow(itemId: string, notes?: string): boolean;
    /**
     * Add remediation details
     */
    addRemediation(itemId: string, remediation: ActionItem['remediation']): boolean;
    /**
     * Link action item to entity
     */
    linkToEntity(itemId: string, entityType: string, entityId: string, reference: string): boolean;
    /**
     * Get overdue action items
     */
    getOverdueItems(): ActionItem[];
    /**
     * Get action item statistics
     */
    getStats(): {
        total: number;
        open: number;
        inProgress: number;
        blocked: number;
        resolved: number;
        critical: number;
        overdue: number;
        byType: {
            remediation: number;
            audit_finding: number;
            risk_treatment: number;
            compliance: number;
        };
    };
    /**
     * Get workflow for action item
     */
    getWorkflow(itemId: string): IssueWorkflow | undefined;
}
declare const _default: IssueActionItemService;
export default _default;
//# sourceMappingURL=issueActionItemService.d.ts.map
/**
 * Training & Awareness Service
 * Security awareness training, compliance learning management, campaign tracking
 */
export interface TrainingCourse {
    id: string;
    title: string;
    type: 'security_awareness' | 'compliance' | 'phishing' | 'data_privacy' | 'custom';
    description: string;
    duration: number;
    framework?: string;
    mandatory: boolean;
    frequency: 'once' | 'annual' | 'quarterly' | 'monthly';
    content: {
        modules: string[];
        quiz: boolean;
        passingScore?: number;
    };
    createdAt: Date;
    status: 'active' | 'draft' | 'archived';
}
export interface TrainingAssignment {
    id: string;
    courseId: string;
    userId: string;
    assignedAt: Date;
    dueDate: Date;
    status: 'assigned' | 'in_progress' | 'completed' | 'overdue';
    completedAt?: Date;
    score?: number;
    attempts: number;
}
export interface AwarenessCampaign {
    id: string;
    name: string;
    type: 'phishing_simulation' | 'security_newsletter' | 'policy_update' | 'custom';
    description: string;
    startDate: Date;
    endDate: Date;
    targetAudience: string[];
    metrics: {
        sent: number;
        opened: number;
        clicked: number;
        reported: number;
    };
    status: 'planned' | 'active' | 'completed';
}
declare class TrainingAwarenessService {
    /**
     * Create training course
     */
    createCourse(data: Omit<TrainingCourse, 'id' | 'createdAt'>): TrainingCourse;
    /**
     * Get all courses
     */
    getCourses(filters?: {
        type?: TrainingCourse['type'];
        status?: TrainingCourse['status'];
        mandatory?: boolean;
    }): TrainingCourse[];
    /**
     * Assign training to user
     */
    assignTraining(courseId: string, userId: string, dueDate: Date): TrainingAssignment;
    /**
     * Bulk assign training to multiple users
     */
    bulkAssignTraining(courseId: string, userIds: string[], dueDate: Date): TrainingAssignment[];
    /**
     * Complete training
     */
    completeTraining(assignmentId: string, score: number): boolean;
    /**
     * Get user's training assignments
     */
    getUserAssignments(userId: string): TrainingAssignment[];
    /**
     * Get overdue training
     */
    getOverdueTraining(): TrainingAssignment[];
    /**
     * Create awareness campaign
     */
    createCampaign(data: Omit<AwarenessCampaign, 'id' | 'metrics'>): AwarenessCampaign;
    /**
     * Get campaigns
     */
    getCampaigns(status?: AwarenessCampaign['status']): AwarenessCampaign[];
    /**
     * Update campaign metrics
     */
    updateCampaignMetrics(campaignId: string, metrics: Partial<AwarenessCampaign['metrics']>): boolean;
    /**
     * Get training completion statistics
     */
    getCompletionStats(): {
        totalAssignments: number;
        completed: number;
        completionRate: number;
        inProgress: number;
        overdue: number;
        averageScore: number;
    };
    /**
     * Calculate average score
     */
    private calculateAverageScore;
    /**
     * Get compliance training report
     */
    getComplianceReport(framework: string): {
        framework: string;
        requiredCourses: TrainingCourse[];
        completionRate: number;
        usersCompliant: number;
        totalUsers: number;
    };
}
declare const _default: TrainingAwarenessService;
export default _default;
//# sourceMappingURL=trainingAwarenessService.d.ts.map
"use strict";
/**
 * Training & Awareness Service
 * Security awareness training, compliance learning management, campaign tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
// In-memory storage
const trainingCourses = new Map();
const trainingAssignments = new Map();
const awarenessCampaigns = new Map();
// Initialize with demo data
trainingCourses.set('course_1', {
    id: 'course_1',
    title: 'Security Awareness Fundamentals',
    type: 'security_awareness',
    description: 'Essential security practices for all employees',
    duration: 45,
    framework: 'ISO 27001',
    mandatory: true,
    frequency: 'annual',
    content: {
        modules: ['Password Security', 'Phishing Awareness', 'Data Protection', 'Incident Reporting'],
        quiz: true,
        passingScore: 80,
    },
    createdAt: new Date('2024-01-01'),
    status: 'active',
});
class TrainingAwarenessService {
    /**
     * Create training course
     */
    createCourse(data) {
        const course = {
            id: `course_${Date.now()}`,
            ...data,
            createdAt: new Date(),
        };
        trainingCourses.set(course.id, course);
        logger.info(`📚 Training course created: ${course.title}`);
        return course;
    }
    /**
     * Get all courses
     */
    getCourses(filters) {
        let courses = Array.from(trainingCourses.values());
        if (filters?.type) {
            courses = courses.filter(c => c.type === filters.type);
        }
        if (filters?.status) {
            courses = courses.filter(c => c.status === filters.status);
        }
        if (filters?.mandatory !== undefined) {
            courses = courses.filter(c => c.mandatory === filters.mandatory);
        }
        return courses;
    }
    /**
     * Assign training to user
     */
    assignTraining(courseId, userId, dueDate) {
        const assignment = {
            id: `assignment_${Date.now()}`,
            courseId,
            userId,
            assignedAt: new Date(),
            dueDate,
            status: 'assigned',
            attempts: 0,
        };
        trainingAssignments.set(assignment.id, assignment);
        logger.info(`✅ Training assigned to user ${userId}`);
        return assignment;
    }
    /**
     * Bulk assign training to multiple users
     */
    bulkAssignTraining(courseId, userIds, dueDate) {
        return userIds.map(userId => this.assignTraining(courseId, userId, dueDate));
    }
    /**
     * Complete training
     */
    completeTraining(assignmentId, score) {
        const assignment = trainingAssignments.get(assignmentId);
        if (!assignment)
            return false;
        const course = trainingCourses.get(assignment.courseId);
        if (!course)
            return false;
        assignment.attempts++;
        assignment.score = score;
        // Check if passed
        const passedScore = course.content.passingScore || 0;
        if (score >= passedScore) {
            assignment.status = 'completed';
            assignment.completedAt = new Date();
            logger.info(`✅ Training completed with score ${score}%`);
            return true;
        }
        else {
            logger.info(`❌ Training failed with score ${score}% (required: ${passedScore}%)`);
            return false;
        }
    }
    /**
     * Get user's training assignments
     */
    getUserAssignments(userId) {
        return Array.from(trainingAssignments.values())
            .filter(a => a.userId === userId)
            .sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime());
    }
    /**
     * Get overdue training
     */
    getOverdueTraining() {
        const now = new Date();
        return Array.from(trainingAssignments.values())
            .filter(a => a.status !== 'completed' && a.dueDate < now)
            .map(a => ({ ...a, status: 'overdue' }));
    }
    /**
     * Create awareness campaign
     */
    createCampaign(data) {
        const campaign = {
            id: `campaign_${Date.now()}`,
            ...data,
            metrics: { sent: 0, opened: 0, clicked: 0, reported: 0 },
        };
        awarenessCampaigns.set(campaign.id, campaign);
        logger.info(`📢 Awareness campaign created: ${campaign.name}`);
        return campaign;
    }
    /**
     * Get campaigns
     */
    getCampaigns(status) {
        let campaigns = Array.from(awarenessCampaigns.values());
        if (status) {
            campaigns = campaigns.filter(c => c.status === status);
        }
        return campaigns.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    }
    /**
     * Update campaign metrics
     */
    updateCampaignMetrics(campaignId, metrics) {
        const campaign = awarenessCampaigns.get(campaignId);
        if (!campaign)
            return false;
        campaign.metrics = { ...campaign.metrics, ...metrics };
        return true;
    }
    /**
     * Get training completion statistics
     */
    getCompletionStats() {
        const allAssignments = Array.from(trainingAssignments.values());
        const totalAssignments = allAssignments.length;
        const completed = allAssignments.filter(a => a.status === 'completed').length;
        const overdue = allAssignments.filter(a => {
            const now = new Date();
            return a.status !== 'completed' && a.dueDate < now;
        }).length;
        return {
            totalAssignments,
            completed,
            completionRate: totalAssignments > 0 ? Math.round((completed / totalAssignments) * 100) : 0,
            inProgress: allAssignments.filter(a => a.status === 'in_progress').length,
            overdue,
            averageScore: this.calculateAverageScore(),
        };
    }
    /**
     * Calculate average score
     */
    calculateAverageScore() {
        const completedAssignments = Array.from(trainingAssignments.values())
            .filter(a => a.status === 'completed' && a.score !== undefined);
        if (completedAssignments.length === 0)
            return 0;
        const totalScore = completedAssignments.reduce((sum, a) => sum + (a.score || 0), 0);
        return Math.round(totalScore / completedAssignments.length);
    }
    /**
     * Get compliance training report
     */
    getComplianceReport(framework) {
        const requiredCourses = Array.from(trainingCourses.values())
            .filter(c => c.framework === framework && c.mandatory);
        // Count users who completed all required courses
        const userCompletionMap = new Map();
        Array.from(trainingAssignments.values())
            .filter(a => a.status === 'completed')
            .forEach(a => {
            if (!userCompletionMap.has(a.userId)) {
                userCompletionMap.set(a.userId, new Set());
            }
            userCompletionMap.get(a.userId).add(a.courseId);
        });
        const requiredCourseIds = new Set(requiredCourses.map(c => c.id));
        let usersCompliant = 0;
        userCompletionMap.forEach((completedCourses) => {
            const hasAllRequired = Array.from(requiredCourseIds).every(id => completedCourses.has(id));
            if (hasAllRequired)
                usersCompliant++;
        });
        const totalUsers = userCompletionMap.size;
        return {
            framework,
            requiredCourses,
            completionRate: totalUsers > 0 ? Math.round((usersCompliant / totalUsers) * 100) : 0,
            usersCompliant,
            totalUsers,
        };
    }
}
exports.default = new TrainingAwarenessService();
//# sourceMappingURL=trainingAwarenessService.js.map
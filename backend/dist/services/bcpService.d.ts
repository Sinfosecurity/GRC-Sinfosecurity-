/**
 * Business Continuity Planning Service
 * Manages BIA, recovery plans, RTO/RPO tracking
 */
export interface BusinessProcess {
    id: string;
    name: string;
    description: string;
    owner: string;
    criticalityLevel: 'critical' | 'high' | 'medium' | 'low';
    rto: number;
    rpo: number;
    dependencies: string[];
    impactAssessment: ImpactAssessment;
    createdAt: Date;
}
export interface ImpactAssessment {
    financialImpact: number;
    reputationalImpact: 'severe' | 'major' | 'moderate' | 'minor';
    regulatoryImpact: boolean;
    customerImpact: 'severe' | 'major' | 'moderate' | 'minor';
}
export interface RecoveryPlan {
    id: string;
    processId: string;
    name: string;
    steps: RecoveryStep[];
    responsibleTeam: string;
    lastTested?: Date;
    testResults?: string;
    status: 'active' | 'draft' | 'archived';
    createdAt: Date;
}
export interface RecoveryStep {
    id: string;
    order: number;
    description: string;
    responsible: string;
    estimatedDuration: number;
    resourcesRequired: string[];
}
export interface BCPTest {
    id: string;
    planId: string;
    scheduledDate: Date;
    type: 'tabletop' | 'walkthrough' | 'fullscale';
    participants: string[];
    status: 'scheduled' | 'completed' | 'cancelled';
    results?: TestResults;
}
export interface TestResults {
    completedAt: Date;
    success: boolean;
    objectivesMet: number;
    issuesIdentified: string[];
    recommendations: string[];
}
declare class BCPService {
    getAllProcesses(): BusinessProcess[];
    getProcessById(id: string): BusinessProcess | undefined;
    createProcess(data: Omit<BusinessProcess, 'id' | 'createdAt'>): BusinessProcess;
    getAllPlans(): RecoveryPlan[];
    getPlanById(id: string): RecoveryPlan | undefined;
    getPlansForProcess(processId: string): RecoveryPlan[];
    createPlan(data: Omit<RecoveryPlan, 'id' | 'createdAt'>): RecoveryPlan;
    scheduleTest(data: Omit<BCPTest, 'id'>): BCPTest;
    getUpcomingTests(): BCPTest[];
    getStatistics(): {
        totalProcesses: number;
        criticalProcesses: number;
        avgRTO: number;
        avgRPO: number;
        totalPlans: number;
        upcomingTests: number;
    };
}
declare const _default: BCPService;
export default _default;
//# sourceMappingURL=bcpService.d.ts.map
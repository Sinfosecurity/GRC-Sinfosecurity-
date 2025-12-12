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
    rto: number; // Recovery Time Objective (hours)
    rpo: number; // Recovery Point Objective (hours)
    dependencies: string[];
    impactAssessment: ImpactAssessment;
    createdAt: Date;
}

export interface ImpactAssessment {
    financialImpact: number; // per hour
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
    estimatedDuration: number; // minutes
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
    objectivesMet: number; // percentage
    issuesIdentified: string[];
    recommendations: string[];
}

// In-memory storage
const processes = new Map<string, BusinessProcess>();
const recoveryPlans = new Map<string, RecoveryPlan>();
const tests = new Map<string, BCPTest>();

// Initialize demo data
const initializeDemoData = () => {
    const demoProcesses: BusinessProcess[] = [
        {
            id: 'bp_1',
            name: 'Customer Payment Processing',
            description: 'Critical payment gateway and transaction processing',
            owner: 'Finance Director',
            criticalityLevel: 'critical',
            rto: 2, // 2 hours
            rpo: 1, // 1 hour
            dependencies: ['payment_gateway', 'database', 'api_servers'],
            impactAssessment: {
                financialImpact: 50000,
                reputationalImpact: 'severe',
                regulatoryImpact: true,
                customerImpact: 'severe',
            },
            createdAt: new Date('2024-01-15'),
        },
        {
            id: 'bp_2',
            name: 'Data Backup Systems',
            description: 'Automated backup and recovery systems',
            owner: 'IT Director',
            criticalityLevel: 'high',
            rto: 4,
            rpo: 2,
            dependencies: ['backup_servers', 'storage_arrays'],
            impactAssessment: {
                financialImpact: 25000,
                reputationalImpact: 'major',
                regulatoryImpact: true,
                customerImpact: 'moderate',
            },
            createdAt: new Date('2024-02-01'),
        },
    ];

    const demoPlans: RecoveryPlan[] = [
        {
            id: 'rp_1',
            processId: 'bp_1',
            name: 'Payment System Recovery Plan',
            steps: [
                {
                    id: 'step_1',
                    order: 1,
                    description: 'Activate backup payment gateway',
                    responsible: 'IT Operations Lead',
                    estimatedDuration: 30,
                    resourcesRequired: ['backup_gateway', 'vpn_access'],
                },
                {
                    id: 'step_2',
                    order: 2,
                    description: 'Verify transaction processing',
                    responsible: 'Finance Manager',
                    estimatedDuration: 20,
                    resourcesRequired: ['test_accounts', 'monitoring_tools'],
                },
            ],
            responsibleTeam: 'IT Operations',
            lastTested: new Date('2024-11-15'),
            status: 'active',
            createdAt: new Date('2024-01-20'),
        },
    ];

    demoProcesses.forEach(p => processes.set(p.id, p));
    demoPlans.forEach(p => recoveryPlans.set(p.id, p));
};

initializeDemoData();

class BCPService {
    // Business Process Methods
    getAllProcesses(): BusinessProcess[] {
        return Array.from(processes.values());
    }

    getProcessById(id: string): BusinessProcess | undefined {
        return processes.get(id);
    }

    createProcess(data: Omit<BusinessProcess, 'id' | 'createdAt'>): BusinessProcess {
        const process: BusinessProcess = {
            id: `bp_${Date.now()}`,
            ...data,
            createdAt: new Date(),
        };
        processes.set(process.id, process);
        return process;
    }

    // Recovery Plan Methods
    getAllPlans(): RecoveryPlan[] {
        return Array.from(recoveryPlans.values());
    }

    getPlanById(id: string): RecoveryPlan | undefined {
        return recoveryPlans.get(id);
    }

    getPlansForProcess(processId: string): RecoveryPlan[] {
        return Array.from(recoveryPlans.values()).filter(p => p.processId === processId);
    }

    createPlan(data: Omit<RecoveryPlan, 'id' | 'createdAt'>): RecoveryPlan {
        const plan: RecoveryPlan = {
            id: `rp_${Date.now()}`,
            ...data,
            createdAt: new Date(),
        };
        recoveryPlans.set(plan.id, plan);
        return plan;
    }

    // Test Scheduling Methods
    scheduleTest(data: Omit<BCPTest, 'id'>): BCPTest {
        const test: BCPTest = {
            id: `test_${Date.now()}`,
            ...data,
        };
        tests.set(test.id, test);
        return test;
    }

    getUpcomingTests(): BCPTest[] {
        return Array.from(tests.values())
            .filter(t => t.status === 'scheduled' && t.scheduledDate > new Date())
            .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
    }

    // Statistics
    getStatistics() {
        const allProcesses = Array.from(processes.values());
        const criticalCount = allProcesses.filter(p => p.criticalityLevel === 'critical').length;
        const avgRTO = allProcesses.reduce((sum, p) => sum + p.rto, 0) / allProcesses.length || 0;
        const avgRPO = allProcesses.reduce((sum, p) => sum + p.rpo, 0) / allProcesses.length || 0;

        return {
            totalProcesses: allProcesses.length,
            criticalProcesses: criticalCount,
            avgRTO: Math.round(avgRTO * 10) / 10,
            avgRPO: Math.round(avgRPO * 10) / 10,
            totalPlans: recoveryPlans.size,
            upcomingTests: this.getUpcomingTests().length,
        };
    }
}

export default new BCPService();

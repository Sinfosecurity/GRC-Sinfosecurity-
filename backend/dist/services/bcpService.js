"use strict";
/**
 * Business Continuity Planning Service
 * Manages BIA, recovery plans, RTO/RPO tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
// In-memory storage
const processes = new Map();
const recoveryPlans = new Map();
const tests = new Map();
// Initialize demo data
const initializeDemoData = () => {
    const demoProcesses = [
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
    const demoPlans = [
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
    getAllProcesses() {
        return Array.from(processes.values());
    }
    getProcessById(id) {
        return processes.get(id);
    }
    createProcess(data) {
        const process = {
            id: `bp_${Date.now()}`,
            ...data,
            createdAt: new Date(),
        };
        processes.set(process.id, process);
        return process;
    }
    // Recovery Plan Methods
    getAllPlans() {
        return Array.from(recoveryPlans.values());
    }
    getPlanById(id) {
        return recoveryPlans.get(id);
    }
    getPlansForProcess(processId) {
        return Array.from(recoveryPlans.values()).filter(p => p.processId === processId);
    }
    createPlan(data) {
        const plan = {
            id: `rp_${Date.now()}`,
            ...data,
            createdAt: new Date(),
        };
        recoveryPlans.set(plan.id, plan);
        return plan;
    }
    // Test Scheduling Methods
    scheduleTest(data) {
        const test = {
            id: `test_${Date.now()}`,
            ...data,
        };
        tests.set(test.id, test);
        return test;
    }
    getUpcomingTests() {
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
exports.default = new BCPService();
//# sourceMappingURL=bcpService.js.map
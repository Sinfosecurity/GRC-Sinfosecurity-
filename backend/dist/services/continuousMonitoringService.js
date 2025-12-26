"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Continuous Monitoring Service
 * Real-time monitoring of compliance status, control effectiveness, and risk levels
 */
const logger_1 = __importDefault(require("../config/logger"));
const auditService_1 = require("./auditService");
const notificationService_1 = __importDefault(require("./notificationService"));
class ContinuousMonitoringService {
    constructor() {
        this.monitoringChecks = new Map();
        this.monitoringResults = [];
        this.complianceHealth = null;
        this.controlStatuses = new Map();
        this.initializeChecks();
    }
    /**
     * Initialize default monitoring checks
     */
    initializeChecks() {
        const defaultChecks = [
            {
                id: 'check_compliance_drift',
                name: 'Compliance Drift Detection',
                category: 'compliance',
                description: 'Monitors for changes that may affect compliance status',
                frequency: 'daily',
                enabled: true,
            },
            {
                id: 'check_control_effectiveness',
                name: 'Control Effectiveness Monitoring',
                category: 'control',
                description: 'Validates control effectiveness through automated testing',
                frequency: 'daily',
                enabled: true,
            },
            {
                id: 'check_risk_thresholds',
                name: 'Risk Threshold Monitoring',
                category: 'risk',
                description: 'Alerts when risk scores exceed defined thresholds',
                frequency: 'hourly',
                enabled: true,
            },
            {
                id: 'check_security_posture',
                name: 'Security Posture Assessment',
                category: 'security',
                description: 'Evaluates overall security posture',
                frequency: 'daily',
                enabled: true,
            },
            {
                id: 'check_policy_compliance',
                name: 'Policy Compliance Verification',
                category: 'compliance',
                description: 'Verifies adherence to organizational policies',
                frequency: 'daily',
                enabled: true,
            },
            {
                id: 'check_access_control',
                name: 'Access Control Monitoring',
                category: 'security',
                description: 'Monitors user access and privilege escalations',
                frequency: 'hourly',
                enabled: true,
            },
        ];
        defaultChecks.forEach(check => {
            this.monitoringChecks.set(check.id, check);
        });
    }
    /**
     * Run all enabled monitoring checks
     */
    async runAllChecks() {
        logger_1.default.info('🔍 Running continuous monitoring checks...');
        const results = [];
        for (const [_, check] of this.monitoringChecks) {
            if (check.enabled) {
                const result = await this.runCheck(check);
                results.push(result);
                // Update last check time
                check.lastCheck = new Date();
                check.lastStatus = result.status;
            }
        }
        // Store results
        this.monitoringResults.push(...results);
        // Keep only last 1000 results
        if (this.monitoringResults.length > 1000) {
            this.monitoringResults = this.monitoringResults.slice(-1000);
        }
        // Update compliance health score
        this.updateComplianceHealth();
        // Send alerts for failures
        await this.processAlerts(results);
        // Log monitoring execution
        auditService_1.AuditService.log({
            userId: 'system',
            userName: 'Monitoring System',
            action: 'run_monitoring_checks',
            resourceType: 'Monitoring',
            status: 'success',
            details: `Executed ${results.length} monitoring checks`,
        });
        return results;
    }
    /**
     * Run a specific monitoring check
     */
    async runCheck(check) {
        logger_1.default.info(`  ↳ Running: ${check.name}`);
        // Simulate different check types
        // In production, these would call actual monitoring logic
        switch (check.id) {
            case 'check_compliance_drift':
                return this.checkComplianceDrift();
            case 'check_control_effectiveness':
                return this.checkControlEffectiveness();
            case 'check_risk_thresholds':
                return this.checkRiskThresholds();
            case 'check_security_posture':
                return this.checkSecurityPosture();
            case 'check_policy_compliance':
                return this.checkPolicyCompliance();
            case 'check_access_control':
                return this.checkAccessControl();
            default:
                return this.defaultCheck(check);
        }
    }
    /**
     * Check for compliance drift
     */
    checkComplianceDrift() {
        // Mock implementation - would check actual compliance data
        const findings = [];
        const score = 92;
        // Simulate finding compliance issues
        if (Math.random() > 0.7) {
            findings.push({
                severity: 'medium',
                category: 'Configuration',
                title: 'Configuration drift detected',
                description: 'System configuration has changed from compliant baseline',
                affectedResources: ['Database Server', 'Web Application'],
                remediation: 'Review and revert unauthorized configuration changes',
            });
        }
        return {
            checkId: 'check_compliance_drift',
            timestamp: new Date(),
            status: findings.length === 0 ? 'pass' : 'warning',
            score,
            details: `Compliance drift check completed. ${findings.length} issue(s) found.`,
            findings,
            recommendations: findings.length > 0
                ? ['Schedule immediate remediation', 'Review change management process']
                : ['Continue monitoring for drift'],
        };
    }
    /**
     * Check control effectiveness
     */
    checkControlEffectiveness() {
        const findings = [];
        const score = 88;
        // Simulate control test results
        const controls = [
            { id: 'AC-01', name: 'Access Control Policy', effectiveness: 95 },
            { id: 'AC-02', name: 'Account Management', effectiveness: 78 },
            { id: 'SI-01', name: 'System Integrity', effectiveness: 92 },
        ];
        controls.forEach(control => {
            if (control.effectiveness < 80) {
                findings.push({
                    severity: 'high',
                    category: 'Control',
                    title: `${control.name} below threshold`,
                    description: `Control effectiveness at ${control.effectiveness}%, below 80% threshold`,
                    affectedResources: [control.id],
                    remediation: 'Review and strengthen control implementation',
                });
            }
        });
        return {
            checkId: 'check_control_effectiveness',
            timestamp: new Date(),
            status: findings.length === 0 ? 'pass' : 'warning',
            score,
            details: `Tested ${controls.length} controls, ${findings.length} below threshold`,
            findings,
            recommendations: findings.length > 0
                ? ['Prioritize remediation of weak controls', 'Update control documentation']
                : ['Controls operating within acceptable parameters'],
        };
    }
    /**
     * Check risk thresholds
     */
    checkRiskThresholds() {
        const findings = [];
        const score = 85;
        // Simulate risk monitoring
        const highRisks = 2; // Would query actual risk data
        const criticalRisks = 0;
        if (criticalRisks > 0) {
            findings.push({
                severity: 'critical',
                category: 'Risk',
                title: 'Critical risk threshold exceeded',
                description: `${criticalRisks} critical risk(s) require immediate attention`,
                affectedResources: ['Risk Register'],
                remediation: 'Execute risk mitigation plans immediately',
            });
        }
        if (highRisks > 5) {
            findings.push({
                severity: 'high',
                category: 'Risk',
                title: 'High risk count elevated',
                description: `${highRisks} high-priority risks identified`,
                affectedResources: ['Risk Register'],
                remediation: 'Review and prioritize risk mitigation activities',
            });
        }
        return {
            checkId: 'check_risk_thresholds',
            timestamp: new Date(),
            status: criticalRisks > 0 ? 'fail' : highRisks > 5 ? 'warning' : 'pass',
            score,
            details: `Risk monitoring: ${criticalRisks} critical, ${highRisks} high`,
            findings,
            recommendations: findings.length > 0
                ? ['Escalate to risk committee', 'Accelerate mitigation timelines']
                : ['Risk levels within acceptable range'],
        };
    }
    /**
     * Check security posture
     */
    checkSecurityPosture() {
        const findings = [];
        const score = 90;
        return {
            checkId: 'check_security_posture',
            timestamp: new Date(),
            status: 'pass',
            score,
            details: 'Overall security posture healthy',
            findings,
            recommendations: ['Maintain current security practices', 'Continue regular assessments'],
        };
    }
    /**
     * Check policy compliance
     */
    checkPolicyCompliance() {
        const findings = [];
        const score = 94;
        return {
            checkId: 'check_policy_compliance',
            timestamp: new Date(),
            status: 'pass',
            score,
            details: 'Policy compliance within acceptable limits',
            findings,
            recommendations: ['Continue policy awareness training'],
        };
    }
    /**
     * Check access control
     */
    checkAccessControl() {
        const findings = [];
        const score = 87;
        return {
            checkId: 'check_access_control',
            timestamp: new Date(),
            status: 'pass',
            score,
            details: 'Access controls functioning properly',
            findings,
            recommendations: ['Review privileged account usage monthly'],
        };
    }
    /**
     * Default check implementation
     */
    defaultCheck(check) {
        return {
            checkId: check.id,
            timestamp: new Date(),
            status: 'pass',
            score: 85,
            details: `${check.name} completed successfully`,
            findings: [],
            recommendations: [],
        };
    }
    /**
     * Update overall compliance health score
     */
    updateComplianceHealth() {
        const recentResults = this.monitoringResults.slice(-20);
        const avgScore = recentResults.reduce((sum, r) => sum + r.score, 0) / recentResults.length;
        this.complianceHealth = {
            overall: Math.round(avgScore),
            byFramework: {
                'ISO 27001': 92,
                'SOC 2': 88,
                'GDPR': 95,
                'HIPAA': 90,
            },
            byCategory: {
                'Access Control': 91,
                'Data Protection': 93,
                'Incident Management': 87,
                'Risk Management': 89,
            },
            trend: avgScore >= 90 ? 'stable' : avgScore >= 85 ? 'stable' : 'declining',
            lastUpdated: new Date(),
        };
    }
    /**
     * Process alerts for failed checks
     */
    async processAlerts(results) {
        const criticalFindings = results
            .flatMap(r => r.findings)
            .filter(f => f.severity === 'critical' || f.severity === 'high');
        if (criticalFindings.length > 0) {
            logger_1.default.info(`⚠️  ${criticalFindings.length} critical/high findings detected`);
            // Send notification
            await notificationService_1.default.notify({
                type: 'CONTROL_FAILURE',
                severity: 'high',
                data: {
                    name: 'Continuous Monitoring Alert',
                    category: 'Monitoring',
                    detectedAt: new Date(),
                    impact: 'High',
                    findings: criticalFindings,
                },
            });
        }
    }
    /**
     * Get monitoring checks
     */
    getMonitoringChecks() {
        return Array.from(this.monitoringChecks.values());
    }
    /**
     * Get monitoring results with filters
     */
    getResults(filters) {
        let filtered = [...this.monitoringResults];
        if (filters) {
            if (filters.checkId) {
                filtered = filtered.filter(r => r.checkId === filters.checkId);
            }
            if (filters.status) {
                filtered = filtered.filter(r => r.status === filters.status);
            }
            if (filters.startDate) {
                filtered = filtered.filter(r => r.timestamp >= filters.startDate);
            }
            if (filters.endDate) {
                filtered = filtered.filter(r => r.timestamp <= filters.endDate);
            }
        }
        // Sort by timestamp desc
        filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const limit = filters?.limit || 50;
        return filtered.slice(0, limit);
    }
    /**
     * Get compliance health score
     */
    getComplianceHealth() {
        return this.complianceHealth;
    }
    /**
     * Get recent findings
     */
    getRecentFindings(limit = 20) {
        const recentResults = this.monitoringResults.slice(-limit);
        return recentResults.flatMap(r => r.findings);
    }
    /**
     * Toggle monitoring check
     */
    toggleCheck(checkId, enabled) {
        const check = this.monitoringChecks.get(checkId);
        if (check) {
            check.enabled = enabled;
            return check;
        }
        return null;
    }
}
// Export singleton
exports.default = new ContinuousMonitoringService();
//# sourceMappingURL=continuousMonitoringService.js.map
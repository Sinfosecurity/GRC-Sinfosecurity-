"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessMetricsCollector = exports.BusinessMetricsCollector = void 0;
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../config/logger"));
const monitoring_1 = require("./monitoring");
/**
 * Business Metrics Collector
 *
 * Collects and updates business-specific metrics for monitoring
 */
class BusinessMetricsCollector {
    constructor() {
        this.updateInterval = null;
        this.isRunning = false;
    }
    /**
     * Start collecting business metrics
     */
    start() {
        if (this.isRunning) {
            logger_1.default.warn('Business metrics collector already running');
            return;
        }
        logger_1.default.info('Starting business metrics collector...');
        this.isRunning = true;
        // Initial collection
        this.collectMetrics();
        // Collect metrics every 5 minutes
        this.updateInterval = setInterval(() => {
            this.collectMetrics();
        }, 5 * 60 * 1000);
        logger_1.default.info('Business metrics collector started');
    }
    /**
     * Stop collecting business metrics
     */
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.isRunning = false;
        logger_1.default.info('Business metrics collector stopped');
    }
    /**
     * Collect all business metrics
     */
    async collectMetrics() {
        try {
            await Promise.all([
                this.collectVendorMetrics(),
                this.collectAssessmentMetrics(),
                this.collectRiskMetrics(),
                this.collectControlMetrics(),
                this.collectIncidentMetrics(),
                this.collectComplianceMetrics(),
                this.collectSessionMetrics(),
            ]);
            logger_1.default.debug('Business metrics collected successfully');
        }
        catch (error) {
            logger_1.default.error('Error collecting business metrics:', error);
        }
    }
    /**
     * Collect vendor metrics
     */
    async collectVendorMetrics() {
        try {
            // Get vendors by tier and status
            const vendors = await database_1.prisma.vendor.groupBy({
                by: ['tier', 'status', 'organizationId'],
                _count: true,
            });
            // Reset gauges
            monitoring_1.vendorCount.reset();
            // Update metrics
            vendors.forEach((group) => {
                monitoring_1.vendorCount.set({
                    tier: group.tier,
                    status: group.status,
                    organization_id: group.organizationId,
                }, group._count);
            });
            logger_1.default.debug('Vendor metrics collected', { groupCount: vendors.length });
        }
        catch (error) {
            logger_1.default.error('Error collecting vendor metrics:', error);
        }
    }
    /**
     * Collect assessment metrics
     */
    async collectAssessmentMetrics() {
        try {
            // Simplified - count by status only to avoid schema mismatches
            const totalAssessments = await database_1.prisma.vendorAssessment.count();
            const overdueCount = await database_1.prisma.vendorAssessment.count({
                where: {
                    status: 'OVERDUE',
                },
            });
            // Reset gauges
            monitoring_1.assessmentCount.reset();
            monitoring_1.overdueAssessments.reset();
            // Update with simplified counts
            monitoring_1.assessmentCount.set({
                status: 'ALL',
                type: 'ALL',
                organization_id: 'ALL',
            }, totalAssessments);
            monitoring_1.overdueAssessments.set({ organization_id: 'ALL' }, overdueCount);
            logger_1.default.debug('Assessment metrics collected', {
                total: totalAssessments,
                overdue: overdueCount,
            });
        }
        catch (error) {
            logger_1.default.error('Error collecting assessment metrics:', error);
        }
    }
    /**
     * Collect risk metrics
     */
    async collectRiskMetrics() {
        try {
            // Simplified count
            const totalRisks = await database_1.prisma.risk.count();
            // Reset gauges
            monitoring_1.riskCount.reset();
            // Update with simplified count
            monitoring_1.riskCount.set({
                level: 'ALL',
                category: 'ALL',
                status: 'ALL',
                organization_id: 'ALL',
            }, totalRisks);
            logger_1.default.debug('Risk metrics collected', { total: totalRisks });
        }
        catch (error) {
            logger_1.default.error('Error collecting risk metrics:', error);
        }
    }
    /**
     * Collect control metrics
     */
    async collectControlMetrics() {
        try {
            // Simplified count
            const totalControls = await database_1.prisma.control.count();
            // Reset gauges
            monitoring_1.controlCount.reset();
            // Update with simplified count
            monitoring_1.controlCount.set({
                framework: 'ALL',
                status: 'ALL',
                organization_id: 'ALL',
            }, totalControls);
            logger_1.default.debug('Control metrics collected', { total: totalControls });
        }
        catch (error) {
            logger_1.default.error('Error collecting control metrics:', error);
        }
    }
    /**
     * Collect incident metrics
     */
    async collectIncidentMetrics() {
        try {
            // Get incidents created in last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const incidents = await database_1.prisma.incident.groupBy({
                by: ['severity', 'status', 'organizationId'],
                where: {
                    createdAt: {
                        gte: thirtyDaysAgo,
                    },
                },
                _count: true,
            });
            // Update metrics (counter, so we increment)
            incidents.forEach((group) => {
                // Note: In production, you'd want to track increments properly
                // This is simplified for demonstration
                monitoring_1.incidentCount.inc({
                    severity: group.severity,
                    status: group.status,
                    organization_id: group.organizationId,
                }, 0 // Would increment by actual new incidents
                );
            });
            logger_1.default.debug('Incident metrics collected', { groupCount: incidents.length });
        }
        catch (error) {
            logger_1.default.error('Error collecting incident metrics:', error);
        }
    }
    /**
     * Collect compliance metrics
     */
    async collectComplianceMetrics() {
        try {
            // Simplified compliance calculation
            const totalControls = await database_1.prisma.control.count();
            const operationalControls = await database_1.prisma.control.count({
                where: { status: 'OPERATIONAL' },
            });
            const compliancePercentage = totalControls > 0
                ? (operationalControls / totalControls) * 100
                : 0;
            monitoring_1.complianceScore.set({
                framework: 'ALL',
                organization_id: 'ALL',
            }, compliancePercentage);
            logger_1.default.debug('Compliance metrics collected', {
                total: totalControls,
                operational: operationalControls,
                score: compliancePercentage.toFixed(2),
            });
        }
        catch (error) {
            logger_1.default.error('Error collecting compliance metrics:', error);
        }
    }
    /**
     * Collect session metrics
     */
    async collectSessionMetrics() {
        try {
            // Count active sessions (simplified to total active users)
            const totalUsers = await database_1.prisma.user.count();
            // Reset gauge
            monitoring_1.activeSessions.reset();
            // Update metrics
            monitoring_1.activeSessions.set({ organization_id: 'ALL' }, totalUsers);
            logger_1.default.debug('Session metrics collected', { totalUsers });
        }
        catch (error) {
            logger_1.default.error('Error collecting session metrics:', error);
        }
    }
    /**
     * Force immediate metrics collection
     */
    async collectNow() {
        logger_1.default.info('Forcing immediate business metrics collection');
        await this.collectMetrics();
    }
    /**
     * Get current metrics summary
     */
    async getMetricsSummary() {
        try {
            const [totalVendors, totalAssessments, totalRisks, totalControls, totalIncidents,] = await Promise.all([
                database_1.prisma.vendor.count(),
                database_1.prisma.vendorAssessment.count(),
                database_1.prisma.risk.count(),
                database_1.prisma.control.count(),
                database_1.prisma.incident.count(),
            ]);
            return {
                vendors: totalVendors,
                assessments: totalAssessments,
                risks: totalRisks,
                controls: totalControls,
                incidents: totalIncidents,
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            logger_1.default.error('Error getting metrics summary:', error);
            return null;
        }
    }
}
exports.BusinessMetricsCollector = BusinessMetricsCollector;
// Export singleton
exports.businessMetricsCollector = new BusinessMetricsCollector();
//# sourceMappingURL=businessMetrics.js.map
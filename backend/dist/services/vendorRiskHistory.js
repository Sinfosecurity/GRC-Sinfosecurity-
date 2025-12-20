"use strict";
/**
 * Vendor Risk History Service
 * Automatically tracks vendor risk scores over time for trend analysis
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../config/logger"));
class VendorRiskHistoryService {
    /**
     * Record risk score snapshot
     */
    async recordRiskSnapshot(vendorId, organizationId, changeReason, changedBy) {
        try {
            // Get current vendor state
            const vendor = await database_1.prisma.vendor.findUnique({
                where: { id: vendorId },
                include: {
                    issues: {
                        where: {
                            status: { in: ['OPEN', 'IN_PROGRESS'] },
                        },
                    },
                    monitoringRecords: {
                        where: {
                            requiresAction: true,
                            resolvedAt: null,
                        },
                    },
                    contracts: {
                        where: {
                            status: 'ACTIVE',
                        },
                    },
                },
            });
            if (!vendor) {
                throw new Error('Vendor not found');
            }
            // Count issues and alerts
            const openIssuesCount = vendor.issues.length;
            const criticalIssuesCount = vendor.issues.filter(i => i.severity === 'CRITICAL').length;
            const monitoringAlertsCount = vendor.monitoringRecords.length;
            // Count SLA breaches (would need to query contract SLA records)
            const slaBreachCount = 0; // Placeholder
            // Create history record
            await database_1.prisma.vendorRiskHistory.create({
                data: {
                    vendorId,
                    organizationId,
                    inherentRiskScore: vendor.inherentRiskScore,
                    residualRiskScore: vendor.residualRiskScore,
                    openIssuesCount,
                    criticalIssuesCount,
                    monitoringAlertsCount,
                    slaBreachCount,
                    changeReason,
                    changedBy,
                    vendorStatus: vendor.status,
                    vendorTier: vendor.tier,
                },
            });
            logger_1.default.info('Risk history snapshot recorded', {
                vendorId,
                residualRiskScore: vendor.residualRiskScore,
                changeReason,
            });
        }
        catch (error) {
            logger_1.default.error('Failed to record risk snapshot', { error: error.message, vendorId });
            // Don't throw - this is a background operation
        }
    }
    /**
     * Get risk trend for a vendor
     */
    async getVendorRiskTrend(vendorId, organizationId, months = 12) {
        try {
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);
            const history = await database_1.prisma.vendorRiskHistory.findMany({
                where: {
                    vendorId,
                    organizationId,
                    recordedAt: { gte: startDate },
                },
                orderBy: { recordedAt: 'asc' },
            });
            // Calculate trend
            const trend = this.calculateTrend(history.map(h => h.residualRiskScore));
            return {
                vendorId,
                period: `${months} months`,
                dataPoints: history.length,
                history: history.map(h => ({
                    date: h.recordedAt,
                    inherentRisk: h.inherentRiskScore,
                    residualRisk: h.residualRiskScore,
                    openIssues: h.openIssuesCount,
                    criticalIssues: h.criticalIssuesCount,
                    tier: h.vendorTier,
                    status: h.vendorStatus,
                    changeReason: h.changeReason,
                })),
                trend: {
                    direction: trend.direction,
                    changePercent: trend.changePercent,
                    volatility: trend.volatility,
                },
                insights: this.generateInsights(history, trend),
            };
        }
        catch (error) {
            logger_1.default.error('Failed to get vendor risk trend', { error: error.message, vendorId });
            throw error;
        }
    }
    /**
     * Get risk trends for all vendors
     */
    async getAllVendorTrends(organizationId, months = 6) {
        try {
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);
            // Get all vendors with their risk history
            const vendors = await database_1.prisma.vendor.findMany({
                where: {
                    organizationId,
                    status: { in: ['ACTIVE', 'APPROVED'] },
                },
                select: {
                    id: true,
                    name: true,
                    tier: true,
                    residualRiskScore: true,
                    riskHistory: {
                        where: {
                            recordedAt: { gte: startDate },
                        },
                        orderBy: { recordedAt: 'asc' },
                    },
                },
            });
            const trends = vendors.map(vendor => {
                const scores = vendor.riskHistory.map(h => h.residualRiskScore);
                const trend = this.calculateTrend(scores);
                return {
                    vendorId: vendor.id,
                    vendorName: vendor.name,
                    tier: vendor.tier,
                    currentRiskScore: vendor.residualRiskScore,
                    dataPoints: vendor.riskHistory.length,
                    trend: {
                        direction: trend.direction,
                        changePercent: trend.changePercent,
                        volatility: trend.volatility,
                    },
                    alert: this.determineAlertLevel(vendor.residualRiskScore, trend),
                };
            });
            // Sort by risk score descending
            trends.sort((a, b) => b.currentRiskScore - a.currentRiskScore);
            return {
                period: `${months} months`,
                totalVendors: trends.length,
                trends,
                summary: {
                    improving: trends.filter(t => t.trend.direction === 'Decreasing').length,
                    deteriorating: trends.filter(t => t.trend.direction === 'Increasing').length,
                    stable: trends.filter(t => t.trend.direction === 'Stable').length,
                    highVolatility: trends.filter(t => t.trend.volatility === 'High').length,
                },
            };
        }
        catch (error) {
            logger_1.default.error('Failed to get all vendor trends', { error: error.message, organizationId });
            throw error;
        }
    }
    /**
     * Calculate trend statistics
     */
    calculateTrend(scores) {
        if (scores.length < 2) {
            return {
                direction: 'Insufficient Data',
                changePercent: 0,
                volatility: 'Unknown',
            };
        }
        // Calculate linear regression
        const n = scores.length;
        const sumX = scores.reduce((sum, _, i) => sum + i, 0);
        const sumY = scores.reduce((sum, score) => sum + score, 0);
        const sumXY = scores.reduce((sum, score, i) => sum + i * score, 0);
        const sumX2 = scores.reduce((sum, _, i) => sum + i * i, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const firstScore = scores[0];
        const lastScore = scores[scores.length - 1];
        const changePercent = firstScore !== 0 ? ((lastScore - firstScore) / firstScore) * 100 : 0;
        // Determine direction
        let direction = 'Stable';
        if (Math.abs(changePercent) < 5) {
            direction = 'Stable';
        }
        else if (slope > 0) {
            direction = 'Increasing';
        }
        else {
            direction = 'Decreasing';
        }
        // Calculate volatility (standard deviation)
        const mean = sumY / n;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = mean !== 0 ? (stdDev / mean) * 100 : 0;
        let volatility = 'Low';
        if (coefficientOfVariation > 30) {
            volatility = 'High';
        }
        else if (coefficientOfVariation > 15) {
            volatility = 'Medium';
        }
        return {
            direction,
            changePercent: Math.round(changePercent * 10) / 10,
            volatility,
        };
    }
    /**
     * Generate insights from history
     */
    generateInsights(history, trend) {
        const insights = [];
        if (trend.direction === 'Increasing') {
            insights.push(`Risk score increasing by ${Math.abs(trend.changePercent)}% - requires attention`);
        }
        else if (trend.direction === 'Decreasing') {
            insights.push(`Risk score improving by ${Math.abs(trend.changePercent)}% - positive trend`);
        }
        else {
            insights.push('Risk score stable over time period');
        }
        if (trend.volatility === 'High') {
            insights.push('High volatility detected - indicates unstable risk profile');
        }
        // Check for recent spikes
        const recentHistory = history.slice(-5);
        const maxRecentRisk = Math.max(...recentHistory.map(h => h.residualRiskScore));
        const avgRecentRisk = recentHistory.reduce((sum, h) => sum + h.residualRiskScore, 0) / recentHistory.length;
        if (maxRecentRisk > avgRecentRisk * 1.3) {
            insights.push('Recent risk spike detected - investigate root cause');
        }
        // Check issue trends
        const recentIssues = history.slice(-3);
        const issuesIncreasing = recentIssues.every((h, i) => i === 0 || h.openIssuesCount >= recentIssues[i - 1].openIssuesCount);
        if (issuesIncreasing) {
            insights.push('Open issues trending upward - escalate to vendor management');
        }
        return insights;
    }
    /**
     * Determine alert level
     */
    determineAlertLevel(currentScore, trend) {
        if (currentScore >= 80 && trend.direction === 'Increasing') {
            return 'CRITICAL';
        }
        else if (currentScore >= 70 || (currentScore >= 60 && trend.direction === 'Increasing')) {
            return 'HIGH';
        }
        else if (trend.volatility === 'High') {
            return 'MEDIUM';
        }
        return 'LOW';
    }
}
exports.default = new VendorRiskHistoryService();
//# sourceMappingURL=vendorRiskHistory.js.map
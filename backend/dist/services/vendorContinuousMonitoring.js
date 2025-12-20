"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../config/logger"));
const database_1 = require("../config/database");
class VendorContinuousMonitoringService {
    /**
     * Record monitoring signal/alert
     */
    async recordSignal(data) {
        const changeDetected = data.previousValue && data.currentValue !== data.previousValue;
        const signal = await database_1.prisma.vendorMonitoring.create({
            data: {
                ...data,
                changeDetected: changeDetected || false,
                requiresAction: data.riskLevel === 'Critical' || data.riskLevel === 'High',
            },
            include: {
                vendor: {
                    select: {
                        name: true,
                        tier: true,
                    },
                },
            },
        });
        // If critical, create issue and notify
        if (data.riskLevel === 'Critical') {
            await this.createIssueFromSignal(signal);
        }
        // Trigger reassessment if significant change
        if (changeDetected && data.riskLevel !== 'Low') {
            await this.triggerReassessment(data.vendorId, data.riskIndicator);
        }
        logger_1.default.info(`✅ Monitoring signal recorded: ${data.riskIndicator} for ${signal.vendor.name}`);
        return signal;
    }
    /**
     * Monitor security ratings (Bitsight, SecurityScorecard, etc.)
     */
    async monitorSecurityRating(vendorId, organizationId, source, currentRating, previousRating) {
        let riskLevel = 'Low';
        if (currentRating < 400)
            riskLevel = 'Critical';
        else if (currentRating < 600)
            riskLevel = 'High';
        else if (currentRating < 750)
            riskLevel = 'Medium';
        return await this.recordSignal({
            vendorId,
            organizationId,
            monitoringType: 'SECURITY_RATING',
            source,
            riskIndicator: 'Security Rating Score',
            riskLevel,
            riskDescription: `Security rating: ${currentRating}/1000${previousRating ? ` (Previous: ${previousRating})` : ''}`,
            currentValue: currentRating.toString(),
            previousValue: previousRating?.toString(),
        });
    }
    /**
     * Monitor for data breaches
     */
    async monitorDataBreach(vendorId, organizationId, breachDetails) {
        const riskLevel = (breachDetails.recordsAffected || 0) > 10000 ? 'Critical' : 'High';
        return await this.recordSignal({
            vendorId,
            organizationId,
            monitoringType: 'BREACH_NOTIFICATION',
            source: breachDetails.source,
            riskIndicator: 'Data Breach Detected',
            riskLevel,
            riskDescription: `Data breach: ${breachDetails.description}. Records affected: ${breachDetails.recordsAffected || 'Unknown'}`,
            rawData: breachDetails,
            url: breachDetails.url,
        });
    }
    /**
     * Monitor certificate expiry
     */
    async monitorCertificateExpiry(vendorId, organizationId, certificateType, expiryDate) {
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        let riskLevel = 'Low';
        if (daysUntilExpiry < 0)
            riskLevel = 'Critical';
        else if (daysUntilExpiry < 30)
            riskLevel = 'High';
        else if (daysUntilExpiry < 90)
            riskLevel = 'Medium';
        if (daysUntilExpiry <= 90) {
            return await this.recordSignal({
                vendorId,
                organizationId,
                monitoringType: 'CERTIFICATE_EXPIRY',
                source: 'Internal Monitoring',
                riskIndicator: `${certificateType} Certificate Expiring`,
                riskLevel,
                riskDescription: `${certificateType} certificate expires in ${daysUntilExpiry} days (${expiryDate.toDateString()})`,
                currentValue: expiryDate.toISOString(),
            });
        }
    }
    /**
     * Monitor news mentions
     */
    async monitorNewsMention(vendorId, organizationId, newsData) {
        const riskLevel = newsData.sentiment === 'Negative' &&
            (newsData.keywords.includes('breach') || newsData.keywords.includes('hack'))
            ? 'High'
            : newsData.sentiment === 'Negative'
                ? 'Medium'
                : 'Low';
        if (riskLevel !== 'Low') {
            return await this.recordSignal({
                vendorId,
                organizationId,
                monitoringType: 'NEWS_MENTION',
                source: newsData.source,
                riskIndicator: 'Negative News Mention',
                riskLevel,
                riskDescription: newsData.headline,
                rawData: newsData,
                url: newsData.url,
            });
        }
    }
    /**
     * Monitor financial health
     */
    async monitorFinancialHealth(vendorId, organizationId, financialData) {
        let riskLevel = 'Low';
        if (financialData.profitabilityStatus === 'Loss' &&
            financialData.cashFlowStatus === 'Negative') {
            riskLevel = 'High';
        }
        else if (financialData.cashFlowStatus === 'Negative') {
            riskLevel = 'Medium';
        }
        if (riskLevel !== 'Low') {
            return await this.recordSignal({
                vendorId,
                organizationId,
                monitoringType: 'FINANCIAL_HEALTH',
                source: financialData.source,
                riskIndicator: 'Financial Health Concern',
                riskLevel,
                riskDescription: `Financial status: ${financialData.profitabilityStatus}, Cash flow: ${financialData.cashFlowStatus}`,
                rawData: financialData,
            });
        }
    }
    /**
     * Monitor M&A activity
     */
    async monitorMAndA(vendorId, organizationId, activityData) {
        const riskLevel = 'High';
        return await this.recordSignal({
            vendorId,
            organizationId,
            monitoringType: 'M_AND_A_ACTIVITY',
            source: activityData.source,
            riskIndicator: `M&A Activity: ${activityData.activityType}`,
            riskLevel,
            riskDescription: activityData.description,
            rawData: activityData,
            url: activityData.url,
        });
    }
    /**
     * Get active monitoring signals requiring action
     */
    async getActiveSignals(organizationId, vendorId) {
        return await database_1.prisma.vendorMonitoring.findMany({
            where: {
                organizationId,
                ...(vendorId ? { vendorId } : {}),
                requiresAction: true,
                resolvedAt: null,
            },
            include: {
                vendor: {
                    select: {
                        name: true,
                        tier: true,
                        status: true,
                    },
                },
            },
            orderBy: [
                { detectedAt: 'desc' },
            ],
        });
    }
    /**
     * Acknowledge signal
     */
    async acknowledgeSignal(signalId, organizationId, acknowledgedBy) {
        return await database_1.prisma.vendorMonitoring.updateMany({
            where: {
                id: signalId,
                organizationId,
            },
            data: {
                acknowledgedAt: new Date(),
            },
        });
    }
    /**
     * Resolve signal with action taken
     */
    async resolveSignal(signalId, organizationId, actionTaken, actionTakenBy) {
        return await database_1.prisma.vendorMonitoring.updateMany({
            where: {
                id: signalId,
                organizationId,
            },
            data: {
                actionTaken,
                actionTakenBy,
                actionTakenAt: new Date(),
                resolvedAt: new Date(),
                requiresAction: false,
            },
        });
    }
    /**
     * Schedule automated monitoring checks
     */
    async scheduleMonitoringChecks(organizationId) {
        // Get all active vendors
        const vendors = await database_1.prisma.vendor.findMany({
            where: {
                organizationId,
                status: 'ACTIVE',
            },
            select: {
                id: true,
                name: true,
                tier: true,
                website: true,
            },
        });
        const checks = [];
        for (const vendor of vendors) {
            // Check frequency based on tier
            const checkFrequency = this.getCheckFrequency(vendor.tier);
            checks.push({
                vendorId: vendor.id,
                vendorName: vendor.name,
                frequency: checkFrequency,
                nextCheck: this.calculateNextCheckDate(checkFrequency),
                checksEnabled: [
                    'SECURITY_RATING',
                    'BREACH_NOTIFICATION',
                    'CERTIFICATE_EXPIRY',
                    'NEWS_MENTION',
                    'FINANCIAL_HEALTH',
                ],
            });
        }
        logger_1.default.info(`✅ Scheduled monitoring for ${vendors.length} vendors`);
        return checks;
    }
    /**
     * Get monitoring statistics
     */
    async getMonitoringStatistics(organizationId) {
        const [totalSignals, criticalSignals, unresolvedSignals, signalsByType, recentTrend,] = await Promise.all([
            database_1.prisma.vendorMonitoring.count({ where: { organizationId } }),
            database_1.prisma.vendorMonitoring.count({
                where: { organizationId, riskLevel: 'Critical' },
            }),
            database_1.prisma.vendorMonitoring.count({
                where: { organizationId, requiresAction: true, resolvedAt: null },
            }),
            database_1.prisma.vendorMonitoring.groupBy({
                by: ['monitoringType'],
                where: { organizationId },
                _count: true,
            }),
            database_1.prisma.vendorMonitoring.count({
                where: {
                    organizationId,
                    detectedAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                    },
                },
            }),
        ]);
        return {
            summary: {
                totalSignals,
                criticalSignals,
                unresolvedSignals,
                recentTrend,
            },
            signalsByType: signalsByType.map(s => ({
                type: s.monitoringType,
                count: s._count,
            })),
        };
    }
    /**
     * Create issue from critical monitoring signal
     */
    async createIssueFromSignal(signal) {
        await database_1.prisma.vendorIssue.create({
            data: {
                vendorId: signal.vendorId,
                organizationId: signal.organizationId,
                title: `${signal.riskIndicator} - Monitoring Alert`,
                description: signal.riskDescription,
                issueType: this.mapMonitoringTypeToIssueType(signal.monitoringType),
                severity: 'CRITICAL',
                priority: 'URGENT',
                source: 'CONTINUOUS_MONITORING',
                identifiedBy: 'system',
                category: signal.monitoringType,
                status: 'OPEN',
            },
        });
        logger_1.default.info(`🚨 Created critical issue from monitoring signal: ${signal.riskIndicator}`);
    }
    /**
     * Trigger vendor reassessment
     */
    async triggerReassessment(vendorId, reason) {
        // Get vendor details
        const vendor = await database_1.prisma.vendor.findUnique({
            where: { id: vendorId },
        });
        if (!vendor)
            return;
        // Create triggered reassessment
        await database_1.prisma.vendorAssessment.create({
            data: {
                vendorId,
                organizationId: vendor.organizationId,
                assessmentType: 'TRIGGERED_REASSESSMENT',
                status: 'NOT_STARTED',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
        });
        logger_1.default.info(`✅ Triggered reassessment for vendor: ${vendorId} - Reason: ${reason}`);
    }
    /**
     * Get check frequency based on vendor tier
     */
    getCheckFrequency(tier) {
        switch (tier) {
            case 'CRITICAL':
                return 'daily';
            case 'HIGH':
                return 'weekly';
            case 'MEDIUM':
                return 'monthly';
            case 'LOW':
                return 'quarterly';
            default:
                return 'monthly';
        }
    }
    /**
     * Calculate next check date
     */
    calculateNextCheckDate(frequency) {
        const now = new Date();
        switch (frequency) {
            case 'daily':
                return new Date(now.setDate(now.getDate() + 1));
            case 'weekly':
                return new Date(now.setDate(now.getDate() + 7));
            case 'monthly':
                return new Date(now.setMonth(now.getMonth() + 1));
            case 'quarterly':
                return new Date(now.setMonth(now.getMonth() + 3));
            default:
                return new Date(now.setMonth(now.getMonth() + 1));
        }
    }
    /**
     * Map monitoring type to issue type
     */
    mapMonitoringTypeToIssueType(monitoringType) {
        const mapping = {
            SECURITY_RATING: 'SECURITY_VULNERABILITY',
            BREACH_NOTIFICATION: 'DATA_BREACH',
            CERTIFICATE_EXPIRY: 'COMPLIANCE_GAP',
            NEWS_MENTION: 'REPUTATIONAL_RISK',
            FINANCIAL_HEALTH: 'FINANCIAL_CONCERN',
            M_AND_A_ACTIVITY: 'OTHER',
        };
        return mapping[monitoringType] || 'OTHER';
    }
}
exports.default = new VendorContinuousMonitoringService();
//# sourceMappingURL=vendorContinuousMonitoring.js.map
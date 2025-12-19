/**
 * Vendor Continuous Monitoring Service
 * Real-time vendor risk signals and automated monitoring
 */

import { VendorMonitoringType } from '@prisma/client';
import { prisma } from '../config/database';

export interface MonitoringSignal {
    vendorId: string;
    organizationId: string;
    monitoringType: VendorMonitoringType;
    source: string;
    riskIndicator: string;
    riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
    riskDescription: string;
    currentValue?: string;
    previousValue?: string;
    rawData?: any;
    url?: string;
}

class VendorContinuousMonitoringService {
    /**
     * Record monitoring signal/alert
     */
    async recordSignal(data: MonitoringSignal) {
        const changeDetected = data.previousValue && data.currentValue !== data.previousValue;

        const signal = await prisma.vendorMonitoring.create({
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

        console.log(`✅ Monitoring signal recorded: ${data.riskIndicator} for ${signal.vendor.name}`);
        return signal;
    }

    /**
     * Monitor security ratings (Bitsight, SecurityScorecard, etc.)
     */
    async monitorSecurityRating(
        vendorId: string,
        organizationId: string,
        source: string,
        currentRating: number,
        previousRating?: number
    ) {
        let riskLevel: 'Critical' | 'High' | 'Medium' | 'Low' = 'Low';
        if (currentRating < 400) riskLevel = 'Critical';
        else if (currentRating < 600) riskLevel = 'High';
        else if (currentRating < 750) riskLevel = 'Medium';

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
    async monitorDataBreach(
        vendorId: string,
        organizationId: string,
        breachDetails: {
            source: string;
            breachDate: Date;
            recordsAffected?: number;
            dataTypesCompromised: string[];
            description: string;
            url?: string;
        }
    ) {
        const riskLevel: 'Critical' | 'High' | 'Medium' | 'Low' =
            (breachDetails.recordsAffected || 0) > 10000 ? 'Critical' : 'High';

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
    async monitorCertificateExpiry(
        vendorId: string,
        organizationId: string,
        certificateType: string,
        expiryDate: Date
    ) {
        const daysUntilExpiry = Math.floor(
            (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        let riskLevel: 'Critical' | 'High' | 'Medium' | 'Low' = 'Low';
        if (daysUntilExpiry < 0) riskLevel = 'Critical';
        else if (daysUntilExpiry < 30) riskLevel = 'High';
        else if (daysUntilExpiry < 90) riskLevel = 'Medium';

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
    async monitorNewsMention(
        vendorId: string,
        organizationId: string,
        newsData: {
            source: string;
            headline: string;
            sentiment: 'Positive' | 'Neutral' | 'Negative';
            keywords: string[];
            url: string;
            publishedDate: Date;
        }
    ) {
        const riskLevel: 'Critical' | 'High' | 'Medium' | 'Low' =
            newsData.sentiment === 'Negative' && 
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
    async monitorFinancialHealth(
        vendorId: string,
        organizationId: string,
        financialData: {
            creditRating?: string;
            revenueChange?: number; // Percentage
            profitabilityStatus: 'Profitable' | 'Break-even' | 'Loss';
            cashFlowStatus: 'Positive' | 'Negative';
            source: string;
        }
    ) {
        let riskLevel: 'Critical' | 'High' | 'Medium' | 'Low' = 'Low';

        if (
            financialData.profitabilityStatus === 'Loss' &&
            financialData.cashFlowStatus === 'Negative'
        ) {
            riskLevel = 'High';
        } else if (financialData.cashFlowStatus === 'Negative') {
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
    async monitorMAndA(
        vendorId: string,
        organizationId: string,
        activityData: {
            activityType: 'Acquisition' | 'Merger' | 'Buyout' | 'IPO';
            acquirer?: string;
            announcementDate: Date;
            expectedCloseDate?: Date;
            description: string;
            source: string;
            url?: string;
        }
    ) {
        const riskLevel: 'Critical' | 'High' | 'Medium' | 'Low' = 'High';

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
    async getActiveSignals(organizationId: string, vendorId?: string) {
        return await prisma.vendorMonitoring.findMany({
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
    async acknowledgeSignal(
        signalId: string,
        organizationId: string,
        acknowledgedBy: string
    ) {
        return await prisma.vendorMonitoring.updateMany({
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
    async resolveSignal(
        signalId: string,
        organizationId: string,
        actionTaken: string,
        actionTakenBy: string
    ) {
        return await prisma.vendorMonitoring.updateMany({
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
    async scheduleMonitoringChecks(organizationId: string) {
        // Get all active vendors
        const vendors = await prisma.vendor.findMany({
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

        console.log(`✅ Scheduled monitoring for ${vendors.length} vendors`);
        return checks;
    }

    /**
     * Get monitoring statistics
     */
    async getMonitoringStatistics(organizationId: string) {
        const [
            totalSignals,
            criticalSignals,
            unresolvedSignals,
            signalsByType,
            recentTrend,
        ] = await Promise.all([
            prisma.vendorMonitoring.count({ where: { organizationId } }),
            prisma.vendorMonitoring.count({
                where: { organizationId, riskLevel: 'Critical' },
            }),
            prisma.vendorMonitoring.count({
                where: { organizationId, requiresAction: true, resolvedAt: null },
            }),
            prisma.vendorMonitoring.groupBy({
                by: ['monitoringType'],
                where: { organizationId },
                _count: true,
            }),
            prisma.vendorMonitoring.count({
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
    private async createIssueFromSignal(signal: any) {
        await prisma.vendorIssue.create({
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

        console.log(`🚨 Created critical issue from monitoring signal: ${signal.riskIndicator}`);
    }

    /**
     * Trigger vendor reassessment
     */
    private async triggerReassessment(vendorId: string, reason: string) {
        // Get vendor details
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
        });

        if (!vendor) return;

        // Create triggered reassessment
        await prisma.vendorAssessment.create({
            data: {
                vendorId,
                organizationId: vendor.organizationId,
                assessmentType: 'TRIGGERED_REASSESSMENT',
                status: 'NOT_STARTED',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
        });

        console.log(`✅ Triggered reassessment for vendor: ${vendorId} - Reason: ${reason}`);
    }

    /**
     * Get check frequency based on vendor tier
     */
    private getCheckFrequency(tier: string): string {
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
    private calculateNextCheckDate(frequency: string): Date {
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
    private mapMonitoringTypeToIssueType(monitoringType: string): string {
        const mapping: any = {
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

export default new VendorContinuousMonitoringService();

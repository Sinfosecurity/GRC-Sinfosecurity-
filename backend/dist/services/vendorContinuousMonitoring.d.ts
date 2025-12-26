/**
 * Vendor Continuous Monitoring Service
 * Real-time vendor risk signals and automated monitoring
 */
import { VendorMonitoringType } from '@prisma/client';
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
declare class VendorContinuousMonitoringService {
    /**
     * Record monitoring signal/alert
     */
    recordSignal(data: MonitoringSignal): Promise<{
        vendor: {
            name: string;
            tier: import(".prisma/client").$Enums.VendorTier;
        };
    } & {
        url: string | null;
        id: string;
        organizationId: string;
        vendorId: string;
        source: string;
        requiresAction: boolean;
        actionTaken: string | null;
        detectedAt: Date;
        monitoringType: import(".prisma/client").$Enums.VendorMonitoringType;
        riskIndicator: string;
        riskLevel: string;
        riskDescription: string;
        currentValue: string | null;
        previousValue: string | null;
        changeDetected: boolean;
        rawData: import("@prisma/client/runtime/library").JsonValue | null;
        actionTakenBy: string | null;
        actionTakenAt: Date | null;
        acknowledgedAt: Date | null;
        resolvedAt: Date | null;
    }>;
    /**
     * Monitor security ratings (Bitsight, SecurityScorecard, etc.)
     */
    monitorSecurityRating(vendorId: string, organizationId: string, source: string, currentRating: number, previousRating?: number): Promise<{
        vendor: {
            name: string;
            tier: import(".prisma/client").$Enums.VendorTier;
        };
    } & {
        url: string | null;
        id: string;
        organizationId: string;
        vendorId: string;
        source: string;
        requiresAction: boolean;
        actionTaken: string | null;
        detectedAt: Date;
        monitoringType: import(".prisma/client").$Enums.VendorMonitoringType;
        riskIndicator: string;
        riskLevel: string;
        riskDescription: string;
        currentValue: string | null;
        previousValue: string | null;
        changeDetected: boolean;
        rawData: import("@prisma/client/runtime/library").JsonValue | null;
        actionTakenBy: string | null;
        actionTakenAt: Date | null;
        acknowledgedAt: Date | null;
        resolvedAt: Date | null;
    }>;
    /**
     * Monitor for data breaches
     */
    monitorDataBreach(vendorId: string, organizationId: string, breachDetails: {
        source: string;
        breachDate: Date;
        recordsAffected?: number;
        dataTypesCompromised: string[];
        description: string;
        url?: string;
    }): Promise<{
        vendor: {
            name: string;
            tier: import(".prisma/client").$Enums.VendorTier;
        };
    } & {
        url: string | null;
        id: string;
        organizationId: string;
        vendorId: string;
        source: string;
        requiresAction: boolean;
        actionTaken: string | null;
        detectedAt: Date;
        monitoringType: import(".prisma/client").$Enums.VendorMonitoringType;
        riskIndicator: string;
        riskLevel: string;
        riskDescription: string;
        currentValue: string | null;
        previousValue: string | null;
        changeDetected: boolean;
        rawData: import("@prisma/client/runtime/library").JsonValue | null;
        actionTakenBy: string | null;
        actionTakenAt: Date | null;
        acknowledgedAt: Date | null;
        resolvedAt: Date | null;
    }>;
    /**
     * Monitor certificate expiry
     */
    monitorCertificateExpiry(vendorId: string, organizationId: string, certificateType: string, expiryDate: Date): Promise<{
        vendor: {
            name: string;
            tier: import(".prisma/client").$Enums.VendorTier;
        };
    } & {
        url: string | null;
        id: string;
        organizationId: string;
        vendorId: string;
        source: string;
        requiresAction: boolean;
        actionTaken: string | null;
        detectedAt: Date;
        monitoringType: import(".prisma/client").$Enums.VendorMonitoringType;
        riskIndicator: string;
        riskLevel: string;
        riskDescription: string;
        currentValue: string | null;
        previousValue: string | null;
        changeDetected: boolean;
        rawData: import("@prisma/client/runtime/library").JsonValue | null;
        actionTakenBy: string | null;
        actionTakenAt: Date | null;
        acknowledgedAt: Date | null;
        resolvedAt: Date | null;
    }>;
    /**
     * Monitor news mentions
     */
    monitorNewsMention(vendorId: string, organizationId: string, newsData: {
        source: string;
        headline: string;
        sentiment: 'Positive' | 'Neutral' | 'Negative';
        keywords: string[];
        url: string;
        publishedDate: Date;
    }): Promise<{
        vendor: {
            name: string;
            tier: import(".prisma/client").$Enums.VendorTier;
        };
    } & {
        url: string | null;
        id: string;
        organizationId: string;
        vendorId: string;
        source: string;
        requiresAction: boolean;
        actionTaken: string | null;
        detectedAt: Date;
        monitoringType: import(".prisma/client").$Enums.VendorMonitoringType;
        riskIndicator: string;
        riskLevel: string;
        riskDescription: string;
        currentValue: string | null;
        previousValue: string | null;
        changeDetected: boolean;
        rawData: import("@prisma/client/runtime/library").JsonValue | null;
        actionTakenBy: string | null;
        actionTakenAt: Date | null;
        acknowledgedAt: Date | null;
        resolvedAt: Date | null;
    }>;
    /**
     * Monitor financial health
     */
    monitorFinancialHealth(vendorId: string, organizationId: string, financialData: {
        creditRating?: string;
        revenueChange?: number;
        profitabilityStatus: 'Profitable' | 'Break-even' | 'Loss';
        cashFlowStatus: 'Positive' | 'Negative';
        source: string;
    }): Promise<{
        vendor: {
            name: string;
            tier: import(".prisma/client").$Enums.VendorTier;
        };
    } & {
        url: string | null;
        id: string;
        organizationId: string;
        vendorId: string;
        source: string;
        requiresAction: boolean;
        actionTaken: string | null;
        detectedAt: Date;
        monitoringType: import(".prisma/client").$Enums.VendorMonitoringType;
        riskIndicator: string;
        riskLevel: string;
        riskDescription: string;
        currentValue: string | null;
        previousValue: string | null;
        changeDetected: boolean;
        rawData: import("@prisma/client/runtime/library").JsonValue | null;
        actionTakenBy: string | null;
        actionTakenAt: Date | null;
        acknowledgedAt: Date | null;
        resolvedAt: Date | null;
    }>;
    /**
     * Monitor M&A activity
     */
    monitorMAndA(vendorId: string, organizationId: string, activityData: {
        activityType: 'Acquisition' | 'Merger' | 'Buyout' | 'IPO';
        acquirer?: string;
        announcementDate: Date;
        expectedCloseDate?: Date;
        description: string;
        source: string;
        url?: string;
    }): Promise<{
        vendor: {
            name: string;
            tier: import(".prisma/client").$Enums.VendorTier;
        };
    } & {
        url: string | null;
        id: string;
        organizationId: string;
        vendorId: string;
        source: string;
        requiresAction: boolean;
        actionTaken: string | null;
        detectedAt: Date;
        monitoringType: import(".prisma/client").$Enums.VendorMonitoringType;
        riskIndicator: string;
        riskLevel: string;
        riskDescription: string;
        currentValue: string | null;
        previousValue: string | null;
        changeDetected: boolean;
        rawData: import("@prisma/client/runtime/library").JsonValue | null;
        actionTakenBy: string | null;
        actionTakenAt: Date | null;
        acknowledgedAt: Date | null;
        resolvedAt: Date | null;
    }>;
    /**
     * Get active monitoring signals requiring action
     */
    getActiveSignals(organizationId: string, vendorId?: string): Promise<({
        vendor: {
            status: import(".prisma/client").$Enums.VendorStatus;
            name: string;
            tier: import(".prisma/client").$Enums.VendorTier;
        };
    } & {
        url: string | null;
        id: string;
        organizationId: string;
        vendorId: string;
        source: string;
        requiresAction: boolean;
        actionTaken: string | null;
        detectedAt: Date;
        monitoringType: import(".prisma/client").$Enums.VendorMonitoringType;
        riskIndicator: string;
        riskLevel: string;
        riskDescription: string;
        currentValue: string | null;
        previousValue: string | null;
        changeDetected: boolean;
        rawData: import("@prisma/client/runtime/library").JsonValue | null;
        actionTakenBy: string | null;
        actionTakenAt: Date | null;
        acknowledgedAt: Date | null;
        resolvedAt: Date | null;
    })[]>;
    /**
     * Acknowledge signal
     */
    acknowledgeSignal(signalId: string, organizationId: string, acknowledgedBy: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    /**
     * Resolve signal with action taken
     */
    resolveSignal(signalId: string, organizationId: string, actionTaken: string, actionTakenBy: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    /**
     * Schedule automated monitoring checks
     */
    scheduleMonitoringChecks(organizationId: string): Promise<any[]>;
    /**
     * Get monitoring statistics
     */
    getMonitoringStatistics(organizationId: string): Promise<{
        summary: {
            totalSignals: number;
            criticalSignals: number;
            unresolvedSignals: number;
            recentTrend: number;
        };
        signalsByType: {
            type: import(".prisma/client").$Enums.VendorMonitoringType;
            count: number;
        }[];
    }>;
    /**
     * Create issue from critical monitoring signal
     */
    private createIssueFromSignal;
    /**
     * Trigger vendor reassessment
     */
    private triggerReassessment;
    /**
     * Get check frequency based on vendor tier
     */
    private getCheckFrequency;
    /**
     * Calculate next check date
     */
    private calculateNextCheckDate;
    /**
     * Map monitoring type to issue type
     */
    private mapMonitoringTypeToIssueType;
}
declare const _default: VendorContinuousMonitoringService;
export default _default;
//# sourceMappingURL=vendorContinuousMonitoring.d.ts.map
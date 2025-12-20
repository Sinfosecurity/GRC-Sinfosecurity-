/**
 * Vendor Risk History Service
 * Automatically tracks vendor risk scores over time for trend analysis
 */
declare class VendorRiskHistoryService {
    /**
     * Record risk score snapshot
     */
    recordRiskSnapshot(vendorId: string, organizationId: string, changeReason: string, changedBy?: string): Promise<void>;
    /**
     * Get risk trend for a vendor
     */
    getVendorRiskTrend(vendorId: string, organizationId: string, months?: number): Promise<{
        vendorId: string;
        period: string;
        dataPoints: number;
        history: {
            date: Date;
            inherentRisk: number;
            residualRisk: number;
            openIssues: number;
            criticalIssues: number;
            tier: import(".prisma/client").$Enums.VendorTier;
            status: import(".prisma/client").$Enums.VendorStatus;
            changeReason: string | null;
        }[];
        trend: {
            direction: string;
            changePercent: number;
            volatility: string;
        };
        insights: string[];
    }>;
    /**
     * Get risk trends for all vendors
     */
    getAllVendorTrends(organizationId: string, months?: number): Promise<{
        period: string;
        totalVendors: number;
        trends: {
            vendorId: string;
            vendorName: string;
            tier: import(".prisma/client").$Enums.VendorTier;
            currentRiskScore: number;
            dataPoints: number;
            trend: {
                direction: string;
                changePercent: number;
                volatility: string;
            };
            alert: string;
        }[];
        summary: {
            improving: number;
            deteriorating: number;
            stable: number;
            highVolatility: number;
        };
    }>;
    /**
     * Calculate trend statistics
     */
    private calculateTrend;
    /**
     * Generate insights from history
     */
    private generateInsights;
    /**
     * Determine alert level
     */
    private determineAlertLevel;
}
declare const _default: VendorRiskHistoryService;
export default _default;
//# sourceMappingURL=vendorRiskHistory.d.ts.map
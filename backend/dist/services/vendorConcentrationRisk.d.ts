/**
 * Vendor Concentration Risk Analysis Service
 * Analyzes over-reliance on vendors, categories, and geographies
 * Critical for regulatory compliance (OCC, FCA, EBA)
 */
interface ConcentrationRiskAnalysis {
    summary: {
        totalVendors: number;
        totalSpend: number;
        criticalVendors: number;
        geographicRegions: number;
        categories: number;
    };
    spendConcentration: {
        top1Vendor: {
            vendorId: string;
            vendorName: string;
            spend: number;
            percentOfTotal: number;
        } | null;
        top3Percent: number;
        top5Percent: number;
        top10Percent: number;
        topVendorsBySpend: Array<{
            vendorId: string;
            vendorName: string;
            tier: string;
            spend: number;
            percentOfTotal: number;
            services: string;
        }>;
    };
    geographicConcentration: {
        countriesRepresented: string[];
        highestConcentration: {
            country: string;
            vendorCount: number;
            percent: number;
        } | null;
        riskLevel: string;
        recommendations: string[];
        byCountry: Array<{
            country: string;
            vendorCount: number;
            criticalVendorCount: number;
            percentOfTotal: number;
        }>;
    };
    categoryConcentration: {
        byCategory: Array<{
            category: string;
            vendorCount: number;
            criticalVendorCount: number;
            totalSpend: number;
            percentOfTotal: number;
        }>;
        highestRiskCategory: {
            category: string;
            vendorCount: number;
            criticalCount: number;
        } | null;
    };
    singlePointsOfFailure: Array<{
        vendorId: string;
        vendorName: string;
        tier: string;
        services: string;
        reason: string;
        hasBackup: boolean;
        riskMitigation: string;
    }>;
    recommendations: string[];
    overallRiskRating: string;
}
declare class VendorConcentrationRiskService {
    /**
     * Perform comprehensive concentration risk analysis
     */
    analyzeConcentrationRisk(organizationId: string): Promise<ConcentrationRiskAnalysis>;
    /**
     * Analyze spend concentration
     */
    private analyzeSpendConcentration;
    /**
     * Analyze geographic concentration
     */
    private analyzeGeographicConcentration;
    /**
     * Analyze category concentration
     */
    private analyzeCategoryConcentration;
    /**
     * Identify single points of failure
     */
    private identifySinglePointsOfFailure;
    /**
     * Generate mitigation recommendation for a vendor
     */
    private generateMitigationRecommendation;
    /**
     * Generate overall recommendations
     */
    private generateRecommendations;
    /**
     * Calculate overall risk rating
     */
    private calculateOverallRiskRating;
    /**
     * Export concentration risk report for board
     */
    exportBoardReport(organizationId: string): Promise<{
        title: string;
        date: string;
        executiveSummary: {
            overallRiskRating: string;
            totalVendors: number;
            criticalVendors: number;
            keyRisks: string[];
        };
        findings: ConcentrationRiskAnalysis;
        recommendations: string[];
        nextSteps: string[];
    }>;
}
declare const _default: VendorConcentrationRiskService;
export default _default;
//# sourceMappingURL=vendorConcentrationRisk.d.ts.map
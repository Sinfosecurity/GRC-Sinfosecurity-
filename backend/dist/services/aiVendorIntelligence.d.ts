/**
 * AI-Powered Vendor Intelligence Service
 * Advanced AI features for TPRM including contract analysis, risk prediction, and audit readiness
 */
declare class AIVendorIntelligenceService {
    /**
     * Generate AI-powered vendor risk summary
     */
    generateVendorRiskSummary(vendorData: any): Promise<string>;
    /**
     * Analyze vendor assessment responses using AI
     */
    analyzeAssessmentResponses(assessmentData: any): Promise<{
        totalResponses: any;
        weakResponses: any;
        flaggedItems: any[];
        overallRisk: string;
        recommendation: string;
    }>;
    /**
     * AI Contract Clause Review
     */
    reviewContractClauses(contractText: string, vendorName: string): Promise<{
        contractName: string;
        overallRiskScore: number;
        missingClauses: any[];
        weakClauses: any[];
        strongClauses: any[];
        recommendations: any[];
    }>;
    /**
     * AI Audit Readiness - Generate vendor audit package
     */
    generateVendorAuditPackage(vendorId: string, organizationId: string): Promise<{
        vendorId: string;
        generatedAt: string;
        sections: {
            title: string;
            status: string;
            items: string[];
        }[];
        narratives: {
            executiveSummary: string;
            riskSummary: string;
            complianceSummary: string;
        };
        gaps: string[];
        recommendations: string[];
    }>;
    /**
     * Natural Language Q&A for vendors
     */
    answerVendorQuestion(question: string, vendorContext: any): Promise<string>;
    /**
     * Vendor Risk Comparison
     */
    compareVendors(vendor1Data: any, vendor2Data: any): Promise<{
        comparison: {
            metric: string;
            vendor1: any;
            vendor2: any;
            winner: string;
        }[];
        recommendation: string;
    }>;
    private getRiskLevel;
    private analyzeRiskFactors;
    private generateRecommendations;
    private calculateOverallRisk;
    private generateAssessmentRecommendation;
    private getClauseRiskImpact;
    private getSuggestedClauseLanguage;
    private generateAuditNarrative;
    private compareTiers;
    private generateComparisonRecommendation;
}
declare const _default: AIVendorIntelligenceService;
export default _default;
//# sourceMappingURL=aiVendorIntelligence.d.ts.map
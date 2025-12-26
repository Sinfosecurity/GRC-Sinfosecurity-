export interface MaturityAssessment {
    id: string;
    framework: string;
    assessmentDate: Date;
    assessor: string;
    overallScore: number;
    domains: MaturityDomain[];
    status: 'draft' | 'completed' | 'archived';
}
export interface MaturityDomain {
    domain: string;
    score: number;
    level: 'initial' | 'managed' | 'defined' | 'quantitative' | 'optimizing';
    capabilities: MaturityCapability[];
    recommendations: string[];
}
export interface MaturityCapability {
    capability: string;
    currentLevel: number;
    targetLevel: number;
    gap: number;
    priority: 'high' | 'medium' | 'low';
}
export interface BenchmarkData {
    industry: string;
    companySizeCategory: string;
    averageScores: {
        domain: string;
        average: number;
    }[];
    topPerformers: {
        domain: string;
        top25Percent: number;
    }[];
}
declare class GRCMaturityService {
    /**
     * Create maturity assessment
     */
    createAssessment(data: Omit<MaturityAssessment, 'id' | 'assessmentDate' | 'status'>): MaturityAssessment;
    /**
     * Get all assessments
     */
    getAssessments(framework?: string): MaturityAssessment[];
    /**
     * Get assessment by ID
     */
    getAssessment(assessmentId: string): MaturityAssessment | undefined;
    /**
     * Calculate overall score from domains
     */
    calculateOverallScore(domains: MaturityDomain[]): number;
    /**
     * Get maturity level name
     */
    getMaturityLevelName(score: number): string;
    /**
     * Get benchmark comparison
     */
    getBenchmark(industry: string, sizeCategory: string): BenchmarkData | undefined;
    /**
     * Compare assessment to benchmark
     */
    compareToIndustry(assessmentId: string, industry: string, sizeCategory: string): {
        assessment: MaturityAssessment;
        benchmark: BenchmarkData;
        comparison: {
            domain: string;
            yourScore: number;
            industryAverage: number;
            top25Percent: number;
            percentile: string;
        }[];
    } | null;
    /**
     * Get improvement roadmap
     */
    getImprovementRoadmap(assessmentId: string): {
        highPriority: MaturityCapability[];
        mediumPriority: MaturityCapability[];
        lowPriority: MaturityCapability[];
        estimatedTimeframe: string;
    } | null;
    /**
     * Get maturity dashboard
     */
    getDashboard(): {
        latestAssessment: MaturityAssessment;
        totalAssessments: number;
        averageScore: number;
        maturityLevel: string;
        improvementAreas: string[];
    };
}
declare const _default: GRCMaturityService;
export default _default;
//# sourceMappingURL=grcMaturityService.d.ts.map
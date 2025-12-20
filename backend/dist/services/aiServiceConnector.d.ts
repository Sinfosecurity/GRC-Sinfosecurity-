/**
 * AI Service Connector
 * Connects to Python AI services for risk prediction, gap analysis, and recommendations
 */
interface AIConfig {
    aiServiceUrl: string;
}
export interface RiskPrediction {
    riskId: string;
    predictedSeverity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    factors: string[];
    recommendations: string[];
}
export interface GapAnalysisResult {
    framework: string;
    overallScore: number;
    gaps: Gap[];
    recommendations: string[];
}
export interface Gap {
    controlId: string;
    description: string;
    currentState: string;
    targetState: string;
    priority: 'low' | 'medium' | 'high';
}
export interface AIRecommendation {
    id: string;
    type: 'risk_mitigation' | 'compliance_improvement' | 'process_optimization';
    title: string;
    description: string;
    priority: number;
    estimatedImpact: string;
}
declare class AIServiceConnector {
    private config;
    constructor(config?: AIConfig);
    /**
     * Get risk prediction using ML model
     */
    predictRisk(riskData: any): Promise<RiskPrediction>;
    /**
     * Perform automated gap analysis
     */
    analyzeGaps(framework: string, currentControls: any[]): Promise<GapAnalysisResult>;
    /**
     * Get AI-powered recommendations
     */
    getRecommendations(context: string): Promise<AIRecommendation[]>;
    /**
     * Analyze document for compliance
     */
    analyzeDocument(document: {
        name: string;
        content: string;
    }): Promise<any>;
    /**
     * Calculate predicted severity based on risk factors
     */
    private calculatePredictedSeverity;
    /**
     * Get smart risk score using ML
     */
    getSmartRiskScore(risk: any): Promise<{
        score: number;
        trend: 'increasing' | 'stable' | 'decreasing';
    }>;
    private severityToScore;
}
declare const _default: AIServiceConnector;
export default _default;
//# sourceMappingURL=aiServiceConnector.d.ts.map
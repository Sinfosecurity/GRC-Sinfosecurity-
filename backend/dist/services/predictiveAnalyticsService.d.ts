/**
 * Predictive Analytics Service
 * ML-powered risk forecasting, compliance predictions, and anomaly detection
 */
export interface RiskForecast {
    riskId: string;
    currentSeverity: string;
    predictedSeverity: string;
    forecastDate: Date;
    confidence: number;
    trendDirection: 'increasing' | 'stable' | 'decreasing';
    factors: string[];
}
export interface ComplianceForecast {
    framework: string;
    currentScore: number;
    predictedScore: number;
    forecastDate: Date;
    probabilityOfViolation: number;
    recommendations: string[];
}
export interface Anomaly {
    id: string;
    type: 'risk_spike' | 'compliance_drop' | 'unusual_access' | 'data_anomaly';
    severity: 'low' | 'medium' | 'high' | 'critical';
    detectedAt: Date;
    description: string;
    affectedResource: string;
    confidenceScore: number;
    suggestedActions: string[];
}
declare class PredictiveAnalyticsService {
    /**
     * Predict risk trends for next 30/60/90 days
     */
    predictRiskTrends(riskId: string, days?: number): Promise<RiskForecast[]>;
    /**
     * Forecast compliance scores for frameworks
     */
    forecastCompliance(framework: string, months?: number): Promise<ComplianceForecast[]>;
    /**
     * Detect anomalies in GRC data using ML
     */
    detectAnomalies(dataSource: string): Promise<Anomaly[]>;
    /**
     * Train ML model on historical GRC data
     */
    trainModel(modelType: 'risk_prediction' | 'compliance_forecast' | 'anomaly_detection'): Promise<{
        modelId: string;
        accuracy: number;
        trainingDataSize: number;
        completedAt: Date;
    }>;
    /**
     * Get predictive insights summary
     */
    getPredictiveInsights(): Promise<{
        riskTrend: 'improving' | 'stable' | 'worsening';
        complianceTrend: 'improving' | 'stable' | 'declining';
        anomalyCount: number;
        topPredictions: string[];
    }>;
    /**
     * Generate risk heat prediction for future
     */
    generateRiskHeatPrediction(days?: number): Promise<{
        date: Date;
        heatMap: number[][];
    }[]>;
}
declare const _default: PredictiveAnalyticsService;
export default _default;
//# sourceMappingURL=predictiveAnalyticsService.d.ts.map
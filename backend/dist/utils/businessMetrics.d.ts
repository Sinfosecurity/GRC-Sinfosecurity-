/**
 * Business Metrics Collector
 *
 * Collects and updates business-specific metrics for monitoring
 */
export declare class BusinessMetricsCollector {
    private updateInterval;
    private isRunning;
    /**
     * Start collecting business metrics
     */
    start(): void;
    /**
     * Stop collecting business metrics
     */
    stop(): void;
    /**
     * Collect all business metrics
     */
    private collectMetrics;
    /**
     * Collect vendor metrics
     */
    private collectVendorMetrics;
    /**
     * Collect assessment metrics
     */
    private collectAssessmentMetrics;
    /**
     * Collect risk metrics
     */
    private collectRiskMetrics;
    /**
     * Collect control metrics
     */
    private collectControlMetrics;
    /**
     * Collect incident metrics
     */
    private collectIncidentMetrics;
    /**
     * Collect compliance metrics
     */
    private collectComplianceMetrics;
    /**
     * Collect session metrics
     */
    private collectSessionMetrics;
    /**
     * Force immediate metrics collection
     */
    collectNow(): Promise<void>;
    /**
     * Get current metrics summary
     */
    getMetricsSummary(): Promise<{
        vendors: number;
        assessments: number;
        risks: number;
        controls: number;
        incidents: number;
        timestamp: string;
    }>;
}
export declare const businessMetricsCollector: BusinessMetricsCollector;
//# sourceMappingURL=businessMetrics.d.ts.map
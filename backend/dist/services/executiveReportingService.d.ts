/**
 * Executive Reporting Service
 * Board-ready reports, executive dashboards, C-suite risk views
 */
export interface ExecutiveReport {
    id: string;
    title: string;
    type: 'board_report' | 'exec_summary' | 'risk_dashboard' | 'compliance_status';
    period: string;
    generatedAt: Date;
    generatedBy: string;
    summary: {
        keyHighlights: string[];
        criticalIssues: string[];
        recommendations: string[];
    };
    metrics: {
        overallRiskScore: number;
        complianceScore: number;
        openCriticalIssues: number;
        trendsVsPrevPeriod: {
            risk: 'improving' | 'stable' | 'worsening';
            compliance: 'improving' | 'stable' | 'worsening';
        };
    };
    sections: ExecutiveReportSection[];
    status: 'draft' | 'reviewed' | 'approved';
}
export interface ExecutiveReportSection {
    title: string;
    type: 'text' | 'chart' | 'table' | 'kpi';
    content: any;
    priority: 'high' | 'medium' | 'low';
}
export interface BoardTemplate {
    id: string;
    name: string;
    description: string;
    sections: string[];
    frequency: 'monthly' | 'quarterly' | 'annual';
}
declare class ExecutiveReportingService {
    /**
     * Generate executive report
     */
    generateReport(type: ExecutiveReport['type'], period: string, generatedBy: string): ExecutiveReport;
    /**
     * Get report title based on type
     */
    private getReportTitle;
    /**
     * Get all reports
     */
    getReports(filters?: {
        type?: ExecutiveReport['type'];
        status?: ExecutiveReport['status'];
    }): ExecutiveReport[];
    /**
     * Get report by ID
     */
    getReport(reportId: string): ExecutiveReport | undefined;
    /**
     * Update report status
     */
    updateStatus(reportId: string, status: ExecutiveReport['status']): boolean;
    /**
     * Get board templates
     */
    getTemplates(): BoardTemplate[];
    /**
     * Create board presentation from report
     */
    createBoardPresentation(reportId: string): {
        slides: {
            title: string;
            type: 'summary' | 'metrics' | 'risks' | 'compliance';
            content: any;
        }[];
    } | null;
    /**
     * Export to PDF-ready format
     */
    exportToPDF(reportId: string): ExecutiveReport | null;
    /**
     * Get C-suite risk view
     */
    getCSuiteRiskView(): {
        topRisks: any[];
        criticalIssues: number;
        complianceStatus: string;
        trendIndicator: string;
    };
}
declare const _default: ExecutiveReportingService;
export default _default;
//# sourceMappingURL=executiveReportingService.d.ts.map
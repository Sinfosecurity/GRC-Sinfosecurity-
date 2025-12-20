/**
 * Report Generator Service
 * Generates reports in various formats (PDF, Excel, CSV)
 */
export type ReportType = 'risk_summary' | 'compliance_status' | 'control_effectiveness' | 'incident_report' | 'audit_log' | 'custom';
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';
export type ReportFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
export interface ReportTemplate {
    id: string;
    name: string;
    description: string;
    type: ReportType;
    sections: ReportSection[];
    filters?: ReportFilter[];
    createdAt: Date;
}
export interface ReportSection {
    id: string;
    title: string;
    type: 'summary' | 'table' | 'chart' | 'list';
    dataSource: string;
    config?: any;
}
export interface ReportFilter {
    field: string;
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between';
    value: any;
}
export interface ReportSchedule {
    id: string;
    templateId: string;
    frequency: ReportFrequency;
    recipients: string[];
    format: ReportFormat;
    nextRun: Date;
    enabled: boolean;
    createdBy: string;
}
export interface GeneratedReport {
    id: string;
    templateId: string;
    generatedAt: Date;
    generatedBy: string;
    format: ReportFormat;
    data: any;
    fileUrl?: string;
}
declare class ReportGenerator {
    /**
     * Get all report templates
     */
    getAllTemplates(): ReportTemplate[];
    /**
     * Get template by ID
     */
    getTemplateById(templateId: string): ReportTemplate | undefined;
    /**
     * Create new report template
     */
    createTemplate(data: Omit<ReportTemplate, 'id' | 'createdAt'>): ReportTemplate;
    /**
     * Update template
     */
    updateTemplate(templateId: string, updates: Partial<ReportTemplate>): ReportTemplate | null;
    /**
     * Delete template
     */
    deleteTemplate(templateId: string): boolean;
    /**
     * Generate report from template
     */
    generateReport(templateId: string, format?: ReportFormat, generatedBy?: string): Promise<GeneratedReport>;
    /**
     * Get data for a report section
     */
    private getSectionData;
    /**
     * Schedule recurring report
     */
    scheduleReport(data: Omit<ReportSchedule, 'id' | 'nextRun'>): ReportSchedule;
    /**
     * Get all schedules
     */
    getAllSchedules(): ReportSchedule[];
    /**
     * Calculate next run time based on frequency
     */
    private calculateNextRun;
    /**
     * Get all generated reports
     */
    getAllReports(): GeneratedReport[];
    /**
     * Export report data to CSV format
     */
    exportToCSV(data: any[]): string;
}
declare const _default: ReportGenerator;
export default _default;
//# sourceMappingURL=reportGenerator.d.ts.map
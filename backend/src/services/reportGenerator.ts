/**
 * Report Generator Service
 * Generates reports in various formats (PDF, Excel, CSV)
 */

import { AuditService } from './auditService';

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
    dataSource: string; // e.g., 'risks', 'compliance', 'controls'
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

// In-memory storage
const templates = new Map<string, ReportTemplate>();
const schedules = new Map<string, ReportSchedule>();
const reports = new Map<string, GeneratedReport>();

// Initialize demo templates
const initializeDemoTemplates = () => {
    const demoTemplates: ReportTemplate[] = [
        {
            id: 'tpl_1',
            name: 'Executive Risk Summary',
            description: 'High-level overview of organizational risks for executive stakeholders',
            type: 'risk_summary',
            sections: [
                {
                    id: 'sec_1',
                    title: 'Risk Overview',
                    type: 'summary',
                    dataSource: 'risks',
                },
                {
                    id: 'sec_2',
                    title: 'Critical Risks',
                    type: 'table',
                    dataSource: 'risks',
                    config: { filter: { priority: ['critical', 'high'] } },
                },
                {
                    id: 'sec_3',
                    title: 'Risk Trend',
                    type: 'chart',
                    dataSource: 'risks',
                },
            ],
            createdAt: new Date('2024-01-15'),
        },
        {
            id: 'tpl_2',
            name: 'Compliance Status Report',
            description: 'Detailed compliance status across all frameworks',
            type: 'compliance_status',
            sections: [
                {
                    id: 'sec_1',
                    title: 'Compliance Overview',
                    type: 'summary',
                    dataSource: 'compliance',
                },
                {
                    id: 'sec_2',
                    title: 'Framework Status',
                    type: 'table',
                    dataSource: 'compliance',
                },
                {
                    id: 'sec_3',
                    title: 'Upcoming Deadlines',
                    type: 'list',
                    dataSource: 'compliance',
                },
            ],
            createdAt: new Date('2024-02-01'),
        },
        {
            id: 'tpl_3',
            name: 'Control Effectiveness Report',
            description: 'Assessment of internal control effectiveness',
            type: 'control_effectiveness',
            sections: [
                {
                    id: 'sec_1',
                    title: 'Control Summary',
                    type: 'summary',
                    dataSource: 'controls',
                },
                {
                    id: 'sec_2',
                    title: 'Failed Controls',
                    type: 'table',
                    dataSource: 'controls',
                    config: { filter: { status: 'failed' } },
                },
            ],
            createdAt: new Date('2024-03-01'),
        },
        {
            id: 'tpl_4',
            name: 'Incident Response Report',
            description: 'Summary of security incidents and responses',
            type: 'incident_report',
            sections: [
                {
                    id: 'sec_1',
                    title: 'Incident Overview',
                    type: 'summary',
                    dataSource: 'incidents',
                },
                {
                    id: 'sec_2',
                    title: 'Recent Incidents',
                    type: 'table',
                    dataSource: 'incidents',
                },
            ],
            createdAt: new Date('2024-04-01'),
        },
    ];

    demoTemplates.forEach(tpl => templates.set(tpl.id, tpl));
};

initializeDemoTemplates();

class ReportGenerator {
    /**
     * Get all report templates
     */
    getAllTemplates(): ReportTemplate[] {
        return Array.from(templates.values());
    }

    /**
     * Get template by ID
     */
    getTemplateById(templateId: string): ReportTemplate | undefined {
        return templates.get(templateId);
    }

    /**
     * Create new report template
     */
    createTemplate(data: Omit<ReportTemplate, 'id' | 'createdAt'>): ReportTemplate {
        const template: ReportTemplate = {
            id: `tpl_${Date.now()}`,
            ...data,
            createdAt: new Date(),
        };

        templates.set(template.id, template);

        AuditService.log({
            userId: 'system',
            userName: 'System',
            action: 'create_report_template',
            resourceType: 'ReportTemplate',
            resourceId: template.id,
            resourceName: template.name,
            status: 'success',
        });

        return template;
    }

    /**
     * Update template
     */
    updateTemplate(templateId: string, updates: Partial<ReportTemplate>): ReportTemplate | null {
        const template = templates.get(templateId);

        if (!template) {
            return null;
        }

        const updated = { ...template, ...updates };
        templates.set(templateId, updated);

        return updated;
    }

    /**
     * Delete template
     */
    deleteTemplate(templateId: string): boolean {
        const template = templates.get(templateId);

        if (!template) {
            return false;
        }

        templates.delete(templateId);

        AuditService.log({
            userId: 'system',
            userName: 'System',
            action: 'delete_report_template',
            resourceType: 'ReportTemplate',
            resourceId: templateId,
            resourceName: template.name,
            status: 'success',
        });

        return true;
    }

    /**
     * Generate report from template
     */
    async generateReport(
        templateId: string,
        format: ReportFormat = 'pdf',
        generatedBy: string = 'system'
    ): Promise<GeneratedReport> {
        const template = templates.get(templateId);

        if (!template) {
            throw new Error('Template not found');
        }

        // Collect data for each section
        const sectionData = await Promise.all(
            template.sections.map(section => this.getSectionData(section))
        );

        const report: GeneratedReport = {
            id: `rpt_${Date.now()}`,
            templateId,
            generatedAt: new Date(),
            generatedBy,
            format,
            data: {
                template: template.name,
                sections: sectionData,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    generatedBy,
                },
            },
        };

        // In production, generate actual file (PDF/Excel/CSV)
        // For now, we'll just store the data
        reports.set(report.id, report);

        AuditService.log({
            userId: generatedBy,
            userName: 'User',
            action: 'generate_report',
            resourceType: 'Report',
            resourceId: report.id,
            resourceName: template.name,
            status: 'success',
            details: `Generated ${format.toUpperCase()} report`,
        });

        return report;
    }

    /**
     * Get data for a report section
     */
    private async getSectionData(section: ReportSection): Promise<any> {
        // Mock data - in production would query actual data sources
        const mockData: Record<string, any> = {
            risks: {
                total: 42,
                critical: 3,
                high: 8,
                medium: 20,
                low: 11,
                byCategory: [
                    { category: 'Cybersecurity', count: 15 },
                    { category: 'Operational', count: 12 },
                    { category: 'Financial', count: 8 },
                    { category: 'Compliance', count: 7 },
                ],
            },
            compliance: {
                total: 5,
                compliant: 4,
                nonCompliant: 1,
                frameworks: [
                    { name: 'ISO 27001', status: 'Compliant', score: 95 },
                    { name: 'SOC 2', status: 'Compliant', score: 92 },
                    { name: 'GDPR', status: 'Compliant', score: 88 },
                    { name: 'HIPAA', status: 'Non-Compliant', score: 72 },
                    { name: 'TISAX', status: 'Compliant', score: 90 },
                ],
            },
            controls: {
                total: 156,
                passing: 143,
                failing: 13,
                effectivenessRate: 92,
            },
            incidents: {
                total: 15,
                open: 3,
                closed: 12,
                critical: 2,
                high: 5,
                medium: 6,
                low: 2,
            },
        };

        return {
            title: section.title,
            type: section.type,
            data: mockData[section.dataSource] || {},
        };
    }

    /**
     * Schedule recurring report
     */
    scheduleReport(data: Omit<ReportSchedule, 'id' | 'nextRun'>): ReportSchedule {
        const schedule: ReportSchedule = {
            id: `sch_${Date.now()}`,
            ...data,
            nextRun: this.calculateNextRun(data.frequency),
        };

        schedules.set(schedule.id, schedule);

        return schedule;
    }

    /**
     * Get all schedules
     */
    getAllSchedules(): ReportSchedule[] {
        return Array.from(schedules.values());
    }

    /**
     * Calculate next run time based on frequency
     */
    private calculateNextRun(frequency: ReportFrequency): Date {
        const now = new Date();

        switch (frequency) {
            case 'daily':
                now.setDate(now.getDate() + 1);
                break;
            case 'weekly':
                now.setDate(now.getDate() + 7);
                break;
            case 'monthly':
                now.setMonth(now.getMonth() + 1);
                break;
            case 'quarterly':
                now.setMonth(now.getMonth() + 3);
                break;
            default:
                // once - set to far future
                now.setFullYear(now.getFullYear() + 10);
        }

        return now;
    }

    /**
     * Get all generated reports
     */
    getAllReports(): GeneratedReport[] {
        return Array.from(reports.values())
            .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
    }

    /**
     * Export report data to CSV format
     */
    exportToCSV(data: any[]): string {
        if (!data || data.length === 0) {
            return '';
        }

        // Get headers from first object
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');

        // Convert data to CSV rows
        const csvRows = data.map(row =>
            headers.map(header => {
                const value = row[header];
                // Escape commas and quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        );

        return `${csvHeaders}\n${csvRows.join('\n')}`;
    }
}

// Export singleton instance
export default new ReportGenerator();

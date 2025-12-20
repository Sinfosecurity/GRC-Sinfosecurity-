/**
 * Vendor Reporting & Analytics Service
 * Executive-level TPRM reports and dashboards
 */
declare class VendorReportingService {
    /**
     * Generate Executive TPRM Dashboard
     */
    generateExecutiveDashboard(organizationId: string): Promise<{
        generatedAt: string;
        period: string;
        summary: {
            vendors: {
                total: number;
                active: number;
                critical: number;
                high: number;
                proposed: number;
            };
            risks: {
                extreme: number;
                high: number;
                medium: number;
                low: number;
            };
            assessments: {
                total: number;
                completed: number;
                overdue: number;
                completionRate: number;
            };
            issues: {
                total: number;
                open: number;
                critical: number;
                overdue: number;
            };
            contracts: {
                total: number;
                active: number;
                expiring: number;
            };
            monitoring: {
                total: number;
                critical: number;
                unresolved: number;
            };
        };
        topRisks: {
            name: string;
            category: import(".prisma/client").$Enums.VendorCategory;
            tier: import(".prisma/client").$Enums.VendorTier;
            residualRiskScore: number;
            _count: {
                issues: number;
            };
        }[];
        recentActivity: {
            newVendors: number;
            completedAssessments: number;
            resolvedIssues: number;
            newIssues: number;
        };
        recommendations: {
            priority: string;
            title: string;
            description: string;
        }[];
    }>;
    /**
     * Generate Vendor Risk Heatmap Data
     */
    generateRiskHeatmap(organizationId: string): Promise<{
        data: {
            vendorId: string;
            vendorName: string;
            tier: import(".prisma/client").$Enums.VendorTier;
            category: import(".prisma/client").$Enums.VendorCategory;
            impact: number;
            likelihood: number;
            riskScore: number;
            openIssues: number;
            hasSensitiveData: boolean;
            riskZone: string;
        }[];
        zones: {
            extreme: number;
            high: number;
            medium: number;
            low: number;
        };
    }>;
    /**
     * Generate Vendor Performance Scorecard
     */
    generateVendorScorecard(vendorId: string, organizationId: string): Promise<{
        vendor: {
            id: string;
            name: string;
            tier: import(".prisma/client").$Enums.VendorTier;
            status: import(".prisma/client").$Enums.VendorStatus;
        };
        scores: {
            overall: number;
            performance: number;
            compliance: number;
            security: number;
            responsiveness: number;
        };
        metrics: {
            assessmentHistory: {
                date: Date | null;
                score: number | null;
            }[];
            openIssues: number;
            resolvedIssues: number;
            monitoringAlerts: number;
            contractCompliance: string;
        };
        aiInsights: string;
    }>;
    /**
     * Generate Vendor Trend Analysis
     */
    generateTrendAnalysis(organizationId: string, months?: number): Promise<{
        period: string;
        startDate: string;
        endDate: string;
        trends: {
            vendorGrowth: never[];
            riskScores: never[];
            assessments: never[];
            issues: never[];
        };
        insights: string[];
    }>;
    /**
     * Export PowerPoint-ready report data
     */
    exportBoardReport(organizationId: string): Promise<{
        title: string;
        date: string;
        slides: ({
            title: string;
            content: {
                vendors: {
                    total: number;
                    active: number;
                    critical: number;
                    high: number;
                    proposed: number;
                };
                risks: {
                    extreme: number;
                    high: number;
                    medium: number;
                    low: number;
                };
                assessments: {
                    total: number;
                    completed: number;
                    overdue: number;
                    completionRate: number;
                };
                issues: {
                    total: number;
                    open: number;
                    critical: number;
                    overdue: number;
                };
                contracts: {
                    total: number;
                    active: number;
                    expiring: number;
                };
                monitoring: {
                    total: number;
                    critical: number;
                    unresolved: number;
                };
            };
            type: string;
        } | {
            title: string;
            content: {
                data: {
                    vendorId: string;
                    vendorName: string;
                    tier: import(".prisma/client").$Enums.VendorTier;
                    category: import(".prisma/client").$Enums.VendorCategory;
                    impact: number;
                    likelihood: number;
                    riskScore: number;
                    openIssues: number;
                    hasSensitiveData: boolean;
                    riskZone: string;
                }[];
                zones: {
                    extreme: number;
                    high: number;
                    medium: number;
                    low: number;
                };
            };
            type: string;
        } | {
            title: string;
            content: {
                name: string;
                category: import(".prisma/client").$Enums.VendorCategory;
                tier: import(".prisma/client").$Enums.VendorTier;
                residualRiskScore: number;
                _count: {
                    issues: number;
                };
            }[];
            type: string;
        } | {
            title: string;
            content: {
                period: string;
                startDate: string;
                endDate: string;
                trends: {
                    vendorGrowth: never[];
                    riskScores: never[];
                    assessments: never[];
                    issues: never[];
                };
                insights: string[];
            };
            type: string;
        } | {
            title: string;
            content: {
                total: number;
                open: number;
                critical: number;
                overdue: number;
            };
            type: string;
        } | {
            title: string;
            content: {
                priority: string;
                title: string;
                description: string;
            }[];
            type: string;
        })[];
    }>;
    /**
     * Generate Regulatory Compliance Report
     */
    generateComplianceReport(organizationId: string, framework?: string): Promise<{
        framework: string;
        generatedAt: string;
        summary: {
            totalVendors: number;
            compliantVendors: number;
            atRiskVendors: number;
            complianceGaps: number;
        };
        vendors: {
            name: string;
            tier: import(".prisma/client").$Enums.VendorTier;
            complianceScore: number | null;
            openGaps: number;
            lastAssessed: Date | null;
        }[];
    }>;
    private getVendorStatistics;
    private getRiskDistribution;
    private getAssessmentMetrics;
    private getIssueMetrics;
    private getContractMetrics;
    private getMonitoringMetrics;
    private getTopRiskVendors;
    private getRecentActivity;
    private generateExecutiveRecommendations;
    private calculateRiskZone;
    private calculatePerformanceScore;
    private calculateComplianceScore;
    private calculateSecurityScore;
    private calculateResponseScore;
    private assessContractCompliance;
    private getVendorGrowthTrend;
    private getRiskScoreTrends;
    private getAssessmentTrends;
    private getIssueTrends;
    private generateTrendInsights;
}
declare const _default: VendorReportingService;
export default _default;
//# sourceMappingURL=vendorReportingService.d.ts.map
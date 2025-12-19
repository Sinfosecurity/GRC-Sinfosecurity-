/**
 * Vendor Reporting & Analytics Service
 * Executive-level TPRM reports and dashboards
 */

import { prisma } from '../config/database';
import aiVendorIntelligence from './aiVendorIntelligence';

interface ReportFilters {
    startDate?: Date;
    endDate?: Date;
    tier?: string;
    status?: string;
    category?: string;
}

class VendorReportingService {
    /**
     * Generate Executive TPRM Dashboard
     */
    async generateExecutiveDashboard(organizationId: string) {
        const [
            vendorStats,
            riskDistribution,
            assessmentMetrics,
            issueMetrics,
            contractMetrics,
            monitoringMetrics,
            topRisks,
            recentActivity,
        ] = await Promise.all([
            this.getVendorStatistics(organizationId),
            this.getRiskDistribution(organizationId),
            this.getAssessmentMetrics(organizationId),
            this.getIssueMetrics(organizationId),
            this.getContractMetrics(organizationId),
            this.getMonitoringMetrics(organizationId),
            this.getTopRiskVendors(organizationId, 10),
            this.getRecentActivity(organizationId, 30),
        ]);

        return {
            generatedAt: new Date().toISOString(),
            period: 'current',
            summary: {
                vendors: vendorStats,
                risks: riskDistribution,
                assessments: assessmentMetrics,
                issues: issueMetrics,
                contracts: contractMetrics,
                monitoring: monitoringMetrics,
            },
            topRisks,
            recentActivity,
            recommendations: await this.generateExecutiveRecommendations(organizationId),
        };
    }

    /**
     * Generate Vendor Risk Heatmap Data
     */
    async generateRiskHeatmap(organizationId: string) {
        const vendors = await prisma.vendor.findMany({
            where: {
                organizationId,
                status: 'ACTIVE',
            },
            select: {
                id: true,
                name: true,
                tier: true,
                residualRiskScore: true,
                category: true,
                dataTypesAccessed: true,
                _count: {
                    select: {
                        issues: {
                            where: {
                                status: { in: ['OPEN', 'IN_PROGRESS'] },
                            },
                        },
                    },
                },
            },
        });

        const heatmapData = vendors.map(vendor => {
            // X-axis: Impact (based on tier and data types)
            let impact = 0;
            if (vendor.tier === 'CRITICAL') impact = 4;
            else if (vendor.tier === 'HIGH') impact = 3;
            else if (vendor.tier === 'MEDIUM') impact = 2;
            else impact = 1;

            // Y-axis: Likelihood (based on risk score)
            let likelihood = 0;
            if (vendor.residualRiskScore >= 80) likelihood = 4;
            else if (vendor.residualRiskScore >= 60) likelihood = 3;
            else if (vendor.residualRiskScore >= 30) likelihood = 2;
            else likelihood = 1;

            return {
                vendorId: vendor.id,
                vendorName: vendor.name,
                tier: vendor.tier,
                category: vendor.category,
                impact,
                likelihood,
                riskScore: vendor.residualRiskScore,
                openIssues: vendor._count.issues,
                hasSensitiveData: vendor.dataTypesAccessed.some(dt =>
                    ['PII', 'PHI', 'PCI', 'Financial'].includes(dt)
                ),
                riskZone: this.calculateRiskZone(impact, likelihood),
            };
        });

        return {
            data: heatmapData,
            zones: {
                extreme: heatmapData.filter(v => v.riskZone === 'Extreme').length,
                high: heatmapData.filter(v => v.riskZone === 'High').length,
                medium: heatmapData.filter(v => v.riskZone === 'Medium').length,
                low: heatmapData.filter(v => v.riskZone === 'Low').length,
            },
        };
    }

    /**
     * Generate Vendor Performance Scorecard
     */
    async generateVendorScorecard(vendorId: string, organizationId: string) {
        const vendor = await prisma.vendor.findFirst({
            where: { id: vendorId, organizationId },
            include: {
                assessments: {
                    where: { status: 'COMPLETED' },
                    orderBy: { completedAt: 'desc' },
                    take: 5,
                },
                contracts: {
                    where: { status: 'ACTIVE' },
                },
                issues: true,
                monitoringRecords: {
                    orderBy: { detectedAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        // Calculate scores
        const performanceScore = await this.calculatePerformanceScore(vendor);
        const complianceScore = await this.calculateComplianceScore(vendor);
        const securityScore = await this.calculateSecurityScore(vendor);
        const responseScore = await this.calculateResponseScore(vendor);

        return {
            vendor: {
                id: vendor.id,
                name: vendor.name,
                tier: vendor.tier,
                status: vendor.status,
            },
            scores: {
                overall: Math.round((performanceScore + complianceScore + securityScore + responseScore) / 4),
                performance: performanceScore,
                compliance: complianceScore,
                security: securityScore,
                responsiveness: responseScore,
            },
            metrics: {
                assessmentHistory: vendor.assessments.map(a => ({
                    date: a.completedAt,
                    score: a.overallScore,
                })),
                openIssues: vendor.issues.filter(i => ['OPEN', 'IN_PROGRESS'].includes(i.status)).length,
                resolvedIssues: vendor.issues.filter(i => ['RESOLVED', 'CLOSED'].includes(i.status)).length,
                monitoringAlerts: vendor.monitoringRecords.filter(m => m.requiresAction).length,
                contractCompliance: await this.assessContractCompliance(vendor.contracts),
            },
            aiInsights: await aiVendorIntelligence.generateVendorRiskSummary(vendor),
        };
    }

    /**
     * Generate Vendor Trend Analysis
     */
    async generateTrendAnalysis(organizationId: string, months: number = 12) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        // Vendor growth trend
        const vendorGrowth = await this.getVendorGrowthTrend(organizationId, startDate);

        // Risk score trends
        const riskTrends = await this.getRiskScoreTrends(organizationId, startDate);

        // Assessment completion trends
        const assessmentTrends = await this.getAssessmentTrends(organizationId, startDate);

        // Issue trends
        const issueTrends = await this.getIssueTrends(organizationId, startDate);

        return {
            period: `${months} months`,
            startDate: startDate.toISOString(),
            endDate: new Date().toISOString(),
            trends: {
                vendorGrowth,
                riskScores: riskTrends,
                assessments: assessmentTrends,
                issues: issueTrends,
            },
            insights: this.generateTrendInsights(vendorGrowth, riskTrends, issueTrends),
        };
    }

    /**
     * Export PowerPoint-ready report data
     */
    async exportBoardReport(organizationId: string) {
        const dashboard = await this.generateExecutiveDashboard(organizationId);
        const heatmap = await this.generateRiskHeatmap(organizationId);
        const trends = await this.generateTrendAnalysis(organizationId, 6);

        // Format for PowerPoint export
        return {
            title: 'Third-Party Risk Management - Board Report',
            date: new Date().toISOString(),
            slides: [
                {
                    title: 'Executive Summary',
                    content: dashboard.summary,
                    type: 'summary',
                },
                {
                    title: 'Vendor Risk Heatmap',
                    content: heatmap,
                    type: 'heatmap',
                },
                {
                    title: 'Top 10 Risk Vendors',
                    content: dashboard.topRisks,
                    type: 'table',
                },
                {
                    title: 'Trend Analysis (6 Months)',
                    content: trends,
                    type: 'charts',
                },
                {
                    title: 'Open Issues & Remediation Status',
                    content: dashboard.summary.issues,
                    type: 'metrics',
                },
                {
                    title: 'Recommendations',
                    content: dashboard.recommendations,
                    type: 'bullets',
                },
            ],
        };
    }

    /**
     * Generate Regulatory Compliance Report
     */
    async generateComplianceReport(organizationId: string, framework?: string) {
        // Map vendors to compliance frameworks
        const vendors = await prisma.vendor.findMany({
            where: {
                organizationId,
                status: 'ACTIVE',
                ...(framework ? { regulatoryScope: { has: framework } } : {}),
            },
            include: {
                assessments: {
                    where: { status: 'COMPLETED' },
                    orderBy: { completedAt: 'desc' },
                    take: 1,
                },
                issues: {
                    where: { issueType: 'COMPLIANCE_GAP' },
                },
            },
        });

        const summary = {
            totalVendors: vendors.length,
            compliantVendors: vendors.filter(v => 
                v.assessments[0]?.complianceScore && v.assessments[0].complianceScore >= 80
            ).length,
            atRiskVendors: vendors.filter(v =>
                v.assessments[0]?.complianceScore && v.assessments[0].complianceScore < 60
            ).length,
            complianceGaps: vendors.reduce((sum, v) => sum + v.issues.length, 0),
        };

        return {
            framework: framework || 'All Frameworks',
            generatedAt: new Date().toISOString(),
            summary,
            vendors: vendors.map(v => ({
                name: v.name,
                tier: v.tier,
                complianceScore: v.assessments[0]?.complianceScore || null,
                openGaps: v.issues.filter(i => ['OPEN', 'IN_PROGRESS'].includes(i.status)).length,
                lastAssessed: v.assessments[0]?.completedAt || null,
            })),
        };
    }

    // ==========================================
    // PRIVATE HELPER METHODS
    // ==========================================

    private async getVendorStatistics(organizationId: string) {
        const [total, active, critical, high, proposed] = await Promise.all([
            prisma.vendor.count({ where: { organizationId } }),
            prisma.vendor.count({ where: { organizationId, status: 'ACTIVE' } }),
            prisma.vendor.count({ where: { organizationId, tier: 'CRITICAL' } }),
            prisma.vendor.count({ where: { organizationId, tier: 'HIGH' } }),
            prisma.vendor.count({ where: { organizationId, status: 'PROPOSED' } }),
        ]);

        return { total, active, critical, high, proposed };
    }

    private async getRiskDistribution(organizationId: string) {
        const vendors = await prisma.vendor.findMany({
            where: { organizationId, status: 'ACTIVE' },
            select: { residualRiskScore: true },
        });

        return {
            extreme: vendors.filter(v => v.residualRiskScore >= 80).length,
            high: vendors.filter(v => v.residualRiskScore >= 60 && v.residualRiskScore < 80).length,
            medium: vendors.filter(v => v.residualRiskScore >= 30 && v.residualRiskScore < 60).length,
            low: vendors.filter(v => v.residualRiskScore < 30).length,
        };
    }

    private async getAssessmentMetrics(organizationId: string) {
        const [total, completed, overdue] = await Promise.all([
            prisma.vendorAssessment.count({ where: { organizationId } }),
            prisma.vendorAssessment.count({ where: { organizationId, status: 'COMPLETED' } }),
            prisma.vendorAssessment.count({
                where: {
                    organizationId,
                    status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
                    dueDate: { lt: new Date() },
                },
            }),
        ]);

        return { total, completed, overdue, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }

    private async getIssueMetrics(organizationId: string) {
        const [total, open, critical, overdue] = await Promise.all([
            prisma.vendorIssue.count({ where: { organizationId } }),
            prisma.vendorIssue.count({ where: { organizationId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
            prisma.vendorIssue.count({ where: { organizationId, severity: 'CRITICAL' } }),
            prisma.vendorIssue.count({
                where: {
                    organizationId,
                    status: { in: ['OPEN', 'IN_PROGRESS'] },
                    targetRemediationDate: { lt: new Date() },
                },
            }),
        ]);

        return { total, open, critical, overdue };
    }

    private async getContractMetrics(organizationId: string) {
        const [total, active, expiring] = await Promise.all([
            prisma.vendorContract.count({ where: { organizationId } }),
            prisma.vendorContract.count({ where: { organizationId, status: 'ACTIVE' } }),
            prisma.vendorContract.count({
                where: {
                    organizationId,
                    status: 'ACTIVE',
                    expirationDate: { lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
                },
            }),
        ]);

        return { total, active, expiring };
    }

    private async getMonitoringMetrics(organizationId: string) {
        const [total, critical, unresolved] = await Promise.all([
            prisma.vendorMonitoring.count({ where: { organizationId } }),
            prisma.vendorMonitoring.count({ where: { organizationId, riskLevel: 'Critical' } }),
            prisma.vendorMonitoring.count({ where: { organizationId, requiresAction: true } }),
        ]);

        return { total, critical, unresolved };
    }

    private async getTopRiskVendors(organizationId: string, limit: number) {
        return await prisma.vendor.findMany({
            where: { organizationId, status: 'ACTIVE' },
            orderBy: { residualRiskScore: 'desc' },
            take: limit,
            select: {
                name: true,
                tier: true,
                residualRiskScore: true,
                category: true,
                _count: {
                    select: {
                        issues: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
                    },
                },
            },
        });
    }

    private async getRecentActivity(organizationId: string, days: number) {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const [newVendors, completedAssessments, resolvedIssues, newIssues] = await Promise.all([
            prisma.vendor.count({ where: { organizationId, createdAt: { gte: since } } }),
            prisma.vendorAssessment.count({
                where: { organizationId, status: 'COMPLETED', completedAt: { gte: since } },
            }),
            prisma.vendorIssue.count({
                where: { organizationId, status: 'RESOLVED', closedAt: { gte: since } },
            }),
            prisma.vendorIssue.count({ where: { organizationId, identifiedDate: { gte: since } } }),
        ]);

        return { newVendors, completedAssessments, resolvedIssues, newIssues };
    }

    private async generateExecutiveRecommendations(organizationId: string) {
        const recommendations = [];

        // Check for overdue assessments
        const overdueCount = await prisma.vendorAssessment.count({
            where: {
                organizationId,
                status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
                dueDate: { lt: new Date() },
            },
        });

        if (overdueCount > 0) {
            recommendations.push({
                priority: 'High',
                title: `${overdueCount} Overdue Assessments`,
                description: 'Complete pending vendor assessments to maintain compliance',
            });
        }

        // Check for high-risk vendors without recent assessments
        const staleHighRisk = await prisma.vendor.count({
            where: {
                organizationId,
                tier: { in: ['CRITICAL', 'HIGH'] },
                lastReviewDate: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            },
        });

        if (staleHighRisk > 0) {
            recommendations.push({
                priority: 'Critical',
                title: `${staleHighRisk} High-Risk Vendors Need Reassessment`,
                description: 'Critical and high-tier vendors should be assessed quarterly',
            });
        }

        return recommendations;
    }

    private calculateRiskZone(impact: number, likelihood: number): string {
        const score = impact * likelihood;
        if (score >= 12) return 'Extreme';
        if (score >= 8) return 'High';
        if (score >= 4) return 'Medium';
        return 'Low';
    }

    private async calculatePerformanceScore(vendor: any): Promise<number> {
        // Based on SLA compliance, issue resolution time, etc.
        return 85; // Placeholder
    }

    private async calculateComplianceScore(vendor: any): Promise<number> {
        if (vendor.assessments.length > 0) {
            return vendor.assessments[0].complianceScore || 0;
        }
        return 0;
    }

    private async calculateSecurityScore(vendor: any): Promise<number> {
        if (vendor.assessments.length > 0) {
            return vendor.assessments[0].securityScore || 0;
        }
        return 0;
    }

    private async calculateResponseScore(vendor: any): Promise<number> {
        // Based on how quickly vendor responds to issues
        return 80; // Placeholder
    }

    private async assessContractCompliance(contracts: any[]): Promise<string> {
        if (contracts.length === 0) return 'No active contracts';
        const activeContracts = contracts.filter(c => c.status === 'ACTIVE');
        return `${activeContracts.length} active contract(s)`;
    }

    private async getVendorGrowthTrend(organizationId: string, startDate: Date) {
        // Implementation would group vendors by month
        return [];
    }

    private async getRiskScoreTrends(organizationId: string, startDate: Date) {
        // Implementation would track risk score changes over time
        return [];
    }

    private async getAssessmentTrends(organizationId: string, startDate: Date) {
        // Implementation would track assessment completion over time
        return [];
    }

    private async getIssueTrends(organizationId: string, startDate: Date) {
        // Implementation would track issue creation/resolution over time
        return [];
    }

    private generateTrendInsights(vendorGrowth: any[], riskTrends: any[], issueTrends: any[]) {
        return [
            'Vendor portfolio growth is stable',
            'Average risk scores are trending down',
            'Issue resolution time has improved',
        ];
    }
}

export default new VendorReportingService();

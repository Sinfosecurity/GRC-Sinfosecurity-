/**
 * GRC Maturity Assessment Service
 * Maturity scoring, benchmarking, capability models
 */
import logger from '../config/logger';

export interface MaturityAssessment {
    id: string;
    framework: string;
    assessmentDate: Date;
    assessor: string;
    overallScore: number; // 1-5
    domains: MaturityDomain[];
    status: 'draft' | 'completed' | 'archived';
}

export interface MaturityDomain {
    domain: string;
    score: number; // 1-5 (Initial, Managed, Defined, Quantitatively Managed, Optimizing)
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

// In-memory storage
const assessments = new Map<string, MaturityAssessment>();
const benchmarks = new Map<string, BenchmarkData>();

// Initialize with demo assessment
assessments.set('assess_1', {
    id: 'assess_1',
    framework: 'GRC Maturity Model',
    assessmentDate: new Date(),
    assessor: 'admin@sinfosecurity.com',
    overallScore: 3.2,
    status: 'completed',
    domains: [
        {
            domain: 'Risk Management',
            score: 3.5,
            level: 'defined',
            capabilities: [
                { capability: 'Risk Identification', currentLevel: 4, targetLevel: 5, gap: 1, priority: 'medium' },
                { capability: 'Risk Assessment', currentLevel: 3, targetLevel: 4, gap: 1, priority: 'high' },
                { capability: 'Risk Monitoring', currentLevel: 3, targetLevel: 4, gap: 1, priority: 'high' },
            ],
            recommendations: [
                'Implement continuous risk monitoring',
                'Automate risk scoring processes',
                'Integrate threat intelligence feeds',
            ],
        },
        {
            domain: 'Compliance Management',
            score: 3.8,
            level: 'defined',
            capabilities: [
                { capability: 'Compliance Tracking', currentLevel: 4, targetLevel: 4, gap: 0, priority: 'low' },
                { capability: 'Policy Management', currentLevel: 3, targetLevel: 4, gap: 1, priority: 'medium' },
                { capability: 'Audit Management', currentLevel: 4, targetLevel: 5, gap: 1, priority: 'medium' },
            ],
            recommendations: [
                'Enhance policy version control',
                'Implement automated compliance testing',
            ],
        },
        {
            domain: 'Governance',
            score: 2.7,
            level: 'managed',
            capabilities: [
                { capability: 'Strategic Alignment', currentLevel: 3, targetLevel: 4, gap: 1, priority: 'high' },
                { capability: 'Stakeholder Engagement', currentLevel: 2, targetLevel: 3, gap: 1, priority: 'high' },
                { capability: 'Performance Metrics', currentLevel: 3, targetLevel: 4, gap: 1, priority: 'medium' },
            ],
            recommendations: [
                'Establish GRC steering committee',
                'Define key risk indicators (KRIs)',
                'Implement executive dashboards',
            ],
        },
    ],
});

// Industry benchmarks
benchmarks.set('technology_midsize', {
    industry: 'Technology',
    companySizeCategory: '100-500 employees',
    averageScores: [
        { domain: 'Risk Management', average: 3.2 },
        { domain: 'Compliance Management', average: 3.5 },
        { domain: 'Governance', average: 2.9 },
        { domain: 'Security Controls', average: 3.4 },
    ],
    topPerformers: [
        { domain: 'Risk Management', top25Percent: 4.1 },
        { domain: 'Compliance Management', top25Percent: 4.3 },
        { domain: 'Governance', top25Percent: 3.8 },
        { domain: 'Security Controls', top25Percent: 4.2 },
    ],
});

class GRCMaturityService {
    /**
     * Create maturity assessment
     */
    createAssessment(data: Omit<MaturityAssessment, 'id' | 'assessmentDate' | 'status'>): MaturityAssessment {
        const assessment: MaturityAssessment = {
            id: `assess_${Date.now()}`,
            ...data,
            assessmentDate: new Date(),
            status: 'draft',
        };

        assessments.set(assessment.id, assessment);
        logger.info(`📊 Maturity assessment created for ${assessment.framework}`);

        return assessment;
    }

    /**
     * Get all assessments
     */
    getAssessments(framework?: string): MaturityAssessment[] {
        let allAssessments = Array.from(assessments.values());

        if (framework) {
            allAssessments = allAssessments.filter(a => a.framework === framework);
        }

        return allAssessments.sort((a, b) => b.assessmentDate.getTime() - a.assessmentDate.getTime());
    }

    /**
     * Get assessment by ID
     */
    getAssessment(assessmentId: string): MaturityAssessment | undefined {
        return assessments.get(assessmentId);
    }

    /**
     * Calculate overall score from domains
     */
    calculateOverallScore(domains: MaturityDomain[]): number {
        if (domains.length === 0) return 0;

        const total = domains.reduce((sum, d) => sum + d.score, 0);
        return Math.round((total / domains.length) * 10) / 10;
    }

    /**
     * Get maturity level name
     */
    getMaturityLevelName(score: number): string {
        if (score < 1.5) return 'Initial (Ad-hoc)';
        if (score < 2.5) return 'Managed (Repeatable)';
        if (score < 3.5) return 'Defined (Standardized)';
        if (score < 4.5) return 'Quantitatively Managed (Measured)';
        return 'Optimizing (Continuous Improvement)';
    }

    /**
     * Get benchmark comparison
     */
    getBenchmark(industry: string, sizeCategory: string): BenchmarkData | undefined {
        const key = `${industry.toLowerCase()}_${sizeCategory.toLowerCase().replace(/\s/g, '')}`;
        return benchmarks.get(key);
    }

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
    } | null {
        const assessment = assessments.get(assessmentId);
        const benchmark = this.getBenchmark(industry, sizeCategory);

        if (!assessment || !benchmark) return null;

        const comparison = assessment.domains.map(domain => {
            const benchDomain = benchmark.averageScores.find(b => b.domain === domain.domain);
            const topPerf = benchmark.topPerformers.find(t => t.domain === domain.domain);

            let percentile = '50th';
            if (domain.score >= (topPerf?.top25Percent || 4.0)) {
                percentile = 'Top 25%';
            } else if (domain.score >= (benchDomain?.average || 3.0)) {
                percentile = 'Above Average';
            } else {
                percentile = 'Below Average';
            }

            return {
                domain: domain.domain,
                yourScore: domain.score,
                industryAverage: benchDomain?.average || 0,
                top25Percent: topPerf?.top25Percent || 0,
                percentile,
            };
        });

        return {
            assessment,
            benchmark,
            comparison,
        };
    }

    /**
     * Get improvement roadmap
     */
    getImprovementRoadmap(assessmentId: string): {
        highPriority: MaturityCapability[];
        mediumPriority: MaturityCapability[];
        lowPriority: MaturityCapability[];
        estimatedTimeframe: string;
    } | null {
        const assessment = assessments.get(assessmentId);
        if (!assessment) return null;

        const allCapabilities: MaturityCapability[] = [];
        assessment.domains.forEach(d => allCapabilities.push(...d.capabilities));

        const highPriority = allCapabilities.filter(c => c.priority === 'high' && c.gap > 0);
        const mediumPriority = allCapabilities.filter(c => c.priority === 'medium' && c.gap > 0);
        const lowPriority = allCapabilities.filter(c => c.priority === 'low' && c.gap > 0);

        const totalGaps = highPriority.length + mediumPriority.length + lowPriority.length;
        const estimatedTimeframe = totalGaps < 5 ? '3-6 months' :
            totalGaps < 10 ? '6-12 months' : '12-18 months';

        return {
            highPriority,
            mediumPriority,
            lowPriority,
            estimatedTimeframe,
        };
    }

    /**
     * Get maturity dashboard
     */
    getDashboard() {
        const allAssessments = Array.from(assessments.values());
        const latest = allAssessments.sort((a, b) =>
            b.assessmentDate.getTime() - a.assessmentDate.getTime()
        )[0];

        return {
            latestAssessment: latest,
            totalAssessments: allAssessments.length,
            averageScore: latest?.overallScore || 0,
            maturityLevel: latest ? this.getMaturityLevelName(latest.overallScore) : 'Not Assessed',
            improvementAreas: latest ?
                latest.domains
                    .filter(d => d.score < 3.5)
                    .map(d => d.domain) : [],
        };
    }
}

export default new GRCMaturityService();

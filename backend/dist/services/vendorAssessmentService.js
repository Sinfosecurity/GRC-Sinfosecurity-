"use strict";
/**
 * Vendor Assessment Service
 * Due diligence, risk assessments, and questionnaires (SIG, CAIQ, Custom)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../config/logger"));
class VendorAssessmentService {
    /**
     * Create a new vendor assessment
     */
    async createAssessment(data) {
        const assessment = await database_1.prisma.vendorAssessment.create({
            data: {
                ...data,
                status: client_1.AssessmentStatus.NOT_STARTED,
            },
            include: {
                vendor: {
                    select: {
                        name: true,
                        tier: true,
                    },
                },
            },
        });
        // Generate assessment questions based on template
        await this.generateAssessmentQuestions(assessment.id, data.frameworkUsed || 'Custom');
        logger_1.default.info(`✅ Created assessment for vendor: ${assessment.vendor.name}`);
        return assessment;
    }
    /**
     * Get assessment by ID with all responses
     */
    async getAssessmentById(assessmentId, organizationId) {
        return await database_1.prisma.vendorAssessment.findFirst({
            where: {
                id: assessmentId,
                organizationId,
            },
            include: {
                vendor: true,
                responses: {
                    orderBy: { questionId: 'asc' },
                },
                evidence: {
                    orderBy: { uploadedAt: 'desc' },
                },
            },
        });
    }
    /**
     * List assessments for a vendor
     */
    async listVendorAssessments(vendorId, organizationId) {
        return await database_1.prisma.vendorAssessment.findMany({
            where: {
                vendorId,
                organizationId,
            },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        responses: true,
                        evidence: true,
                    },
                },
            },
        });
    }
    /**
     * Submit response to assessment question
     */
    async submitResponse(data, respondedBy) {
        const assessment = await database_1.prisma.vendorAssessment.findUnique({
            where: { id: data.assessmentId },
        });
        if (!assessment) {
            throw new Error('Assessment not found');
        }
        // Find or create response
        const existingResponse = await database_1.prisma.assessmentResponse.findFirst({
            where: {
                assessmentId: data.assessmentId,
                questionId: data.questionId,
            },
        });
        // Calculate score based on response
        const score = this.calculateResponseScore(data.response);
        if (existingResponse) {
            // Update existing response
            await database_1.prisma.assessmentResponse.update({
                where: { id: existingResponse.id },
                data: {
                    response: data.response,
                    notes: data.notes,
                    score,
                    respondedBy,
                    respondedAt: new Date(),
                },
            });
        }
        else {
            // Create new response
            await database_1.prisma.assessmentResponse.create({
                data: {
                    assessmentId: data.assessmentId,
                    questionId: data.questionId,
                    response: data.response,
                    notes: data.notes,
                    score,
                    respondedBy,
                    respondedAt: new Date(),
                    questionText: '', // Will be populated from template
                    questionCategory: '',
                    maxScore: 10,
                },
            });
        }
        // Update assessment status if it was NOT_STARTED
        if (assessment.status === client_1.AssessmentStatus.NOT_STARTED) {
            await database_1.prisma.vendorAssessment.update({
                where: { id: data.assessmentId },
                data: { status: client_1.AssessmentStatus.IN_PROGRESS },
            });
        }
        logger_1.default.info(`✅ Response submitted for question: ${data.questionId}`);
    }
    /**
     * Complete assessment and calculate final scores
     */
    async completeAssessment(assessmentId, completedBy) {
        try {
            // Use transaction to ensure assessment completion and vendor update are atomic
            const result = await database_1.prisma.$transaction(async (tx) => {
                const assessment = await tx.vendorAssessment.findFirst({
                    where: { id: assessmentId },
                    include: {
                        _count: { select: { evidence: true } },
                    },
                });
                if (!assessment) {
                    throw new errors_1.NotFoundError('Assessment', assessmentId);
                }
                // Calculate scores by category
                const scores = await this.calculateAssessmentScores(assessmentId);
                // Identify gaps (questions with low scores)
                const gaps = await this.identifyGaps(assessmentId);
                // Generate AI recommendations
                const recommendations = await this.generateRecommendations(assessment.vendorId, gaps);
                // Update assessment with final results
                const updated = await tx.vendorAssessment.update({
                    where: { id: assessmentId },
                    data: {
                        status: client_1.AssessmentStatus.COMPLETED,
                        overallScore: scores.overall,
                        securityScore: scores.security,
                        privacyScore: scores.privacy,
                        complianceScore: scores.compliance,
                        operationalScore: scores.operational,
                        gapsIdentified: gaps,
                        recommendations,
                        completedAt: new Date(),
                        evidenceCollected: assessment._count?.evidence > 0,
                        evidenceCount: assessment._count?.evidence || 0,
                    },
                });
                // Update vendor's residual risk score atomically
                const newRiskScore = Math.max(0, 100 - scores.overall);
                await tx.vendor.update({
                    where: { id: assessment.vendorId },
                    data: {
                        residualRiskScore: newRiskScore,
                        lastReviewDate: new Date(),
                        updatedAt: new Date(),
                    },
                });
                return { updated, scores };
            });
            logger_1.default.info('Assessment completed successfully', {
                assessmentId,
                overallScore: result.scores.overall,
                completedBy,
            });
            // Record risk history snapshot
            const vendorRiskHistory = await Promise.resolve().then(() => __importStar(require('./vendorRiskHistory')));
            await vendorRiskHistory.default.recordRiskSnapshot(result.updated.vendorId, result.updated.organizationId, 'Assessment Completed', completedBy);
            return result.updated;
        }
        catch (error) {
            logger_1.default.error('Failed to complete assessment', { error: error.message, assessmentId });
            throw error instanceof errors_1.NotFoundError ? error : (0, errors_1.handlePrismaError)(error);
        }
    }
    /**
     * Generate assessment questions from template
     */
    async generateAssessmentQuestions(assessmentId, frameworkUsed) {
        const template = this.getAssessmentTemplate(frameworkUsed);
        const questions = [];
        template.sections.forEach(section => {
            section.questions.forEach(q => {
                questions.push({
                    assessmentId,
                    questionId: q.id,
                    questionText: q.question,
                    questionCategory: q.category,
                    weight: q.weight,
                    maxScore: 10,
                    evidenceRequired: q.evidenceRequired || false,
                });
            });
        });
        await database_1.prisma.assessmentResponse.createMany({
            data: questions,
        });
        logger_1.default.info(`✅ Generated ${questions.length} questions for assessment`);
    }
    /**
     * Calculate assessment scores by category
     */
    async calculateAssessmentScores(assessmentId) {
        const responses = await database_1.prisma.assessmentResponse.findMany({
            where: { assessmentId },
        });
        const calculateCategoryScore = (category) => {
            const categoryResponses = responses.filter(r => r.questionCategory === category && r.score !== null);
            if (categoryResponses.length === 0)
                return null;
            const totalScore = categoryResponses.reduce((sum, r) => sum + (r.score || 0), 0);
            const maxScore = categoryResponses.reduce((sum, r) => sum + r.maxScore, 0);
            return Math.round((totalScore / maxScore) * 100);
        };
        const security = calculateCategoryScore('Security');
        const privacy = calculateCategoryScore('Privacy');
        const compliance = calculateCategoryScore('Compliance');
        const operational = calculateCategoryScore('Operational');
        // Calculate overall score (weighted average)
        const categoriesWithScores = [security, privacy, compliance, operational].filter(s => s !== null);
        const overall = categoriesWithScores.length > 0
            ? Math.round(categoriesWithScores.reduce((sum, s) => sum + s, 0) /
                categoriesWithScores.length)
            : 0;
        return {
            overall,
            security,
            privacy,
            compliance,
            operational,
        };
    }
    /**
     * Identify gaps (low-scoring areas)
     */
    async identifyGaps(assessmentId) {
        const responses = await database_1.prisma.assessmentResponse.findMany({
            where: {
                assessmentId,
                score: { lte: 5 }, // Low score threshold
            },
            orderBy: { score: 'asc' },
        });
        return responses.map(r => ({
            questionId: r.questionId,
            question: r.questionText,
            category: r.questionCategory,
            score: r.score,
            maxScore: r.maxScore,
            response: r.response,
            severity: r.score <= 3 ? 'High' : 'Medium',
        }));
    }
    /**
     * Generate AI-powered recommendations
     */
    async generateRecommendations(vendorId, gaps) {
        // This would integrate with AI service
        // For now, generate rule-based recommendations
        const recommendations = gaps.map(gap => {
            let recommendation = '';
            let priority = 'Medium';
            if (gap.category === 'Security') {
                recommendation = `Address security gap: ${gap.question}. Vendor should implement controls to improve from ${gap.score}/${gap.maxScore}.`;
                priority = gap.severity === 'High' ? 'High' : 'Medium';
            }
            else if (gap.category === 'Privacy') {
                recommendation = `Privacy concern identified: ${gap.question}. Request Data Processing Agreement and privacy documentation.`;
                priority = 'High';
            }
            else if (gap.category === 'Compliance') {
                recommendation = `Compliance gap: ${gap.question}. Obtain relevant certifications or attestations.`;
                priority = 'Medium';
            }
            else {
                recommendation = `Operational improvement needed: ${gap.question}. Discuss with vendor in next review.`;
                priority = 'Low';
            }
            return {
                title: `${gap.category} Improvement Required`,
                description: recommendation,
                priority,
                category: gap.category,
                relatedQuestionId: gap.questionId,
            };
        });
        return recommendations;
    }
    /**
     * Update vendor's residual risk score based on assessment
     */
    async updateVendorRiskScore(vendorId, assessmentScore) {
        // Risk score is inverse of assessment score
        // High assessment score = Low risk
        const riskScore = Math.max(0, 100 - assessmentScore);
        await database_1.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                residualRiskScore: riskScore,
                lastReviewDate: new Date(),
            },
        });
        logger_1.default.info(`✅ Updated vendor risk score to: ${riskScore}`);
    }
    /**
     * Calculate response score based on answer
     */
    calculateResponseScore(response) {
        // Scoring logic based on response quality
        // This is simplified - in production would use more sophisticated NLP
        const positiveKeywords = [
            'yes',
            'implemented',
            'compliant',
            'certified',
            'annually',
            'quarterly',
            'encrypted',
            'monitored',
        ];
        const negativeKeywords = ['no', 'unknown', 'not implemented', 'none', 'never'];
        const lowerResponse = response.toLowerCase();
        if (negativeKeywords.some(keyword => lowerResponse.includes(keyword))) {
            return 2; // Low score
        }
        if (positiveKeywords.some(keyword => lowerResponse.includes(keyword))) {
            return 9; // High score
        }
        return 5; // Medium score for neutral responses
    }
    /**
     * Get assessment template (SIG, CAIQ, or Custom)
     */
    getAssessmentTemplate(frameworkUsed) {
        // This would load from database in production
        // For now, returning the template used in the frontend
        return {
            name: frameworkUsed,
            type: frameworkUsed,
            sections: [
                {
                    title: 'Information Security',
                    questions: [
                        {
                            id: 'sec_1',
                            question: 'Does the vendor maintain ISO 27001, SOC 2, or equivalent certification?',
                            category: 'Security',
                            weight: 10,
                            options: [
                                'Yes - ISO 27001',
                                'Yes - SOC 2 Type II',
                                'Yes - Both',
                                'No certification',
                                'In progress',
                            ],
                            frameworkMappings: ['ISO 27001:A.18.1.1', 'SOC 2:CC1.1'],
                            evidenceRequired: true,
                        },
                        {
                            id: 'sec_2',
                            question: 'How does the vendor handle data encryption?',
                            category: 'Security',
                            weight: 9,
                            options: [
                                'Encryption at rest and in transit (AES-256/TLS 1.3)',
                                'Encryption at rest only',
                                'Encryption in transit only',
                                'No encryption',
                                'Unknown',
                            ],
                            frameworkMappings: ['ISO 27001:A.10.1.1', 'NIST 800-53:SC-8'],
                        },
                        {
                            id: 'sec_3',
                            question: 'What is the vendor\'s incident response time commitment?',
                            category: 'Security',
                            weight: 8,
                            options: [
                                '< 1 hour (Critical incidents)',
                                '< 4 hours',
                                '< 24 hours',
                                'No SLA defined',
                                'Unknown',
                            ],
                        },
                        {
                            id: 'sec_4',
                            question: 'Does the vendor conduct regular penetration testing?',
                            category: 'Security',
                            weight: 7,
                            options: [
                                'Quarterly by third-party',
                                'Annually by third-party',
                                'Internal testing only',
                                'No testing',
                                'Unknown',
                            ],
                            evidenceRequired: true,
                        },
                    ],
                },
                {
                    title: 'Data Privacy & Compliance',
                    questions: [
                        {
                            id: 'priv_1',
                            question: 'Is the vendor GDPR compliant (if processing EU data)?',
                            category: 'Privacy',
                            weight: 10,
                            options: [
                                'Yes - Fully compliant with DPA',
                                'Yes - Standard contractual clauses',
                                'Partially compliant',
                                'Not applicable',
                                'No',
                            ],
                            frameworkMappings: ['GDPR:Art.28', 'GDPR:Art.32'],
                            evidenceRequired: true,
                        },
                        {
                            id: 'priv_2',
                            question: 'Where is customer data stored geographically?',
                            category: 'Privacy',
                            weight: 8,
                            options: [
                                'EU/EEA only',
                                'US with Privacy Shield',
                                'Multi-region with data residency options',
                                'Outside EU/US',
                                'Unknown',
                            ],
                        },
                        {
                            id: 'priv_3',
                            question: 'Does the vendor have a Data Processing Agreement (DPA)?',
                            category: 'Privacy',
                            weight: 9,
                            options: [
                                'Yes - Signed and current',
                                'Yes - Pending signature',
                                'Standard terms only',
                                'No DPA',
                                'Not required',
                            ],
                            evidenceRequired: true,
                        },
                    ],
                },
                {
                    title: 'Business Continuity & Availability',
                    questions: [
                        {
                            id: 'bc_1',
                            question: 'What is the vendor\'s uptime SLA?',
                            category: 'Operational',
                            weight: 8,
                            options: [
                                '99.99% (4 nines)',
                                '99.9% (3 nines)',
                                '99.5%',
                                'No SLA',
                                'Unknown',
                            ],
                        },
                        {
                            id: 'bc_2',
                            question: 'Does the vendor have a documented Business Continuity Plan (BCP)?',
                            category: 'Operational',
                            weight: 9,
                            options: [
                                'Yes - Tested annually',
                                'Yes - Tested bi-annually',
                                'Yes - Not tested',
                                'No',
                                'Unknown',
                            ],
                            evidenceRequired: true,
                        },
                        {
                            id: 'bc_3',
                            question: 'What is the vendor\'s Recovery Time Objective (RTO)?',
                            category: 'Operational',
                            weight: 8,
                            options: ['< 1 hour', '< 4 hours', '< 24 hours', '> 24 hours', 'Not defined'],
                        },
                    ],
                },
                {
                    title: 'Vendor Management & Due Diligence',
                    questions: [
                        {
                            id: 'mgmt_1',
                            question: 'How long has the vendor been in business?',
                            category: 'Compliance',
                            weight: 6,
                            options: ['10+ years', '5-10 years', '2-5 years', '< 2 years', 'Startup'],
                        },
                        {
                            id: 'mgmt_2',
                            question: 'Does the vendor have cyber insurance?',
                            category: 'Compliance',
                            weight: 7,
                            options: [
                                'Yes - $10M+ coverage',
                                'Yes - $5M-$10M',
                                'Yes - < $5M',
                                'No',
                                'Unknown',
                            ],
                            evidenceRequired: true,
                        },
                        {
                            id: 'mgmt_3',
                            question: 'Has the vendor had any security breaches in the past 3 years?',
                            category: 'Security',
                            weight: 10,
                            options: [
                                'No breaches',
                                'Minor breach - quickly resolved',
                                'Major breach - resolved',
                                'Multiple breaches',
                                'Unknown',
                            ],
                        },
                        {
                            id: 'mgmt_4',
                            question: 'Does the vendor conduct third-party security audits?',
                            category: 'Compliance',
                            weight: 8,
                            options: ['Yes - Annually', 'Yes - Every 2 years', 'Rarely', 'No', 'Unknown'],
                            evidenceRequired: true,
                        },
                    ],
                },
            ],
        };
    }
    /**
     * Get overdue assessments
     */
    async getOverdueAssessments(organizationId) {
        return await database_1.prisma.vendorAssessment.findMany({
            where: {
                organizationId,
                status: { in: [client_1.AssessmentStatus.NOT_STARTED, client_1.AssessmentStatus.IN_PROGRESS] },
                dueDate: { lt: new Date() },
            },
            include: {
                vendor: {
                    select: {
                        name: true,
                        tier: true,
                    },
                },
            },
            orderBy: { dueDate: 'asc' },
        });
    }
    /**
     * Get assessment completion rate
     */
    async getAssessmentMetrics(organizationId) {
        const [total, completed, overdue] = await Promise.all([
            database_1.prisma.vendorAssessment.count({ where: { organizationId } }),
            database_1.prisma.vendorAssessment.count({
                where: { organizationId, status: client_1.AssessmentStatus.COMPLETED },
            }),
            database_1.prisma.vendorAssessment.count({
                where: {
                    organizationId,
                    status: { in: [client_1.AssessmentStatus.NOT_STARTED, client_1.AssessmentStatus.IN_PROGRESS] },
                    dueDate: { lt: new Date() },
                },
            }),
        ]);
        return {
            total,
            completed,
            overdue,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
    }
}
exports.default = new VendorAssessmentService();
//# sourceMappingURL=vendorAssessmentService.js.map
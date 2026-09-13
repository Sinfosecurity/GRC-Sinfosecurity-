/**
 * Vendor Assessment Service
 * Due diligence, risk assessments, and questionnaires (SIG, CAIQ, Custom)
 */

import { VendorAssessment, AssessmentType, AssessmentStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { handlePrismaError, NotFoundError } from '../utils/errors';
import logger from '../config/logger';
import { getActiveTemplate, getTemplateById } from './questionnaireService';
import { ApiError } from '../middleware/errorHandler';
import { calculateVendorRiskAt, RISK_SCORE_VERSION } from './deterministicRiskEngine';

export interface QuestionTemplate {
    id: string;
    question: string;
    category: string;
    weight: number;
    options: string[];
    frameworkMappings?: string[]; // ["ISO 27001:A.9.1.1", "NIST 800-53:AC-2"]
    evidenceRequired?: boolean;
}

export interface AssessmentTemplate {
    name: string;
    type: string; // "SIG", "CAIQ", "Custom"
    version?: string;
    sections: {
        title: string;
        questions: QuestionTemplate[];
    }[];
}

export interface CreateAssessmentInput {
    vendorId: string;
    organizationId: string;
    assessmentType: AssessmentType;
    frameworkUsed?: string;
    assignedTo?: string;
    dueDate?: Date;
    templateId?: string;
}

export interface SubmitAssessmentResponseInput {
    assessmentId: string;
    organizationId: string;
    vendorId?: string;
    questionId: string;
    response?: string;
    answer?: string;
    notes?: string;
    reviewerComment?: string;
    evidenceIds?: string[];
}

class VendorAssessmentService {
    /**
     * Create a new vendor assessment
     */
    async createAssessment(data: CreateAssessmentInput): Promise<VendorAssessment> {
        const { templateId, ...rest } = data;
        const template = templateId
            ? await getTemplateById(data.organizationId, templateId)
            : await getActiveTemplate(data.organizationId, data.frameworkUsed || 'Custom');
        if (!template) {
            throw new ApiError(404, 'Questionnaire template not found');
        }
        const assessment = await prisma.vendorAssessment.create({
            data: {
                ...rest,
                status: AssessmentStatus.NOT_STARTED,
                templateId: template.id,
                templateVersion: template.version,
                scoreVersion: RISK_SCORE_VERSION,
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

        await this.generateAssessmentQuestionsFromTemplate(assessment.id, template);

        logger.info(`✅ Created assessment for vendor: ${assessment.vendor.name}`);
        return assessment;
    }

    /**
     * Get assessment by ID with all responses
     */
    async getAssessmentById(assessmentId: string, organizationId: string) {
        return await prisma.vendorAssessment.findFirst({
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
    async listVendorAssessments(vendorId: string, organizationId: string) {
        return await prisma.vendorAssessment.findMany({
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

    async listOrganizationAssessments(organizationId: string) {
        return prisma.vendorAssessment.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            include: {
                vendor: { select: { id: true, name: true, tier: true } },
                _count: { select: { responses: true, evidence: true } },
            },
            take: 200,
        });
    }

    /**
     * Submit response to assessment question
     */
    async submitResponse(data: SubmitAssessmentResponseInput, respondedBy: string) {
        const assessment = await prisma.vendorAssessment.findFirst({
            where: {
                id: data.assessmentId,
                organizationId: data.organizationId,
                ...(data.vendorId ? { vendorId: data.vendorId } : {}),
            },
        });

        if (!assessment) {
            throw new ApiError(404, 'Assessment not found');
        }

        const answer = (data.response || data.answer || '').trim();
        if (!answer) {
            throw new ApiError(400, 'Response is required');
        }

        const existingResponse = await prisma.assessmentResponse.findFirst({
            where: {
                assessmentId: data.assessmentId,
                questionId: data.questionId,
            },
        });

        const score = this.calculateResponseScore(answer);

        if (existingResponse) {
            await prisma.assessmentResponse.update({
                where: { id: existingResponse.id },
                data: {
                    response: answer,
                    notes: data.notes,
                    reviewerComment: data.reviewerComment,
                    score,
                    respondedBy,
                    respondedAt: new Date(),
                },
            });
        } else {
            await prisma.assessmentResponse.create({
                data: {
                    assessmentId: data.assessmentId,
                    questionId: data.questionId,
                    response: answer,
                    notes: data.notes,
                    reviewerComment: data.reviewerComment,
                    score,
                    respondedBy,
                    respondedAt: new Date(),
                    questionText: '',
                    questionCategory: '',
                    maxScore: 10,
                },
            });
        }

        if (assessment.status === AssessmentStatus.NOT_STARTED) {
            await prisma.vendorAssessment.update({
                where: { id: assessment.id },
                data: { status: AssessmentStatus.IN_PROGRESS },
            });
        }

        logger.info(`✅ Response submitted for question: ${data.questionId}`);
        return this.getAssessmentById(data.assessmentId, data.organizationId);
    }

    /**
     * Complete assessment and calculate final scores
     */
    async completeAssessment(assessmentId: string, completedBy: string, organizationId?: string) {
        try {
            const result = await prisma.$transaction(async (tx) => {
                const assessment = await tx.vendorAssessment.findFirst({
                    where: { id: assessmentId, ...(organizationId ? { organizationId } : {}) },
                    include: {
                        _count: { select: { evidence: true } },
                    },
                });

                if (!assessment) {
                    throw new NotFoundError('Assessment', assessmentId);
                }

                const scores = await this.calculateAssessmentScores(assessmentId);
                const gaps = await this.identifyGaps(assessmentId);
                const recommendations = await this.generateRecommendations(assessment.vendorId, gaps);

                const updated = await tx.vendorAssessment.update({
                    where: { id: assessmentId },
                    data: {
                        status: AssessmentStatus.COMPLETED,
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

                await tx.vendor.updateMany({
                    where: { id: assessment.vendorId, organizationId: assessment.organizationId },
                    data: {
                        lastReviewDate: new Date(),
                    },
                });

                return { updated, scores };
            });

            logger.info('Assessment completed successfully', {
                assessmentId,
                overallScore: result.scores.overall,
                completedBy,
            });

            const vendorRiskHistory = await import('./vendorRiskHistory');
            await vendorRiskHistory.default.recordRiskSnapshot(
                result.updated.vendorId,
                result.updated.organizationId,
                'Assessment Completed',
                completedBy
            );

            const { explainableRiskService } = await import('./explainableRiskService');
            await explainableRiskService.recalculate(result.updated.organizationId, result.updated.vendorId);

            return result.updated;
        } catch (error: any) {
            logger.error('Failed to complete assessment', { error: error.message, assessmentId });
            throw error instanceof NotFoundError || error instanceof ApiError ? error : handlePrismaError(error);
        }
    }

    private async generateAssessmentQuestionsFromTemplate(assessmentId: string, template: { version: string; sections: Array<{ questions: Array<{ questionKey: string; questionText: string; category: string; weight: number; evidenceRequired: boolean }> }> }) {
        const questions = template.sections.flatMap((section) =>
            section.questions.map((q) => ({
                assessmentId,
                questionId: q.questionKey,
                questionText: q.questionText,
                questionCategory: q.category,
                weight: q.weight,
                maxScore: 10,
                evidenceRequired: q.evidenceRequired || false,
            }))
        );

        await prisma.assessmentResponse.createMany({ data: questions });
        logger.info(`Generated ${questions.length} questions from template ${template.version}`);
    }

    /**
     * Generate assessment questions from template
     */
    private async generateAssessmentQuestions(assessmentId: string, frameworkUsed: string) {
        const assessment = await prisma.vendorAssessment.findUnique({ where: { id: assessmentId } });
        const template = await getActiveTemplate(assessment?.organizationId || '', frameworkUsed);
        await this.generateAssessmentQuestionsFromTemplate(assessmentId, template);
    }

    /**
     * Calculate assessment scores by category
     */
    private async calculateAssessmentScores(assessmentId: string) {
        const responses = await prisma.assessmentResponse.findMany({
            where: { assessmentId },
        });

        const calculateCategoryScore = (category: string) => {
            const categoryResponses = responses.filter(
                r => r.questionCategory === category && r.score !== null
            );
            if (categoryResponses.length === 0) return null;

            const totalScore = categoryResponses.reduce((sum, r) => sum + (r.score || 0), 0);
            const maxScore = categoryResponses.reduce((sum, r) => sum + r.maxScore, 0);

            return Math.round((totalScore / maxScore) * 100);
        };

        const security = calculateCategoryScore('Security');
        const privacy = calculateCategoryScore('Privacy');
        const compliance = calculateCategoryScore('Compliance');
        const operational = calculateCategoryScore('Operational');

        // Calculate overall score (weighted average)
        const categoriesWithScores = [security, privacy, compliance, operational].filter(
            s => s !== null
        ) as number[];
        const overall =
            categoriesWithScores.length > 0
                ? Math.round(
                      categoriesWithScores.reduce((sum, s) => sum + s, 0) /
                          categoriesWithScores.length
                  )
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
    private async identifyGaps(assessmentId: string) {
        const responses = await prisma.assessmentResponse.findMany({
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
            severity: r.score! <= 3 ? 'High' : 'Medium',
        }));
    }

    /**
     * Rule-based recommendations. AI analysis is a separate, labeled capability.
     */
    private async generateRecommendations(vendorId: string, gaps: any[]) {
        const recommendations = gaps.map(gap => {
            let recommendation = '';
            let priority = 'Medium';

            if (gap.category === 'Security') {
                recommendation = `Address security gap: ${gap.question}. Vendor should implement controls to improve from ${gap.score}/${gap.maxScore}.`;
                priority = gap.severity === 'High' ? 'High' : 'Medium';
            } else if (gap.category === 'Privacy') {
                recommendation = `Privacy concern identified: ${gap.question}. Request Data Processing Agreement and privacy documentation.`;
                priority = 'High';
            } else if (gap.category === 'Compliance') {
                recommendation = `Compliance gap: ${gap.question}. Obtain relevant certifications or attestations.`;
                priority = 'Medium';
            } else {
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
    private async updateVendorRiskScore(vendorId: string, assessmentScore: number) {
        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) return;
        const issues = await prisma.vendorIssue.findMany({
            where: { vendorId, status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING_VALIDATION'] } },
        });
        const result = calculateVendorRiskAt(
            {
                vendorCriticality: vendor.tier,
                dataSensitivityCount: vendor.dataTypesAccessed.length,
                regulatoryCount: vendor.regulatoryScope.length,
                hasSubcontractors: vendor.hasSubcontractors,
                controlMaturity: Math.round(assessmentScore / 20),
                questionScores: [{ score: assessmentScore, maxScore: 100, weight: 10 }],
                openFindings: issues.map((issue) => ({ severity: issue.severity })),
            },
            new Date()
        );
        await prisma.vendor.updateMany({
            where: { id: vendorId, organizationId: vendor.organizationId },
            data: {
                inherentRiskScore: result.inherentRisk,
                residualRiskScore: result.residualRisk,
                lastReviewDate: new Date(),
            },
        });
        await prisma.scoreCalculation.create({
            data: {
                organizationId: vendor.organizationId,
                vendorId,
                scoreVersion: result.scoreVersion,
                inherentRisk: result.inherentRisk,
                controlEffectiveness: result.controlEffectiveness,
                residualRisk: result.residualRisk,
                riskBand: result.riskBand,
                inputs: result.inputs as object,
                explanation: result.explanation,
                factors: result.factors as object,
            },
        });
        logger.info(`Updated vendor risk score using ${result.scoreVersion}`);
    }

    /**
     * Calculate response score based on answer
     */
    private calculateResponseScore(response: string): number | null {
        const lower = response.trim().toLowerCase();
        if (lower === 'not applicable' || lower === 'n/a' || lower.startsWith('not applicable')) {
            return null;
        }
        if (lower.startsWith('yes') || lower.includes('no exceptions') || lower.includes('type ii')) {
            return 9;
        }
        if (lower.startsWith('partial') || lower.startsWith('in progress') || lower.includes('outdated') || lower.includes('bridge')) {
            return 5;
        }
        if (lower.startsWith('no') || lower === 'unknown' || lower.startsWith('qualified')) {
            return 2;
        }
        return 5;
    }

    /**
     * Get assessment template (SIG, CAIQ, or Custom)
     */
    private getAssessmentTemplate(frameworkUsed: string): AssessmentTemplate {
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
                            question:
                                'Does the vendor maintain ISO 27001, SOC 2, or equivalent certification?',
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
                            question:
                                'Does the vendor have a documented Business Continuity Plan (BCP)?',
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
                            question:
                                'Has the vendor had any security breaches in the past 3 years?',
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
    async getOverdueAssessments(organizationId: string) {
        return await prisma.vendorAssessment.findMany({
            where: {
                organizationId,
                status: { in: [AssessmentStatus.NOT_STARTED, AssessmentStatus.IN_PROGRESS] },
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
    async getAssessmentMetrics(organizationId: string) {
        const [total, completed, overdue] = await Promise.all([
            prisma.vendorAssessment.count({ where: { organizationId } }),
            prisma.vendorAssessment.count({
                where: { organizationId, status: AssessmentStatus.COMPLETED },
            }),
            prisma.vendorAssessment.count({
                where: {
                    organizationId,
                    status: { in: [AssessmentStatus.NOT_STARTED, AssessmentStatus.IN_PROGRESS] },
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

export default new VendorAssessmentService();

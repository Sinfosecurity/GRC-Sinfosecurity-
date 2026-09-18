/**
 * Vendor Management Service (TPRM Core)
 * Enterprise-grade Third-Party Risk Management
 */

import { CriticalityLevel, Prisma, Vendor, VendorCategory, VendorTier, VendorStatus, VendorType } from '@prisma/client';
import { prisma } from '../config/database';
import { deriveAssessmentStatus } from './vendorAssessmentStatus';
import { handlePrismaError, NotFoundError, ValidationError, BusinessLogicError } from '../utils/errors';
import { ApiError } from '../middleware/errorHandler';
import logger from '../config/logger';
import { calculateVendorRiskAt } from './deterministicRiskEngine';
import { explainableRiskService } from './explainableRiskService';
import { recordAudit } from './auditEventService';
import { allocateVendorPublicId } from './vendorOnboardingService';
import { extractVendorDomain } from './vendorOnboardingScoring';
import { applyHardFloorToTier, assertLegacyUpdateMaySetTier, resolveMinimumTier } from './vendorTierIntegrity';

export interface CreateVendorInput {
    name: string;
    legalName?: string;
    vendorType: VendorType;
    category: string;
    tier: VendorTier;
    primaryContact: string;
    contactEmail: string;
    contactPhone?: string;
    website?: string;
    businessOwner?: string;
    relationshipOwner?: string;
    servicesProvided: string;
    contractValue?: number;
    currency?: string;
    dataTypesAccessed: string[];
    geographicFootprint: string[];
    regulatoryScope: string[];
    hasSubcontractors?: boolean;
    fourthParties?: any;
    organizationId: string;
}

export interface UpdateVendorInput {
    name?: string;
    legalName?: string;
    vendorType?: VendorType;
    category?: string;
    tier?: VendorTier;
    status?: VendorStatus;
    primaryContact?: string;
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
    businessOwner?: string;
    relationshipOwner?: string;
    servicesProvided?: string;
    contractValue?: number;
    currency?: string;
    dataTypesAccessed?: string[];
    geographicFootprint?: string[];
    regulatoryScope?: string[];
    hasSubcontractors?: boolean;
    fourthParties?: any;
    inherentRiskScore?: number;
    residualRiskScore?: number;
    lastReviewDate?: Date;
    nextReviewDate?: Date;
}

export interface VendorFilters {
    tier?: VendorTier;
    status?: VendorStatus;
    vendorType?: VendorType;
    category?: string;
    search?: string;
    hasOverdueReview?: boolean;
    minRiskScore?: number;
    maxRiskScore?: number;
}

function groupCount(value: number | { _all?: number } | undefined): number {
    if (typeof value === 'number') return value;
    return value?._all || 0;
}

class VendorManagementService {
    /**
     * Create a new vendor
     */
    async createVendor(data: CreateVendorInput): Promise<Vendor> {
        try {
            const tier = applyHardFloorToTier(
                data.tier,
                resolveMinimumTier({ dataTypesAccessed: data.dataTypesAccessed })
            );
            const inherentRiskScore = this.calculateInherentRisk(
                tier,
                data.dataTypesAccessed,
                data.hasSubcontractors || false
            );
            const nextReviewDate = this.calculateNextReviewDate(tier);

            const createData: Prisma.VendorUncheckedCreateInput = {
                publicId: await allocateVendorPublicId(data.organizationId),
                name: data.name,
                legalName: data.legalName,
                vendorType: data.vendorType,
                category: this.toVendorCategory(data.category),
                tier,
                primaryContact: data.primaryContact,
                contactEmail: data.contactEmail,
                contactPhone: data.contactPhone,
                website: data.website,
                domain: extractVendorDomain(data.website),
                businessOwner: data.businessOwner,
                relationshipOwner: data.relationshipOwner,
                servicesProvided: data.servicesProvided,
                contractValue: data.contractValue,
                currency: data.currency,
                dataTypesAccessed: data.dataTypesAccessed || [],
                geographicFootprint: data.geographicFootprint || [],
                regulatoryScope: data.regulatoryScope || [],
                hasSubcontractors: data.hasSubcontractors || false,
                fourthParties: data.fourthParties,
                organizationId: data.organizationId,
                inherentRiskScore,
                residualRiskScore: inherentRiskScore,
                nextReviewDate,
                status: VendorStatus.PROPOSED,
                criticalityLevel: this.mapTierToCriticality(tier),
            };

            const vendor = await prisma.vendor.create({
                data: createData,
            });
            await explainableRiskService.recalculate(vendor.organizationId, vendor.id);
            const scored = await prisma.vendor.findUnique({ where: { id: vendor.id } });

            logger.info(`Vendor created successfully`, { vendorId: vendor.id, vendorName: vendor.name, tier: vendor.tier });
            return scored || vendor;
        } catch (error: any) {
            logger.error('Failed to create vendor', { error: error.message, data });
            throw handlePrismaError(error);
        }
    }

    /**
     * Get vendor by ID with all relations
     */
    async getVendorById(vendorId: string, organizationId: string) {
        try {
            const vendor = await prisma.vendor.findFirst({
                where: {
                    id: vendorId,
                    organizationId,
                },
                include: {
                    assessments: {
                        where: { organizationId },
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                    },
                    contracts: {
                        where: { status: 'ACTIVE', organizationId },
                    },
                    issues: {
                        where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, organizationId },
                    },
                    documents: {
                        where: { organizationId },
                        orderBy: { uploadedAt: 'desc' },
                        take: 10,
                    },
                    contacts: true,
                    monitoringRecords: {
                        where: { requiresAction: true, organizationId },
                        orderBy: { detectedAt: 'desc' },
                        take: 5,
                    },
                    reviews: {
                        where: { organizationId },
                        orderBy: { reviewDate: 'desc' },
                        take: 3,
                    },
                },
            });

            if (!vendor) {
                throw new NotFoundError('Vendor', vendorId);
            }

            return vendor;
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Failed to fetch vendor', { error: error.message, vendorId, organizationId });
            throw handlePrismaError(error);
        }
    }

    /**
     * List vendors with filtering and pagination
     */
    async listVendors(
        organizationId: string,
        filters: VendorFilters = {},
        page: number = 1,
        pageSize: number = 20
    ) {
        const where: any = { organizationId };

        if (filters.tier) where.tier = filters.tier;
        if (filters.status) where.status = filters.status;
        if (filters.vendorType) where.vendorType = filters.vendorType;
        if (filters.category) where.category = filters.category;

        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { legalName: { contains: filters.search, mode: 'insensitive' } },
                { primaryContact: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        if (filters.hasOverdueReview) {
            where.nextReviewDate = { lt: new Date() };
        }

        if (filters.minRiskScore !== undefined) {
            where.residualRiskScore = { gte: filters.minRiskScore };
        }

        if (filters.maxRiskScore !== undefined) {
            where.residualRiskScore = {
                ...where.residualRiskScore,
                lte: filters.maxRiskScore,
            };
        }

        const [vendors, total] = await Promise.all([
            prisma.vendor.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: [
                    { tier: 'asc' }, // Critical first
                    { residualRiskScore: 'desc' },
                    { name: 'asc' },
                ],
                include: {
                    assessments: {
                        where: { organizationId },
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: { status: true, dueDate: true, completedAt: true },
                    },
                    _count: {
                        select: {
                            assessments: { where: { organizationId } },
                            issues: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, organizationId } },
                            contracts: { where: { status: 'ACTIVE', organizationId } },
                        },
                    },
                },
            }),
            prisma.vendor.count({ where }),
        ]);

        return {
            vendors: vendors.map((vendor) => ({
                ...vendor,
                assessmentStatus: deriveAssessmentStatus(vendor.assessments[0]),
            })),
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        };
    }

    /**
     * Update vendor
     */
    async updateVendor(
        vendorId: string,
        organizationId: string,
        data: UpdateVendorInput
    ): Promise<Vendor> {
        const existing = await prisma.vendor.findFirst({
            where: { id: vendorId, organizationId },
        });
        if (!existing) {
            throw new NotFoundError('Vendor', vendorId);
        }
        const {
            inherentRiskScore: _clientInherent,
            residualRiskScore: _clientResidual,
            status: _clientStatus,
            tier: requestedTier,
            ...safeData
        } = data as UpdateVendorInput & { status?: unknown };
        void _clientStatus;
        void _clientInherent;
        void _clientResidual;

        let additionalData: Prisma.VendorUncheckedUpdateManyInput = {};
        if (requestedTier) {
            const onboarding = await prisma.vendorOnboarding.findUnique({
                where: { vendorId },
                select: { hardFloors: true },
            });
            assertLegacyUpdateMaySetTier(Boolean(onboarding));
            const floors = Array.isArray(onboarding?.hardFloors) ? onboarding.hardFloors as Array<{ applies?: boolean }> : [];
            const tier = applyHardFloorToTier(
                requestedTier,
                resolveMinimumTier({
                    hardFloors: floors,
                    dataTypesAccessed: data.dataTypesAccessed || existing.dataTypesAccessed,
                })
            );
            additionalData.tier = tier;
            additionalData.nextReviewDate = this.calculateNextReviewDate(tier);
            additionalData.criticalityLevel = this.mapTierToCriticality(tier);
            data.tier = tier;
        }

        const { category, ...safeWithoutCategory } = safeData;
        await prisma.vendor.updateMany({
            where: {
                id: vendorId,
                organizationId,
            },
            data: {
                ...safeWithoutCategory,
                ...(category ? { category: this.toVendorCategory(category) } : {}),
                ...additionalData,
                updatedAt: new Date(),
            },
        });

        await recordAudit({
            organizationId,
            action: 'vendor.update',
            resourceType: 'Vendor',
            resourceId: vendorId,
            result: 'success',
            metadata: { status: data.status, tier: data.tier },
        });

        if (data.tier && data.tier !== existing.tier) {
            await explainableRiskService.recalculate(organizationId, vendorId);
        }

        logger.info(`Updated vendor: ${vendorId}`);
        return await this.getVendorById(vendorId, organizationId) as Vendor;
    }

    /**
     * Delete vendor (soft delete by setting status to TERMINATED)
     */
    async deleteVendor(vendorId: string, organizationId: string): Promise<void> {
        const existing = await prisma.vendor.findFirst({
            where: { id: vendorId, organizationId },
        });
        if (!existing) {
            throw new NotFoundError('Vendor', vendorId);
        }
        await prisma.vendor.updateMany({
            where: {
                id: vendorId,
                organizationId,
            },
            data: {
                status: VendorStatus.TERMINATED,
                terminatedAt: new Date(),
            },
        });

        logger.info(`Terminated vendor: ${vendorId}`);
    }

    /**
     * Get vendor dashboard statistics
     */
    async getVendorStatistics(organizationId: string) {
        const inRegister = { organizationId, status: { not: VendorStatus.TERMINATED } };
        const [
            totalVendors,
            activeVendors,
            criticalVendors,
            highRiskVendors,
            overdueReviews,
            activeIssues,
            expiringContracts,
            tierDistribution,
            categoryDistribution,
            riskScores,
        ] = await Promise.all([
            prisma.vendor.count({ where: { organizationId } }),
            prisma.vendor.count({
                where: { organizationId, status: VendorStatus.ACTIVE },
            }),
            prisma.vendor.count({
                where: { organizationId, tier: VendorTier.CRITICAL, status: { not: VendorStatus.TERMINATED } },
            }),
            prisma.vendor.count({
                where: { organizationId, residualRiskScore: { gte: 70 }, status: { not: VendorStatus.TERMINATED } },
            }),
            prisma.vendor.count({
                where: {
                    organizationId,
                    nextReviewDate: { lt: new Date() },
                    status: VendorStatus.ACTIVE,
                },
            }),
            prisma.vendorIssue.count({
                where: {
                    organizationId,
                    status: { in: ['OPEN', 'IN_PROGRESS'] },
                },
            }),
            prisma.vendorContract.count({
                where: {
                    organizationId,
                    status: 'ACTIVE',
                    expirationDate: {
                        lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
                    },
                },
            }),
            prisma.vendor.groupBy({
                by: ['tier'],
                where: inRegister,
                _count: true,
            }),
            prisma.vendor.groupBy({
                by: ['category'],
                where: inRegister,
                _count: true,
            }),
            prisma.vendor.aggregate({
                where: inRegister,
                _avg: {
                    inherentRiskScore: true,
                    residualRiskScore: true,
                },
            }),
        ]);

        return {
            summary: {
                totalVendors,
                activeVendors,
                criticalVendors,
                highRiskVendors,
                overdueReviews,
                activeIssues,
                expiringContracts,
            },
            averageRiskScore: riskScores._avg.residualRiskScore || 0,
            averageInherentRisk: riskScores._avg.inherentRiskScore || 0,
            tierDistribution: tierDistribution.map(t => ({
                tier: t.tier,
                count: groupCount(t._count),
            })),
            tierCounts: {
                CRITICAL: groupCount(tierDistribution.find((t) => t.tier === VendorTier.CRITICAL)?._count),
                HIGH: groupCount(tierDistribution.find((t) => t.tier === VendorTier.HIGH)?._count),
                MEDIUM: groupCount(tierDistribution.find((t) => t.tier === VendorTier.MEDIUM)?._count),
                LOW: groupCount(tierDistribution.find((t) => t.tier === VendorTier.LOW)?._count),
                Critical: groupCount(tierDistribution.find((t) => t.tier === VendorTier.CRITICAL)?._count),
                High: groupCount(tierDistribution.find((t) => t.tier === VendorTier.HIGH)?._count),
                Medium: groupCount(tierDistribution.find((t) => t.tier === VendorTier.MEDIUM)?._count),
                Low: groupCount(tierDistribution.find((t) => t.tier === VendorTier.LOW)?._count),
            },
            categoryDistribution: categoryDistribution.map(c => ({
                category: c.category,
                count: c._count,
            })),
        };
    }

    /**
     * Get vendors requiring attention
     */
    async getVendorsRequiringAttention(organizationId: string) {
        const today = new Date();
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Overdue reviews
        const overdueReviews = await prisma.vendor.findMany({
            where: {
                organizationId,
                status: VendorStatus.ACTIVE,
                nextReviewDate: { lt: today },
            },
            select: {
                id: true,
                name: true,
                tier: true,
                nextReviewDate: true,
                residualRiskScore: true,
            },
            orderBy: { tier: 'asc' },
        });

        // Upcoming reviews
        const upcomingReviews = await prisma.vendor.findMany({
            where: {
                organizationId,
                status: VendorStatus.ACTIVE,
                nextReviewDate: { gte: today, lte: thirtyDaysFromNow },
            },
            select: {
                id: true,
                name: true,
                tier: true,
                nextReviewDate: true,
            },
            orderBy: { nextReviewDate: 'asc' },
        });

        // High-risk vendors with open issues
        const highRiskWithIssues = await prisma.vendor.findMany({
            where: {
                organizationId,
                residualRiskScore: { gte: 70 },
                issues: {
                    some: {
                        status: { in: ['OPEN', 'IN_PROGRESS'] },
                    },
                },
            },
            include: {
                issues: {
                    where: {
                        status: { in: ['OPEN', 'IN_PROGRESS'] },
                    },
                },
            },
        });

        // Vendors with critical monitoring alerts
        const criticalAlerts = await prisma.vendorMonitoring.findMany({
            where: {
                organizationId,
                requiresAction: true,
                riskLevel: 'Critical',
            },
            include: {
                vendor: {
                    select: {
                        id: true,
                        name: true,
                        tier: true,
                    },
                },
            },
            orderBy: { detectedAt: 'desc' },
        });

        return {
            overdueReviews,
            upcomingReviews,
            highRiskWithIssues,
            criticalAlerts,
        };
    }

    /**
     * Calculate inherent risk score based on multiple factors
     */
    private calculateInherentRisk(
        tier: VendorTier,
        dataTypes: string[],
        hasSubcontractors: boolean
    ): number {
        const sensitiveDataTypes = ['PII', 'PHI', 'PCI', 'Financial', 'IP'];
        const sensitiveCount = dataTypes.filter((dt) => sensitiveDataTypes.includes(dt)).length;
        return calculateVendorRiskAt(
            {
                vendorCriticality: tier,
                dataSensitivityCount: sensitiveCount,
                hasSubcontractors,
            },
            new Date()
        ).inherentRisk;
    }

    /**
     * Calculate next review date based on tier
     */
    private calculateNextReviewDate(tier: VendorTier): Date {
        const today = new Date();
        let months = 12; // Default annual

        switch (tier) {
            case VendorTier.CRITICAL:
                months = 3; // Quarterly
                break;
            case VendorTier.HIGH:
                months = 6; // Semi-annual
                break;
            case VendorTier.MEDIUM:
                months = 12; // Annual
                break;
            case VendorTier.LOW:
                months = 24; // Biennial
                break;
        }

        return new Date(today.setMonth(today.getMonth() + months));
    }

    /**
     * Map tier to criticality level
     */
    private toVendorCategory(value: string): VendorCategory {
        return (Object.values(VendorCategory) as string[]).includes(value)
            ? (value as VendorCategory)
            : VendorCategory.OTHER;
    }

    private mapTierToCriticality(tier: VendorTier): CriticalityLevel {
        switch (tier) {
            case VendorTier.CRITICAL:
                return CriticalityLevel.CRITICAL;
            case VendorTier.HIGH:
                return CriticalityLevel.HIGH;
            case VendorTier.MEDIUM:
                return CriticalityLevel.MEDIUM;
            case VendorTier.LOW:
                return CriticalityLevel.LOW;
            default:
                return CriticalityLevel.MEDIUM;
        }
    }

    /**
     * Approve vendor (change status from PROPOSED to APPROVED)
     */
    async approveVendor(vendorId: string, organizationId: string, approvedBy: string, input: { decision?: string; conditions?: string; rationale?: string } = {}) {
        const actor = await prisma.user.findFirst({ where: { id: approvedBy, organizationId }, select: { id: true, role: true, firstName: true, lastName: true } });
        if (!actor) throw new ApiError(403, 'Only an authorized reviewer can record this decision.');
        const { decideApproval } = await import('./vendorLifecycleClosureService');
        return decideApproval(organizationId, vendorId, {
            id: actor.id,
            role: actor.role,
            name: `${actor.firstName || ''} ${actor.lastName || ''}`.trim(),
        }, {
            decision: (input.decision as 'APPROVE' | 'REJECT' | 'APPROVE_WITH_CONDITIONS') || 'APPROVE',
            conditions: input.conditions,
            rationale: input.rationale,
        });
    }

    /**
     * Onboard vendor (change status from APPROVED to ACTIVE)
     */
    async onboardVendor(vendorId: string, organizationId: string, actorUserId?: string) {
        const actor = actorUserId
            ? await prisma.user.findFirst({ where: { id: actorUserId, organizationId }, select: { id: true, role: true, firstName: true, lastName: true } })
            : null;
        if (!actor) throw new ApiError(403, 'Only a risk reviewer can activate a vendor.');
        const { activateVendor } = await import('./vendorLifecycleClosureService');
        return activateVendor(organizationId, vendorId, {
            id: actor.id,
            role: actor.role,
            name: `${actor.firstName || ''} ${actor.lastName || ''}`.trim(),
        });
    }

    /**
     * Offboard vendor - comprehensive exit process
     */
    async offboardVendor(
        vendorId: string,
        organizationId: string,
        offboardingData: {
            dataReturned: boolean;
            dataDestroyed: boolean;
            accessRevoked: boolean;
            exitNotes?: string;
        }
    ) {
        try {
            const existing = await prisma.vendor.findFirst({
                where: { id: vendorId, organizationId },
                select: { id: true },
            });
            if (!existing) {
                throw new NotFoundError('Vendor', vendorId);
            }
            await prisma.$transaction(async (tx) => {
                const openIssues = await tx.vendorIssue.count({
                    where: {
                        vendorId,
                        organizationId,
                        status: { in: ['OPEN', 'IN_PROGRESS'] },
                    },
                });

                if (openIssues > 0) {
                    throw new BusinessLogicError(
                        `Cannot offboard vendor with ${openIssues} open issues. Please resolve or accept risks first.`,
                        { openIssues }
                    );
                }

                // Update vendor status
                await tx.vendor.updateMany({
                    where: { id: vendorId, organizationId },
                    data: {
                        status: VendorStatus.TERMINATED,
                        terminatedAt: new Date(),
                        updatedAt: new Date(),
                    },
                });

                // Close all monitoring records
                await tx.vendorMonitoring.updateMany({
                    where: { vendorId, acknowledgedAt: null },
                    data: { acknowledgedAt: new Date() },
                });

                // Create offboarding review record
                await tx.vendorReview.create({
                    data: {
                        vendorId,
                        organizationId,
                        reviewType: 'OFFBOARDING_REVIEW',
                        reviewDate: new Date(),
                        reviewer: 'system',
                        decision: 'TERMINATE',
                        notes: offboardingData.exitNotes,
                        findings: {
                            dataReturned: offboardingData.dataReturned,
                            dataDestroyed: offboardingData.dataDestroyed,
                            accessRevoked: offboardingData.accessRevoked,
                            completedAt: new Date(),
                        },
                    },
                });
            });

            logger.info('Vendor offboarded successfully', { vendorId, organizationId });
        } catch (error: any) {
            logger.error('Failed to offboard vendor', { error: error.message, vendorId });
            throw error instanceof BusinessLogicError || error instanceof NotFoundError
                ? error
                : handlePrismaError(error);
        }
    }
}

export default new VendorManagementService();

/**
 * Vendor Management Service (TPRM Core)
 * Enterprise-grade Third-Party Risk Management
 */

import { Vendor, VendorTier, VendorStatus, VendorType } from '@prisma/client';
import { prisma } from '../config/database';
import { handlePrismaError, NotFoundError, ValidationError, BusinessLogicError } from '../utils/errors';
import logger from '../config/logger';

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

class VendorManagementService {
    /**
     * Create a new vendor
     */
    async createVendor(data: CreateVendorInput): Promise<Vendor> {
        try {
            // Calculate initial inherent risk score based on tier and data access
            const inherentRiskScore = this.calculateInherentRisk(
                data.tier,
                data.dataTypesAccessed,
                data.hasSubcontractors || false
            );

            // Calculate next review date based on tier
            const nextReviewDate = this.calculateNextReviewDate(data.tier);

            const vendor = await prisma.vendor.create({
                data: {
                    ...data,
                    inherentRiskScore,
                    residualRiskScore: inherentRiskScore, // Initially same as inherent
                    nextReviewDate,
                    status: VendorStatus.PROPOSED,
                    criticalityLevel: this.mapTierToCriticality(data.tier) as any,
                },
            });

            logger.info(`Vendor created successfully`, { vendorId: vendor.id, vendorName: vendor.name, tier: vendor.tier });
            return vendor;
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
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                    },
                    contracts: {
                        where: { status: 'ACTIVE' },
                    },
                    issues: {
                        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
                    },
                    documents: {
                        orderBy: { uploadedAt: 'desc' },
                        take: 10,
                    },
                    contacts: true,
                    monitoringRecords: {
                        where: { requiresAction: true },
                        orderBy: { detectedAt: 'desc' },
                        take: 5,
                    },
                    reviews: {
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
                    _count: {
                        select: {
                            assessments: true,
                            issues: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
                            contracts: { where: { status: 'ACTIVE' } },
                        },
                    },
                },
            }),
            prisma.vendor.count({ where }),
        ]);

        return {
            vendors,
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
        // If tier is changing, recalculate review date
        let additionalData: any = {};
        if (data.tier) {
            additionalData.nextReviewDate = this.calculateNextReviewDate(data.tier);
            additionalData.criticalityLevel = this.mapTierToCriticality(data.tier);
        }

        const vendor = await prisma.vendor.updateMany({
            where: {
                id: vendorId,
                organizationId,
            },
            data: {
                ...data,
                ...additionalData,
                updatedAt: new Date(),
            },
        });

        logger.info(`✅ Updated vendor: ${vendorId}`);
        return await this.getVendorById(vendorId, organizationId) as Vendor;
    }

    /**
     * Delete vendor (soft delete by setting status to TERMINATED)
     */
    async deleteVendor(vendorId: string, organizationId: string): Promise<void> {
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

        logger.info(`✅ Terminated vendor: ${vendorId}`);
    }

    /**
     * Get vendor dashboard statistics
     */
    async getVendorStatistics(organizationId: string) {
        const [
            totalVendors,
            activeVendors,
            criticalVendors,
            highRiskVendors,
            overdueReviews,
            activeIssues,
            expiringContracts,
        ] = await Promise.all([
            prisma.vendor.count({ where: { organizationId } }),
            prisma.vendor.count({
                where: { organizationId, status: VendorStatus.ACTIVE },
            }),
            prisma.vendor.count({
                where: { organizationId, tier: VendorTier.CRITICAL },
            }),
            prisma.vendor.count({
                where: { organizationId, residualRiskScore: { gte: 70 } },
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
        ]);

        // Tier distribution
        const tierDistribution = await prisma.vendor.groupBy({
            by: ['tier'],
            where: { organizationId, status: VendorStatus.ACTIVE },
            _count: true,
        });

        // Category distribution
        const categoryDistribution = await prisma.vendor.groupBy({
            by: ['category'],
            where: { organizationId, status: VendorStatus.ACTIVE },
            _count: true,
        });

        // Average risk scores
        const riskScores = await prisma.vendor.aggregate({
            where: { organizationId, status: VendorStatus.ACTIVE },
            _avg: {
                inherentRiskScore: true,
                residualRiskScore: true,
            },
        });

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
                count: t._count,
            })),
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
        let score = 0;

        // Base score by tier
        switch (tier) {
            case VendorTier.CRITICAL:
                score = 80;
                break;
            case VendorTier.HIGH:
                score = 60;
                break;
            case VendorTier.MEDIUM:
                score = 40;
                break;
            case VendorTier.LOW:
                score = 20;
                break;
        }

        // Add points for sensitive data
        const sensitiveDataTypes = ['PII', 'PHI', 'PCI', 'Financial', 'IP'];
        const sensitiveCount = dataTypes.filter(dt =>
            sensitiveDataTypes.includes(dt)
        ).length;
        score += sensitiveCount * 3;

        // Add points for subcontractors (fourth-party risk)
        if (hasSubcontractors) {
            score += 10;
        }

        return Math.min(score, 100); // Cap at 100
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
    private mapTierToCriticality(tier: VendorTier): string {
        switch (tier) {
            case VendorTier.CRITICAL:
                return 'CRITICAL';
            case VendorTier.HIGH:
                return 'HIGH';
            case VendorTier.MEDIUM:
                return 'MEDIUM';
            case VendorTier.LOW:
                return 'LOW';
            default:
                return 'MEDIUM';
        }
    }

    /**
     * Approve vendor (change status from PROPOSED to APPROVED)
     */
    async approveVendor(vendorId: string, organizationId: string, approvedBy: string) {
        return await prisma.vendor.updateMany({
            where: { id: vendorId, organizationId },
            data: {
                status: VendorStatus.APPROVED,
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Onboard vendor (change status from APPROVED to ACTIVE)
     */
    async onboardVendor(vendorId: string, organizationId: string) {
        return await prisma.vendor.updateMany({
            where: { id: vendorId, organizationId },
            data: {
                status: VendorStatus.ACTIVE,
                onboardedAt: new Date(),
                updatedAt: new Date(),
            },
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
            // Use transaction to ensure atomicity
            await prisma.$transaction(async (tx) => {
                // Check for open issues
                const openIssues = await tx.vendorIssue.count({
                    where: {
                        vendorId,
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
            throw error instanceof BusinessLogicError ? error : handlePrismaError(error);
        }
    }
}

export default new VendorManagementService();

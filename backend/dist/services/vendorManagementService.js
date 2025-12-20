"use strict";
/**
 * Vendor Management Service (TPRM Core)
 * Enterprise-grade Third-Party Risk Management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../config/logger"));
class VendorManagementService {
    /**
     * Create a new vendor
     */
    async createVendor(data) {
        try {
            // Calculate initial inherent risk score based on tier and data access
            const inherentRiskScore = this.calculateInherentRisk(data.tier, data.dataTypesAccessed, data.hasSubcontractors || false);
            // Calculate next review date based on tier
            const nextReviewDate = this.calculateNextReviewDate(data.tier);
            const vendor = await database_1.prisma.vendor.create({
                data: {
                    ...data,
                    inherentRiskScore,
                    residualRiskScore: inherentRiskScore, // Initially same as inherent
                    nextReviewDate,
                    status: client_1.VendorStatus.PROPOSED,
                    criticalityLevel: this.mapTierToCriticality(data.tier),
                },
            });
            logger_1.default.info(`Vendor created successfully`, { vendorId: vendor.id, vendorName: vendor.name, tier: vendor.tier });
            return vendor;
        }
        catch (error) {
            logger_1.default.error('Failed to create vendor', { error: error.message, data });
            throw (0, errors_1.handlePrismaError)(error);
        }
    }
    /**
     * Get vendor by ID with all relations
     */
    async getVendorById(vendorId, organizationId) {
        try {
            const vendor = await database_1.prisma.vendor.findFirst({
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
                throw new errors_1.NotFoundError('Vendor', vendorId);
            }
            return vendor;
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                throw error;
            }
            logger_1.default.error('Failed to fetch vendor', { error: error.message, vendorId, organizationId });
            throw (0, errors_1.handlePrismaError)(error);
        }
    }
    /**
     * List vendors with filtering and pagination
     */
    async listVendors(organizationId, filters = {}, page = 1, pageSize = 20) {
        const where = { organizationId };
        if (filters.tier)
            where.tier = filters.tier;
        if (filters.status)
            where.status = filters.status;
        if (filters.vendorType)
            where.vendorType = filters.vendorType;
        if (filters.category)
            where.category = filters.category;
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
            database_1.prisma.vendor.findMany({
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
            database_1.prisma.vendor.count({ where }),
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
    async updateVendor(vendorId, organizationId, data) {
        // If tier is changing, recalculate review date
        let additionalData = {};
        if (data.tier) {
            additionalData.nextReviewDate = this.calculateNextReviewDate(data.tier);
            additionalData.criticalityLevel = this.mapTierToCriticality(data.tier);
        }
        const vendor = await database_1.prisma.vendor.updateMany({
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
        logger_1.default.info(`✅ Updated vendor: ${vendorId}`);
        return await this.getVendorById(vendorId, organizationId);
    }
    /**
     * Delete vendor (soft delete by setting status to TERMINATED)
     */
    async deleteVendor(vendorId, organizationId) {
        await database_1.prisma.vendor.updateMany({
            where: {
                id: vendorId,
                organizationId,
            },
            data: {
                status: client_1.VendorStatus.TERMINATED,
                terminatedAt: new Date(),
            },
        });
        logger_1.default.info(`✅ Terminated vendor: ${vendorId}`);
    }
    /**
     * Get vendor dashboard statistics
     */
    async getVendorStatistics(organizationId) {
        const [totalVendors, activeVendors, criticalVendors, highRiskVendors, overdueReviews, activeIssues, expiringContracts,] = await Promise.all([
            database_1.prisma.vendor.count({ where: { organizationId } }),
            database_1.prisma.vendor.count({
                where: { organizationId, status: client_1.VendorStatus.ACTIVE },
            }),
            database_1.prisma.vendor.count({
                where: { organizationId, tier: client_1.VendorTier.CRITICAL },
            }),
            database_1.prisma.vendor.count({
                where: { organizationId, residualRiskScore: { gte: 70 } },
            }),
            database_1.prisma.vendor.count({
                where: {
                    organizationId,
                    nextReviewDate: { lt: new Date() },
                    status: client_1.VendorStatus.ACTIVE,
                },
            }),
            database_1.prisma.vendorIssue.count({
                where: {
                    organizationId,
                    status: { in: ['OPEN', 'IN_PROGRESS'] },
                },
            }),
            database_1.prisma.vendorContract.count({
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
        const tierDistribution = await database_1.prisma.vendor.groupBy({
            by: ['tier'],
            where: { organizationId, status: client_1.VendorStatus.ACTIVE },
            _count: true,
        });
        // Category distribution
        const categoryDistribution = await database_1.prisma.vendor.groupBy({
            by: ['category'],
            where: { organizationId, status: client_1.VendorStatus.ACTIVE },
            _count: true,
        });
        // Average risk scores
        const riskScores = await database_1.prisma.vendor.aggregate({
            where: { organizationId, status: client_1.VendorStatus.ACTIVE },
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
    async getVendorsRequiringAttention(organizationId) {
        const today = new Date();
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        // Overdue reviews
        const overdueReviews = await database_1.prisma.vendor.findMany({
            where: {
                organizationId,
                status: client_1.VendorStatus.ACTIVE,
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
        const upcomingReviews = await database_1.prisma.vendor.findMany({
            where: {
                organizationId,
                status: client_1.VendorStatus.ACTIVE,
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
        const highRiskWithIssues = await database_1.prisma.vendor.findMany({
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
        const criticalAlerts = await database_1.prisma.vendorMonitoring.findMany({
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
    calculateInherentRisk(tier, dataTypes, hasSubcontractors) {
        let score = 0;
        // Base score by tier
        switch (tier) {
            case client_1.VendorTier.CRITICAL:
                score = 80;
                break;
            case client_1.VendorTier.HIGH:
                score = 60;
                break;
            case client_1.VendorTier.MEDIUM:
                score = 40;
                break;
            case client_1.VendorTier.LOW:
                score = 20;
                break;
        }
        // Add points for sensitive data
        const sensitiveDataTypes = ['PII', 'PHI', 'PCI', 'Financial', 'IP'];
        const sensitiveCount = dataTypes.filter(dt => sensitiveDataTypes.includes(dt)).length;
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
    calculateNextReviewDate(tier) {
        const today = new Date();
        let months = 12; // Default annual
        switch (tier) {
            case client_1.VendorTier.CRITICAL:
                months = 3; // Quarterly
                break;
            case client_1.VendorTier.HIGH:
                months = 6; // Semi-annual
                break;
            case client_1.VendorTier.MEDIUM:
                months = 12; // Annual
                break;
            case client_1.VendorTier.LOW:
                months = 24; // Biennial
                break;
        }
        return new Date(today.setMonth(today.getMonth() + months));
    }
    /**
     * Map tier to criticality level
     */
    mapTierToCriticality(tier) {
        switch (tier) {
            case client_1.VendorTier.CRITICAL:
                return 'CRITICAL';
            case client_1.VendorTier.HIGH:
                return 'HIGH';
            case client_1.VendorTier.MEDIUM:
                return 'MEDIUM';
            case client_1.VendorTier.LOW:
                return 'LOW';
            default:
                return 'MEDIUM';
        }
    }
    /**
     * Approve vendor (change status from PROPOSED to APPROVED)
     */
    async approveVendor(vendorId, organizationId, approvedBy) {
        return await database_1.prisma.vendor.updateMany({
            where: { id: vendorId, organizationId },
            data: {
                status: client_1.VendorStatus.APPROVED,
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Onboard vendor (change status from APPROVED to ACTIVE)
     */
    async onboardVendor(vendorId, organizationId) {
        return await database_1.prisma.vendor.updateMany({
            where: { id: vendorId, organizationId },
            data: {
                status: client_1.VendorStatus.ACTIVE,
                onboardedAt: new Date(),
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Offboard vendor - comprehensive exit process
     */
    async offboardVendor(vendorId, organizationId, offboardingData) {
        try {
            // Use transaction to ensure atomicity
            await database_1.prisma.$transaction(async (tx) => {
                // Check for open issues
                const openIssues = await tx.vendorIssue.count({
                    where: {
                        vendorId,
                        status: { in: ['OPEN', 'IN_PROGRESS'] },
                    },
                });
                if (openIssues > 0) {
                    throw new errors_1.BusinessLogicError(`Cannot offboard vendor with ${openIssues} open issues. Please resolve or accept risks first.`, { openIssues });
                }
                // Update vendor status
                await tx.vendor.updateMany({
                    where: { id: vendorId, organizationId },
                    data: {
                        status: client_1.VendorStatus.TERMINATED,
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
            logger_1.default.info('Vendor offboarded successfully', { vendorId, organizationId });
        }
        catch (error) {
            logger_1.default.error('Failed to offboard vendor', { error: error.message, vendorId });
            throw error instanceof errors_1.BusinessLogicError ? error : (0, errors_1.handlePrismaError)(error);
        }
    }
}
exports.default = new VendorManagementService();
//# sourceMappingURL=vendorManagementService.js.map
"use strict";
/**
 * Risk Appetite Monitoring Service
 * Tracks and alerts on risk appetite thresholds for SOC 2 / ISO 27001 compliance
 *
 * SOC 2 TSC CC3.3: Entity establishes and monitors risk tolerance
 * ISO 27001 Clause 6.1.2: Risk assessment process includes risk acceptance criteria
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const logger_1 = __importDefault(require("../config/logger"));
const prisma = new client_1.PrismaClient();
class RiskAppetiteService {
    /**
     * Create a new risk appetite threshold
     */
    async createRiskAppetite(data) {
        logger_1.default.info(`Creating risk appetite for organization ${data.organizationId}, category: ${data.category}`);
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + data.reviewFrequency);
        const riskAppetite = await prisma.riskAppetite.create({
            data: {
                organizationId: data.organizationId,
                category: data.category,
                subcategory: data.subcategory,
                appetiteStatement: data.appetiteStatement,
                quantitativeThreshold: data.quantitativeThreshold,
                qualitativeThreshold: data.qualitativeThreshold,
                riskTolerance: data.riskTolerance,
                earlyWarningThreshold: data.earlyWarningThreshold,
                approvedBy: data.approvedBy,
                approvalDate: data.approvalDate,
                reviewFrequency: data.reviewFrequency,
                nextReviewDate,
                rationaleDocument: data.rationaleDocument,
                boardApprovalEvidence: data.boardApprovalEvidence,
            },
        });
        logger_1.default.info(`Risk appetite created: ${riskAppetite.id}`);
        return riskAppetite;
    }
    /**
     * Update risk appetite threshold
     */
    async updateRiskAppetite(id, organizationId, data) {
        logger_1.default.info(`Updating risk appetite ${id}`);
        const riskAppetite = await prisma.riskAppetite.update({
            where: { id, organizationId },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
        logger_1.default.info(`Risk appetite updated: ${id}`);
        return riskAppetite;
    }
    /**
     * Calculate current risk level for a category
     */
    async calculateCurrentRiskLevel(organizationId, category) {
        logger_1.default.info(`Calculating current risk level for ${category}`);
        // For Third Party Risk, aggregate vendor risk scores
        if (category === 'Third Party Risk' || category === 'Vendor Risk') {
            const vendors = await prisma.vendor.findMany({
                where: {
                    organizationId,
                    status: { not: 'TERMINATED' },
                },
                include: {
                    assessments: {
                        where: { status: 'COMPLETED' },
                        orderBy: { updatedAt: 'desc' },
                        take: 1,
                    },
                },
            });
            if (vendors.length === 0)
                return 0;
            // Calculate weighted average risk score
            let totalRisk = 0;
            let totalWeight = 0;
            for (const vendor of vendors) {
                const assessment = vendor.assessments[0];
                if (assessment && assessment.overallScore) {
                    const weight = this.getVendorWeight(vendor.tier);
                    totalRisk += assessment.overallScore * weight;
                    totalWeight += weight;
                }
            }
            return totalWeight > 0 ? totalRisk / totalWeight : 0;
        }
        // For other risk categories, aggregate from Risk table
        const risks = await prisma.risk.findMany({
            where: {
                organizationId,
                category: category,
                status: { not: 'CLOSED' },
            },
        });
        if (risks.length === 0)
            return 0;
        const avgRiskScore = risks.reduce((sum, r) => sum + r.riskScore, 0) / risks.length;
        return avgRiskScore;
    }
    /**
     * Get vendor weight based on tier (for risk calculations)
     */
    getVendorWeight(tier) {
        const weights = {
            CRITICAL: 3.0,
            HIGH: 2.0,
            MEDIUM: 1.0,
            LOW: 0.5,
        };
        return weights[tier] || 1.0;
    }
    /**
     * Monitor risk appetite and detect breaches
     */
    async monitorRiskAppetite(riskAppetiteId, organizationId) {
        logger_1.default.info(`Monitoring risk appetite ${riskAppetiteId}`);
        const riskAppetite = await prisma.riskAppetite.findUnique({
            where: { id: riskAppetiteId, organizationId },
        });
        if (!riskAppetite) {
            throw new Error('Risk appetite not found');
        }
        // Calculate current risk level
        const currentRiskLevel = await this.calculateCurrentRiskLevel(organizationId, riskAppetite.category);
        // Update current risk level
        let breachStatus = riskAppetite.breachStatus;
        if (currentRiskLevel >= riskAppetite.riskTolerance) {
            breachStatus = 'CRITICAL_BREACH';
        }
        else if (currentRiskLevel >= riskAppetite.riskTolerance * 0.9) {
            breachStatus = 'BREACH';
        }
        else if (currentRiskLevel >= riskAppetite.earlyWarningThreshold) {
            breachStatus = 'APPROACHING_LIMIT';
        }
        else {
            breachStatus = 'WITHIN_APPETITE';
        }
        await prisma.riskAppetite.update({
            where: { id: riskAppetiteId },
            data: {
                currentRiskLevel,
                breachStatus,
                lastCalculated: new Date(),
            },
        });
        // Trigger breach if needed
        if (breachStatus === 'BREACH' || breachStatus === 'CRITICAL_BREACH') {
            await this.recordBreach({
                riskAppetiteId,
                breachType: breachStatus === 'CRITICAL_BREACH' ? 'Tolerance Exceeded' : 'Threshold Breach',
                actualRiskLevel: currentRiskLevel,
                triggerEvent: `Risk level ${currentRiskLevel.toFixed(2)} exceeded ${breachStatus === 'CRITICAL_BREACH' ? 'tolerance' : 'threshold'} of ${riskAppetite.riskTolerance}`,
                contributingFactors: [],
            });
        }
        logger_1.default.info(`Risk appetite ${riskAppetiteId} status: ${breachStatus}, level: ${currentRiskLevel}`);
        return { currentRiskLevel, breachStatus };
    }
    /**
     * Monitor all risk appetites for an organization
     */
    async monitorAllRiskAppetites(organizationId) {
        logger_1.default.info(`Monitoring all risk appetites for organization ${organizationId}`);
        const riskAppetites = await prisma.riskAppetite.findMany({
            where: { organizationId },
        });
        const results = [];
        for (const appetite of riskAppetites) {
            const result = await this.monitorRiskAppetite(appetite.id, organizationId);
            results.push({
                id: appetite.id,
                category: appetite.category,
                ...result,
            });
        }
        return results;
    }
    /**
     * Record a risk appetite breach
     */
    async recordBreach(data) {
        logger_1.default.warn(`Recording risk appetite breach for ${data.riskAppetiteId}: ${data.breachType}`);
        const riskAppetite = await prisma.riskAppetite.findUnique({
            where: { id: data.riskAppetiteId },
        });
        if (!riskAppetite) {
            throw new Error('Risk appetite not found');
        }
        // Check if breach already exists for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingBreach = await prisma.riskAppetiteBreach.findFirst({
            where: {
                riskAppetiteId: data.riskAppetiteId,
                breachDate: { gte: today },
                status: 'OPEN',
            },
        });
        if (existingBreach) {
            logger_1.default.info('Breach already recorded for today, skipping');
            return existingBreach;
        }
        const excessAmount = data.actualRiskLevel - riskAppetite.riskTolerance;
        const breach = await prisma.riskAppetiteBreach.create({
            data: {
                riskAppetiteId: data.riskAppetiteId,
                breachType: data.breachType,
                actualRiskLevel: data.actualRiskLevel,
                thresholdExceeded: riskAppetite.riskTolerance,
                excessAmount,
                triggerEvent: data.triggerEvent,
                contributingFactors: data.contributingFactors,
                vendorIds: data.vendorIds || [],
                escalatedToBoard: excessAmount > riskAppetite.riskTolerance * 0.2, // Escalate if >20% over
                boardActionRequired: excessAmount > riskAppetite.riskTolerance * 0.5, // Action required if >50% over
            },
        });
        // Send notifications (would integrate with notification service)
        logger_1.default.warn(`RISK APPETITE BREACH: ${data.breachType} - Actual: ${data.actualRiskLevel}, Tolerance: ${riskAppetite.riskTolerance}`);
        return breach;
    }
    /**
     * Get all risk appetites for an organization
     */
    async listRiskAppetites(organizationId) {
        return prisma.riskAppetite.findMany({
            where: { organizationId },
            include: {
                breaches: {
                    where: { status: 'OPEN' },
                    orderBy: { breachDate: 'desc' },
                },
            },
            orderBy: { category: 'asc' },
        });
    }
    /**
     * Get all breaches for an organization
     */
    async listBreaches(organizationId, status) {
        const where = {};
        if (status) {
            where.status = status;
        }
        return prisma.riskAppetiteBreach.findMany({
            where,
            include: {
                riskAppetite: {
                    where: { organizationId },
                },
            },
            orderBy: { breachDate: 'desc' },
        });
    }
    /**
     * Resolve a breach
     */
    async resolveBreach(breachId, mitigationPlan, mitigationOwner, resolutionNotes) {
        logger_1.default.info(`Resolving risk appetite breach ${breachId}`);
        const breach = await prisma.riskAppetiteBreach.update({
            where: { id: breachId },
            data: {
                status: 'MITIGATED',
                mitigationPlan,
                mitigationOwner,
                resolvedAt: new Date(),
                resolutionNotes,
            },
        });
        logger_1.default.info(`Breach ${breachId} resolved`);
        return breach;
    }
    /**
     * Get risk appetite dashboard
     */
    async getDashboard(organizationId) {
        const appetites = await this.listRiskAppetites(organizationId);
        const breaches = await prisma.riskAppetiteBreach.findMany({
            where: {
                riskAppetite: { organizationId },
                status: 'OPEN',
            },
        });
        const summary = {
            totalAppetites: appetites.length,
            withinAppetite: appetites.filter(a => a.breachStatus === 'WITHIN_APPETITE').length,
            approachingLimit: appetites.filter(a => a.breachStatus === 'APPROACHING_LIMIT').length,
            breached: appetites.filter(a => a.breachStatus === 'BREACH').length,
            criticalBreaches: appetites.filter(a => a.breachStatus === 'CRITICAL_BREACH').length,
            openBreaches: breaches.length,
            boardEscalations: breaches.filter(b => b.escalatedToBoard).length,
        };
        return {
            summary,
            appetites,
            recentBreaches: breaches.slice(0, 10),
        };
    }
    /**
     * Get appetites requiring review
     */
    async getAppetitesRequiringReview(organizationId) {
        const today = new Date();
        return prisma.riskAppetite.findMany({
            where: {
                organizationId,
                nextReviewDate: { lte: today },
            },
            orderBy: { nextReviewDate: 'asc' },
        });
    }
}
exports.default = new RiskAppetiteService();
//# sourceMappingURL=riskAppetite.js.map
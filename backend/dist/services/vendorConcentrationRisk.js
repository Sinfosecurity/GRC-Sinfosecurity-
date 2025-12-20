"use strict";
/**
 * Vendor Concentration Risk Analysis Service
 * Analyzes over-reliance on vendors, categories, and geographies
 * Critical for regulatory compliance (OCC, FCA, EBA)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../config/logger"));
class VendorConcentrationRiskService {
    /**
     * Perform comprehensive concentration risk analysis
     */
    async analyzeConcentrationRisk(organizationId) {
        try {
            const vendors = await database_1.prisma.vendor.findMany({
                where: {
                    organizationId,
                    status: { in: ['ACTIVE', 'APPROVED'] },
                },
                select: {
                    id: true,
                    name: true,
                    tier: true,
                    category: true,
                    contractValue: true,
                    currency: true,
                    servicesProvided: true,
                    geographicFootprint: true,
                    dataTypesAccessed: true,
                    hasSubcontractors: true,
                    criticalityLevel: true,
                },
            });
            const totalVendors = vendors.length;
            const totalSpend = vendors.reduce((sum, v) => sum + Number(v.contractValue || 0), 0);
            const criticalVendors = vendors.filter(v => v.tier === 'CRITICAL').length;
            // Analyze spend concentration
            const spendConcentration = this.analyzeSpendConcentration(vendors, totalSpend);
            // Analyze geographic concentration
            const geographicConcentration = this.analyzeGeographicConcentration(vendors);
            // Analyze category concentration
            const categoryConcentration = this.analyzeCategoryConcentration(vendors, totalSpend);
            // Identify single points of failure
            const singlePointsOfFailure = this.identifySinglePointsOfFailure(vendors);
            // Generate recommendations
            const recommendations = this.generateRecommendations(spendConcentration, geographicConcentration, categoryConcentration, singlePointsOfFailure);
            // Calculate overall risk rating
            const overallRiskRating = this.calculateOverallRiskRating(spendConcentration, geographicConcentration, categoryConcentration, singlePointsOfFailure.length);
            logger_1.default.info('Concentration risk analysis completed', {
                organizationId,
                totalVendors,
                criticalVendors,
                overallRiskRating,
            });
            return {
                summary: {
                    totalVendors,
                    totalSpend,
                    criticalVendors,
                    geographicRegions: geographicConcentration.countriesRepresented.length,
                    categories: categoryConcentration.byCategory.length,
                },
                spendConcentration,
                geographicConcentration,
                categoryConcentration,
                singlePointsOfFailure,
                recommendations,
                overallRiskRating,
            };
        }
        catch (error) {
            logger_1.default.error('Failed to analyze concentration risk', { error: error.message, organizationId });
            throw error;
        }
    }
    /**
     * Analyze spend concentration
     */
    analyzeSpendConcentration(vendors, totalSpend) {
        // Sort vendors by spend
        const vendorsBySpend = [...vendors]
            .filter(v => v.contractValue)
            .sort((a, b) => Number(b.contractValue) - Number(a.contractValue));
        const topVendorsBySpend = vendorsBySpend.slice(0, 10).map(v => ({
            vendorId: v.id,
            vendorName: v.name,
            tier: v.tier,
            spend: Number(v.contractValue),
            percentOfTotal: totalSpend > 0 ? (Number(v.contractValue) / totalSpend) * 100 : 0,
            services: v.servicesProvided,
        }));
        const top1Vendor = vendorsBySpend.length > 0 ? {
            vendorId: vendorsBySpend[0].id,
            vendorName: vendorsBySpend[0].name,
            spend: Number(vendorsBySpend[0].contractValue),
            percentOfTotal: totalSpend > 0 ? (Number(vendorsBySpend[0].contractValue) / totalSpend) * 100 : 0,
        } : null;
        const top3Spend = vendorsBySpend.slice(0, 3).reduce((sum, v) => sum + Number(v.contractValue), 0);
        const top5Spend = vendorsBySpend.slice(0, 5).reduce((sum, v) => sum + Number(v.contractValue), 0);
        const top10Spend = vendorsBySpend.slice(0, 10).reduce((sum, v) => sum + Number(v.contractValue), 0);
        return {
            top1Vendor,
            top3Percent: totalSpend > 0 ? (top3Spend / totalSpend) * 100 : 0,
            top5Percent: totalSpend > 0 ? (top5Spend / totalSpend) * 100 : 0,
            top10Percent: totalSpend > 0 ? (top10Spend / totalSpend) * 100 : 0,
            topVendorsBySpend,
        };
    }
    /**
     * Analyze geographic concentration
     */
    analyzeGeographicConcentration(vendors) {
        const countryMap = new Map();
        vendors.forEach(v => {
            if (v.geographicFootprint && Array.isArray(v.geographicFootprint)) {
                v.geographicFootprint.forEach((country) => {
                    const existing = countryMap.get(country) || { total: 0, critical: 0 };
                    existing.total++;
                    if (v.tier === 'CRITICAL')
                        existing.critical++;
                    countryMap.set(country, existing);
                });
            }
        });
        const countriesRepresented = Array.from(countryMap.keys());
        const byCountry = Array.from(countryMap.entries())
            .map(([country, data]) => ({
            country,
            vendorCount: data.total,
            criticalVendorCount: data.critical,
            percentOfTotal: (data.total / vendors.length) * 100,
        }))
            .sort((a, b) => b.vendorCount - a.vendorCount);
        const highestConcentration = byCountry.length > 0 ? {
            country: byCountry[0].country,
            vendorCount: byCountry[0].vendorCount,
            percent: byCountry[0].percentOfTotal,
        } : null;
        // Determine risk level
        let riskLevel = 'Low';
        const recommendations = [];
        if (highestConcentration && highestConcentration.percent > 70) {
            riskLevel = 'Critical';
            recommendations.push(`Over 70% of vendors in ${highestConcentration.country} - consider geographic diversification`);
        }
        else if (highestConcentration && highestConcentration.percent > 50) {
            riskLevel = 'High';
            recommendations.push(`Over 50% of vendors in ${highestConcentration.country} - monitor regional risks`);
        }
        else if (countriesRepresented.length < 3) {
            riskLevel = 'Medium';
            recommendations.push('Limited geographic diversity - consider expanding vendor locations');
        }
        return {
            countriesRepresented,
            highestConcentration,
            riskLevel,
            recommendations,
            byCountry,
        };
    }
    /**
     * Analyze category concentration
     */
    analyzeCategoryConcentration(vendors, totalSpend) {
        const categoryMap = new Map();
        vendors.forEach(v => {
            const category = v.category;
            const existing = categoryMap.get(category) || { count: 0, critical: 0, spend: 0 };
            existing.count++;
            if (v.tier === 'CRITICAL')
                existing.critical++;
            existing.spend += Number(v.contractValue || 0);
            categoryMap.set(category, existing);
        });
        const byCategory = Array.from(categoryMap.entries())
            .map(([category, data]) => ({
            category,
            vendorCount: data.count,
            criticalVendorCount: data.critical,
            totalSpend: data.spend,
            percentOfTotal: (data.count / vendors.length) * 100,
        }))
            .sort((a, b) => b.vendorCount - a.vendorCount);
        const highestRiskCategory = byCategory.find(c => c.criticalVendorCount > 0) || null;
        return {
            byCategory,
            highestRiskCategory: highestRiskCategory ? {
                category: highestRiskCategory.category,
                vendorCount: highestRiskCategory.vendorCount,
                criticalCount: highestRiskCategory.criticalVendorCount,
            } : null,
        };
    }
    /**
     * Identify single points of failure
     */
    identifySinglePointsOfFailure(vendors) {
        const criticalVendors = vendors.filter(v => v.tier === 'CRITICAL' || v.criticalityLevel === 'CRITICAL');
        return criticalVendors.map(v => ({
            vendorId: v.id,
            vendorName: v.name,
            tier: v.tier,
            services: v.servicesProvided,
            reason: `Critical ${v.category} vendor with no documented backup`,
            hasBackup: false, // Would need business process mapping to determine this
            riskMitigation: this.generateMitigationRecommendation(v),
        }));
    }
    /**
     * Generate mitigation recommendation for a vendor
     */
    generateMitigationRecommendation(vendor) {
        const recommendations = [];
        if (vendor.hasSubcontractors) {
            recommendations.push('Review and approve fourth-party dependencies');
        }
        if (vendor.dataTypesAccessed?.some((dt) => ['PII', 'PHI', 'PCI'].includes(dt))) {
            recommendations.push('Implement data backup and recovery procedures');
        }
        recommendations.push('Identify and qualify backup vendors');
        recommendations.push('Document business continuity plan for vendor failure');
        return recommendations.join('; ');
    }
    /**
     * Generate overall recommendations
     */
    generateRecommendations(spendConcentration, geographicConcentration, categoryConcentration, singlePointsOfFailure) {
        const recommendations = [];
        // Spend concentration recommendations
        if (spendConcentration.top1Vendor && spendConcentration.top1Vendor.percentOfTotal > 40) {
            recommendations.push(`CRITICAL: Single vendor (${spendConcentration.top1Vendor.vendorName}) represents ${Math.round(spendConcentration.top1Vendor.percentOfTotal)}% of total spend - consider diversification`);
        }
        if (spendConcentration.top3Percent > 60) {
            recommendations.push(`Top 3 vendors represent ${Math.round(spendConcentration.top3Percent)}% of spend - implement vendor diversification strategy`);
        }
        // Geographic recommendations
        recommendations.push(...geographicConcentration.recommendations);
        // Category concentration
        if (categoryConcentration.highestRiskCategory && categoryConcentration.highestRiskCategory.criticalCount > 5) {
            recommendations.push(`${categoryConcentration.highestRiskCategory.criticalCount} critical vendors in ${categoryConcentration.highestRiskCategory.category} - conduct detailed category risk assessment`);
        }
        // Single points of failure
        if (singlePointsOfFailure.length > 0) {
            recommendations.push(`${singlePointsOfFailure.length} critical vendors without documented backup solutions - develop business continuity plans`);
        }
        // General recommendations
        recommendations.push('Establish risk appetite thresholds for vendor concentration');
        recommendations.push('Conduct quarterly concentration risk reviews with board/risk committee');
        recommendations.push('Document vendor substitutability assessment for critical vendors');
        return recommendations;
    }
    /**
     * Calculate overall risk rating
     */
    calculateOverallRiskRating(spendConcentration, geographicConcentration, categoryConcentration, spofCount) {
        let score = 0;
        // Spend concentration scoring
        if (spendConcentration.top1Vendor && spendConcentration.top1Vendor.percentOfTotal > 50) {
            score += 3; // Critical
        }
        else if (spendConcentration.top1Vendor && spendConcentration.top1Vendor.percentOfTotal > 30) {
            score += 2; // High
        }
        else if (spendConcentration.top3Percent > 70) {
            score += 2;
        }
        // Geographic concentration scoring
        if (geographicConcentration.riskLevel === 'Critical') {
            score += 3;
        }
        else if (geographicConcentration.riskLevel === 'High') {
            score += 2;
        }
        else if (geographicConcentration.riskLevel === 'Medium') {
            score += 1;
        }
        // Single points of failure scoring
        if (spofCount > 10) {
            score += 3;
        }
        else if (spofCount > 5) {
            score += 2;
        }
        else if (spofCount > 0) {
            score += 1;
        }
        // Determine overall rating
        if (score >= 7)
            return 'Critical';
        if (score >= 5)
            return 'High';
        if (score >= 3)
            return 'Medium';
        return 'Low';
    }
    /**
     * Export concentration risk report for board
     */
    async exportBoardReport(organizationId) {
        try {
            const analysis = await this.analyzeConcentrationRisk(organizationId);
            return {
                title: 'Vendor Concentration Risk Analysis - Board Report',
                date: new Date().toISOString(),
                executiveSummary: {
                    overallRiskRating: analysis.overallRiskRating,
                    totalVendors: analysis.summary.totalVendors,
                    criticalVendors: analysis.summary.criticalVendors,
                    keyRisks: [
                        `Top vendor represents ${Math.round(analysis.spendConcentration.top1Vendor?.percentOfTotal || 0)}% of spend`,
                        `${analysis.singlePointsOfFailure.length} critical vendors without backup`,
                        `Geographic concentration: ${analysis.geographicConcentration.riskLevel} risk`,
                    ],
                },
                findings: analysis,
                recommendations: analysis.recommendations,
                nextSteps: [
                    'Board approval of vendor concentration risk appetite',
                    'Development of vendor diversification roadmap',
                    'Quarterly concentration risk monitoring',
                    'Business continuity planning for critical vendors',
                ],
            };
        }
        catch (error) {
            logger_1.default.error('Failed to export board report', { error: error.message, organizationId });
            throw error;
        }
    }
}
exports.default = new VendorConcentrationRiskService();
//# sourceMappingURL=vendorConcentrationRisk.js.map
/**
 * Vendor Contract & SLA Management Service
 * Enterprise contract lifecycle and SLA tracking
 */

import { VendorContract, ContractType, ContractStatus } from '@prisma/client';
import { prisma } from '../config/database';

export interface CreateContractInput {
    vendorId: string;
    organizationId: string;
    contractType: ContractType;
    contractNumber?: string;
    title: string;
    description?: string;
    effectiveDate: Date;
    expirationDate: Date;
    renewalDate?: Date;
    autoRenewal?: boolean;
    noticePeriod?: number;
    contractValue: number;
    currency?: string;
    paymentTerms?: string;
    slaCommitments?: any;
    hasDataProtectionClause?: boolean;
    hasRightToAudit?: boolean;
    hasBreachNotification?: boolean;
    hasInsuranceRequirement?: boolean;
    hasSubcontractorControls?: boolean;
    hasTerminationRights?: boolean;
    hasIPProtection?: boolean;
    hasDPA?: boolean;
    dpaSignedDate?: Date;
    documentUrl?: string;
}

class VendorContractService {
    /**
     * Create new contract
     */
    async createContract(data: CreateContractInput): Promise<VendorContract> {
        const contract = await prisma.vendorContract.create({
            data: {
                ...data,
                status: ContractStatus.DRAFT,
            },
            include: {
                vendor: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        console.log(`✅ Created contract: ${contract.title} for ${contract.vendor.name}`);
        return contract;
    }

    /**
     * Get contract by ID
     */
    async getContractById(contractId: string, organizationId: string) {
        return await prisma.vendorContract.findFirst({
            where: {
                id: contractId,
                organizationId,
            },
            include: {
                vendor: true,
                slaTracking: {
                    orderBy: { periodStart: 'desc' },
                },
            },
        });
    }

    /**
     * List contracts for vendor
     */
    async listVendorContracts(vendorId: string, organizationId: string) {
        return await prisma.vendorContract.findMany({
            where: {
                vendorId,
                organizationId,
            },
            orderBy: { effectiveDate: 'desc' },
        });
    }

    /**
     * Update contract
     */
    async updateContract(
        contractId: string,
        organizationId: string,
        data: Partial<CreateContractInput>
    ) {
        return await prisma.vendorContract.updateMany({
            where: {
                id: contractId,
                organizationId,
            },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Approve contract
     */
    async approveContract(
        contractId: string,
        organizationId: string,
        approvedBy: string
    ) {
        return await prisma.vendorContract.updateMany({
            where: {
                id: contractId,
                organizationId,
            },
            data: {
                status: ContractStatus.ACTIVE,
                approvedBy,
                approvedAt: new Date(),
            },
        });
    }

    /**
     * Get expiring contracts (within specified days)
     */
    async getExpiringContracts(organizationId: string, withinDays: number = 90) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + withinDays);

        const contracts = await prisma.vendorContract.findMany({
            where: {
                organizationId,
                status: ContractStatus.ACTIVE,
                expirationDate: {
                    gte: new Date(),
                    lte: futureDate,
                },
            },
            include: {
                vendor: {
                    select: {
                        name: true,
                        tier: true,
                    },
                },
            },
            orderBy: { expirationDate: 'asc' },
        });

        // Mark contracts expiring within 30 days
        for (const contract of contracts) {
            const daysUntilExpiry = Math.floor(
                (contract.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            if (daysUntilExpiry <= 30 && contract.status !== ContractStatus.EXPIRING_SOON) {
                await prisma.vendorContract.update({
                    where: { id: contract.id },
                    data: { status: ContractStatus.EXPIRING_SOON },
                });
            }
        }

        return contracts;
    }

    /**
     * Track SLA metric
     */
    async trackSLAMetric(data: {
        contractId: string;
        metricName: string;
        metricType: string;
        target: number;
        actual: number;
        unit: string;
        period: string;
        periodStart: Date;
        periodEnd: Date;
        notes?: string;
    }) {
        const status = data.actual >= data.target ? 'MET' : 'BREACHED';

        const slaRecord = await prisma.sLATracking.create({
            data: {
                ...data,
                status,
                breachCount: status === 'BREACHED' ? 1 : 0,
            },
        });

        // If SLA breached, create vendor issue
        if (status === 'BREACHED') {
            const contract = await prisma.vendorContract.findUnique({
                where: { id: data.contractId },
                include: { vendor: true },
            });

            if (contract) {
                await prisma.vendorIssue.create({
                    data: {
                        vendorId: contract.vendorId,
                        organizationId: contract.organizationId,
                        title: `SLA Breach: ${data.metricName}`,
                        description: `SLA metric "${data.metricName}" breached. Target: ${data.target}${data.unit}, Actual: ${data.actual}${data.unit}`,
                        issueType: 'SLA_BREACH',
                        severity: 'HIGH',
                        priority: 'HIGH',
                        source: 'CONTINUOUS_MONITORING',
                        identifiedBy: 'system',
                        category: 'Performance',
                        status: 'OPEN',
                    },
                });
            }
        }

        console.log(`✅ SLA tracked: ${data.metricName} - ${status}`);
        return slaRecord;
    }

    /**
     * Get SLA compliance report
     */
    async getSLAComplianceReport(organizationId: string, period: 'MONTH' | 'QUARTER' | 'YEAR') {
        const startDate = this.getPeriodStartDate(period);

        const slaRecords = await prisma.sLATracking.findMany({
            where: {
                contract: {
                    organizationId,
                },
                periodStart: {
                    gte: startDate,
                },
            },
            include: {
                contract: {
                    include: {
                        vendor: {
                            select: {
                                name: true,
                                tier: true,
                            },
                        },
                    },
                },
            },
        });

        const totalMetrics = slaRecords.length;
        const metricsMet = slaRecords.filter(r => r.status === 'MET').length;
        const metricsBreached = slaRecords.filter(r => r.status === 'BREACHED').length;

        // Group by vendor
        const byVendor = slaRecords.reduce((acc: any, record) => {
            const vendorName = record.contract.vendor.name;
            if (!acc[vendorName]) {
                acc[vendorName] = {
                    vendorName,
                    tier: record.contract.vendor.tier,
                    total: 0,
                    met: 0,
                    breached: 0,
                };
            }
            acc[vendorName].total++;
            if (record.status === 'MET') acc[vendorName].met++;
            if (record.status === 'BREACHED') acc[vendorName].breached++;
            return acc;
        }, {});

        return {
            period,
            summary: {
                totalMetrics,
                metricsMet,
                metricsBreached,
                complianceRate: totalMetrics > 0 ? Math.round((metricsMet / totalMetrics) * 100) : 0,
            },
            byVendor: Object.values(byVendor),
        };
    }

    /**
     * Analyze contract risk clauses
     */
    async analyzeContractRisk(contractId: string) {
        const contract = await prisma.vendorContract.findUnique({
            where: { id: contractId },
        });

        if (!contract) {
            throw new Error('Contract not found');
        }

        const risks: any[] = [];
        const recommendations: any[] = [];

        // Check critical clauses
        if (!contract.hasDataProtectionClause) {
            risks.push({
                severity: 'HIGH',
                clause: 'Data Protection',
                description: 'Contract lacks data protection clause',
            });
            recommendations.push({
                title: 'Add Data Protection Clause',
                priority: 'HIGH',
                description: 'Include comprehensive data protection and security requirements',
            });
        }

        if (!contract.hasRightToAudit) {
            risks.push({
                severity: 'MEDIUM',
                clause: 'Right to Audit',
                description: 'No right-to-audit clause present',
            });
            recommendations.push({
                title: 'Include Right to Audit',
                priority: 'MEDIUM',
                description: 'Add clause allowing periodic security and compliance audits',
            });
        }

        if (!contract.hasBreachNotification) {
            risks.push({
                severity: 'HIGH',
                clause: 'Breach Notification',
                description: 'No breach notification requirements',
            });
            recommendations.push({
                title: 'Add Breach Notification Clause',
                priority: 'HIGH',
                description: 'Require vendor to notify within 24-72 hours of security incidents',
            });
        }

        if (!contract.hasInsuranceRequirement) {
            risks.push({
                severity: 'MEDIUM',
                clause: 'Insurance',
                description: 'No cyber insurance requirement',
            });
        }

        if (!contract.hasSubcontractorControls) {
            risks.push({
                severity: 'MEDIUM',
                clause: 'Subcontractor Controls',
                description: 'No controls over vendor subcontractors',
            });
        }

        if (!contract.hasDPA && contract.contractType === 'DATA_PROCESSING_AGREEMENT') {
            risks.push({
                severity: 'CRITICAL',
                clause: 'DPA',
                description: 'Data Processing Agreement not signed',
            });
        }

        const riskScore = risks.reduce((score, r) => {
            if (r.severity === 'CRITICAL') return score + 25;
            if (r.severity === 'HIGH') return score + 15;
            if (r.severity === 'MEDIUM') return score + 10;
            return score + 5;
        }, 0);

        return {
            contractId: contract.id,
            contractTitle: contract.title,
            riskScore: Math.min(riskScore, 100),
            riskLevel: riskScore > 60 ? 'High' : riskScore > 30 ? 'Medium' : 'Low',
            risks,
            recommendations,
            clauseCoverage: {
                dataProtection: contract.hasDataProtectionClause,
                rightToAudit: contract.hasRightToAudit,
                breachNotification: contract.hasBreachNotification,
                insurance: contract.hasInsuranceRequirement,
                subcontractorControls: contract.hasSubcontractorControls,
                terminationRights: contract.hasTerminationRights,
                ipProtection: contract.hasIPProtection,
                dpa: contract.hasDPA,
            },
        };
    }

    /**
     * Get contract statistics
     */
    async getContractStatistics(organizationId: string) {
        const [
            totalContracts,
            activeContracts,
            expiringContracts,
            totalValue,
            contractsByType,
        ] = await Promise.all([
            prisma.vendorContract.count({ where: { organizationId } }),
            prisma.vendorContract.count({
                where: { organizationId, status: ContractStatus.ACTIVE },
            }),
            prisma.vendorContract.count({
                where: {
                    organizationId,
                    status: ContractStatus.ACTIVE,
                    expirationDate: {
                        lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    },
                },
            }),
            prisma.vendorContract.aggregate({
                where: { organizationId, status: ContractStatus.ACTIVE },
                _sum: { contractValue: true },
            }),
            prisma.vendorContract.groupBy({
                by: ['contractType'],
                where: { organizationId, status: ContractStatus.ACTIVE },
                _count: true,
            }),
        ]);

        return {
            totalContracts,
            activeContracts,
            expiringContracts,
            totalValue: totalValue._sum.contractValue || 0,
            contractsByType: contractsByType.map(c => ({
                type: c.contractType,
                count: c._count,
            })),
        };
    }

    /**
     * Helper: Get period start date
     */
    private getPeriodStartDate(period: 'MONTH' | 'QUARTER' | 'YEAR'): Date {
        const now = new Date();
        switch (period) {
            case 'MONTH':
                return new Date(now.getFullYear(), now.getMonth(), 1);
            case 'QUARTER':
                const quarter = Math.floor(now.getMonth() / 3);
                return new Date(now.getFullYear(), quarter * 3, 1);
            case 'YEAR':
                return new Date(now.getFullYear(), 0, 1);
        }
    }
}

export default new VendorContractService();

import { VendorTier, VendorType } from '@prisma/client';
import vendorManagementService from '../services/vendorManagementService';
import vendorIssueService from '../services/vendorIssueService';
import vendorAssessmentService from '../services/vendorAssessmentService';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { webhookService } from './webhookService';

export function pageParams(query: Record<string, unknown>) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    return { page, pageSize };
}

export function pageResult<T>(items: T[], total: number, page: number, pageSize: number) {
    return { page, pageSize, total, items };
}

export const publicResources = {
    async listVendors(organizationId: string, query: Record<string, unknown>) {
        const { page, pageSize } = pageParams(query);
        const result = await vendorManagementService.listVendors(
            organizationId,
            { search: typeof query.search === 'string' ? query.search : undefined },
            page,
            pageSize,
        );
        return pageResult(result.vendors, result.pagination.total, page, pageSize);
    },

    async getVendor(organizationId: string, id: string) {
        const vendor = await vendorManagementService.getVendorById(id, organizationId).catch(() => null);
        if (!vendor) throw new ApiError(404, 'Vendor not found');
        return vendor;
    },

    async createVendor(organizationId: string, body: Record<string, unknown>) {
        const name = String(body.name || '').trim();
        if (!name) throw new ApiError(400, 'name is required');
        const vendor = await vendorManagementService.createVendor({
            name,
            vendorType: (body.vendorType as VendorType) || VendorType.SAAS,
            category: String(body.category || 'TECHNOLOGY'),
            tier: (body.tier as VendorTier) || VendorTier.UNRATED,
            primaryContact: String(body.primaryContact || 'API'),
            contactEmail: String(body.contactEmail || 'api@example.invalid'),
            servicesProvided: String(body.servicesProvided || 'Created via public API'),
            dataTypesAccessed: Array.isArray(body.dataTypesAccessed) ? body.dataTypesAccessed as string[] : [],
            geographicFootprint: Array.isArray(body.geographicFootprint) ? body.geographicFootprint as string[] : [],
            regulatoryScope: Array.isArray(body.regulatoryScope) ? body.regulatoryScope as string[] : [],
            organizationId,
        });
        await webhookService.emit(organizationId, 'third_party.created', { type: 'Vendor', id: vendor.id }, { name: vendor.name, publicId: vendor.publicId });
        return vendor;
    },

    async updateVendor(organizationId: string, id: string, body: Record<string, unknown>) {
        const vendor = await vendorManagementService.updateVendor(id, organizationId, {
            name: typeof body.name === 'string' ? body.name : undefined,
            primaryContact: typeof body.primaryContact === 'string' ? body.primaryContact : undefined,
            contactEmail: typeof body.contactEmail === 'string' ? body.contactEmail : undefined,
            servicesProvided: typeof body.servicesProvided === 'string' ? body.servicesProvided : undefined,
        });
        await webhookService.emit(organizationId, 'third_party.updated', { type: 'Vendor', id: vendor.id }, { name: vendor.name });
        return vendor;
    },

    async listFindings(organizationId: string, query: Record<string, unknown>) {
        const { page, pageSize } = pageParams(query);
        const rows = await vendorIssueService.listOrganizationIssues(organizationId);
        const start = (page - 1) * pageSize;
        return pageResult(rows.slice(start, start + pageSize), rows.length, page, pageSize);
    },

    async getFinding(organizationId: string, id: string) {
        const finding = await vendorIssueService.getIssueById(id, organizationId);
        if (!finding) throw new ApiError(404, 'Finding not found');
        return finding;
    },

    async listAssessments(organizationId: string, query: Record<string, unknown>) {
        const { page, pageSize } = pageParams(query);
        const rows = await vendorAssessmentService.listOrganizationAssessments(organizationId);
        const start = (page - 1) * pageSize;
        return pageResult(rows.slice(start, start + pageSize), rows.length, page, pageSize);
    },

    async listRisks(organizationId: string, query: Record<string, unknown>) {
        const { page, pageSize } = pageParams(query);
        const [items, total] = await Promise.all([
            prisma.vendor.findMany({
                where: { organizationId },
                orderBy: { residualRiskScore: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: { id: true, name: true, residualRiskScore: true, inherentRiskScore: true, tier: true, updatedAt: true },
            }),
            prisma.vendor.count({ where: { organizationId } }),
        ]);
        return pageResult(items.map((row) => ({
            id: row.id,
            title: row.name,
            inherentScore: row.inherentRiskScore,
            residualScore: row.residualRiskScore,
            tier: row.tier,
            updatedAt: row.updatedAt,
        })), total, page, pageSize);
    },

    async listEvidence(organizationId: string, query: Record<string, unknown>) {
        const { page, pageSize } = pageParams(query);
        const [items, total] = await Promise.all([
            prisma.vendorDocument.findMany({
                where: { organizationId },
                orderBy: { uploadedAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    title: true,
                    documentType: true,
                    fileName: true,
                    scanStatus: true,
                    uploadedAt: true,
                    vendorId: true,
                },
            }),
            prisma.vendorDocument.count({ where: { organizationId } }),
        ]);
        return pageResult(items, total, page, pageSize);
    },

    async insuranceConfiguration(organizationId: string) {
        const { insuranceService } = await import('../insurance/insuranceService');
        return insuranceService.configuration(organizationId);
    },

    async insuranceEntities(organizationId: string, query: Record<string, unknown>) {
        const { page, pageSize } = pageParams(query);
        const { insuranceService } = await import('../insurance/insuranceService');
        const items = await insuranceService.entities(organizationId);
        return pageResult(items.slice((page - 1) * pageSize, page * pageSize), items.length, page, pageSize);
    },

    async insuranceLicenses(organizationId: string, query: Record<string, unknown>) {
        const { page, pageSize } = pageParams(query);
        const { insuranceService } = await import('../insurance/insuranceService');
        const items = await insuranceService.licenses(organizationId);
        return pageResult(items.slice((page - 1) * pageSize, page * pageSize), items.length, page, pageSize);
    },

    async insuranceRiskSummary(organizationId: string) {
        const { insuranceService } = await import('../insurance/insuranceService');
        return insuranceService.riskSummary(organizationId);
    },

    async insuranceRegulatoryPacks(organizationId: string) {
        const { insuranceOperations } = await import('../insurance/operationsService');
        const workspace = await insuranceOperations.regulatoryWorkspace(organizationId);
        return {
            honesty: workspace.honesty,
            packs: workspace.packs.map((pack) => ({
                key: pack.key,
                label: pack.label,
                jurisdiction: pack.jurisdiction,
                regulator: pack.regulator,
                version: pack.version,
                sourceUrl: pack.sourceUrl,
                applicabilityState: pack.applicabilityState,
                overlay: pack.overlay,
            })),
        };
    },

    async insuranceModels(organizationId: string) {
        const { insuranceService } = await import('../insurance/insuranceService');
        return insuranceService.aiContexts(organizationId);
    },
};

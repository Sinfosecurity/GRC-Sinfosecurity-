import crypto from 'crypto';
import { EditionConfigStatus, EnterpriseRiskCategory, IndustryEditionKey, Prisma, ScanStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from '../services/auditEventService';
import { governanceGraphService } from '../services/governanceGraphService';
import { insuranceCatalog, recommendPacks, RISK_TAXONOMY, typesForCountry } from './catalog';

const HONESTY = 'Recommended regulation is not applicable regulation. Configured packs are not compliance. Unknown is not zero. An expired license record is not automatically a legal finding of unlicensed status.';

function asStringArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    return [];
}

function publicId(prefix: string) {
    return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

function snapshotOf(input: Record<string, unknown>) {
    return JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue;
}

function presentEvidence(object: { id: string; filename: string; scanStatus: ScanStatus; uploadedAt: Date; uploadedBy: string; classification: string; ownerType: string } | null) {
    if (!object) return null;
    return {
        id: object.id,
        filename: object.filename,
        category: 'insurance-license',
        scanStatus: object.scanStatus,
        uploadedAt: object.uploadedAt,
        owner: object.uploadedBy,
        source: object.ownerType,
        usable: object.scanStatus === ScanStatus.CLEAN,
        honesty: object.scanStatus === ScanStatus.CLEAN
            ? 'CLEAN shared evidence. Same StoredObject bytes; not a second Insurance file store.'
            : 'Non-CLEAN evidence is not usable for this license record.',
    };
}

async function audit(organizationId: string, actorUserId: string | undefined, action: string, resourceType: string, resourceId?: string, metadata?: Record<string, unknown>) {
    await recordAudit({ organizationId, actorUserId, action, resourceType, resourceId, result: 'success', metadata });
}

async function activeConfig(organizationId: string) {
    return prisma.organizationEditionConfig.findFirst({
        where: { organizationId, editionKey: IndustryEditionKey.INSURANCE, status: EditionConfigStatus.ACTIVE },
        orderBy: { version: 'desc' },
    });
}

export async function editionIsInsurance(organizationId: string) {
    return Boolean(await activeConfig(organizationId));
}

async function projectEntity(organizationId: string, actorUserId: string | undefined, entity: { id: string; name: string; domicileCountryCode: string; domicileSubJurisdiction: string | null; operatingJurisdictions: unknown; linesOfBusiness: unknown; parentEntityId: string | null }) {
    const entityNode = await governanceGraphService.ensureNode({
        organizationId,
        actorUserId,
        nodeType: 'INSURANCE_ENTITY',
        sourceModel: 'InsuranceEntity',
        sourceId: entity.id,
        displayLabel: entity.name,
    });
    const country = await governanceGraphService.ensureNode({
        organizationId,
        actorUserId,
        nodeType: 'JURISDICTION',
        sourceModel: 'InsuranceJurisdiction',
        sourceId: entity.domicileCountryCode,
        displayLabel: entity.domicileCountryCode,
    });
    await governanceGraphService.createRelationship({
        organizationId,
        fromNodeId: entityNode.node.id,
        toNodeId: country.node.id,
        relationshipType: 'APPLIES_TO',
        provenance: 'SYSTEM',
        createdBy: actorUserId,
    });
    if (entity.domicileCountryCode === 'NG') {
        const regulator = await governanceGraphService.ensureNode({
            organizationId,
            actorUserId,
            nodeType: 'REGULATOR',
            sourceModel: 'InsuranceAuthority',
            sourceId: 'NAICOM',
            displayLabel: 'NAICOM',
        });
        await governanceGraphService.createRelationship({
            organizationId,
            fromNodeId: entityNode.node.id,
            toNodeId: regulator.node.id,
            relationshipType: 'GOVERNED_BY',
            provenance: 'SYSTEM',
            createdBy: actorUserId,
        });
    }
    if (entity.domicileCountryCode === 'US') {
        const regulator = await governanceGraphService.ensureNode({
            organizationId,
            actorUserId,
            nodeType: 'REGULATOR',
            sourceModel: 'InsuranceAuthority',
            sourceId: 'US-STATE-DOI',
            displayLabel: 'State insurance regulator',
        });
        await governanceGraphService.createRelationship({
            organizationId,
            fromNodeId: entityNode.node.id,
            toNodeId: regulator.node.id,
            relationshipType: 'GOVERNED_BY',
            provenance: 'SYSTEM',
            createdBy: actorUserId,
        });
    }
    for (const lob of asStringArray(entity.linesOfBusiness)) {
        const lobNode = await governanceGraphService.ensureNode({
            organizationId,
            actorUserId,
            nodeType: 'LINE_OF_BUSINESS',
            sourceModel: 'InsuranceLineOfBusiness',
            sourceId: lob,
            displayLabel: lob,
        });
        await governanceGraphService.createRelationship({
            organizationId,
            fromNodeId: entityNode.node.id,
            toNodeId: lobNode.node.id,
            relationshipType: 'COVERS',
            provenance: 'SYSTEM',
            createdBy: actorUserId,
        });
    }
    if (entity.parentEntityId) {
        const parentNode = await governanceGraphService.ensureNode({
            organizationId,
            actorUserId,
            nodeType: 'INSURANCE_ENTITY',
            sourceModel: 'InsuranceEntity',
            sourceId: entity.parentEntityId,
            displayLabel: 'Group parent',
        });
        await governanceGraphService.createRelationship({
            organizationId,
            fromNodeId: parentNode.node.id,
            toNodeId: entityNode.node.id,
            relationshipType: 'OWNS',
            provenance: 'SYSTEM',
            createdBy: actorUserId,
        });
    }
    return entityNode.node;
}

const GOVERNANCE_PROCESSES: Record<string, { label: string; critical?: string }> = {
    CLAIMS: { label: 'Claims process', critical: 'Claims processing' },
    UNDERWRITING: { label: 'Underwriting process' },
    PRICING: { label: 'Pricing process' },
    REINSURANCE: { label: 'Reinsurance / counterparty process' },
    POLICY_ADMINISTRATION: { label: 'Policy administration process', critical: 'Policy issuance / renewal' },
};

async function projectProcesses(organizationId: string, actorUserId: string | undefined, activities: string[]) {
    for (const key of activities) {
        const spec = GOVERNANCE_PROCESSES[key];
        if (!spec) continue;
        await governanceGraphService.ensureNode({
            organizationId,
            actorUserId,
            nodeType: 'BUSINESS_PROCESS',
            sourceModel: 'InsuranceActivity',
            sourceId: key,
            displayLabel: spec.label,
        });
        if (spec.critical) {
            await governanceGraphService.ensureNode({
                organizationId,
                actorUserId,
                nodeType: 'CRITICAL_SERVICE',
                sourceModel: 'InsuranceCriticalService',
                sourceId: key,
                displayLabel: spec.critical,
            });
        }
    }
}

async function seedRiskTaxonomy(organizationId: string) {
    for (const row of RISK_TAXONOMY) {
        await prisma.enterpriseRiskCustomCategory.upsert({
            where: { organizationId_name: { organizationId, name: `Insurance / ${row.label}` } },
            create: { organizationId, name: `Insurance / ${row.label}`, canonicalParent: row.parent as EnterpriseRiskCategory },
            update: {},
        });
    }
}

function serializeConfig(row: Awaited<ReturnType<typeof activeConfig>>) {
    if (!row) return null;
    return {
        id: row.id,
        editionKey: row.editionKey,
        version: row.version,
        status: row.status,
        organizationType: row.organizationType,
        domicileCountryCode: row.domicileCountryCode,
        domicileSubJurisdiction: row.domicileSubJurisdiction,
        operatingJurisdictions: row.operatingJurisdictions,
        linesOfBusiness: row.linesOfBusiness,
        activities: row.activities,
        dataHandled: row.dataHandled,
        aiUsage: row.aiUsage,
        thirdPartyEcosystem: row.thirdPartyEcosystem,
        enabledPacks: row.enabledPacks,
        recommendedPacks: row.recommendedPacks,
        recommendationDecisions: row.recommendationDecisions,
        effectiveFrom: row.effectiveFrom,
        supersededAt: row.supersededAt,
        honesty: HONESTY,
    };
}

export const insuranceService = {
    catalog() {
        return insuranceCatalog();
    },

    async overview(organizationId: string) {
        const config = await activeConfig(organizationId);
        const [entities, licenses, history, vendors, aiContexts, highRisks, findings, expiringEvidence] = await Promise.all([
            prisma.insuranceEntity.count({ where: { organizationId } }),
            prisma.insuranceLicense.findMany({ where: { organizationId } }),
            prisma.organizationEditionConfig.findMany({ where: { organizationId, editionKey: IndustryEditionKey.INSURANCE }, orderBy: { version: 'desc' } }),
            prisma.insuranceVendorClassification.count({ where: { organizationId } }),
            prisma.insuranceAiContext.findMany({ where: { organizationId } }),
            config
                ? prisma.enterpriseRisk.count({
                    where: {
                        organizationId,
                        residualRating: { in: ['HIGH', 'CRITICAL'] },
                        customCategory: { name: { startsWith: 'Insurance /' } },
                    },
                })
                : Promise.resolve(null),
            prisma.vendorIssue.count({ where: { organizationId, severity: { in: ['HIGH', 'CRITICAL'] }, status: { notIn: ['CLOSED', 'RESOLVED', 'RISK_ACCEPTED'] } } }).catch(() => null),
            Promise.resolve(null),
        ]);
        const soon = new Date(Date.now() + 90 * 86400000);
        const licensesExpiring = licenses.filter((row) => row.expiryDate && row.expiryDate <= soon);
        const aiDue = aiContexts.filter((row) => row.nextReviewAt && row.nextReviewAt <= new Date());
        return {
            honesty: HONESTY,
            activated: Boolean(config),
            configuration: serializeConfig(config),
            history: history.map((row) => ({ version: row.version, status: row.status, effectiveFrom: row.effectiveFrom, supersededAt: row.supersededAt, organizationType: row.organizationType })),
            metrics: {
                entities: { value: entities, basis: 'Insurance entity register' },
                jurisdictions: { value: config ? asStringArray(config.operatingJurisdictions).length : null, basis: config ? 'Active edition configuration' : 'NOT_CONFIGURED' },
                licenses: { value: licenses.length, basis: 'License register' },
                licensesExpiring: { value: licensesExpiring.length, basis: 'License expiry date within 90 days. Not a legal finding.' },
                classifiedVendors: { value: vendors, basis: 'Insurance service classifications on existing vendors' },
                insuranceRisksHighCritical: { value: highRisks, basis: highRisks === null ? 'NOT_CONFIGURED' : 'Enterprise Risk rows tagged Insurance / *' },
                aiModelsDue: { value: aiDue.length, basis: aiContexts.length ? 'Insurance AI context next-review dates' : 'NOT_CONFIGURED' },
                highFindings: { value: findings, basis: findings === null ? 'NOT_CALCULATED' : 'Existing vendor findings HIGH/CRITICAL' },
                evidenceExpiring: { value: expiringEvidence, basis: expiringEvidence === null ? 'NOT_CALCULATED' : 'Shared evidence links with expiry within 90 days' },
            },
            attention: [
                ...licensesExpiring.map((row) => ({ type: 'license', why: 'License record expires within 90 days. This is not a legal finding of unlicensed status.', href: '/insurance/licenses', publicId: row.publicId })),
                ...aiDue.map((row) => ({ type: 'ai-review', why: 'Insurance AI context has a next-review date that has passed.', href: '/ai-governance/systems', publicId: row.aiSystemId })),
            ],
        };
    },

    async configuration(organizationId: string) {
        const [active, history] = await Promise.all([
            activeConfig(organizationId),
            prisma.organizationEditionConfig.findMany({ where: { organizationId, editionKey: IndustryEditionKey.INSURANCE }, orderBy: { version: 'desc' } }),
        ]);
        return { active: serializeConfig(active), history: history.map((row) => serializeConfig(row)), catalog: insuranceCatalog() };
    },

    recommend(input: Record<string, unknown>) {
        return {
            honesty: 'Recommended based on your configuration. Not legally required.',
            packs: recommendPacks({
                organizationType: String(input.organizationType || ''),
                activities: asStringArray(input.activities),
                dataHandled: asStringArray(input.dataHandled),
                countries: [String(input.domicileCountryCode || ''), ...asStringArray(input.operatingJurisdictions).map((row) => row.split('-')[0] || row)],
                subJurisdictions: asStringArray(input.operatingJurisdictions),
            }),
        };
    },

    async activate(organizationId: string, actorUserId: string, input: Record<string, unknown>) {
        const organizationType = String(input.organizationType || '').trim();
        const domicileCountryCode = String(input.domicileCountryCode || '').trim();
        if (!organizationType || !domicileCountryCode) throw new ApiError(400, 'Choose an organization type and domicile.');
        const allowed = typesForCountry(domicileCountryCode).some((row) => row.key === organizationType) || organizationType === 'OTHER';
        if (!allowed) throw new ApiError(400, 'That organization type is not listed for the selected domicile. It can still be recorded as Other.');
        const operatingJurisdictions = asStringArray(input.operatingJurisdictions);
        const linesOfBusiness = asStringArray(input.linesOfBusiness);
        const activities = asStringArray(input.activities);
        const dataHandled = asStringArray(input.dataHandled);
        const recommended = recommendPacks({
            organizationType,
            activities,
            dataHandled,
            countries: [domicileCountryCode, ...operatingJurisdictions.map((row) => row.split('-')[0] || row)],
            subJurisdictions: operatingJurisdictions,
        });
        const accepted = asStringArray(input.enabledPacks);
        const decisions = (input.recommendationDecisions as Record<string, string>) || {};
        const current = await prisma.organizationEditionConfig.findMany({
            where: { organizationId, editionKey: IndustryEditionKey.INSURANCE },
            orderBy: { version: 'desc' },
        });
        const nextVersion = (current[0]?.version || 0) + 1;
        await prisma.organizationEditionConfig.updateMany({
            where: { organizationId, editionKey: IndustryEditionKey.INSURANCE, status: EditionConfigStatus.ACTIVE },
            data: { status: EditionConfigStatus.SUPERSEDED, supersededAt: new Date() },
        });
        const payload = {
            organizationType,
            domicileCountryCode,
            domicileSubJurisdiction: input.domicileSubJurisdiction ? String(input.domicileSubJurisdiction) : null,
            operatingJurisdictions,
            linesOfBusiness,
            activities,
            dataHandled,
            aiUsage: asStringArray(input.aiUsage),
            thirdPartyEcosystem: asStringArray(input.thirdPartyEcosystem),
            enabledPacks: accepted,
            recommendedPacks: recommended,
            recommendationDecisions: decisions,
        };
        const created = await prisma.organizationEditionConfig.create({
            data: {
                organizationId,
                editionKey: IndustryEditionKey.INSURANCE,
                version: nextVersion,
                status: EditionConfigStatus.ACTIVE,
                ...payload,
                createdByUserId: actorUserId,
                snapshot: snapshotOf({ ...payload, version: nextVersion }),
            },
        });
        await seedRiskTaxonomy(organizationId);
        await projectProcesses(organizationId, actorUserId, activities);
        await audit(organizationId, actorUserId, nextVersion === 1 ? 'insurance.edition.activated' : 'insurance.configuration.changed', 'OrganizationEditionConfig', created.id, { version: nextVersion });
        return serializeConfig(created);
    },

    async entities(organizationId: string) {
        const rows = await prisma.insuranceEntity.findMany({ where: { organizationId }, include: { licenses: true, children: true }, orderBy: { createdAt: 'asc' } });
        return rows.map((row) => ({
            ...row,
            childCount: row.children.length,
            licenseCount: row.licenses.length,
        }));
    },

    async createEntity(organizationId: string, actorUserId: string, input: Record<string, unknown>) {
        const config = await activeConfig(organizationId);
        if (!config) throw new ApiError(409, 'Activate Insurance Edition before adding entities.');
        const name = String(input.name || '').trim();
        if (!name) throw new ApiError(400, 'Name the insurance entity.');
        if (input.parentEntityId) {
            const parent = await prisma.insuranceEntity.findFirst({ where: { id: String(input.parentEntityId), organizationId } });
            if (!parent) throw new ApiError(404, 'Parent entity not found in this organization.');
        }
        const created = await prisma.insuranceEntity.create({
            data: {
                organizationId,
                publicId: publicId('ent'),
                name,
                organizationType: String(input.organizationType || config.organizationType),
                domicileCountryCode: String(input.domicileCountryCode || config.domicileCountryCode),
                domicileSubJurisdiction: input.domicileSubJurisdiction ? String(input.domicileSubJurisdiction) : null,
                operatingJurisdictions: asStringArray(input.operatingJurisdictions),
                linesOfBusiness: asStringArray(input.linesOfBusiness),
                isGroup: Boolean(input.isGroup),
                parentEntityId: input.parentEntityId ? String(input.parentEntityId) : null,
                notes: input.notes ? String(input.notes) : null,
                createdUnderConfigId: config.id,
            },
        });
        await projectEntity(organizationId, actorUserId, created);
        await audit(organizationId, actorUserId, 'insurance.entity.added', 'InsuranceEntity', created.id, { publicId: created.publicId });
        return created;
    },

    async licenses(organizationId: string) {
        const rows = await prisma.insuranceLicense.findMany({ where: { organizationId }, include: { entity: true }, orderBy: { createdAt: 'desc' } });
        const evidenceIds = rows.map((row) => row.evidenceObjectId).filter((id): id is string => Boolean(id));
        const objects = evidenceIds.length
            ? await prisma.storedObject.findMany({ where: { organizationId, id: { in: evidenceIds }, deletedAt: null } })
            : [];
        const byId = new Map(objects.map((row) => [row.id, row]));
        return rows.map((row) => ({ ...row, evidence: presentEvidence(row.evidenceObjectId ? byId.get(row.evidenceObjectId) || null : null) }));
    },

    async createLicense(organizationId: string, actorUserId: string, input: Record<string, unknown>) {
        const entity = await prisma.insuranceEntity.findFirst({ where: { organizationId, publicId: String(input.entityPublicId || input.entityId || '') } })
            || await prisma.insuranceEntity.findFirst({ where: { organizationId, id: String(input.entityId || '') } });
        if (!entity) throw new ApiError(404, 'Insurance entity not found.');
        const created = await prisma.insuranceLicense.create({
            data: {
                organizationId,
                publicId: publicId('lic'),
                entityId: entity.id,
                authorityKey: String(input.authorityKey || '').trim() || 'UNKNOWN',
                jurisdictionCode: String(input.jurisdictionCode || entity.domicileCountryCode),
                licenseType: String(input.licenseType || '').trim() || 'UNSPECIFIED',
                reference: input.reference ? String(input.reference) : null,
                classes: asStringArray(input.classes),
                status: (String(input.status || 'UNKNOWN') as 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'UNKNOWN'),
                effectiveDate: input.effectiveDate ? new Date(String(input.effectiveDate)) : null,
                expiryDate: input.expiryDate ? new Date(String(input.expiryDate)) : null,
                restrictions: input.restrictions ? String(input.restrictions) : null,
                ownerUserId: actorUserId,
                verificationBasis: (String(input.verificationBasis || 'CUSTOMER_RECORDED') as 'CUSTOMER_RECORDED' | 'DOCUMENT_VERIFIED' | 'EXTERNAL_SOURCE_VERIFIED'),
                reviewDueAt: input.reviewDueAt ? new Date(String(input.reviewDueAt)) : null,
                notes: input.notes ? String(input.notes) : 'Recorded metadata. Not a legal determination.',
            },
        });
        const licenseNode = await governanceGraphService.ensureNode({
            organizationId,
            actorUserId,
            nodeType: 'INSURANCE_LICENSE',
            sourceModel: 'InsuranceLicense',
            sourceId: created.id,
            displayLabel: created.licenseType,
        });
        const entityNode = await governanceGraphService.ensureNode({
            organizationId,
            actorUserId,
            nodeType: 'INSURANCE_ENTITY',
            sourceModel: 'InsuranceEntity',
            sourceId: entity.id,
            displayLabel: entity.name,
        });
        await governanceGraphService.createRelationship({
            organizationId,
            fromNodeId: entityNode.node.id,
            toNodeId: licenseNode.node.id,
            relationshipType: 'COVERED_BY',
            provenance: 'SYSTEM',
            createdBy: actorUserId,
        });
        await audit(organizationId, actorUserId, 'insurance.license.added', 'InsuranceLicense', created.id, { publicId: created.publicId });
        return created;
    },

    async updateLicense(organizationId: string, actorUserId: string, publicIdValue: string, input: Record<string, unknown>) {
        const existing = await prisma.insuranceLicense.findFirst({ where: { organizationId, publicId: publicIdValue } });
        if (!existing) throw new ApiError(404, 'License not found.');
        const updated = await prisma.insuranceLicense.update({
            where: { id: existing.id },
            data: {
                status: input.status ? String(input.status) as typeof existing.status : existing.status,
                reference: input.reference !== undefined ? String(input.reference || '') || null : existing.reference,
                expiryDate: input.expiryDate ? new Date(String(input.expiryDate)) : existing.expiryDate,
                reviewDueAt: input.reviewDueAt ? new Date(String(input.reviewDueAt)) : existing.reviewDueAt,
                verificationBasis: input.verificationBasis ? String(input.verificationBasis) as typeof existing.verificationBasis : existing.verificationBasis,
                notes: input.notes !== undefined ? String(input.notes) : existing.notes,
            },
        });
        await audit(organizationId, actorUserId, 'insurance.license.updated', 'InsuranceLicense', updated.id, { publicId: updated.publicId });
        return updated;
    },

    async attachLicenseEvidence(organizationId: string, actorUserId: string, publicIdValue: string, input: Record<string, unknown>) {
        const existing = await prisma.insuranceLicense.findFirst({ where: { organizationId, publicId: publicIdValue } });
        if (!existing) throw new ApiError(404, 'License not found.');
        const evidenceObjectId = String(input.evidenceObjectId || '').trim();
        if (!evidenceObjectId) throw new ApiError(400, 'Choose an existing Shared Evidence object.');
        const stored = await prisma.storedObject.findFirst({ where: { id: evidenceObjectId, organizationId, deletedAt: null } });
        if (!stored) throw new ApiError(404, 'Evidence not found.');
        if (stored.scanStatus !== ScanStatus.CLEAN) {
            throw new ApiError(403, 'Only files with a CLEAN malware scan can be used as license evidence.');
        }
        if (existing.evidenceObjectId === stored.id) {
            return { ...existing, evidence: presentEvidence(stored), replaced: false };
        }
        const updated = await prisma.insuranceLicense.update({
            where: { id: existing.id },
            data: { evidenceObjectId: stored.id, verificationBasis: existing.verificationBasis === 'CUSTOMER_RECORDED' ? 'DOCUMENT_VERIFIED' : existing.verificationBasis },
        });
        await audit(organizationId, actorUserId, 'insurance.license.evidence.attached', 'InsuranceLicense', updated.id, {
            publicId: updated.publicId,
            evidenceObjectId: stored.id,
            previousEvidenceObjectId: existing.evidenceObjectId,
            action: existing.evidenceObjectId ? 'replaced' : 'attached',
            filename: stored.filename,
        });
        return { ...updated, evidence: presentEvidence(stored), replaced: Boolean(existing.evidenceObjectId) };
    },

    async classifyVendor(organizationId: string, actorUserId: string, input: Record<string, unknown>) {
        const vendorId = String(input.vendorId || '');
        const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, organizationId } });
        if (!vendor) throw new ApiError(404, 'Vendor not found in this organization.');
        const created = await prisma.insuranceVendorClassification.upsert({
            where: { organizationId_vendorId_serviceCategory: { organizationId, vendorId, serviceCategory: String(input.serviceCategory || 'OTHER') } },
            create: {
                organizationId,
                vendorId,
                serviceCategory: String(input.serviceCategory || 'OTHER'),
                jurisdictionCode: input.jurisdictionCode ? String(input.jurisdictionCode) : null,
                entityId: input.entityId ? String(input.entityId) : null,
                linesOfBusiness: asStringArray(input.linesOfBusiness),
                claimsAuthority: Boolean(input.claimsAuthority),
                underwritingAuthority: Boolean(input.underwritingAuthority),
                policyholderInteraction: Boolean(input.policyholderInteraction),
                premiumHandling: Boolean(input.premiumHandling),
                criticality: input.criticality ? String(input.criticality) : null,
                licenseRequired: Boolean(input.licenseRequired),
                aiModelProvider: Boolean(input.aiModelProvider),
                regulatedOutsourcing: Boolean(input.regulatedOutsourcing),
                fourthPartyUse: Boolean(input.fourthPartyUse),
                notes: input.notes ? String(input.notes) : null,
            },
            update: {
                jurisdictionCode: input.jurisdictionCode ? String(input.jurisdictionCode) : null,
                entityId: input.entityId ? String(input.entityId) : null,
                linesOfBusiness: asStringArray(input.linesOfBusiness),
                claimsAuthority: Boolean(input.claimsAuthority),
                underwritingAuthority: Boolean(input.underwritingAuthority),
                policyholderInteraction: Boolean(input.policyholderInteraction),
                premiumHandling: Boolean(input.premiumHandling),
                criticality: input.criticality ? String(input.criticality) : null,
                licenseRequired: Boolean(input.licenseRequired),
                aiModelProvider: Boolean(input.aiModelProvider),
                regulatedOutsourcing: Boolean(input.regulatedOutsourcing),
                fourthPartyUse: Boolean(input.fourthPartyUse),
                notes: input.notes ? String(input.notes) : null,
            },
        });
        await governanceGraphService.ensureNode({
            organizationId,
            actorUserId,
            nodeType: 'VENDOR',
            sourceModel: 'Vendor',
            sourceId: vendorId,
            displayLabel: vendor.name,
        });
        await audit(organizationId, actorUserId, 'insurance.vendor.classified', 'InsuranceVendorClassification', created.id, { vendorId });
        return created;
    },

    async vendorClasses(organizationId: string) {
        return prisma.insuranceVendorClassification.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
    },

    async upsertAiContext(organizationId: string, actorUserId: string, input: Record<string, unknown>) {
        const aiSystemId = String(input.aiSystemId || '');
        const system = await prisma.aiSystem.findFirst({ where: { id: aiSystemId, organizationId } }).catch(() => null);
        if (!system) throw new ApiError(404, 'AI system not found in this organization.');
        const saved = await prisma.insuranceAiContext.upsert({
            where: { organizationId_aiSystemId: { organizationId, aiSystemId } },
            create: {
                organizationId,
                aiSystemId,
                entityId: input.entityId ? String(input.entityId) : null,
                jurisdictionCode: input.jurisdictionCode ? String(input.jurisdictionCode) : null,
                insuranceUseCase: input.insuranceUseCase ? String(input.insuranceUseCase) : null,
                lineOfBusiness: input.lineOfBusiness ? String(input.lineOfBusiness) : null,
                underwritingInfluence: Boolean(input.underwritingInfluence),
                pricingInfluence: Boolean(input.pricingInfluence),
                claimsInfluence: Boolean(input.claimsInfluence),
                fraudInfluence: Boolean(input.fraudInfluence),
                consumerImpact: Boolean(input.consumerImpact),
                externalData: Boolean(input.externalData),
                thirdPartyProvider: input.thirdPartyProvider ? String(input.thirdPartyProvider) : null,
                validationStatus: input.validationStatus ? String(input.validationStatus) : null,
                biasReviewStatus: input.biasReviewStatus ? String(input.biasReviewStatus) : null,
                explainability: input.explainability ? String(input.explainability) : null,
                humanOversight: input.humanOversight ? String(input.humanOversight) : null,
                lastReviewAt: input.lastReviewAt ? new Date(String(input.lastReviewAt)) : null,
                nextReviewAt: input.nextReviewAt ? new Date(String(input.nextReviewAt)) : null,
            },
            update: {
                entityId: input.entityId ? String(input.entityId) : null,
                jurisdictionCode: input.jurisdictionCode ? String(input.jurisdictionCode) : null,
                insuranceUseCase: input.insuranceUseCase ? String(input.insuranceUseCase) : null,
                lineOfBusiness: input.lineOfBusiness ? String(input.lineOfBusiness) : null,
                underwritingInfluence: Boolean(input.underwritingInfluence),
                pricingInfluence: Boolean(input.pricingInfluence),
                claimsInfluence: Boolean(input.claimsInfluence),
                fraudInfluence: Boolean(input.fraudInfluence),
                consumerImpact: Boolean(input.consumerImpact),
                externalData: Boolean(input.externalData),
                thirdPartyProvider: input.thirdPartyProvider ? String(input.thirdPartyProvider) : null,
                validationStatus: input.validationStatus ? String(input.validationStatus) : null,
                biasReviewStatus: input.biasReviewStatus ? String(input.biasReviewStatus) : null,
                explainability: input.explainability ? String(input.explainability) : null,
                humanOversight: input.humanOversight ? String(input.humanOversight) : null,
                lastReviewAt: input.lastReviewAt ? new Date(String(input.lastReviewAt)) : null,
                nextReviewAt: input.nextReviewAt ? new Date(String(input.nextReviewAt)) : null,
            },
        });
        await governanceGraphService.ensureNode({
            organizationId,
            actorUserId,
            nodeType: 'AI_SYSTEM',
            sourceModel: 'AiSystem',
            sourceId: aiSystemId,
            displayLabel: system.name,
        });
        await audit(organizationId, actorUserId, 'insurance.ai.context.updated', 'InsuranceAiContext', saved.id, { aiSystemId });
        return saved;
    },

    async aiContexts(organizationId: string) {
        return prisma.insuranceAiContext.findMany({ where: { organizationId } });
    },

    async riskSummary(organizationId: string) {
        const categories = await prisma.enterpriseRiskCustomCategory.findMany({
            where: { organizationId, name: { startsWith: 'Insurance /' } },
            include: { _count: { select: { risks: true } } },
        });
        return {
            honesty: HONESTY,
            register: 'Supreme Risk',
            categories: categories.map((row) => ({ name: row.name, parent: row.canonicalParent, riskCount: row._count.risks })),
        };
    },

    async graphLinks(organizationId: string) {
        return prisma.governanceNode.findMany({
            where: { organizationId, nodeType: { in: ['INSURANCE_ENTITY', 'INSURANCE_LICENSE', 'JURISDICTION', 'REGULATOR', 'LINE_OF_BUSINESS', 'BUSINESS_PROCESS', 'CRITICAL_SERVICE', 'VENDOR', 'AI_SYSTEM'] } },
            select: { id: true, nodeType: true, displayLabel: true, sourceModel: true, sourceId: true },
        });
    },
};

export type InsuranceService = typeof insuranceService;

import crypto from 'crypto';
import { InsuranceApplicabilityState, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from '../services/auditEventService';
import { governanceGraphService } from '../services/governanceGraphService';
import { recommendPacks } from './catalog';
import { ASSESSMENT_QUESTIONS, FUTURE_JURISDICTIONS, INSURANCE_DATA_CATEGORIES, REGULATORY_PACKS, REGULATORY_REQUIREMENTS, generateAssessmentPlan, requirementsForPack } from './regulatoryCatalog';
import { insuranceService } from './insuranceService';

function asStringArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    return [];
}

function publicId(prefix: string) {
    return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

async function audit(organizationId: string, actorUserId: string | undefined, action: string, resourceType: string, resourceId?: string, metadata?: Record<string, unknown>) {
    await recordAudit({ organizationId, actorUserId, action, resourceType, resourceId, result: 'success', metadata });
}

function latestDecision<T extends { packKey: string; createdAt: Date }>(rows: T[], packKey: string) {
    return rows.filter((row) => row.packKey === packKey).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}

export const insuranceOperations = {
    async regulatoryWorkspace(organizationId: string, organizationType?: string, countries?: string[], subJurisdictions?: string[], activities?: string[]) {
        const config = await prisma.organizationEditionConfig.findFirst({
            where: { organizationId, editionKey: 'INSURANCE', status: 'ACTIVE' },
            orderBy: { version: 'desc' },
        });
        const decisions = await prisma.insuranceApplicabilityDecision.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
        const recommended = recommendPacks({
            organizationType: organizationType || config?.organizationType,
            countries: countries || [config?.domicileCountryCode || '', ...asStringArray(config?.operatingJurisdictions)].map((row) => row.split('-')[0] || row),
            subJurisdictions: subJurisdictions || asStringArray(config?.operatingJurisdictions),
            activities: activities || asStringArray(config?.activities),
        });
        const packs = REGULATORY_PACKS.map((pack) => {
            const last = latestDecision(decisions, pack.key);
            const rec = recommended.find((row) => row.key === pack.key);
            return {
                ...pack,
                recommended: Boolean(rec),
                whyRecommended: rec?.reason || pack.honesty,
                applicabilityState: last?.state || (rec ? 'RECOMMENDED' : 'AVAILABLE'),
                lastReason: last?.reason || null,
                lastVersion: last?.packVersion || pack.version,
                requirements: requirementsForPack(pack.key),
                mappedControls: [...new Set(requirementsForPack(pack.key).flatMap((row) => row.controlKeys))],
                evidenceCategories: [...new Set(requirementsForPack(pack.key).flatMap((row) => row.evidenceCategories))],
            };
        });
        return {
            honesty: 'Recommended is not applicable. Applicable is a human decision. Configured is not compliant. No single percentage is shown without a valid denominator.',
            packs,
            assessmentQuestions: ASSESSMENT_QUESTIONS,
            assessmentPlan: generateAssessmentPlan({
                organizationType: organizationType || config?.organizationType,
                enabledPacks: asStringArray(config?.enabledPacks),
                activities: activities || asStringArray(config?.activities),
            }),
            dataCategories: INSURANCE_DATA_CATEGORIES,
            futureJurisdictionsReady: FUTURE_JURISDICTIONS,
        };
    },

    async reviewApplicability(organizationId: string, actorUserId: string, input: Record<string, unknown>) {
        const packKey = String(input.packKey || '');
        const pack = REGULATORY_PACKS.find((row) => row.key === packKey);
        if (!pack) throw new ApiError(404, 'Unknown regulatory pack.');
        const state = String(input.state || 'NEEDS_REVIEW') as InsuranceApplicabilityState;
        if (!['APPLICABLE', 'NOT_APPLICABLE', 'NEEDS_REVIEW', 'ENABLED', 'DISABLED'].includes(state)) throw new ApiError(400, 'Choose a valid applicability state.');
        if (state === 'NOT_APPLICABLE' && !String(input.reason || '').trim()) throw new ApiError(400, 'A reason is required when marking a pack not applicable.');
        const created = await prisma.insuranceApplicabilityDecision.create({
            data: {
                organizationId,
                packKey,
                packVersion: pack.version,
                state,
                reason: input.reason ? String(input.reason) : null,
                actorUserId,
                snapshot: { packKey, version: pack.version, sourceUrl: pack.sourceUrl, overlay: pack.overlay } as Prisma.InputJsonValue,
            },
        });
        await audit(organizationId, actorUserId, 'insurance.applicability.reviewed', 'InsuranceApplicabilityDecision', created.id, { packKey, state });
        return created;
    },

    async claimsWorkspace(organizationId: string) {
        const [entities, vendors, authorities, risks, findings, models] = await Promise.all([
            prisma.insuranceEntity.findMany({ where: { organizationId } }),
            prisma.insuranceVendorClassification.findMany({ where: { organizationId, serviceCategory: { in: ['TPA', 'CLAIMS_ADMINISTRATOR', 'LOSS_ADJUSTER', 'INDEPENDENT_ADJUSTER', 'REPAIR_NETWORK', 'RESTORATION', 'MEDICAL_IME', 'LEGAL', 'INVESTIGATOR', 'SIU_FRAUD', 'CATASTROPHE_RESPONSE'] } } }),
            prisma.insuranceDelegatedAuthority.findMany({ where: { organizationId, kind: { in: ['CLAIMS', 'BINDING'] } } }),
            prisma.enterpriseRisk.findMany({ where: { organizationId, customCategory: { name: { startsWith: 'Insurance / Claims' } } }, take: 20 }).catch(() => []),
            prisma.vendorIssue.findMany({ where: { organizationId, status: { notIn: ['CLOSED', 'RESOLVED', 'RISK_ACCEPTED'] } }, take: 20 }).catch(() => []),
            prisma.insuranceAiContext.findMany({ where: { organizationId, claimsInfluence: true } }),
        ]);
        return {
            honesty: 'Claims governance only. Supreme is not a claims-processing system.',
            process: 'Claims process',
            entities,
            vendors,
            delegatedAuthority: authorities,
            risks,
            findings,
            models,
        };
    },

    async underwritingWorkspace(organizationId: string) {
        const [entities, vendors, authorities, models] = await Promise.all([
            prisma.insuranceEntity.findMany({ where: { organizationId } }),
            prisma.insuranceVendorClassification.findMany({ where: { organizationId, serviceCategory: { in: ['MGA_MGU', 'UNDERWRITING_DATA', 'ACTUARIAL', 'AI_MODEL_VENDOR', 'DATA_PROVIDER', 'TELEMATICS'] } } }),
            prisma.insuranceDelegatedAuthority.findMany({ where: { organizationId, kind: { in: ['UNDERWRITING', 'BINDING'] } } }),
            prisma.insuranceAiContext.findMany({ where: { organizationId, OR: [{ underwritingInfluence: true }, { pricingInfluence: true }] } }),
        ]);
        return {
            honesty: 'Underwriting and pricing governance only. Not a quoting or rating engine.',
            process: 'Underwriting / pricing process',
            entities,
            vendors,
            delegatedAuthority: authorities,
            models,
        };
    },

    async reinsuranceWorkspace(organizationId: string) {
        const [rows, vendors] = await Promise.all([
            prisma.insuranceCounterparty.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } }),
            prisma.insuranceVendorClassification.findMany({ where: { organizationId, serviceCategory: 'REINSURER' } }),
        ]);
        const byName = new Map<string, number>();
        for (const row of rows) byName.set(row.name, (byName.get(row.name) || 0) + 1);
        return {
            honesty: 'Counterparty governance metadata. Not placement, ceding, or treaty administration.',
            counterparties: rows,
            classifiedReinsurers: vendors,
            concentration: [...byName.entries()].map(([name, count]) => ({ name, relationshipCount: count, basis: 'Recorded relationships. Not an exposure percentage.' })),
        };
    },

    async createDelegatedAuthority(organizationId: string, actorUserId: string, input: Record<string, unknown>) {
        const created = await prisma.insuranceDelegatedAuthority.create({
            data: {
                organizationId,
                publicId: publicId('del'),
                kind: String(input.kind || 'CLAIMS'),
                delegateName: String(input.delegateName || '').trim() || 'Unnamed delegate',
                vendorId: input.vendorId ? String(input.vendorId) : null,
                entityId: input.entityId ? String(input.entityId) : null,
                jurisdictionCode: input.jurisdictionCode ? String(input.jurisdictionCode) : null,
                linesOfBusiness: asStringArray(input.linesOfBusiness),
                scope: input.scope ? String(input.scope) : null,
                limits: input.limits ? String(input.limits) : null,
                reviewDueAt: input.reviewDueAt ? new Date(String(input.reviewDueAt)) : null,
                notes: input.notes ? String(input.notes) : 'Recorded metadata. Not a legal interpretation of authority granted.',
                ownerUserId: actorUserId,
            },
        });
        await audit(organizationId, actorUserId, 'insurance.delegated_authority.changed', 'InsuranceDelegatedAuthority', created.id, { publicId: created.publicId });
        return created;
    },

    async createCounterparty(organizationId: string, actorUserId: string, input: Record<string, unknown>) {
        const created = await prisma.insuranceCounterparty.create({
            data: {
                organizationId,
                publicId: publicId('rei'),
                name: String(input.name || '').trim() || 'Unnamed reinsurer',
                vendorId: input.vendorId ? String(input.vendorId) : null,
                relationshipType: String(input.relationshipType || 'TREATY'),
                entityId: input.entityId ? String(input.entityId) : null,
                jurisdictionCode: input.jurisdictionCode ? String(input.jurisdictionCode) : null,
                linesOfBusiness: asStringArray(input.linesOfBusiness),
                criticality: input.criticality ? String(input.criticality) : null,
                reviewDueAt: input.reviewDueAt ? new Date(String(input.reviewDueAt)) : null,
                notes: input.notes ? String(input.notes) : null,
            },
        });
        if (created.vendorId) {
            await governanceGraphService.ensureNode({
                organizationId,
                actorUserId,
                nodeType: 'VENDOR',
                sourceModel: 'Vendor',
                sourceId: created.vendorId,
                displayLabel: created.name,
            });
        }
        await audit(organizationId, actorUserId, 'insurance.counterparty.changed', 'InsuranceCounterparty', created.id, { publicId: created.publicId });
        return created;
    },

    async concentration(organizationId: string) {
        const vendors = await prisma.insuranceVendorClassification.findMany({ where: { organizationId } });
        const counterparties = await prisma.insuranceCounterparty.findMany({ where: { organizationId } });
        const models = await prisma.insuranceAiContext.findMany({ where: { organizationId } });
        const byCategory: Record<string, number> = {};
        for (const row of vendors) byCategory[row.serviceCategory] = (byCategory[row.serviceCategory] || 0) + 1;
        return {
            honesty: 'Counts of recorded relationships. Not invented exposure percentages.',
            vendorCategories: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
            reinsurers: counterparties.length,
            modelsInfluencingUwOrClaims: models.filter((row) => row.underwritingInfluence || row.claimsInfluence || row.pricingInfluence).length,
        };
    },

    async licenseAttention(organizationId: string) {
        const licenses = await prisma.insuranceLicense.findMany({ where: { organizationId }, include: { entity: true } });
        const now = new Date();
        const soon = new Date(Date.now() + 90 * 86400000);
        return licenses.map((row) => {
            let attention = 'current';
            let message = 'Recorded metadata.';
            if (row.expiryDate && row.expiryDate < now) {
                attention = 'expired-metadata';
                message = 'Recorded license expiry has passed — review required. This is not a finding that the entity is operating illegally.';
            } else if (row.expiryDate && row.expiryDate <= soon) {
                attention = 'expiring';
                message = 'Recorded expiry is within 90 days — review required.';
            } else if (row.reviewDueAt && row.reviewDueAt <= now) {
                attention = 'review-overdue';
                message = 'License review date has passed.';
            } else if (!row.evidenceObjectId) {
                attention = 'missing-evidence';
                message = 'No linked evidence object. Missing evidence is unknown, not a legal finding.';
            }
            return {
                ...row,
                attention,
                message,
                verificationHonesty: row.verificationBasis === 'EXTERNAL_SOURCE_VERIFIED'
                    ? 'External source verified'
                    : row.verificationBasis === 'DOCUMENT_VERIFIED'
                        ? 'Document verified in Supreme'
                        : 'Customer-recorded. Supreme has not verified this license against an official registry.',
            };
        });
    },

    async signals(organizationId: string) {
        const [licenses, models, findings, counterparties] = await Promise.all([
            this.licenseAttention(organizationId),
            prisma.insuranceAiContext.findMany({ where: { organizationId } }),
            prisma.vendorIssue.count({ where: { organizationId, severity: { in: ['HIGH', 'CRITICAL'] }, status: { notIn: ['CLOSED', 'RESOLVED'] } } }).catch(() => 0),
            prisma.insuranceCounterparty.findMany({ where: { organizationId } }),
        ]);
        const now = new Date();
        return [
            ...licenses.filter((row) => row.attention !== 'current').map((row) => ({ type: `license-${row.attention}`, why: row.message, href: '/insurance/licenses' })),
            ...models.filter((row) => row.nextReviewAt && row.nextReviewAt <= now).map((row) => ({ type: 'ai-review-overdue', why: 'Insurance AI context next-review date has passed.', href: '/insurance/ai' })),
            ...(findings ? [{ type: 'critical-finding', why: `${findings} open high/critical vendor findings.`, href: '/findings' }] : []),
            ...(counterparties.filter((row) => row.reviewDueAt && row.reviewDueAt <= now).map((row) => ({ type: 'reinsurance-review', why: `Reinsurance relationship ${row.name} review is due.`, href: '/insurance/reinsurance' }))),
        ];
    },

    async reports(organizationId: string) {
        const [overview, regulatory, licenses, concentration, models, vendors] = await Promise.all([
            insuranceService.overview(organizationId),
            this.regulatoryWorkspace(organizationId),
            this.licenseAttention(organizationId),
            this.concentration(organizationId),
            insuranceService.aiContexts(organizationId),
            insuranceService.vendorClasses(organizationId),
        ]);
        return {
            honesty: 'Live tenant records only. No fabricated compliance percentage.',
            reports: [
                { key: 'executive', title: 'Insurance Executive Risk Overview', data: overview },
                { key: 'third-parties', title: 'Insurance Third-Party Oversight', data: vendors },
                { key: 'licenses', title: 'License & Authorization Register', data: licenses },
                { key: 'regulatory', title: 'Regulatory Readiness', data: { packs: regulatory.packs.map((pack) => ({ key: pack.key, state: pack.applicabilityState, controls: pack.mappedControls, source: pack.sourceUrl })) } },
                { key: 'models', title: 'Insurance AI / Model Inventory', data: models },
                { key: 'concentration', title: 'Critical Service / Concentration', data: concentration },
            ],
        };
    },

    futureArchitectureIntact() {
        return {
            hardCodedOnly: ['NG', 'US', 'US-NY'],
            laterCapableWithoutSchemaChange: FUTURE_JURISDICTIONS,
            note: 'Phase B adds Nigeria and US/NY reference packs only. Other jurisdictions remain catalog-ready.',
        };
    },

    examReadinessDeferred() {
        return {
            deferred: true,
            reason: 'A regulator/exam workspace would duplicate the existing audit/assessment module if built as a new subsystem. Deferred inside #23 until Product Leadership authorizes reuse of those primitives.',
            reuse: ['findings', 'evidence', 'controls', 'assessments'],
        };
    },

    async complaintContext(organizationId: string) {
        const [risks, findings] = await Promise.all([
            prisma.enterpriseRisk.findMany({ where: { organizationId, customCategory: { name: { startsWith: 'Insurance / Conduct' } } }, take: 20 }).catch(() => []),
            prisma.vendorIssue.findMany({ where: { organizationId, status: { notIn: ['CLOSED', 'RESOLVED'] } }, take: 20 }).catch(() => []),
        ]);
        return {
            honesty: 'Governance tags only. Supreme is not a complaints CRM. Operational complaint systems integrate later through #22.',
            tags: ['Claims complaint', 'Sales/distribution complaint', 'Policy administration complaint', 'Vendor-related complaint', 'Conduct issue'],
            risks,
            openFindings: findings,
        };
    },

    packChangeImpact(fromVersion: string, toVersion: string, packKey: string) {
        const current = requirementsForPack(packKey);
        return {
            honesty: 'A pack version change does not silently mark controls noncompliant. Historical assessments stay on the version they were measured against.',
            packKey,
            fromVersion,
            toVersion,
            impactedRequirements: current.map((row) => row.id),
            impactedControls: [...new Set(current.flatMap((row) => row.controlKeys))],
            impactedEvidence: [...new Set(current.flatMap((row) => row.evidenceCategories))],
            next: ['Owner review', 'Applicability decision', 'Gap/task if the human confirms impact'],
        };
    },
};

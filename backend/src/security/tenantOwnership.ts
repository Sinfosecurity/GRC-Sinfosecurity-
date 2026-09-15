/**
 * Tenant parent-ownership lookups.
 * Authenticated organizationId is authoritative. Missing or cross-tenant parents are 404.
 */

import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';

function notFound(resource: string): never {
    throw new ApiError(404, `${resource} not found`);
}

export async function requireVendorForOrganization(organizationId: string, vendorId: string) {
    if (!organizationId || !vendorId) notFound('Vendor');
    const vendor = await prisma.vendor.findFirst({
        where: { id: vendorId, organizationId },
        select: { id: true, organizationId: true },
    });
    if (!vendor) notFound('Vendor');
    return vendor;
}

export async function requireAssessmentForOrganization(
    organizationId: string,
    assessmentId: string,
    vendorId?: string
) {
    if (!organizationId || !assessmentId) notFound('Assessment');
    const assessment = await prisma.vendorAssessment.findFirst({
        where: { id: assessmentId, organizationId },
        select: { id: true, organizationId: true, vendorId: true },
    });
    if (!assessment) notFound('Assessment');
    if (vendorId && assessment.vendorId !== vendorId) {
        throw new ApiError(409, 'Assessment does not belong to this vendor');
    }
    return assessment;
}

export async function requireContractForOrganization(
    organizationId: string,
    contractId: string,
    vendorId?: string
) {
    if (!organizationId || !contractId) notFound('Contract');
    const contract = await prisma.vendorContract.findFirst({
        where: { id: contractId, organizationId },
        select: { id: true, organizationId: true, vendorId: true },
    });
    if (!contract) notFound('Contract');
    if (vendorId && contract.vendorId !== vendorId) {
        throw new ApiError(409, 'Contract does not belong to this vendor');
    }
    return contract;
}

export async function requireAppetiteBreachForOrganization(organizationId: string, breachId: string) {
    if (!organizationId || !breachId) notFound('Breach');
    const breach = await prisma.riskAppetiteBreach.findFirst({
        where: { id: breachId, riskAppetite: { organizationId } },
        select: { id: true },
    });
    if (!breach) notFound('Breach');
    return breach;
}

export async function requireBusinessUnitForOrganization(organizationId: string, businessUnitId: string) {
    if (!organizationId || !businessUnitId) notFound('Business unit');
    const unit = await prisma.businessUnit.findFirst({
        where: { id: businessUnitId, organizationId },
        select: { id: true, organizationId: true },
    });
    if (!unit) notFound('Business unit');
    return unit;
}

export function omitForeignParent<T extends { organizationId?: string | null }>(
    organizationId: string,
    related: T | null | undefined
): T | null {
    if (!related) return null;
    if (related.organizationId && related.organizationId !== organizationId) return null;
    return related;
}

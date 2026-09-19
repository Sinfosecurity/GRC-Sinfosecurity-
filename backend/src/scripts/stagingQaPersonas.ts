/**
 * Staging-only TPRM QA personas. Does not change Golden Journey or vendor authentication.
 */
import { IntakeStatus, Role, UserAccountStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { recordAudit } from '../services/auditEventService';
import { hashPassword, randomToken, validatePasswordPolicy } from '../services/passwordService';
import { createIntakeRequest } from '../services/intakeEngagementService';
import { customerLandingPath, permissionsForRole } from '../security/rbac';
import {
    assertQaOrganizationTarget,
    assertStagingQaPersonasAllowed,
    MANUAL_CASE,
    QA_ORG_NAME,
    QA_ORG_SLUG,
    QA_VENDOR_CONTACT,
} from './stagingQaGuards';

export type QaPersonaKey = 'requester' | 'lead' | 'analyst';

export type QaPersonaDefinition = {
    key: QaPersonaKey;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    passwordEnv: string;
    landingPath: string;
};

export const QA_PERSONAS: QaPersonaDefinition[] = [
    {
        key: 'requester',
        email: 'qa.requester@supremegrc.test',
        firstName: 'QA',
        lastName: 'Requester',
        role: Role.BUSINESS_OWNER,
        passwordEnv: 'STAGING_QA_REQUESTER_PASSWORD',
        landingPath: '/request',
    },
    {
        key: 'lead',
        email: 'qa.tprm.lead@supremegrc.test',
        firstName: 'QA',
        lastName: 'TPRM Lead',
        role: Role.RISK_MANAGER,
        passwordEnv: 'STAGING_QA_TPRM_LEAD_PASSWORD',
        landingPath: '/dashboard',
    },
    {
        key: 'analyst',
        email: 'qa.tprm.analyst@supremegrc.test',
        firstName: 'QA',
        lastName: 'TPRM Analyst',
        role: Role.ASSESSOR,
        passwordEnv: 'STAGING_QA_TPRM_ANALYST_PASSWORD',
        landingPath: '/dashboard',
    },
];

export type ProvisionedPersona = {
    key: QaPersonaKey;
    id: string;
    email: string;
    name: string;
    role: Role;
    landingPath: string;
    created: boolean;
    passwordRotated: boolean;
    plaintextPassword?: string;
};

export type QaOrgSummary = {
    id: string;
    name: string;
    slug: string;
};

function displayName(persona: QaPersonaDefinition) {
    return `${persona.firstName} ${persona.lastName}`;
}

function resolvePassword(persona: QaPersonaDefinition, env: NodeJS.ProcessEnv): { password: string; fromSecret: boolean; generated: boolean } {
    const fromEnv = String(env[persona.passwordEnv] || '').trim();
    if (fromEnv) {
        const invalid = validatePasswordPolicy(fromEnv);
        if (invalid) {
            throw new Error(`${persona.passwordEnv} does not meet the password policy: ${invalid}`);
        }
        return { password: fromEnv, fromSecret: true, generated: false };
    }
    const generated = `Sr#${randomToken(12)}A1`;
    const invalid = validatePasswordPolicy(generated);
    if (invalid) {
        throw new Error(`Generated staging password failed policy: ${invalid}`);
    }
    return { password: generated, fromSecret: false, generated: true };
}

async function assertVendorIsNotAUser() {
    const vendorUser = await prisma.user.findUnique({ where: { email: QA_VENDOR_CONTACT.email } });
    if (vendorUser) {
        throw new Error(
            `QA vendor email ${QA_VENDOR_CONTACT.email} already has a User row (${vendorUser.id}). Vendor authentication ADR forbids a Vendor User. STOP.`
        );
    }
}

export async function ensureQaOrganization(): Promise<QaOrgSummary> {
    assertStagingQaPersonasAllowed();
    const existing = await prisma.organization.findFirst({
        where: { OR: [{ slug: QA_ORG_SLUG }, { name: QA_ORG_NAME }] },
    });
    if (existing) {
        assertQaOrganizationTarget({ slug: existing.slug, name: existing.name });
        if (existing.slug !== QA_ORG_SLUG || existing.name !== QA_ORG_NAME) {
            throw new Error('Existing QA organization identity does not match the locked slug and name.');
        }
        return { id: existing.id, name: existing.name, slug: existing.slug || QA_ORG_SLUG };
    }
    const created = await prisma.organization.create({
        data: {
            name: QA_ORG_NAME,
            slug: QA_ORG_SLUG,
            country: 'US',
            status: 'ACTIVE',
            plan: 'ENTERPRISE',
            isDemo: false,
        },
    });
    return { id: created.id, name: created.name, slug: created.slug || QA_ORG_SLUG };
}

export async function bootstrapQaUsers(env: NodeJS.ProcessEnv = process.env): Promise<{
    organization: QaOrgSummary;
    personas: ProvisionedPersona[];
    vendorUserCreated: false;
    passwordDelivery: 'staging_secret' | 'generated_once' | 'mixed';
}> {
    assertStagingQaPersonasAllowed(env);
    await assertVendorIsNotAUser();
    const organization = await ensureQaOrganization();

    const personas: ProvisionedPersona[] = [];
    let generatedCount = 0;
    let secretCount = 0;

    for (const persona of QA_PERSONAS) {
        const existing = await prisma.user.findUnique({ where: { email: persona.email } });
        if (existing && existing.organizationId !== organization.id) {
            throw new Error(
                `${persona.email} already exists in organization ${existing.organizationId}. Refusing to move a user into the QA tenant.`
            );
        }
        const { password, fromSecret, generated } = resolvePassword(persona, env);
        if (generated) generatedCount += 1;
        if (fromSecret) secretCount += 1;
        const hashedPassword = await hashPassword(password);
        const firstName = persona.firstName;
        const lastName = persona.lastName;

        if (!existing) {
            const user = await prisma.user.create({
                data: {
                    email: persona.email,
                    hashedPassword,
                    firstName,
                    lastName,
                    role: persona.role,
                    organizationId: organization.id,
                    status: UserAccountStatus.ACTIVE,
                    emailVerifiedAt: new Date(),
                    passwordChangedAt: new Date(),
                    provisioningSource: 'staging_qa_personas',
                    mfaEnabled: false,
                },
            });
            await recordAudit({
                organizationId: organization.id,
                actorUserId: user.id,
                action: 'staging.qa_persona_created',
                resourceType: 'User',
                resourceId: user.id,
                result: 'success',
                metadata: { email: persona.email, role: persona.role, method: 'staging_qa_personas' },
            });
            personas.push({
                key: persona.key,
                id: user.id,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                role: user.role,
                landingPath: customerLandingPath(user.role),
                created: true,
                passwordRotated: true,
                plaintextPassword: password,
            });
            continue;
        }

        const user = await prisma.user.update({
            where: { id: existing.id },
            data: {
                firstName,
                lastName,
                role: persona.role,
                status: UserAccountStatus.ACTIVE,
                disabledAt: null,
                emailVerifiedAt: existing.emailVerifiedAt || new Date(),
                hashedPassword,
                passwordChangedAt: new Date(),
                provisioningSource: existing.provisioningSource || 'staging_qa_personas',
            },
        });
        await recordAudit({
            organizationId: organization.id,
            actorUserId: user.id,
            action: 'staging.qa_persona_updated',
            resourceType: 'User',
            resourceId: user.id,
            result: 'success',
            metadata: { email: persona.email, role: persona.role, method: 'staging_qa_personas' },
        });
        personas.push({
            key: persona.key,
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            landingPath: customerLandingPath(user.role),
            created: false,
            passwordRotated: true,
            plaintextPassword: password,
        });
    }

    await assertVendorIsNotAUser();
    const passwordDelivery = generatedCount && secretCount ? 'mixed' : generatedCount ? 'generated_once' : 'staging_secret';
    return { organization, personas, vendorUserCreated: false, passwordDelivery };
}

export async function qaStatus() {
    assertStagingQaPersonasAllowed();
    const organization = await prisma.organization.findFirst({ where: { slug: QA_ORG_SLUG } });
    if (!organization) {
        return { organization: null, personas: [], vendorUser: false, vendorContacts: [], intakes: [] };
    }
    assertQaOrganizationTarget({ slug: organization.slug, name: organization.name });
    const users = await prisma.user.findMany({
        where: { organizationId: organization.id },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
        orderBy: { email: 'asc' },
    });
    const vendorUser = await prisma.user.findUnique({ where: { email: QA_VENDOR_CONTACT.email }, select: { id: true } });
    const vendorContacts = await prisma.vendorContact.findMany({
        where: { email: { equals: QA_VENDOR_CONTACT.email, mode: 'insensitive' }, vendor: { organizationId: organization.id } },
        select: { id: true, name: true, email: true, vendorId: true },
    });
    const intakes = await prisma.intakeRequest.findMany({
        where: { organizationId: organization.id },
        select: { id: true, publicId: true, proposedThirdPartyName: true, proposedServiceName: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
    return {
        organization: { id: organization.id, name: organization.name, slug: organization.slug },
        personas: users.map((user) => ({
            ...user,
            name: `${user.firstName} ${user.lastName}`,
            landingPath: customerLandingPath(user.role),
            permissions: permissionsForRole(user.role),
        })),
        vendorUser: Boolean(vendorUser),
        vendorContacts,
        intakes,
    };
}

async function requireQaOrganization() {
    const organization = await prisma.organization.findFirst({ where: { slug: QA_ORG_SLUG } });
    if (!organization) {
        throw new Error(`QA organization ${QA_ORG_SLUG} was not found.`);
    }
    assertQaOrganizationTarget({ slug: organization.slug, name: organization.name });
    return organization;
}

export async function resetQaTestData() {
    assertStagingQaPersonasAllowed();
    const organization = await requireQaOrganization();
    const organizationId = organization.id;

    const counts: Record<string, number> = {};
    const record = (key: string, count: number) => {
        counts[key] = count;
    };

    await prisma.intakeRequest.updateMany({
        where: { organizationId },
        data: { createdEngagementId: null, matchedVendorId: null },
    });
    await prisma.vendorOnboarding.updateMany({
        where: { organizationId },
        data: { engagementId: null, invitationId: null, assessmentContactId: null },
    });
    await prisma.engagementDueDiligencePlan.updateMany({
        where: { organizationId },
        data: { assessmentContactId: null, invitationId: null },
    });

    record('vendorPortalSession', (await prisma.vendorPortalSession.deleteMany({ where: { organizationId } })).count);
    record('vendorAssessmentInvitation', (await prisma.vendorAssessmentInvitation.deleteMany({ where: { organizationId } })).count);
    record('requesterTaskLink', (await prisma.requesterTaskLink.deleteMany({ where: { organizationId } })).count);
    record('engagementResidualRiskAssessment', (await prisma.engagementResidualRiskAssessment.deleteMany({ where: { organizationId } })).count);
    record('engagementCompensatingControl', (await prisma.engagementCompensatingControl.deleteMany({ where: { organizationId } })).count);
    record('engagementControlEffectiveness', (await prisma.engagementControlEffectiveness.deleteMany({ where: { organizationId } })).count);
    record('engagementAssessmentReview', (await prisma.engagementAssessmentReview.deleteMany({ where: { organizationId } })).count);
    record('evidenceLink', (await prisma.evidenceLink.deleteMany({ where: { organizationId } })).count);
    record('vendorIssueEscalation', (await prisma.vendorIssueEscalation.deleteMany({ where: { organizationId } })).count);
    record('vendorIssueRCA', (await prisma.vendorIssueRCA.deleteMany({ where: { organizationId } })).count);
    record('vendorIssue', (await prisma.vendorIssue.deleteMany({ where: { organizationId } })).count);
    record('vendorAssessment', (await prisma.vendorAssessment.deleteMany({ where: { organizationId } })).count);
    record('engagementDueDiligencePlan', (await prisma.engagementDueDiligencePlan.deleteMany({ where: { organizationId } })).count);
    record('engagementIraClarification', (await prisma.engagementIraClarification.deleteMany({ where: { organizationId } })).count);
    record('engagementIraSubmission', (await prisma.engagementIraSubmission.deleteMany({ where: { organizationId } })).count);
    record('engagementIra', (await prisma.engagementIra.deleteMany({ where: { organizationId } })).count);
    record('engagement', (await prisma.engagement.deleteMany({ where: { organizationId } })).count);
    record('intakeInformationRequest', (await prisma.intakeInformationRequest.deleteMany({ where: { organizationId } })).count);
    record('intakeAssignment', (await prisma.intakeAssignment.deleteMany({ where: { organizationId } })).count);
    record('intakeRequest', (await prisma.intakeRequest.deleteMany({ where: { organizationId } })).count);
    record('vendorOnboarding', (await prisma.vendorOnboarding.deleteMany({ where: { organizationId } })).count);
    record('vendorContact', (await prisma.vendorContact.deleteMany({ where: { vendor: { organizationId } } })).count);
    record('vendorDocumentAlert', (await prisma.vendorDocumentAlert.deleteMany({ where: { organizationId } })).count);
    record('vendorDocument', (await prisma.vendorDocument.deleteMany({ where: { organizationId } })).count);
    record('vendorContract', (await prisma.vendorContract.deleteMany({ where: { organizationId } })).count);
    record('vendorReview', (await prisma.vendorReview.deleteMany({ where: { organizationId } })).count);
    record('vendorMonitoring', (await prisma.vendorMonitoring.deleteMany({ where: { organizationId } })).count);
    record('vendorRiskHistory', (await prisma.vendorRiskHistory.deleteMany({ where: { organizationId } })).count);
    record('governanceEdge', (await prisma.governanceEdge.deleteMany({ where: { organizationId } })).count);
    record('governanceNode', (await prisma.governanceNode.deleteMany({ where: { organizationId } })).count);
    record('inAppNotification', (await prisma.inAppNotification.deleteMany({ where: { organizationId } })).count);
    record('vendor', (await prisma.vendor.deleteMany({ where: { organizationId } })).count);

    const usersKept = await prisma.user.count({ where: { organizationId } });
    await assertVendorIsNotAUser();
    return { organization: { id: organization.id, name: organization.name, slug: organization.slug }, deleted: counts, usersKept };
}

export async function seedManualGoldenJourneyCase() {
    assertStagingQaPersonasAllowed();
    const organization = await requireQaOrganization();
    const requester = await prisma.user.findFirst({
        where: { organizationId: organization.id, email: 'qa.requester@supremegrc.test', role: Role.BUSINESS_OWNER },
    });
    if (!requester) {
        throw new Error('QA Requester is missing. Run bootstrap-users first.');
    }

    const existing = await prisma.intakeRequest.findFirst({
        where: {
            organizationId: organization.id,
            proposedThirdPartyName: MANUAL_CASE.proposedThirdPartyName,
            proposedServiceName: MANUAL_CASE.proposedServiceName,
            status: { notIn: [IntakeStatus.ENGAGEMENT_CREATED, IntakeStatus.CANCELLED, IntakeStatus.REJECTED, IntakeStatus.DUPLICATE] },
        },
        orderBy: { createdAt: 'desc' },
    });
    if (existing) {
        return { organization: { id: organization.id, name: organization.name, slug: organization.slug }, intake: existing, created: false };
    }

    const created = await createIntakeRequest(
        organization.id,
        { id: requester.id, name: `${requester.firstName} ${requester.lastName}`, email: requester.email, role: requester.role },
        { ...MANUAL_CASE }
    );
    return {
        organization: { id: organization.id, name: organization.name, slug: organization.slug },
        intake: { id: created.id, publicId: created.publicId, status: created.status },
        created: true,
    };
}

export function publicPersonaCard(persona: ProvisionedPersona) {
    return {
        key: persona.key,
        name: persona.name || displayName(QA_PERSONAS.find((row) => row.key === persona.key)!),
        email: persona.email,
        role: persona.role,
        landingPath: persona.landingPath,
        created: persona.created,
    };
}

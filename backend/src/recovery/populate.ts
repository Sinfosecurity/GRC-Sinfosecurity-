import fs from 'fs';
import path from 'path';
import { PrismaClient, Role, ScanStatus } from '@prisma/client';
import { hashPassword } from '../services/passwordService';
import { calculateVendorRisk } from '../services/deterministicRiskEngine';
import { LocalStorageProvider } from '../storage/localStorageProvider';
import { sha256 } from './objects';

export const RECOVERY_PASSWORD = 'RecoveryCert1x';

export async function populateRecoveryDataset(prisma: PrismaClient, objectRoot: string) {
    const store = new LocalStorageProvider(objectRoot);
    const password = await hashPassword(RECOVERY_PASSWORD);

    async function createOrg(name: string, plan: string, billing: {
        billingCustomerId: string;
        billingSubscriptionId: string;
        subscriptionStatus: string;
    }) {
        const org = await prisma.organization.create({
            data: {
                name,
                country: 'US',
                industry: 'Financial Services',
                size: '251-1000',
                plan,
                status: 'ACTIVE',
                subscriptionStatus: billing.subscriptionStatus,
                billingCustomerId: billing.billingCustomerId,
                billingSubscriptionId: billing.billingSubscriptionId,
                billingInterval: 'month',
                legalName: `${name} LLC`,
            },
        });
        const admin = await prisma.user.create({
            data: {
                email: name.includes('ORG A') ? 'recovery-admin-a@cert.invalid' : 'recovery-admin-b@cert.invalid',
                hashedPassword: password,
                firstName: 'Recovery',
                lastName: name.includes('ORG A') ? 'Alpha' : 'Bravo',
                role: Role.ADMIN,
                organizationId: org.id,
                status: 'ACTIVE',
            },
        });
        const viewer = await prisma.user.create({
            data: {
                email: name.includes('ORG A') ? 'recovery-viewer-a@cert.invalid' : 'recovery-viewer-b@cert.invalid',
                hashedPassword: password,
                firstName: 'Viewer',
                lastName: name.includes('ORG A') ? 'Alpha' : 'Bravo',
                role: Role.VIEWER,
                organizationId: org.id,
                status: 'ACTIVE',
            },
        });
        const assessor = await prisma.user.create({
            data: {
                email: name.includes('ORG A') ? 'recovery-assessor-a@cert.invalid' : 'recovery-assessor-b@cert.invalid',
                hashedPassword: password,
                firstName: 'Assessor',
                lastName: name.includes('ORG A') ? 'Alpha' : 'Bravo',
                role: Role.ASSESSOR,
                organizationId: org.id,
                status: 'ACTIVE',
            },
        });
        return { org, admin, viewer, assessor };
    }

    const orgA = await createOrg('RECOVERY ORG A', 'PROFESSIONAL', {
        billingCustomerId: 'cus_recovery_a_test',
        billingSubscriptionId: 'sub_recovery_a_test',
        subscriptionStatus: 'active',
    });
    const orgB = await createOrg('RECOVERY ORG B', 'STARTER', {
        billingCustomerId: 'cus_recovery_b_test',
        billingSubscriptionId: 'sub_recovery_b_test',
        subscriptionStatus: 'active',
    });

    async function seedTenant(
        org: typeof orgA,
        vendors: Array<{ name: string; tier: 'CRITICAL' | 'HIGH' | 'MEDIUM' }>
    ) {
        await prisma.scoringMethodology.create({
            data: {
                organizationId: org.org.id,
                version: 'supreme-risk-1.1.0',
                name: 'Supreme Risk 1.1',
                isActive: true,
                weights: { inherent: 60, control: 40 },
                createdBy: org.admin.id,
            },
        });
        await prisma.subscriptionEvent.create({
            data: {
                organizationId: org.org.id,
                stripeEventId: `evt_recovery_${org.org.id.slice(0, 8)}`,
                type: 'customer.subscription.updated',
                payloadSummary: { plan: org.org.plan, testMode: true },
            },
        });
        await prisma.inAppNotification.create({
            data: {
                organizationId: org.org.id,
                userId: org.admin.id,
                eventType: 'ops.alert',
                title: 'Recovery dataset ready',
                body: 'Internal recovery notification record.',
            },
        });

        const created = [];
        for (const spec of vendors) {
            const scored = calculateVendorRisk({
                vendorCriticality: spec.tier,
                dataSensitivityCount: spec.tier === 'CRITICAL' ? 3 : 1,
                regulatoryCount: 2,
                hasSubcontractors: spec.tier === 'CRITICAL',
                openFindings: spec.tier === 'CRITICAL' ? [{ severity: 'HIGH' }] : [{ severity: 'LOW' }],
                compensatingControls: 1,
            });
            const vendor = await prisma.vendor.create({
                data: {
                    name: spec.name,
                    vendorType: 'SAAS',
                    category: 'CLOUD_HOSTING',
                    tier: spec.tier,
                    status: 'ACTIVE',
                    organizationId: org.org.id,
                    primaryContact: `${spec.name} Contact`,
                    contactEmail: `${spec.name.replace(/\s+/g, '.').toLowerCase()}@vendor.invalid`,
                    servicesProvided: 'Hosted processing for recovery certification',
                    dataTypesAccessed: ['PII'],
                    geographicFootprint: ['US'],
                    regulatoryScope: ['SOC2'],
                    inherentRiskScore: scored.inherentRisk,
                    residualRiskScore: scored.residualRisk,
                    hasSubcontractors: spec.tier === 'CRITICAL',
                    fourthParties: spec.tier === 'CRITICAL' ? [{ name: 'Nested Processor' }] : undefined,
                },
            });
            const assessment = await prisma.vendorAssessment.create({
                data: {
                    vendorId: vendor.id,
                    organizationId: org.org.id,
                    assessmentType: 'INITIAL_DUE_DILIGENCE',
                    frameworkUsed: 'SIG',
                    status: 'COMPLETED',
                    assignedTo: org.assessor.id,
                    completedAt: new Date(),
                    overallScore: 82,
                    evidenceCollected: true,
                    evidenceCount: 1,
                    scoreVersion: scored.scoreVersion,
                },
            });
            await prisma.assessmentResponse.create({
                data: {
                    assessmentId: assessment.id,
                    questionId: 'q-access-review',
                    questionText: 'Is access reviewed quarterly?',
                    questionCategory: 'Security',
                    response: 'Yes',
                    score: 10,
                    maxScore: 10,
                    respondedBy: org.assessor.id,
                    respondedAt: new Date(),
                },
            });
            const finding = await prisma.vendorIssue.create({
                data: {
                    vendorId: vendor.id,
                    organizationId: org.org.id,
                    title: `${spec.name} access review gap`,
                    description: 'Open finding used for recovery certification.',
                    issueType: 'AUDIT_FINDING',
                    severity: spec.tier === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
                    priority: 'HIGH',
                    source: 'INTERNAL_ASSESSMENT',
                    identifiedBy: org.assessor.id,
                    category: 'Security',
                    status: 'OPEN',
                    assignedTo: org.admin.id,
                    correctiveActionPlan: 'Complete quarterly access review evidence.',
                    targetRemediationDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                },
            });
            await prisma.vendorContract.create({
                data: {
                    vendorId: vendor.id,
                    organizationId: org.org.id,
                    contractType: 'MASTER_SERVICE_AGREEMENT',
                    title: `${spec.name} master agreement`,
                    effectiveDate: new Date('2026-01-01'),
                    expirationDate: new Date('2027-01-01'),
                    contractValue: 25000,
                    status: 'ACTIVE',
                },
            });
            await prisma.vendorMonitoring.create({
                data: {
                    vendorId: vendor.id,
                    organizationId: org.org.id,
                    monitoringType: 'SECURITY_RATING',
                    source: 'Internal signal',
                    riskIndicator: 'Certificate expiry',
                    riskLevel: 'Medium',
                    riskDescription: 'Persisted monitoring signal for recovery.',
                    requiresAction: false,
                },
            });
            if (spec.tier === 'CRITICAL') {
                await prisma.fourthParty.create({
                    data: {
                        primaryVendorId: vendor.id,
                        organizationId: org.org.id,
                        name: `${spec.name} Subprocessor`,
                        serviceProvided: 'Subprocessing',
                        dataAccess: ['PII'],
                        geographicLocation: ['US'],
                        riskAssessed: true,
                        riskLevel: 'Medium',
                    },
                });
            }
            await prisma.scoreCalculation.create({
                data: {
                    organizationId: org.org.id,
                    vendorId: vendor.id,
                    scoreVersion: scored.scoreVersion,
                    inherentRisk: scored.inherentRisk,
                    controlEffectiveness: scored.controlEffectiveness,
                    residualRisk: scored.residualRisk,
                    riskBand: scored.riskBand,
                    inputs: scored.inputs as object,
                    explanation: scored.explanation,
                    factors: scored.factors as object,
                },
            });
            const brief = await prisma.riskDecisionBrief.create({
                data: {
                    organizationId: org.org.id,
                    vendorId: vendor.id,
                    engagementName: `${spec.name} recovery brief`,
                    inherentRisk: scored.inherentRisk,
                    residualRisk: scored.residualRisk,
                    riskBand: scored.riskBand,
                    evidenceConfidence: 'MEDIUM',
                    openFindingsCount: 1,
                    humanDecision: 'RISK_ACCEPTED',
                    decidedByUserId: org.admin.id,
                    decidedAt: new Date(),
                    status: 'DECIDED',
                    reviewerAnalysis: 'Accepted without changing residual score.',
                    immutableSnapshot: {
                        inherentRisk: scored.inherentRisk,
                        residualRisk: scored.residualRisk,
                        decision: 'RISK_ACCEPTED',
                    },
                },
            });
            const cleanBody = Buffer.from(`Supreme recovery evidence for ${spec.name} / ${org.org.name}\n`);
            const storageKey = `${org.org.id}/vendor/${vendor.id}/clean-policy.pdf`;
            await store.putObject(storageKey, cleanBody, 'application/pdf');
            const stored = await prisma.storedObject.create({
                data: {
                    organizationId: org.org.id,
                    ownerType: 'vendor',
                    ownerId: vendor.id,
                    filename: 'clean-policy.pdf',
                    storageKey,
                    contentType: 'application/pdf',
                    size: cleanBody.length,
                    checksum: sha256(cleanBody),
                    uploadedBy: org.admin.id,
                    scanStatus: ScanStatus.CLEAN,
                },
            });
            await prisma.evidenceLink.create({
                data: {
                    organizationId: org.org.id,
                    storedObjectId: stored.id,
                    vendorId: vendor.id,
                    assessmentId: assessment.id,
                    issueId: finding.id,
                    createdBy: org.admin.id,
                },
            });
            const blockedBody = Buffer.from(`blocked-not-clean ${spec.name}`);
            const blockedKey = `${org.org.id}/vendor/${vendor.id}/unscanned.txt`;
            await store.putObject(blockedKey, blockedBody, 'text/plain');
            await prisma.storedObject.create({
                data: {
                    organizationId: org.org.id,
                    ownerType: 'vendor',
                    ownerId: vendor.id,
                    filename: 'unscanned.txt',
                    storageKey: blockedKey,
                    contentType: 'text/plain',
                    size: blockedBody.length,
                    checksum: sha256(blockedBody),
                    uploadedBy: org.admin.id,
                    scanStatus: ScanStatus.NOT_CONFIGURED,
                },
            });
            await prisma.auditEvent.create({
                data: {
                    organizationId: org.org.id,
                    actorUserId: org.admin.id,
                    action: 'recovery.dataset.seed',
                    resourceType: 'Vendor',
                    resourceId: vendor.id,
                    result: 'success',
                    metadata: { assessmentId: assessment.id, briefId: brief.id },
                },
            });
            created.push({ vendor, assessment, finding, brief, stored });
        }
        return created;
    }

    const seededA = await seedTenant(orgA, [
        { name: 'Harbor Cloud A', tier: 'CRITICAL' },
        { name: 'Ledger Analytics A', tier: 'HIGH' },
        { name: 'Office Tools A', tier: 'MEDIUM' },
    ]);
    const seededB = await seedTenant(orgB, [
        { name: 'Northwind Cloud B', tier: 'CRITICAL' },
        { name: 'Payroll Hub B', tier: 'HIGH' },
    ]);

    const demoDir = path.join(objectRoot, '_application-state');
    fs.mkdirSync(demoDir, { recursive: true });
    fs.appendFileSync(
        path.join(demoDir, 'demo-requests.jsonl'),
        `${JSON.stringify({
            id: 'recovery-demo-1',
            receivedAt: new Date().toISOString(),
            email: 'prospect@cert.invalid',
            company: 'Recovery Prospect',
            selectedPlan: 'PROFESSIONAL',
            intent: 'demo',
            salesNotification: 'NOT_CONFIGURED',
        })}\n`
    );

    return {
        orgA: { ...orgA, vendors: seededA },
        orgB: { ...orgB, vendors: seededB },
    };
}

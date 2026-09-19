import {
    GovernanceAuthority,
    GovernanceNodeType,
    GovernanceProvenance,
} from '@prisma/client';

export const GRAPH_MAX_DEPTH = 3;
export const GRAPH_MAX_RESULTS = 200;
export const GRAPH_SEARCH_LIMIT = 50;

export const CURRENT_TPRM_NODE_TYPES: GovernanceNodeType[] = [
    GovernanceNodeType.ORGANIZATION,
    GovernanceNodeType.INTAKE,
    GovernanceNodeType.ENGAGEMENT,
    GovernanceNodeType.VENDOR,
    GovernanceNodeType.ASSESSMENT,
    GovernanceNodeType.EVIDENCE,
    GovernanceNodeType.FINDING,
    GovernanceNodeType.REMEDIATION,
    GovernanceNodeType.RISK,
    GovernanceNodeType.DECISION,
    GovernanceNodeType.CONTRACT,
    GovernanceNodeType.CONTROL,
    GovernanceNodeType.FRAMEWORK,
    GovernanceNodeType.REQUIREMENT,
    GovernanceNodeType.CONTROL_TEST,
    GovernanceNodeType.KRI,
    GovernanceNodeType.TREATMENT,
    GovernanceNodeType.BUSINESS_UNIT,
    GovernanceNodeType.EXCEPTION,
    GovernanceNodeType.COMPLIANCE_GAP,
    GovernanceNodeType.ATTESTATION,
    GovernanceNodeType.COMPLIANCE_PERIOD,
    GovernanceNodeType.PROCESSING_ACTIVITY,
    GovernanceNodeType.DATA_CATEGORY,
    GovernanceNodeType.DATA_SUBJECT_CATEGORY,
    GovernanceNodeType.TRANSFER,
    GovernanceNodeType.DPIA,
    GovernanceNodeType.RIGHTS_REQUEST,
    GovernanceNodeType.RETENTION_RULE,
    GovernanceNodeType.CONSENT_RECORD,
    GovernanceNodeType.INSURANCE_ENTITY,
    GovernanceNodeType.INSURANCE_LICENSE,
    GovernanceNodeType.JURISDICTION,
    GovernanceNodeType.REGULATOR,
    GovernanceNodeType.LINE_OF_BUSINESS,
    GovernanceNodeType.PRODUCT,
    GovernanceNodeType.BUSINESS_PROCESS,
    GovernanceNodeType.CRITICAL_SERVICE,
    GovernanceNodeType.AI_SYSTEM,
    GovernanceNodeType.AI_USE_CASE,
    GovernanceNodeType.AI_MODEL,
    GovernanceNodeType.AI_PROVIDER,
    GovernanceNodeType.AI_TEST,
    GovernanceNodeType.AI_ASSESSMENT,
];

export const SOURCE_RECORD_HREF: Record<string, (sourceId: string, extras?: { vendorId?: string }) => string> = {
    Organization: () => '/dashboard',
    IntakeRequest: (id) => `/third-parties/intake/${id}`,
    Engagement: (id) => `/third-parties/engagements/${id}`,
    Vendor: (id) => `/vendor-management?vendorId=${id}`,
    VendorAssessment: (id, extras) => `/assessments?vendorId=${extras?.vendorId || ''}&assessmentId=${id}`,
    VendorIssue: (_id, extras) => `/findings?vendorId=${extras?.vendorId || ''}`,
    StoredObject: () => '/documents',
    ScoreCalculation: (_id, extras) => `/vendor-management?vendorId=${extras?.vendorId || ''}`,
    Risk: () => '/dashboard',
    RiskDecisionBrief: (_id, extras) => `/decision-briefs?vendorId=${extras?.vendorId || ''}`,
    VendorContract: (_id, extras) => `/vendor-management?vendorId=${extras?.vendorId || ''}`,
    OrganizationControl: (id) => `/control-center/${id}`,
    FrameworkDefinition: () => '/framework-coverage',
    FrameworkRequirement: () => '/framework-coverage',
    OrganizationControlTest: (id) => `/control-center?testId=${id}`,
    EnterpriseRisk: (id) => `/risks/${id}`,
    EnterpriseRiskKri: () => '/risks',
    EnterpriseRiskTreatment: () => '/risks',
    EnterpriseRiskDecision: () => '/risks',
    ComplianceActivation: (id) => `/compliance/frameworks/${id}`,
    ComplianceRequirementState: (id) => `/compliance/requirements/${id}`,
    ComplianceAttestationCampaign: (id) => `/compliance/campaigns/${id}`,
    ComplianceAttestation: () => '/compliance',
    ComplianceGap: () => '/compliance/gaps',
    ComplianceException: () => '/compliance/exceptions',
    CompliancePeriod: (id) => `/compliance/audits/${id}`,
    PrivacyProcessingActivity: (id) => `/privacy-ops/activities/${id}`,
    PrivacyTransfer: () => '/privacy-ops/transfers',
    PrivacyDpia: () => '/privacy-ops/dpias',
    PrivacyRightsRequest: () => '/privacy-ops/rights',
    PrivacyRetentionRule: () => '/privacy-ops/retention',
    PrivacyConsentRecord: () => '/privacy-ops',
    AiSystem: (id) => `/ai-governance/systems/${id}`,
    AiUseCase: (id) => `/ai-governance/use-cases/${id}`,
    AiModelProvider: () => '/ai-governance/providers',
    AiTest: () => '/ai-governance/testing',
    AiAssessment: () => '/ai-governance/assessments',
    AiApproval: () => '/ai-governance/approvals',
    AiIncident: () => '/ai-governance/incidents',
    InsuranceEntity: () => '/insurance/entities',
    InsuranceLicense: () => '/insurance/licenses',
};

export function publicNode(node: {
    id: string;
    organizationId: string;
    nodeType: GovernanceNodeType;
    sourceModel: string;
    sourceId: string;
    displayLabel: string;
    status: string;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}, extras?: { vendorId?: string }) {
    const hrefFactory = SOURCE_RECORD_HREF[node.sourceModel];
    return {
        id: node.id,
        organizationScoped: true,
        nodeType: node.nodeType,
        sourceModel: node.sourceModel,
        sourceId: node.sourceId,
        displayLabel: node.displayLabel,
        status: node.status,
        archivedAt: node.archivedAt,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        recordHref: hrefFactory ? hrefFactory(node.sourceId, extras) : null,
    };
}

export function isAiAuthoritativeBlocked(provenance: GovernanceProvenance, authority: GovernanceAuthority) {
    return provenance === GovernanceProvenance.AI_SUGGESTED && authority === GovernanceAuthority.AUTHORITATIVE;
}

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
];

export const SOURCE_RECORD_HREF: Record<string, (sourceId: string, extras?: { vendorId?: string }) => string> = {
    Organization: () => '/dashboard',
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

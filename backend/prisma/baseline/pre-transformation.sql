-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'COMPLIANCE_OFFICER', 'RISK_MANAGER', 'AUDITOR', 'USER');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('CYBERSECURITY', 'DATA_PRIVACY', 'OPERATIONAL', 'FINANCIAL', 'COMPLIANCE', 'REPUTATIONAL', 'STRATEGIC');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('IDENTIFIED', 'ASSESSED', 'MITIGATED', 'ACCEPTED', 'TRANSFERRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ControlType" AS ENUM ('PREVENTIVE', 'DETECTIVE', 'CORRECTIVE', 'DIRECTIVE');

-- CreateEnum
CREATE TYPE "ControlStatus" AS ENUM ('PLANNED', 'IMPLEMENTED', 'TESTING', 'OPERATIONAL', 'INEFFECTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "FrameworkType" AS ENUM ('GDPR', 'HIPAA', 'CCPA', 'LGPD', 'APPI', 'ISO27001', 'TISAX', 'SOC2', 'PCI_DSS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('NOT_IMPLEMENTED', 'IN_PROGRESS', 'IMPLEMENTED', 'COMPLIANT', 'NON_COMPLIANT');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('IT_SERVICE', 'CLOUD_SERVICE', 'SAAS', 'PAAS', 'IAAS', 'PROFESSIONAL_SERVICES', 'CONSULTING', 'OUTSOURCING', 'STAFFING', 'SUPPLY_CHAIN', 'MANUFACTURING', 'LOGISTICS', 'CRITICAL_INFRASTRUCTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "VendorCategory" AS ENUM ('TECHNOLOGY', 'CYBERSECURITY', 'CLOUD_HOSTING', 'DATA_PROCESSING', 'PAYMENT_PROCESSING', 'HR_PAYROLL', 'MARKETING', 'ANALYTICS', 'COMMUNICATION', 'LEGAL', 'FINANCIAL', 'INSURANCE', 'FACILITIES', 'OTHER');

-- CreateEnum
CREATE TYPE "VendorTier" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('PROPOSED', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CriticalityLevel" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ContactRole" AS ENUM ('ACCOUNT_MANAGER', 'SECURITY_CONTACT', 'COMPLIANCE_CONTACT', 'TECHNICAL_SUPPORT', 'EXECUTIVE_SPONSOR', 'LEGAL', 'DPO', 'OTHER');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('INITIAL_DUE_DILIGENCE', 'ANNUAL_REVIEW', 'TRIGGERED_REASSESSMENT', 'CONTRACT_RENEWAL', 'POST_INCIDENT', 'CONTINUOUS_MONITORING', 'FOURTH_PARTY_REVIEW');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('MASTER_SERVICE_AGREEMENT', 'STATEMENT_OF_WORK', 'DATA_PROCESSING_AGREEMENT', 'NON_DISCLOSURE_AGREEMENT', 'SERVICE_LEVEL_AGREEMENT', 'PURCHASE_ORDER', 'LICENSE_AGREEMENT', 'SUBSCRIPTION_AGREEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'TERMINATED', 'RENEWED');

-- CreateEnum
CREATE TYPE "SLAMetricType" AS ENUM ('UPTIME', 'AVAILABILITY', 'RESPONSE_TIME', 'RESOLUTION_TIME', 'THROUGHPUT', 'ERROR_RATE', 'SECURITY_INCIDENTS', 'DATA_BREACH_NOTIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SLAStatus" AS ENUM ('MET', 'BREACHED', 'AT_RISK', 'NOT_MEASURED');

-- CreateEnum
CREATE TYPE "VendorIssueType" AS ENUM ('SECURITY_VULNERABILITY', 'COMPLIANCE_GAP', 'CONTRACT_BREACH', 'SLA_BREACH', 'PERFORMANCE_ISSUE', 'DATA_BREACH', 'CONTROL_FAILURE', 'AUDIT_FINDING', 'REGULATORY_VIOLATION', 'FINANCIAL_CONCERN', 'REPUTATIONAL_RISK', 'OTHER');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('URGENT', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "IssueSource" AS ENUM ('INTERNAL_ASSESSMENT', 'EXTERNAL_AUDIT', 'VENDOR_DISCLOSURE', 'CONTINUOUS_MONITORING', 'INCIDENT_RESPONSE', 'THIRD_PARTY_REPORT', 'REGULATORY_FINDING', 'NEWS_MEDIA', 'OTHER');

-- CreateEnum
CREATE TYPE "VendorIssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'PENDING_VENDOR', 'PENDING_VALIDATION', 'RESOLVED', 'CLOSED', 'RISK_ACCEPTED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "VendorDocumentType" AS ENUM ('SOC2_REPORT', 'ISO27001_CERTIFICATE', 'PCI_DSS_AOC', 'PENETRATION_TEST_REPORT', 'VULNERABILITY_SCAN', 'INSURANCE_CERTIFICATE', 'FINANCIAL_STATEMENT', 'SECURITY_POLICY', 'PRIVACY_POLICY', 'INCIDENT_RESPONSE_PLAN', 'BCP_DRP_PLAN', 'DATA_PROCESSING_AGREEMENT', 'CONTRACT', 'SLA_DOCUMENT', 'AUDIT_REPORT', 'RISK_ASSESSMENT', 'SECURITY_QUESTIONNAIRE', 'REFERENCE_LETTER', 'OTHER');

-- CreateEnum
CREATE TYPE "ConfidentialityLevel" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'HIGHLY_CONFIDENTIAL');

-- CreateEnum
CREATE TYPE "VendorMonitoringType" AS ENUM ('SECURITY_RATING', 'CYBER_THREAT_INTEL', 'BREACH_NOTIFICATION', 'VULNERABILITY_DISCLOSURE', 'NEWS_MENTION', 'FINANCIAL_HEALTH', 'REGULATORY_ACTION', 'CERTIFICATE_EXPIRY', 'DOMAIN_MONITORING', 'DARK_WEB_MENTION', 'SOCIAL_MEDIA', 'LEGAL_ACTION', 'M_AND_A_ACTIVITY', 'OTHER');

-- CreateEnum
CREATE TYPE "VendorReviewType" AS ENUM ('ANNUAL_REVIEW', 'QUARTERLY_REVIEW', 'CONTRACT_RENEWAL', 'POST_INCIDENT', 'TRIGGERED_REVIEW', 'OFFBOARDING_REVIEW', 'AUDIT');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED_NO_CHANGE', 'APPROVED_WITH_CONDITIONS', 'TIER_UPGRADE', 'TIER_DOWNGRADE', 'TERMINATE', 'SUSPEND', 'EXTEND_REVIEW');

-- CreateEnum
CREATE TYPE "WorkflowType" AS ENUM ('ONBOARDING', 'CONTRACT_RENEWAL', 'TIER_CHANGE', 'REASSESSMENT_APPROVAL', 'RISK_ACCEPTANCE', 'TERMINATION', 'FOURTH_PARTY_APPROVAL');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'ESCALATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED', 'CONDITIONALLY_APPROVED', 'ESCALATED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "EffectivenessRating" AS ENUM ('EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE', 'NOT_TESTED');

-- CreateEnum
CREATE TYPE "TestingFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'AD_HOC');

-- CreateEnum
CREATE TYPE "TestResult" AS ENUM ('PASSED', 'PASSED_WITH_EXCEPTIONS', 'FAILED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "RiskAppetiteStatus" AS ENUM ('WITHIN_APPETITE', 'APPROACHING_LIMIT', 'BREACH', 'CRITICAL_BREACH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "country" TEXT NOT NULL,
    "size" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "RiskCategory" NOT NULL,
    "likelihood" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "status" "RiskStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "ownerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "mitigation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "likelihood" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Control" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ControlType" NOT NULL,
    "category" TEXT NOT NULL,
    "status" "ControlStatus" NOT NULL DEFAULT 'PLANNED',
    "effectiveness" INTEGER,
    "organizationId" TEXT NOT NULL,
    "implementedAt" TIMESTAMP(3),
    "lastTested" TIMESTAMP(3),
    "nextTest" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskControl" (
    "id" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlTest" (
    "id" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "result" "TestResult" NOT NULL,
    "notes" TEXT,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControlTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceFramework" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FrameworkType" NOT NULL,
    "version" TEXT,
    "organizationId" TEXT NOT NULL,
    "score" INTEGER DEFAULT 0,
    "lastAssessed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceFramework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRequirement" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'NOT_IMPLEMENTED',

    CONSTRAINT "ComplianceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceControl" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "mappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GapAnalysis" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "findings" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "recommendations" JSONB NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GapAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'REPORTED',
    "category" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "rootCause" TEXT,
    "resolution" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "category" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "vendorType" "VendorType" NOT NULL,
    "category" "VendorCategory" NOT NULL,
    "tier" "VendorTier" NOT NULL,
    "status" "VendorStatus" NOT NULL DEFAULT 'PROPOSED',
    "organizationId" TEXT NOT NULL,
    "primaryContact" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "website" TEXT,
    "inherentRiskScore" INTEGER NOT NULL DEFAULT 0,
    "residualRiskScore" INTEGER NOT NULL DEFAULT 0,
    "criticalityLevel" "CriticalityLevel" NOT NULL DEFAULT 'MEDIUM',
    "businessOwner" TEXT,
    "relationshipOwner" TEXT,
    "servicesProvided" TEXT NOT NULL,
    "contractValue" DECIMAL(15,2),
    "currency" TEXT DEFAULT 'USD',
    "dataTypesAccessed" TEXT[],
    "geographicFootprint" TEXT[],
    "regulatoryScope" TEXT[],
    "hasSubcontractors" BOOLEAN NOT NULL DEFAULT false,
    "fourthParties" JSONB,
    "onboardedAt" TIMESTAMP(3),
    "lastReviewDate" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorContact" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "ContactRole" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorAssessment" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assessmentType" "AssessmentType" NOT NULL,
    "frameworkUsed" TEXT,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "overallScore" INTEGER,
    "securityScore" INTEGER,
    "privacyScore" INTEGER,
    "complianceScore" INTEGER,
    "operationalScore" INTEGER,
    "financialScore" INTEGER,
    "identifiedRisks" JSONB,
    "gapsIdentified" JSONB,
    "recommendations" JSONB,
    "assignedTo" TEXT,
    "reviewer" TEXT,
    "approver" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "evidenceCollected" BOOLEAN NOT NULL DEFAULT false,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResponse" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionCategory" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "response" TEXT,
    "score" INTEGER,
    "maxScore" INTEGER NOT NULL,
    "hasEvidence" BOOLEAN NOT NULL DEFAULT false,
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "respondedBy" TEXT,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "AssessmentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorContract" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "contractNumber" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "renewalDate" TIMESTAMP(3),
    "autoRenewal" BOOLEAN NOT NULL DEFAULT false,
    "noticePeriod" INTEGER,
    "contractValue" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentTerms" TEXT,
    "slaCommitments" JSONB,
    "performanceMetrics" JSONB,
    "hasDataProtectionClause" BOOLEAN NOT NULL DEFAULT false,
    "hasRightToAudit" BOOLEAN NOT NULL DEFAULT false,
    "hasBreachNotification" BOOLEAN NOT NULL DEFAULT false,
    "hasInsuranceRequirement" BOOLEAN NOT NULL DEFAULT false,
    "hasSubcontractorControls" BOOLEAN NOT NULL DEFAULT false,
    "hasTerminationRights" BOOLEAN NOT NULL DEFAULT false,
    "hasIPProtection" BOOLEAN NOT NULL DEFAULT false,
    "hasDPA" BOOLEAN NOT NULL DEFAULT false,
    "dpaSignedDate" TIMESTAMP(3),
    "dpaExpiryDate" TIMESTAMP(3),
    "documentUrl" TEXT,
    "documentHash" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "legalReviewedBy" TEXT,
    "legalReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SLATracking" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricType" "SLAMetricType" NOT NULL,
    "target" DECIMAL(10,4) NOT NULL,
    "actual" DECIMAL(10,4),
    "unit" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "SLAStatus" NOT NULL,
    "breachCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SLATracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorIssue" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "issueType" "VendorIssueType" NOT NULL,
    "severity" "IssueSeverity" NOT NULL,
    "priority" "IssuePriority" NOT NULL,
    "source" "IssueSource" NOT NULL,
    "identifiedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "identifiedBy" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "riskRating" TEXT,
    "impactDescription" TEXT,
    "status" "VendorIssueStatus" NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "correctiveActionPlan" TEXT,
    "targetRemediationDate" TIMESTAMP(3),
    "actualRemediationDate" TIMESTAMP(3),
    "validationRequired" BOOLEAN NOT NULL DEFAULT false,
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validationNotes" TEXT,
    "evidenceUrl" TEXT,
    "closureEvidence" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "closureNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDocument" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "organizationId" TEXT NOT NULL,
    "documentType" "VendorDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileHash" TEXT,
    "category" TEXT,
    "confidentiality" "ConfidentialityLevel" NOT NULL DEFAULT 'INTERNAL',
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),

    CONSTRAINT "VendorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorMonitoring" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "monitoringType" "VendorMonitoringType" NOT NULL,
    "source" TEXT NOT NULL,
    "riskIndicator" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "riskDescription" TEXT NOT NULL,
    "currentValue" TEXT,
    "previousValue" TEXT,
    "changeDetected" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "rawData" JSONB,
    "requiresAction" BOOLEAN NOT NULL DEFAULT false,
    "actionTaken" TEXT,
    "actionTakenBy" TEXT,
    "actionTakenAt" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "VendorMonitoring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorReview" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reviewType" "VendorReviewType" NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "nextReviewDate" TIMESTAMP(3),
    "reviewer" TEXT NOT NULL,
    "participants" TEXT[],
    "overallRating" INTEGER,
    "findings" JSONB,
    "recommendations" JSONB,
    "actionItems" JSONB,
    "decision" "ReviewDecision" NOT NULL,
    "tierChange" TEXT,
    "statusChange" TEXT,
    "notes" TEXT,
    "meetingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorApprovalWorkflow" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workflowType" "WorkflowType" NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
    "initiatedBy" TEXT NOT NULL,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "approvalSteps" JSONB NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "businessJustification" TEXT,
    "riskAssessmentSummary" TEXT,

    CONSTRAINT "VendorApprovalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorApprovalStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "approverRole" TEXT NOT NULL,
    "approverUserId" TEXT,
    "approverName" TEXT,
    "requiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decision" "ApprovalDecision",
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "comments" TEXT,
    "conditions" TEXT[],
    "digitalSignature" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "VendorApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDueDiligenceScope" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "determinedBy" TEXT NOT NULL,
    "determinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scopeLevel" TEXT NOT NULL,
    "scopeJustification" TEXT NOT NULL,
    "tierJustification" TEXT NOT NULL,
    "contractValue" DECIMAL(15,2),
    "dataTypes" TEXT[],
    "regulatoryRequirements" TEXT[],
    "geographicRisk" TEXT[],
    "fourthPartyRisk" BOOLEAN NOT NULL DEFAULT false,
    "assessmentDepth" TEXT NOT NULL,
    "requiredCertifications" TEXT[],
    "onSiteAuditRequired" BOOLEAN NOT NULL DEFAULT false,
    "backgroundCheckRequired" BOOLEAN NOT NULL DEFAULT false,
    "financialReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalNotes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorDueDiligenceScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorRiskControl" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "controlId" TEXT,
    "organizationId" TEXT NOT NULL,
    "controlName" TEXT NOT NULL,
    "controlDescription" TEXT,
    "controlType" "ControlType" NOT NULL,
    "controlOwner" TEXT NOT NULL,
    "designEffectiveness" "EffectivenessRating" NOT NULL,
    "operatingEffectiveness" "EffectivenessRating",
    "lastTestedDate" TIMESTAMP(3),
    "nextTestDate" TIMESTAMP(3),
    "testingFrequency" "TestingFrequency" NOT NULL,
    "testResult" "TestResult",
    "testEvidence" TEXT,
    "testerName" TEXT,
    "deficienciesFound" TEXT[],
    "remediationRequired" BOOLEAN NOT NULL DEFAULT false,
    "remediationStatus" TEXT,
    "remediationDueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorRiskControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorIssueRCA" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conductedBy" TEXT NOT NULL,
    "conductedDate" TIMESTAMP(3) NOT NULL,
    "methodology" TEXT NOT NULL,
    "problemStatement" TEXT NOT NULL,
    "rootCause" TEXT NOT NULL,
    "contributingFactors" TEXT[],
    "analysisEvidence" TEXT[],
    "dataReviewed" TEXT[],
    "interviewsHeld" TEXT[],
    "preventiveMeasures" TEXT[],
    "systemicImpact" TEXT NOT NULL,
    "affectsOtherVendors" BOOLEAN NOT NULL DEFAULT false,
    "relatedVendorIds" TEXT[],
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorIssueRCA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorIssueEscalation" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "escalationLevel" INTEGER NOT NULL,
    "escalatedFrom" TEXT NOT NULL,
    "escalatedTo" TEXT NOT NULL,
    "escalationReason" TEXT NOT NULL,
    "escalatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiresBoardNotification" BOOLEAN NOT NULL DEFAULT false,
    "requiresRegulatoryNotification" BOOLEAN NOT NULL DEFAULT false,
    "requiresCustomerNotification" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "responseNotes" TEXT,
    "actionTaken" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "VendorIssueEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorRiskHistory" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inherentRiskScore" INTEGER NOT NULL,
    "residualRiskScore" INTEGER NOT NULL,
    "assessmentScore" INTEGER,
    "openIssuesCount" INTEGER NOT NULL DEFAULT 0,
    "criticalIssuesCount" INTEGER NOT NULL DEFAULT 0,
    "monitoringAlertsCount" INTEGER NOT NULL DEFAULT 0,
    "slaBreachCount" INTEGER NOT NULL DEFAULT 0,
    "changeReason" TEXT,
    "changedBy" TEXT,
    "vendorStatus" "VendorStatus" NOT NULL,
    "vendorTier" "VendorTier" NOT NULL,

    CONSTRAINT "VendorRiskHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "previousVersionId" TEXT,
    "changeReason" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileUrl" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,

    CONSTRAINT "VendorDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDocumentAlert" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "alertDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "daysUntilExpiry" INTEGER NOT NULL,
    "notifiedUsers" TEXT[],
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "notificationDate" TIMESTAMP(3),
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "renewalDocumentId" TEXT,

    CONSTRAINT "VendorDocumentAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagementAttestation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "attestationType" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "attestationScope" TEXT NOT NULL,
    "attestedBy" TEXT NOT NULL,
    "attestedByRole" TEXT NOT NULL,
    "attestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statement" TEXT NOT NULL,
    "digitalSignature" TEXT,
    "controlsOperating" BOOLEAN NOT NULL DEFAULT true,
    "exceptionsDocumented" BOOLEAN NOT NULL DEFAULT true,
    "risksWithinAppetite" BOOLEAN NOT NULL DEFAULT true,
    "supportingEvidence" TEXT[],

    CONSTRAINT "ManagementAttestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorException" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "exceptionType" TEXT NOT NULL,
    "policyViolated" TEXT NOT NULL,
    "requirementWaived" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalComments" TEXT,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "expired" BOOLEAN NOT NULL DEFAULT false,
    "compensatingControls" TEXT[],
    "monitoringRequired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VendorException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorSOCScope" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "inSOCScope" BOOLEAN NOT NULL DEFAULT false,
    "socType" TEXT,
    "subserviceOrg" BOOLEAN NOT NULL DEFAULT false,
    "carveOut" BOOLEAN NOT NULL DEFAULT false,
    "inclusive" BOOLEAN NOT NULL DEFAULT false,
    "hasSOCReport" BOOLEAN NOT NULL DEFAULT false,
    "socReportDate" TIMESTAMP(3),
    "socReportExpiry" TIMESTAMP(3),
    "socReportUrl" TEXT,
    "trustServiceCriteria" TEXT[],
    "disclosureText" TEXT,
    "riskRating" TEXT,
    "lastReviewed" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "nextReview" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorSOCScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FourthParty" (
    "id" TEXT NOT NULL,
    "primaryVendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "serviceProvided" TEXT NOT NULL,
    "dataAccess" TEXT[],
    "geographicLocation" TEXT[],
    "riskAssessed" BOOLEAN NOT NULL DEFAULT false,
    "assessmentDate" TIMESTAMP(3),
    "riskLevel" TEXT,
    "riskScore" INTEGER,
    "hasContract" BOOLEAN NOT NULL DEFAULT false,
    "contractReviewDate" TIMESTAMP(3),
    "hasNDA" BOOLEAN NOT NULL DEFAULT false,
    "monitoringRequired" BOOLEAN NOT NULL DEFAULT false,
    "lastMonitored" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FourthParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorExitRiskAssessment" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assessmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assessedBy" TEXT NOT NULL,
    "dataResidualRisk" TEXT NOT NULL,
    "knowledgeTransferRisk" TEXT NOT NULL,
    "serviceTransitionRisk" TEXT NOT NULL,
    "reputationalRisk" TEXT NOT NULL,
    "legalRisk" TEXT NOT NULL,
    "mitigationPlan" TEXT NOT NULL,
    "transitionPlan" TEXT NOT NULL,
    "transitionDuration" INTEGER,
    "allDataReturned" BOOLEAN NOT NULL DEFAULT false,
    "allDataDestroyed" BOOLEAN NOT NULL DEFAULT false,
    "accessRevoked" BOOLEAN NOT NULL DEFAULT false,
    "contractuallyClosed" BOOLEAN NOT NULL DEFAULT false,
    "noOutstandingPayments" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "VendorExitRiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorExitClosure" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "closureDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedBy" TEXT NOT NULL,
    "residualRisks" JSONB NOT NULL,
    "riskAcceptance" TEXT NOT NULL,
    "acceptedBy" TEXT,
    "acceptanceDate" TIMESTAMP(3),
    "legalSignOff" BOOLEAN NOT NULL DEFAULT false,
    "securitySignOff" BOOLEAN NOT NULL DEFAULT false,
    "complianceSignOff" BOOLEAN NOT NULL DEFAULT false,
    "financeSignOff" BOOLEAN NOT NULL DEFAULT false,
    "exitReport" TEXT,
    "closureEvidence" TEXT[],
    "lessonsLearned" TEXT,

    CONSTRAINT "VendorExitClosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAppetite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "appetiteStatement" TEXT NOT NULL,
    "quantitativeThreshold" DOUBLE PRECISION,
    "qualitativeThreshold" TEXT,
    "riskTolerance" DOUBLE PRECISION NOT NULL,
    "earlyWarningThreshold" DOUBLE PRECISION NOT NULL,
    "currentRiskLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "breachStatus" "RiskAppetiteStatus" NOT NULL DEFAULT 'WITHIN_APPETITE',
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT NOT NULL,
    "approvalDate" TIMESTAMP(3) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "reviewFrequency" INTEGER NOT NULL,
    "nextReviewDate" TIMESTAMP(3) NOT NULL,
    "rationaleDocument" TEXT,
    "boardApprovalEvidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskAppetite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAppetiteBreach" (
    "id" TEXT NOT NULL,
    "riskAppetiteId" TEXT NOT NULL,
    "breachDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "breachType" TEXT NOT NULL,
    "actualRiskLevel" DOUBLE PRECISION NOT NULL,
    "thresholdExceeded" DOUBLE PRECISION NOT NULL,
    "excessAmount" DOUBLE PRECISION NOT NULL,
    "triggerEvent" TEXT NOT NULL,
    "contributingFactors" JSONB NOT NULL,
    "vendorIds" TEXT[],
    "notifiedPersonnel" TEXT[],
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "notificationSentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "mitigationPlan" TEXT,
    "mitigationOwner" TEXT,
    "targetResolutionDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "escalatedToBoard" BOOLEAN NOT NULL DEFAULT false,
    "boardNotificationDate" TIMESTAMP(3),
    "boardActionRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskAppetiteBreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProcessVendorMapping" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "processName" TEXT NOT NULL,
    "processOwner" TEXT NOT NULL,
    "processCategory" TEXT NOT NULL,
    "processCriticality" TEXT NOT NULL,
    "dependencyType" TEXT NOT NULL,
    "usagePercentage" DOUBLE PRECISION NOT NULL,
    "rto" INTEGER,
    "rpo" INTEGER,
    "impactIfUnavailable" TEXT NOT NULL,
    "alternativeAvailable" BOOLEAN NOT NULL DEFAULT false,
    "alternativeVendor" TEXT,
    "revenueAtRisk" DOUBLE PRECISION,
    "customersImpacted" INTEGER,
    "regulatoryImpact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProcessVendorMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBAA" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "baaRequired" BOOLEAN NOT NULL DEFAULT true,
    "baaStatus" TEXT NOT NULL,
    "baaExecutionDate" TIMESTAMP(3),
    "baaEffectiveDate" TIMESTAMP(3),
    "baaExpirationDate" TIMESTAMP(3),
    "phiAccess" BOOLEAN NOT NULL DEFAULT false,
    "phiTypes" TEXT[],
    "phiVolume" TEXT,
    "phiUsage" TEXT,
    "encryptionRequired" BOOLEAN NOT NULL DEFAULT true,
    "encryptionInTransit" BOOLEAN NOT NULL DEFAULT false,
    "encryptionAtRest" BOOLEAN NOT NULL DEFAULT false,
    "accessControls" TEXT,
    "auditLogsRequired" BOOLEAN NOT NULL DEFAULT true,
    "breachNotification24Hr" BOOLEAN NOT NULL DEFAULT true,
    "breachContactEmail" TEXT,
    "breachContactPhone" TEXT,
    "subcontractorsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "subcontractorBAAsRequired" BOOLEAN NOT NULL DEFAULT true,
    "subcontractors" JSONB,
    "lastAttestation" TIMESTAMP(3),
    "attestationFrequency" INTEGER,
    "nextAttestationDue" TIMESTAMP(3),
    "baaDocumentUrl" TEXT,
    "baaSignedCopy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorBAA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorISOControlMapping" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isoStandard" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "controlName" TEXT NOT NULL,
    "controlCategory" TEXT NOT NULL,
    "applicable" BOOLEAN NOT NULL DEFAULT true,
    "applicabilityJustification" TEXT,
    "implementationStatus" TEXT NOT NULL,
    "vendorEvidence" TEXT,
    "evidenceType" TEXT,
    "assessmentDate" TIMESTAMP(3),
    "assessedBy" TEXT,
    "assessmentNotes" TEXT,
    "controlEffectiveness" TEXT,
    "compensatingControl" TEXT,
    "compensatingControlOwner" TEXT,
    "residualRisk" TEXT,
    "riskAcceptance" TEXT,
    "acceptedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorISOControlMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "Risk_organizationId_idx" ON "Risk"("organizationId");

-- CreateIndex
CREATE INDEX "Risk_status_idx" ON "Risk"("status");

-- CreateIndex
CREATE INDEX "Risk_riskScore_idx" ON "Risk"("riskScore");

-- CreateIndex
CREATE INDEX "Risk_organizationId_status_idx" ON "Risk"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Risk_organizationId_riskScore_idx" ON "Risk"("organizationId", "riskScore");

-- CreateIndex
CREATE INDEX "Risk_ownerId_idx" ON "Risk"("ownerId");

-- CreateIndex
CREATE INDEX "Risk_createdAt_idx" ON "Risk"("createdAt");

-- CreateIndex
CREATE INDEX "Risk_category_status_idx" ON "Risk"("category", "status");

-- CreateIndex
CREATE INDEX "RiskAssessment_riskId_idx" ON "RiskAssessment"("riskId");

-- CreateIndex
CREATE INDEX "Control_organizationId_idx" ON "Control"("organizationId");

-- CreateIndex
CREATE INDEX "Control_status_idx" ON "Control"("status");

-- CreateIndex
CREATE INDEX "RiskControl_riskId_idx" ON "RiskControl"("riskId");

-- CreateIndex
CREATE INDEX "RiskControl_controlId_idx" ON "RiskControl"("controlId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskControl_riskId_controlId_key" ON "RiskControl"("riskId", "controlId");

-- CreateIndex
CREATE INDEX "ControlTest_controlId_idx" ON "ControlTest"("controlId");

-- CreateIndex
CREATE INDEX "ComplianceFramework_organizationId_idx" ON "ComplianceFramework"("organizationId");

-- CreateIndex
CREATE INDEX "ComplianceRequirement_frameworkId_idx" ON "ComplianceRequirement"("frameworkId");

-- CreateIndex
CREATE INDEX "ComplianceControl_requirementId_idx" ON "ComplianceControl"("requirementId");

-- CreateIndex
CREATE INDEX "ComplianceControl_controlId_idx" ON "ComplianceControl"("controlId");

-- CreateIndex
CREATE INDEX "ComplianceControl_frameworkId_idx" ON "ComplianceControl"("frameworkId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceControl_requirementId_controlId_key" ON "ComplianceControl"("requirementId", "controlId");

-- CreateIndex
CREATE INDEX "GapAnalysis_frameworkId_idx" ON "GapAnalysis"("frameworkId");

-- CreateIndex
CREATE INDEX "GapAnalysis_status_idx" ON "GapAnalysis"("status");

-- CreateIndex
CREATE INDEX "Incident_organizationId_idx" ON "Incident"("organizationId");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_severity_idx" ON "Incident"("severity");

-- CreateIndex
CREATE INDEX "Policy_organizationId_idx" ON "Policy"("organizationId");

-- CreateIndex
CREATE INDEX "Policy_status_idx" ON "Policy"("status");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Vendor_organizationId_idx" ON "Vendor"("organizationId");

-- CreateIndex
CREATE INDEX "Vendor_tier_idx" ON "Vendor"("tier");

-- CreateIndex
CREATE INDEX "Vendor_status_idx" ON "Vendor"("status");

-- CreateIndex
CREATE INDEX "Vendor_vendorType_idx" ON "Vendor"("vendorType");

-- CreateIndex
CREATE INDEX "Vendor_nextReviewDate_idx" ON "Vendor"("nextReviewDate");

-- CreateIndex
CREATE INDEX "Vendor_organizationId_status_idx" ON "Vendor"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Vendor_organizationId_tier_idx" ON "Vendor"("organizationId", "tier");

-- CreateIndex
CREATE INDEX "Vendor_organizationId_nextReviewDate_idx" ON "Vendor"("organizationId", "nextReviewDate");

-- CreateIndex
CREATE INDEX "Vendor_status_tier_idx" ON "Vendor"("status", "tier");

-- CreateIndex
CREATE INDEX "Vendor_createdAt_idx" ON "Vendor"("createdAt");

-- CreateIndex
CREATE INDEX "Vendor_lastReviewDate_idx" ON "Vendor"("lastReviewDate");

-- CreateIndex
CREATE INDEX "VendorContact_vendorId_idx" ON "VendorContact"("vendorId");

-- CreateIndex
CREATE INDEX "VendorAssessment_vendorId_idx" ON "VendorAssessment"("vendorId");

-- CreateIndex
CREATE INDEX "VendorAssessment_organizationId_idx" ON "VendorAssessment"("organizationId");

-- CreateIndex
CREATE INDEX "VendorAssessment_status_idx" ON "VendorAssessment"("status");

-- CreateIndex
CREATE INDEX "VendorAssessment_dueDate_idx" ON "VendorAssessment"("dueDate");

-- CreateIndex
CREATE INDEX "VendorAssessment_organizationId_status_idx" ON "VendorAssessment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "VendorAssessment_vendorId_status_idx" ON "VendorAssessment"("vendorId", "status");

-- CreateIndex
CREATE INDEX "VendorAssessment_organizationId_dueDate_idx" ON "VendorAssessment"("organizationId", "dueDate");

-- CreateIndex
CREATE INDEX "VendorAssessment_assignedTo_idx" ON "VendorAssessment"("assignedTo");

-- CreateIndex
CREATE INDEX "AssessmentResponse_assessmentId_idx" ON "AssessmentResponse"("assessmentId");

-- CreateIndex
CREATE INDEX "VendorContract_vendorId_idx" ON "VendorContract"("vendorId");

-- CreateIndex
CREATE INDEX "VendorContract_organizationId_idx" ON "VendorContract"("organizationId");

-- CreateIndex
CREATE INDEX "VendorContract_expirationDate_idx" ON "VendorContract"("expirationDate");

-- CreateIndex
CREATE INDEX "VendorContract_status_idx" ON "VendorContract"("status");

-- CreateIndex
CREATE INDEX "SLATracking_contractId_idx" ON "SLATracking"("contractId");

-- CreateIndex
CREATE INDEX "SLATracking_periodStart_idx" ON "SLATracking"("periodStart");

-- CreateIndex
CREATE INDEX "VendorIssue_vendorId_idx" ON "VendorIssue"("vendorId");

-- CreateIndex
CREATE INDEX "VendorIssue_organizationId_idx" ON "VendorIssue"("organizationId");

-- CreateIndex
CREATE INDEX "VendorIssue_status_idx" ON "VendorIssue"("status");

-- CreateIndex
CREATE INDEX "VendorIssue_severity_idx" ON "VendorIssue"("severity");

-- CreateIndex
CREATE INDEX "VendorIssue_targetRemediationDate_idx" ON "VendorIssue"("targetRemediationDate");

-- CreateIndex
CREATE INDEX "VendorDocument_vendorId_idx" ON "VendorDocument"("vendorId");

-- CreateIndex
CREATE INDEX "VendorDocument_assessmentId_idx" ON "VendorDocument"("assessmentId");

-- CreateIndex
CREATE INDEX "VendorDocument_organizationId_idx" ON "VendorDocument"("organizationId");

-- CreateIndex
CREATE INDEX "VendorDocument_documentType_idx" ON "VendorDocument"("documentType");

-- CreateIndex
CREATE INDEX "VendorDocument_validUntil_idx" ON "VendorDocument"("validUntil");

-- CreateIndex
CREATE INDEX "VendorMonitoring_vendorId_idx" ON "VendorMonitoring"("vendorId");

-- CreateIndex
CREATE INDEX "VendorMonitoring_organizationId_idx" ON "VendorMonitoring"("organizationId");

-- CreateIndex
CREATE INDEX "VendorMonitoring_detectedAt_idx" ON "VendorMonitoring"("detectedAt");

-- CreateIndex
CREATE INDEX "VendorMonitoring_requiresAction_idx" ON "VendorMonitoring"("requiresAction");

-- CreateIndex
CREATE INDEX "VendorReview_vendorId_idx" ON "VendorReview"("vendorId");

-- CreateIndex
CREATE INDEX "VendorReview_organizationId_idx" ON "VendorReview"("organizationId");

-- CreateIndex
CREATE INDEX "VendorReview_reviewDate_idx" ON "VendorReview"("reviewDate");

-- CreateIndex
CREATE INDEX "VendorReview_nextReviewDate_idx" ON "VendorReview"("nextReviewDate");

-- CreateIndex
CREATE INDEX "VendorApprovalWorkflow_vendorId_idx" ON "VendorApprovalWorkflow"("vendorId");

-- CreateIndex
CREATE INDEX "VendorApprovalWorkflow_organizationId_idx" ON "VendorApprovalWorkflow"("organizationId");

-- CreateIndex
CREATE INDEX "VendorApprovalWorkflow_status_idx" ON "VendorApprovalWorkflow"("status");

-- CreateIndex
CREATE INDEX "VendorApprovalWorkflow_workflowType_idx" ON "VendorApprovalWorkflow"("workflowType");

-- CreateIndex
CREATE INDEX "VendorApprovalStep_workflowId_idx" ON "VendorApprovalStep"("workflowId");

-- CreateIndex
CREATE INDEX "VendorApprovalStep_approverUserId_idx" ON "VendorApprovalStep"("approverUserId");

-- CreateIndex
CREATE INDEX "VendorApprovalStep_stepOrder_idx" ON "VendorApprovalStep"("stepOrder");

-- CreateIndex
CREATE UNIQUE INDEX "VendorDueDiligenceScope_vendorId_key" ON "VendorDueDiligenceScope"("vendorId");

-- CreateIndex
CREATE INDEX "VendorDueDiligenceScope_vendorId_idx" ON "VendorDueDiligenceScope"("vendorId");

-- CreateIndex
CREATE INDEX "VendorDueDiligenceScope_organizationId_idx" ON "VendorDueDiligenceScope"("organizationId");

-- CreateIndex
CREATE INDEX "VendorRiskControl_vendorId_idx" ON "VendorRiskControl"("vendorId");

-- CreateIndex
CREATE INDEX "VendorRiskControl_controlId_idx" ON "VendorRiskControl"("controlId");

-- CreateIndex
CREATE INDEX "VendorRiskControl_organizationId_idx" ON "VendorRiskControl"("organizationId");

-- CreateIndex
CREATE INDEX "VendorRiskControl_nextTestDate_idx" ON "VendorRiskControl"("nextTestDate");

-- CreateIndex
CREATE UNIQUE INDEX "VendorIssueRCA_issueId_key" ON "VendorIssueRCA"("issueId");

-- CreateIndex
CREATE INDEX "VendorIssueRCA_issueId_idx" ON "VendorIssueRCA"("issueId");

-- CreateIndex
CREATE INDEX "VendorIssueRCA_vendorId_idx" ON "VendorIssueRCA"("vendorId");

-- CreateIndex
CREATE INDEX "VendorIssueRCA_organizationId_idx" ON "VendorIssueRCA"("organizationId");

-- CreateIndex
CREATE INDEX "VendorIssueEscalation_issueId_idx" ON "VendorIssueEscalation"("issueId");

-- CreateIndex
CREATE INDEX "VendorIssueEscalation_vendorId_idx" ON "VendorIssueEscalation"("vendorId");

-- CreateIndex
CREATE INDEX "VendorIssueEscalation_escalatedTo_idx" ON "VendorIssueEscalation"("escalatedTo");

-- CreateIndex
CREATE INDEX "VendorIssueEscalation_escalatedAt_idx" ON "VendorIssueEscalation"("escalatedAt");

-- CreateIndex
CREATE INDEX "VendorRiskHistory_vendorId_idx" ON "VendorRiskHistory"("vendorId");

-- CreateIndex
CREATE INDEX "VendorRiskHistory_recordedAt_idx" ON "VendorRiskHistory"("recordedAt");

-- CreateIndex
CREATE INDEX "VendorRiskHistory_organizationId_idx" ON "VendorRiskHistory"("organizationId");

-- CreateIndex
CREATE INDEX "VendorDocumentVersion_documentId_idx" ON "VendorDocumentVersion"("documentId");

-- CreateIndex
CREATE INDEX "VendorDocumentVersion_version_idx" ON "VendorDocumentVersion"("version");

-- CreateIndex
CREATE INDEX "VendorDocumentAlert_documentId_idx" ON "VendorDocumentAlert"("documentId");

-- CreateIndex
CREATE INDEX "VendorDocumentAlert_vendorId_idx" ON "VendorDocumentAlert"("vendorId");

-- CreateIndex
CREATE INDEX "VendorDocumentAlert_expiryDate_idx" ON "VendorDocumentAlert"("expiryDate");

-- CreateIndex
CREATE INDEX "VendorDocumentAlert_organizationId_idx" ON "VendorDocumentAlert"("organizationId");

-- CreateIndex
CREATE INDEX "ManagementAttestation_organizationId_idx" ON "ManagementAttestation"("organizationId");

-- CreateIndex
CREATE INDEX "ManagementAttestation_attestationType_idx" ON "ManagementAttestation"("attestationType");

-- CreateIndex
CREATE INDEX "ManagementAttestation_period_idx" ON "ManagementAttestation"("period");

-- CreateIndex
CREATE INDEX "VendorException_vendorId_idx" ON "VendorException"("vendorId");

-- CreateIndex
CREATE INDEX "VendorException_expiryDate_idx" ON "VendorException"("expiryDate");

-- CreateIndex
CREATE INDEX "VendorException_organizationId_idx" ON "VendorException"("organizationId");

-- CreateIndex
CREATE INDEX "VendorException_expired_idx" ON "VendorException"("expired");

-- CreateIndex
CREATE UNIQUE INDEX "VendorSOCScope_vendorId_key" ON "VendorSOCScope"("vendorId");

-- CreateIndex
CREATE INDEX "VendorSOCScope_vendorId_idx" ON "VendorSOCScope"("vendorId");

-- CreateIndex
CREATE INDEX "VendorSOCScope_organizationId_idx" ON "VendorSOCScope"("organizationId");

-- CreateIndex
CREATE INDEX "VendorSOCScope_inSOCScope_idx" ON "VendorSOCScope"("inSOCScope");

-- CreateIndex
CREATE INDEX "FourthParty_primaryVendorId_idx" ON "FourthParty"("primaryVendorId");

-- CreateIndex
CREATE INDEX "FourthParty_organizationId_idx" ON "FourthParty"("organizationId");

-- CreateIndex
CREATE INDEX "FourthParty_riskLevel_idx" ON "FourthParty"("riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "VendorExitRiskAssessment_vendorId_key" ON "VendorExitRiskAssessment"("vendorId");

-- CreateIndex
CREATE INDEX "VendorExitRiskAssessment_vendorId_idx" ON "VendorExitRiskAssessment"("vendorId");

-- CreateIndex
CREATE INDEX "VendorExitRiskAssessment_organizationId_idx" ON "VendorExitRiskAssessment"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorExitClosure_vendorId_key" ON "VendorExitClosure"("vendorId");

-- CreateIndex
CREATE INDEX "VendorExitClosure_vendorId_idx" ON "VendorExitClosure"("vendorId");

-- CreateIndex
CREATE INDEX "VendorExitClosure_organizationId_idx" ON "VendorExitClosure"("organizationId");

-- CreateIndex
CREATE INDEX "RiskAppetite_organizationId_idx" ON "RiskAppetite"("organizationId");

-- CreateIndex
CREATE INDEX "RiskAppetite_category_idx" ON "RiskAppetite"("category");

-- CreateIndex
CREATE INDEX "RiskAppetite_breachStatus_idx" ON "RiskAppetite"("breachStatus");

-- CreateIndex
CREATE INDEX "RiskAppetiteBreach_riskAppetiteId_idx" ON "RiskAppetiteBreach"("riskAppetiteId");

-- CreateIndex
CREATE INDEX "RiskAppetiteBreach_breachDate_idx" ON "RiskAppetiteBreach"("breachDate");

-- CreateIndex
CREATE INDEX "RiskAppetiteBreach_status_idx" ON "RiskAppetiteBreach"("status");

-- CreateIndex
CREATE INDEX "BusinessProcessVendorMapping_organizationId_idx" ON "BusinessProcessVendorMapping"("organizationId");

-- CreateIndex
CREATE INDEX "BusinessProcessVendorMapping_vendorId_idx" ON "BusinessProcessVendorMapping"("vendorId");

-- CreateIndex
CREATE INDEX "BusinessProcessVendorMapping_processCriticality_idx" ON "BusinessProcessVendorMapping"("processCriticality");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBAA_vendorId_key" ON "VendorBAA"("vendorId");

-- CreateIndex
CREATE INDEX "VendorBAA_vendorId_idx" ON "VendorBAA"("vendorId");

-- CreateIndex
CREATE INDEX "VendorBAA_organizationId_idx" ON "VendorBAA"("organizationId");

-- CreateIndex
CREATE INDEX "VendorBAA_baaStatus_idx" ON "VendorBAA"("baaStatus");

-- CreateIndex
CREATE INDEX "VendorBAA_baaExpirationDate_idx" ON "VendorBAA"("baaExpirationDate");

-- CreateIndex
CREATE INDEX "VendorISOControlMapping_vendorId_idx" ON "VendorISOControlMapping"("vendorId");

-- CreateIndex
CREATE INDEX "VendorISOControlMapping_organizationId_idx" ON "VendorISOControlMapping"("organizationId");

-- CreateIndex
CREATE INDEX "VendorISOControlMapping_controlId_idx" ON "VendorISOControlMapping"("controlId");

-- CreateIndex
CREATE INDEX "VendorISOControlMapping_implementationStatus_idx" ON "VendorISOControlMapping"("implementationStatus");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Control" ADD CONSTRAINT "Control_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskControl" ADD CONSTRAINT "RiskControl_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskControl" ADD CONSTRAINT "RiskControl_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlTest" ADD CONSTRAINT "ControlTest_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceFramework" ADD CONSTRAINT "ComplianceFramework_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRequirement" ADD CONSTRAINT "ComplianceRequirement_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "ComplianceFramework"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceControl" ADD CONSTRAINT "ComplianceControl_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceControl" ADD CONSTRAINT "ComplianceControl_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceControl" ADD CONSTRAINT "ComplianceControl_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "ComplianceFramework"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GapAnalysis" ADD CONSTRAINT "GapAnalysis_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "ComplianceFramework"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorContact" ADD CONSTRAINT "VendorContact_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAssessment" ADD CONSTRAINT "VendorAssessment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAssessment" ADD CONSTRAINT "VendorAssessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "VendorAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorContract" ADD CONSTRAINT "VendorContract_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorContract" ADD CONSTRAINT "VendorContract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SLATracking" ADD CONSTRAINT "SLATracking_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "VendorContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorIssue" ADD CONSTRAINT "VendorIssue_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorIssue" ADD CONSTRAINT "VendorIssue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "VendorAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMonitoring" ADD CONSTRAINT "VendorMonitoring_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMonitoring" ADD CONSTRAINT "VendorMonitoring_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorReview" ADD CONSTRAINT "VendorReview_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorReview" ADD CONSTRAINT "VendorReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorApprovalWorkflow" ADD CONSTRAINT "VendorApprovalWorkflow_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorApprovalWorkflow" ADD CONSTRAINT "VendorApprovalWorkflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorApprovalStep" ADD CONSTRAINT "VendorApprovalStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "VendorApprovalWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDueDiligenceScope" ADD CONSTRAINT "VendorDueDiligenceScope_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDueDiligenceScope" ADD CONSTRAINT "VendorDueDiligenceScope_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRiskControl" ADD CONSTRAINT "VendorRiskControl_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRiskControl" ADD CONSTRAINT "VendorRiskControl_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRiskControl" ADD CONSTRAINT "VendorRiskControl_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorIssueRCA" ADD CONSTRAINT "VendorIssueRCA_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "VendorIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorIssueRCA" ADD CONSTRAINT "VendorIssueRCA_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorIssueRCA" ADD CONSTRAINT "VendorIssueRCA_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorIssueEscalation" ADD CONSTRAINT "VendorIssueEscalation_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "VendorIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorIssueEscalation" ADD CONSTRAINT "VendorIssueEscalation_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorIssueEscalation" ADD CONSTRAINT "VendorIssueEscalation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRiskHistory" ADD CONSTRAINT "VendorRiskHistory_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRiskHistory" ADD CONSTRAINT "VendorRiskHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocumentVersion" ADD CONSTRAINT "VendorDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "VendorDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocumentAlert" ADD CONSTRAINT "VendorDocumentAlert_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "VendorDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocumentAlert" ADD CONSTRAINT "VendorDocumentAlert_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocumentAlert" ADD CONSTRAINT "VendorDocumentAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementAttestation" ADD CONSTRAINT "ManagementAttestation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorException" ADD CONSTRAINT "VendorException_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorException" ADD CONSTRAINT "VendorException_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorSOCScope" ADD CONSTRAINT "VendorSOCScope_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorSOCScope" ADD CONSTRAINT "VendorSOCScope_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FourthParty" ADD CONSTRAINT "FourthParty_primaryVendorId_fkey" FOREIGN KEY ("primaryVendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FourthParty" ADD CONSTRAINT "FourthParty_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorExitRiskAssessment" ADD CONSTRAINT "VendorExitRiskAssessment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorExitRiskAssessment" ADD CONSTRAINT "VendorExitRiskAssessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorExitClosure" ADD CONSTRAINT "VendorExitClosure_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorExitClosure" ADD CONSTRAINT "VendorExitClosure_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAppetite" ADD CONSTRAINT "RiskAppetite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAppetiteBreach" ADD CONSTRAINT "RiskAppetiteBreach_riskAppetiteId_fkey" FOREIGN KEY ("riskAppetiteId") REFERENCES "RiskAppetite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProcessVendorMapping" ADD CONSTRAINT "BusinessProcessVendorMapping_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProcessVendorMapping" ADD CONSTRAINT "BusinessProcessVendorMapping_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBAA" ADD CONSTRAINT "VendorBAA_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBAA" ADD CONSTRAINT "VendorBAA_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorISOControlMapping" ADD CONSTRAINT "VendorISOControlMapping_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorISOControlMapping" ADD CONSTRAINT "VendorISOControlMapping_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

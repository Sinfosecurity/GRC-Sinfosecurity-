/**
 * Zod Validation Schemas for Vendor Management
 * Comprehensive input validation for TPRM operations
 */
import { z } from 'zod';
export declare const VendorTierSchema: z.ZodEnum<["CRITICAL", "HIGH", "MEDIUM", "LOW"]>;
export declare const VendorTypeSchema: z.ZodEnum<["SOFTWARE", "INFRASTRUCTURE", "PROFESSIONAL_SERVICES", "MANAGED_SERVICES", "CONSULTING", "HARDWARE", "OTHER"]>;
export declare const VendorStatusSchema: z.ZodEnum<["ACTIVE", "PENDING_ONBOARDING", "UNDER_REVIEW", "SUSPENDED", "TERMINATED", "OFFBOARDED"]>;
export declare const AssessmentTypeSchema: z.ZodEnum<["DUE_DILIGENCE", "ANNUAL_REVIEW", "CONTINUOUS", "INCIDENT_DRIVEN", "CONTRACT_RENEWAL", "SIG", "CAIQ", "CUSTOM"]>;
export declare const AssessmentStatusSchema: z.ZodEnum<["DRAFT", "IN_PROGRESS", "PENDING_REVIEW", "COMPLETED", "APPROVED"]>;
export declare const IssueSeveritySchema: z.ZodEnum<["CRITICAL", "HIGH", "MEDIUM", "LOW"]>;
export declare const IssueStatusSchema: z.ZodEnum<["OPEN", "IN_REMEDIATION", "PENDING_VERIFICATION", "RESOLVED", "ACCEPTED_RISK", "CLOSED"]>;
export declare const ContractTypeSchema: z.ZodEnum<["MSA", "SOW", "SLA", "DPA", "NDA", "BAA", "AMENDMENT", "OTHER"]>;
export declare const ContractStatusSchema: z.ZodEnum<["DRAFT", "PENDING_APPROVAL", "ACTIVE", "EXPIRING_SOON", "EXPIRED", "TERMINATED", "RENEWED"]>;
export declare const CreateVendorSchema: z.ZodObject<{
    name: z.ZodString;
    legalName: z.ZodOptional<z.ZodString>;
    vendorType: z.ZodEnum<["SOFTWARE", "INFRASTRUCTURE", "PROFESSIONAL_SERVICES", "MANAGED_SERVICES", "CONSULTING", "HARDWARE", "OTHER"]>;
    category: z.ZodString;
    tier: z.ZodEnum<["CRITICAL", "HIGH", "MEDIUM", "LOW"]>;
    description: z.ZodOptional<z.ZodString>;
    website: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    primaryContact: z.ZodOptional<z.ZodString>;
    primaryContactPhone: z.ZodOptional<z.ZodString>;
    businessOwner: z.ZodOptional<z.ZodString>;
    technicalOwner: z.ZodOptional<z.ZodString>;
    headquarters: z.ZodOptional<z.ZodString>;
    dataProcessingLocations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    servicesProvided: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    criticalityJustification: z.ZodOptional<z.ZodString>;
    annualSpend: z.ZodOptional<z.ZodNumber>;
    contractValue: z.ZodOptional<z.ZodNumber>;
    onboardingDate: z.ZodOptional<z.ZodString>;
    nextReviewDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    description?: string;
    legalName?: string;
    vendorType?: "SOFTWARE" | "INFRASTRUCTURE" | "PROFESSIONAL_SERVICES" | "MANAGED_SERVICES" | "CONSULTING" | "HARDWARE" | "OTHER";
    category?: string;
    tier?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    website?: string;
    primaryContact?: string;
    primaryContactPhone?: string;
    businessOwner?: string;
    technicalOwner?: string;
    headquarters?: string;
    dataProcessingLocations?: string[];
    servicesProvided?: string[];
    criticalityJustification?: string;
    annualSpend?: number;
    contractValue?: number;
    onboardingDate?: string;
    nextReviewDate?: string;
}, {
    name?: string;
    description?: string;
    legalName?: string;
    vendorType?: "SOFTWARE" | "INFRASTRUCTURE" | "PROFESSIONAL_SERVICES" | "MANAGED_SERVICES" | "CONSULTING" | "HARDWARE" | "OTHER";
    category?: string;
    tier?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    website?: string;
    primaryContact?: string;
    primaryContactPhone?: string;
    businessOwner?: string;
    technicalOwner?: string;
    headquarters?: string;
    dataProcessingLocations?: string[];
    servicesProvided?: string[];
    criticalityJustification?: string;
    annualSpend?: number;
    contractValue?: number;
    onboardingDate?: string;
    nextReviewDate?: string;
}>;
export declare const UpdateVendorSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    legalName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    vendorType: z.ZodOptional<z.ZodEnum<["SOFTWARE", "INFRASTRUCTURE", "PROFESSIONAL_SERVICES", "MANAGED_SERVICES", "CONSULTING", "HARDWARE", "OTHER"]>>;
    category: z.ZodOptional<z.ZodString>;
    tier: z.ZodOptional<z.ZodEnum<["CRITICAL", "HIGH", "MEDIUM", "LOW"]>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    website: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    primaryContact: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    primaryContactPhone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    businessOwner: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    technicalOwner: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    headquarters: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    dataProcessingLocations: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    servicesProvided: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    criticalityJustification: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    annualSpend: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    contractValue: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    onboardingDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    nextReviewDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    description?: string;
    legalName?: string;
    vendorType?: "SOFTWARE" | "INFRASTRUCTURE" | "PROFESSIONAL_SERVICES" | "MANAGED_SERVICES" | "CONSULTING" | "HARDWARE" | "OTHER";
    category?: string;
    tier?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    website?: string;
    primaryContact?: string;
    primaryContactPhone?: string;
    businessOwner?: string;
    technicalOwner?: string;
    headquarters?: string;
    dataProcessingLocations?: string[];
    servicesProvided?: string[];
    criticalityJustification?: string;
    annualSpend?: number;
    contractValue?: number;
    onboardingDate?: string;
    nextReviewDate?: string;
}, {
    name?: string;
    description?: string;
    legalName?: string;
    vendorType?: "SOFTWARE" | "INFRASTRUCTURE" | "PROFESSIONAL_SERVICES" | "MANAGED_SERVICES" | "CONSULTING" | "HARDWARE" | "OTHER";
    category?: string;
    tier?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    website?: string;
    primaryContact?: string;
    primaryContactPhone?: string;
    businessOwner?: string;
    technicalOwner?: string;
    headquarters?: string;
    dataProcessingLocations?: string[];
    servicesProvided?: string[];
    criticalityJustification?: string;
    annualSpend?: number;
    contractValue?: number;
    onboardingDate?: string;
    nextReviewDate?: string;
}>;
export declare const CreateAssessmentSchema: z.ZodObject<{
    vendorId: z.ZodString;
    assessmentType: z.ZodEnum<["DUE_DILIGENCE", "ANNUAL_REVIEW", "CONTINUOUS", "INCIDENT_DRIVEN", "CONTRACT_RENEWAL", "SIG", "CAIQ", "CUSTOM"]>;
    assessmentDate: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    questionnaire: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        question: z.ZodString;
        category: z.ZodString;
        weight: z.ZodNumber;
        options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        options?: string[];
        id?: string;
        category?: string;
        question?: string;
        weight?: number;
    }, {
        options?: string[];
        id?: string;
        category?: string;
        question?: string;
        weight?: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    dueDate?: string;
    vendorId?: string;
    assessmentType?: "CONTINUOUS" | "DUE_DILIGENCE" | "ANNUAL_REVIEW" | "INCIDENT_DRIVEN" | "CONTRACT_RENEWAL" | "SIG" | "CAIQ" | "CUSTOM";
    assessmentDate?: string;
    questionnaire?: {
        options?: string[];
        id?: string;
        category?: string;
        question?: string;
        weight?: number;
    }[];
}, {
    description?: string;
    dueDate?: string;
    vendorId?: string;
    assessmentType?: "CONTINUOUS" | "DUE_DILIGENCE" | "ANNUAL_REVIEW" | "INCIDENT_DRIVEN" | "CONTRACT_RENEWAL" | "SIG" | "CAIQ" | "CUSTOM";
    assessmentDate?: string;
    questionnaire?: {
        options?: string[];
        id?: string;
        category?: string;
        question?: string;
        weight?: number;
    }[];
}>;
export declare const SubmitAssessmentResponseSchema: z.ZodObject<{
    questionId: z.ZodString;
    answer: z.ZodString;
    score: z.ZodOptional<z.ZodNumber>;
    evidence: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    notes?: string;
    questionId?: string;
    answer?: string;
    score?: number;
    evidence?: string[];
}, {
    notes?: string;
    questionId?: string;
    answer?: string;
    score?: number;
    evidence?: string[];
}>;
export declare const CompleteAssessmentSchema: z.ZodObject<{
    overallScore: z.ZodNumber;
    recommendations: z.ZodArray<z.ZodString, "many">;
    approverNotes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    overallScore?: number;
    recommendations?: string[];
    approverNotes?: string;
}, {
    overallScore?: number;
    recommendations?: string[];
    approverNotes?: string;
}>;
export declare const CreateContractSchema: z.ZodObject<{
    vendorId: z.ZodString;
    contractType: z.ZodEnum<["MSA", "SOW", "SLA", "DPA", "NDA", "BAA", "AMENDMENT", "OTHER"]>;
    contractNumber: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    effectiveDate: z.ZodString;
    expirationDate: z.ZodString;
    autoRenewal: z.ZodDefault<z.ZodBoolean>;
    noticePeriodDays: z.ZodDefault<z.ZodNumber>;
    contractValue: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    paymentTerms: z.ZodOptional<z.ZodString>;
    terminationClause: z.ZodOptional<z.ZodString>;
    dataProtectionClause: z.ZodOptional<z.ZodString>;
    slaTargets: z.ZodOptional<z.ZodObject<{
        uptime: z.ZodOptional<z.ZodNumber>;
        responseTime: z.ZodOptional<z.ZodNumber>;
        resolutionTime: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uptime?: number;
        responseTime?: number;
        resolutionTime?: number;
    }, {
        uptime?: number;
        responseTime?: number;
        resolutionTime?: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    title?: string;
    contractValue?: number;
    vendorId?: string;
    contractType?: "OTHER" | "MSA" | "SOW" | "SLA" | "DPA" | "NDA" | "BAA" | "AMENDMENT";
    contractNumber?: string;
    effectiveDate?: string;
    expirationDate?: string;
    autoRenewal?: boolean;
    noticePeriodDays?: number;
    currency?: string;
    paymentTerms?: string;
    terminationClause?: string;
    dataProtectionClause?: string;
    slaTargets?: {
        uptime?: number;
        responseTime?: number;
        resolutionTime?: number;
    };
}, {
    description?: string;
    title?: string;
    contractValue?: number;
    vendorId?: string;
    contractType?: "OTHER" | "MSA" | "SOW" | "SLA" | "DPA" | "NDA" | "BAA" | "AMENDMENT";
    contractNumber?: string;
    effectiveDate?: string;
    expirationDate?: string;
    autoRenewal?: boolean;
    noticePeriodDays?: number;
    currency?: string;
    paymentTerms?: string;
    terminationClause?: string;
    dataProtectionClause?: string;
    slaTargets?: {
        uptime?: number;
        responseTime?: number;
        resolutionTime?: number;
    };
}>;
export declare const UpdateContractSchema: z.ZodObject<Omit<{
    vendorId: z.ZodOptional<z.ZodString>;
    contractType: z.ZodOptional<z.ZodEnum<["MSA", "SOW", "SLA", "DPA", "NDA", "BAA", "AMENDMENT", "OTHER"]>>;
    contractNumber: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    effectiveDate: z.ZodOptional<z.ZodString>;
    expirationDate: z.ZodOptional<z.ZodString>;
    autoRenewal: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    noticePeriodDays: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    contractValue: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    paymentTerms: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    terminationClause: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    dataProtectionClause: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    slaTargets: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        uptime: z.ZodOptional<z.ZodNumber>;
        responseTime: z.ZodOptional<z.ZodNumber>;
        resolutionTime: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        uptime?: number;
        responseTime?: number;
        resolutionTime?: number;
    }, {
        uptime?: number;
        responseTime?: number;
        resolutionTime?: number;
    }>>>;
}, "vendorId">, "strip", z.ZodTypeAny, {
    description?: string;
    title?: string;
    contractValue?: number;
    contractType?: "OTHER" | "MSA" | "SOW" | "SLA" | "DPA" | "NDA" | "BAA" | "AMENDMENT";
    contractNumber?: string;
    effectiveDate?: string;
    expirationDate?: string;
    autoRenewal?: boolean;
    noticePeriodDays?: number;
    currency?: string;
    paymentTerms?: string;
    terminationClause?: string;
    dataProtectionClause?: string;
    slaTargets?: {
        uptime?: number;
        responseTime?: number;
        resolutionTime?: number;
    };
}, {
    description?: string;
    title?: string;
    contractValue?: number;
    contractType?: "OTHER" | "MSA" | "SOW" | "SLA" | "DPA" | "NDA" | "BAA" | "AMENDMENT";
    contractNumber?: string;
    effectiveDate?: string;
    expirationDate?: string;
    autoRenewal?: boolean;
    noticePeriodDays?: number;
    currency?: string;
    paymentTerms?: string;
    terminationClause?: string;
    dataProtectionClause?: string;
    slaTargets?: {
        uptime?: number;
        responseTime?: number;
        resolutionTime?: number;
    };
}>;
export declare const RenewContractSchema: z.ZodObject<{
    newExpirationDate: z.ZodString;
    newContractValue: z.ZodOptional<z.ZodNumber>;
    amendmentNotes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    newExpirationDate?: string;
    newContractValue?: number;
    amendmentNotes?: string;
}, {
    newExpirationDate?: string;
    newContractValue?: number;
    amendmentNotes?: string;
}>;
export declare const CreateVendorIssueSchema: z.ZodObject<{
    vendorId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    severity: z.ZodEnum<["CRITICAL", "HIGH", "MEDIUM", "LOW"]>;
    category: z.ZodString;
    discoveredDate: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodString>;
    assignedTo: z.ZodOptional<z.ZodString>;
    potentialImpact: z.ZodOptional<z.ZodString>;
    remediationPlan: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    title?: string;
    assignedTo?: string;
    dueDate?: string;
    category?: string;
    vendorId?: string;
    discoveredDate?: string;
    potentialImpact?: string;
    remediationPlan?: string;
}, {
    description?: string;
    severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    title?: string;
    assignedTo?: string;
    dueDate?: string;
    category?: string;
    vendorId?: string;
    discoveredDate?: string;
    potentialImpact?: string;
    remediationPlan?: string;
}>;
export declare const UpdateVendorIssueSchema: z.ZodObject<Omit<{
    vendorId: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodEnum<["CRITICAL", "HIGH", "MEDIUM", "LOW"]>>;
    category: z.ZodOptional<z.ZodString>;
    discoveredDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    dueDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    assignedTo: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    potentialImpact: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    remediationPlan: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "vendorId">, "strip", z.ZodTypeAny, {
    description?: string;
    severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    title?: string;
    assignedTo?: string;
    dueDate?: string;
    category?: string;
    discoveredDate?: string;
    potentialImpact?: string;
    remediationPlan?: string;
}, {
    description?: string;
    severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    title?: string;
    assignedTo?: string;
    dueDate?: string;
    category?: string;
    discoveredDate?: string;
    potentialImpact?: string;
    remediationPlan?: string;
}>;
export declare const UpdateRemediationPlanSchema: z.ZodObject<{
    remediationPlan: z.ZodString;
    estimatedResolutionDate: z.ZodOptional<z.ZodString>;
    assignedTo: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    assignedTo?: string;
    notes?: string;
    remediationPlan?: string;
    estimatedResolutionDate?: string;
}, {
    assignedTo?: string;
    notes?: string;
    remediationPlan?: string;
    estimatedResolutionDate?: string;
}>;
export declare const UploadDocumentMetadataSchema: z.ZodObject<{
    vendorId: z.ZodString;
    documentType: z.ZodString;
    fileName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    expirationDate: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    vendorId?: string;
    expirationDate?: string;
    documentType?: string;
    fileName?: string;
    tags?: string[];
}, {
    description?: string;
    vendorId?: string;
    expirationDate?: string;
    documentType?: string;
    fileName?: string;
    tags?: string[];
}>;
export declare const CreateVendorReviewSchema: z.ZodObject<{
    vendorId: z.ZodString;
    reviewType: z.ZodEnum<["ANNUAL", "QUARTERLY", "AD_HOC", "OFFBOARDING", "TIER_CHANGE"]>;
    reviewDate: z.ZodOptional<z.ZodString>;
    performanceScore: z.ZodOptional<z.ZodNumber>;
    complianceScore: z.ZodOptional<z.ZodNumber>;
    securityScore: z.ZodOptional<z.ZodNumber>;
    financialStabilityScore: z.ZodOptional<z.ZodNumber>;
    overallRating: z.ZodNumber;
    findings: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    recommendations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    actionItems: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    nextReviewDate: z.ZodOptional<z.ZodString>;
    reviewerNotes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nextReviewDate?: string;
    vendorId?: string;
    recommendations?: string[];
    reviewType?: "ANNUAL" | "QUARTERLY" | "AD_HOC" | "OFFBOARDING" | "TIER_CHANGE";
    reviewDate?: string;
    performanceScore?: number;
    complianceScore?: number;
    securityScore?: number;
    financialStabilityScore?: number;
    overallRating?: number;
    findings?: string[];
    actionItems?: string[];
    reviewerNotes?: string;
}, {
    nextReviewDate?: string;
    vendorId?: string;
    recommendations?: string[];
    reviewType?: "ANNUAL" | "QUARTERLY" | "AD_HOC" | "OFFBOARDING" | "TIER_CHANGE";
    reviewDate?: string;
    performanceScore?: number;
    complianceScore?: number;
    securityScore?: number;
    financialStabilityScore?: number;
    overallRating?: number;
    findings?: string[];
    actionItems?: string[];
    reviewerNotes?: string;
}>;
export declare const CreateMonitoringSignalSchema: z.ZodObject<{
    vendorId: z.ZodString;
    signalType: z.ZodEnum<["NEWS_ALERT", "FINANCIAL_CHANGE", "SECURITY_INCIDENT", "COMPLIANCE_VIOLATION", "PERFORMANCE_DEGRADATION", "SLA_BREACH", "OTHER"]>;
    severity: z.ZodEnum<["CRITICAL", "HIGH", "MEDIUM", "LOW"]>;
    title: z.ZodString;
    description: z.ZodString;
    source: z.ZodOptional<z.ZodString>;
    sourceUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    detectedDate: z.ZodOptional<z.ZodString>;
    requiresAction: z.ZodDefault<z.ZodBoolean>;
    impactAssessment: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    title?: string;
    vendorId?: string;
    signalType?: "OTHER" | "NEWS_ALERT" | "FINANCIAL_CHANGE" | "SECURITY_INCIDENT" | "COMPLIANCE_VIOLATION" | "PERFORMANCE_DEGRADATION" | "SLA_BREACH";
    source?: string;
    sourceUrl?: string;
    detectedDate?: string;
    requiresAction?: boolean;
    impactAssessment?: string;
}, {
    description?: string;
    severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    title?: string;
    vendorId?: string;
    signalType?: "OTHER" | "NEWS_ALERT" | "FINANCIAL_CHANGE" | "SECURITY_INCIDENT" | "COMPLIANCE_VIOLATION" | "PERFORMANCE_DEGRADATION" | "SLA_BREACH";
    source?: string;
    sourceUrl?: string;
    detectedDate?: string;
    requiresAction?: boolean;
    impactAssessment?: string;
}>;
export declare const AcknowledgeSignalSchema: z.ZodObject<{
    notes: z.ZodOptional<z.ZodString>;
    actionTaken: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    notes?: string;
    actionTaken?: string;
}, {
    notes?: string;
    actionTaken?: string;
}>;
export declare const RecordSLAIncidentSchema: z.ZodObject<{
    contractId: z.ZodString;
    incidentType: z.ZodEnum<["UPTIME_BREACH", "RESPONSE_TIME_BREACH", "RESOLUTION_TIME_BREACH", "PERFORMANCE_ISSUE", "OTHER"]>;
    incidentDate: z.ZodString;
    description: z.ZodString;
    impactDuration: z.ZodOptional<z.ZodNumber>;
    resolutionDate: z.ZodOptional<z.ZodString>;
    rootCause: z.ZodOptional<z.ZodString>;
    creditApplied: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    contractId?: string;
    incidentType?: "OTHER" | "UPTIME_BREACH" | "RESPONSE_TIME_BREACH" | "RESOLUTION_TIME_BREACH" | "PERFORMANCE_ISSUE";
    incidentDate?: string;
    impactDuration?: number;
    resolutionDate?: string;
    rootCause?: string;
    creditApplied?: number;
}, {
    description?: string;
    contractId?: string;
    incidentType?: "OTHER" | "UPTIME_BREACH" | "RESPONSE_TIME_BREACH" | "RESOLUTION_TIME_BREACH" | "PERFORMANCE_ISSUE";
    incidentDate?: string;
    impactDuration?: number;
    resolutionDate?: string;
    rootCause?: string;
    creditApplied?: number;
}>;
export declare const BulkUpdateStatusSchema: z.ZodObject<{
    vendorIds: z.ZodArray<z.ZodString, "many">;
    status: z.ZodEnum<["ACTIVE", "PENDING_ONBOARDING", "UNDER_REVIEW", "SUSPENDED", "TERMINATED", "OFFBOARDED"]>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: "ACTIVE" | "SUSPENDED" | "OFFBOARDED" | "UNDER_REVIEW" | "PENDING_ONBOARDING" | "TERMINATED";
    vendorIds?: string[];
    reason?: string;
}, {
    status?: "ACTIVE" | "SUSPENDED" | "OFFBOARDED" | "UNDER_REVIEW" | "PENDING_ONBOARDING" | "TERMINATED";
    vendorIds?: string[];
    reason?: string;
}>;
export declare const BulkAssignTierSchema: z.ZodObject<{
    vendorIds: z.ZodArray<z.ZodString, "many">;
    tier: z.ZodEnum<["CRITICAL", "HIGH", "MEDIUM", "LOW"]>;
    justification: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tier?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    vendorIds?: string[];
    justification?: string;
}, {
    tier?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    vendorIds?: string[];
    justification?: string;
}>;
export declare const VendorListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>>;
    pageSize: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "PENDING_ONBOARDING", "UNDER_REVIEW", "SUSPENDED", "TERMINATED", "OFFBOARDED"]>>;
    tier: z.ZodOptional<z.ZodEnum<["CRITICAL", "HIGH", "MEDIUM", "LOW"]>>;
    vendorType: z.ZodOptional<z.ZodEnum<["SOFTWARE", "INFRASTRUCTURE", "PROFESSIONAL_SERVICES", "MANAGED_SERVICES", "CONSULTING", "HARDWARE", "OTHER"]>>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodEnum<["name", "tier", "status", "inherentRiskScore", "residualRiskScore", "nextReviewDate", "createdAt"]>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    page?: number;
    pageSize?: number;
    status?: "ACTIVE" | "SUSPENDED" | "OFFBOARDED" | "UNDER_REVIEW" | "PENDING_ONBOARDING" | "TERMINATED";
    search?: string;
    vendorType?: "SOFTWARE" | "INFRASTRUCTURE" | "PROFESSIONAL_SERVICES" | "MANAGED_SERVICES" | "CONSULTING" | "HARDWARE" | "OTHER";
    tier?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    sortBy?: "status" | "name" | "createdAt" | "tier" | "nextReviewDate" | "inherentRiskScore" | "residualRiskScore";
    sortOrder?: "asc" | "desc";
}, {
    page?: string;
    pageSize?: string;
    status?: "ACTIVE" | "SUSPENDED" | "OFFBOARDED" | "UNDER_REVIEW" | "PENDING_ONBOARDING" | "TERMINATED";
    search?: string;
    vendorType?: "SOFTWARE" | "INFRASTRUCTURE" | "PROFESSIONAL_SERVICES" | "MANAGED_SERVICES" | "CONSULTING" | "HARDWARE" | "OTHER";
    tier?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    sortBy?: "status" | "name" | "createdAt" | "tier" | "nextReviewDate" | "inherentRiskScore" | "residualRiskScore";
    sortOrder?: "asc" | "desc";
}>;
export declare const AssessmentListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>>;
    pageSize: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodString, number, string>>>;
    vendorId: z.ZodOptional<z.ZodString>;
    assessmentType: z.ZodOptional<z.ZodEnum<["DUE_DILIGENCE", "ANNUAL_REVIEW", "CONTINUOUS", "INCIDENT_DRIVEN", "CONTRACT_RENEWAL", "SIG", "CAIQ", "CUSTOM"]>>;
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "IN_PROGRESS", "PENDING_REVIEW", "COMPLETED", "APPROVED"]>>;
    sortBy: z.ZodOptional<z.ZodEnum<["assessmentDate", "dueDate", "overallScore", "createdAt"]>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    page?: number;
    pageSize?: number;
    status?: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "APPROVED" | "PENDING_REVIEW";
    vendorId?: string;
    assessmentType?: "CONTINUOUS" | "DUE_DILIGENCE" | "ANNUAL_REVIEW" | "INCIDENT_DRIVEN" | "CONTRACT_RENEWAL" | "SIG" | "CAIQ" | "CUSTOM";
    sortBy?: "createdAt" | "dueDate" | "assessmentDate" | "overallScore";
    sortOrder?: "asc" | "desc";
}, {
    page?: string;
    pageSize?: string;
    status?: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "APPROVED" | "PENDING_REVIEW";
    vendorId?: string;
    assessmentType?: "CONTINUOUS" | "DUE_DILIGENCE" | "ANNUAL_REVIEW" | "INCIDENT_DRIVEN" | "CONTRACT_RENEWAL" | "SIG" | "CAIQ" | "CUSTOM";
    sortBy?: "createdAt" | "dueDate" | "assessmentDate" | "overallScore";
    sortOrder?: "asc" | "desc";
}>;
export type CreateVendorInput = z.infer<typeof CreateVendorSchema>;
export type UpdateVendorInput = z.infer<typeof UpdateVendorSchema>;
export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;
export type SubmitAssessmentResponseInput = z.infer<typeof SubmitAssessmentResponseSchema>;
export type CreateContractInput = z.infer<typeof CreateContractSchema>;
export type CreateVendorIssueInput = z.infer<typeof CreateVendorIssueSchema>;
export type CreateVendorReviewInput = z.infer<typeof CreateVendorReviewSchema>;
export type CreateMonitoringSignalInput = z.infer<typeof CreateMonitoringSignalSchema>;
export type VendorListQuery = z.infer<typeof VendorListQuerySchema>;
export type AssessmentListQuery = z.infer<typeof AssessmentListQuerySchema>;
//# sourceMappingURL=vendor.validators.d.ts.map
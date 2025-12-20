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
    name: string;
    vendorType: "SOFTWARE" | "INFRASTRUCTURE" | "PROFESSIONAL_SERVICES" | "MANAGED_SERVICES" | "CONSULTING" | "HARDWARE" | "OTHER";
    category: string;
    tier: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    description?: string | undefined;
    legalName?: string | undefined;
    website?: string | undefined;
    primaryContact?: string | undefined;
    primaryContactPhone?: string | undefined;
    businessOwner?: string | undefined;
    technicalOwner?: string | undefined;
    headquarters?: string | undefined;
    dataProcessingLocations?: string[] | undefined;
    servicesProvided?: string[] | undefined;
    criticalityJustification?: string | undefined;
    annualSpend?: number | undefined;
    contractValue?: number | undefined;
    onboardingDate?: string | undefined;
    nextReviewDate?: string | undefined;
}, {
    name: string;
    vendorType: "SOFTWARE" | "INFRASTRUCTURE" | "PROFESSIONAL_SERVICES" | "MANAGED_SERVICES" | "CONSULTING" | "HARDWARE" | "OTHER";
    category: string;
    tier: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    description?: string | undefined;
    legalName?: string | undefined;
    website?: string | undefined;
    primaryContact?: string | undefined;
    primaryContactPhone?: string | undefined;
    businessOwner?: string | undefined;
    technicalOwner?: string | undefined;
    headquarters?: string | undefined;
    dataProcessingLocations?: string[] | undefined;
    servicesProvided?: string[] | undefined;
    criticalityJustification?: string | undefined;
    annualSpend?: number | undefined;
    contractValue?: number | undefined;
    onboardingDate?: string | undefined;
    nextReviewDate?: string | undefined;
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
    name?: string | undefined;
    description?: string | undefined;
    legalName?: string | undefined;
    vendorType?: "SOFTWARE" | "INFRASTRUCTURE" | "PROFESSIONAL_SERVICES" | "MANAGED_SERVICES" | "CONSULTING" | "HARDWARE" | "OTHER" | undefined;
    category?: string | undefined;
    tier?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | undefined;
    website?: string | undefined;
    primaryContact?: string | undefined;
    primaryContactPhone?: string | undefined;
    businessOwner?: string | undefined;
    technicalOwner?: string | undefined;
    headquarters?: string | undefined;
    dataProcessingLocations?: string[] | undefined;
    servicesProvided?: string[] | undefined;
    criticalityJustification?: string | undefined;
    annualSpend?: number | undefined;
    contractValue?: number | undefined;
    onboardingDate?: string | undefined;
    nextReviewDate?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    legalName?: string | undefined;
    vendorType?: "SOFTWARE" | "INFRASTRUCTURE" | "PROFESSIONAL_SERVICES" | "MANAGED_SERVICES" | "CONSULTING" | "HARDWARE" | "OTHER" | undefined;
    category?: string | undefined;
    tier?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | undefined;
    website?: string | undefined;
    primaryContact?: string | undefined;
    primaryContactPhone?: string | undefined;
    businessOwner?: string | undefined;
    technicalOwner?: string | undefined;
    headquarters?: string | undefined;
    dataProcessingLocations?: string[] | undefined;
    servicesProvided?: string[] | undefined;
    criticalityJustification?: string | undefined;
    annualSpend?: number | undefined;
    contractValue?: number | undefined;
    onboardingDate?: string | undefined;
    nextReviewDate?: string | undefined;
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
        id: string;
        category: string;
        question: string;
        weight: number;
        options?: string[] | undefined;
    }, {
        id: string;
        category: string;
        question: string;
        weight: number;
        options?: string[] | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    vendorId: string;
    assessmentType: "CONTINUOUS" | "DUE_DILIGENCE" | "ANNUAL_REVIEW" | "INCIDENT_DRIVEN" | "CONTRACT_RENEWAL" | "SIG" | "CAIQ" | "CUSTOM";
    description?: string | undefined;
    dueDate?: string | undefined;
    assessmentDate?: string | undefined;
    questionnaire?: {
        id: string;
        category: string;
        question: string;
        weight: number;
        options?: string[] | undefined;
    }[] | undefined;
}, {
    vendorId: string;
    assessmentType: "CONTINUOUS" | "DUE_DILIGENCE" | "ANNUAL_REVIEW" | "INCIDENT_DRIVEN" | "CONTRACT_RENEWAL" | "SIG" | "CAIQ" | "CUSTOM";
    description?: string | undefined;
    dueDate?: string | undefined;
    assessmentDate?: string | undefined;
    questionnaire?: {
        id: string;
        category: string;
        question: string;
        weight: number;
        options?: string[] | undefined;
    }[] | undefined;
}>;
export declare const SubmitAssessmentResponseSchema: z.ZodObject<{
    questionId: z.ZodString;
    answer: z.ZodString;
    score: z.ZodOptional<z.ZodNumber>;
    evidence: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    questionId: string;
    answer: string;
    notes?: string | undefined;
    score?: number | undefined;
    evidence?: string[] | undefined;
}, {
    questionId: string;
    answer: string;
    notes?: string | undefined;
    score?: number | undefined;
    evidence?: string[] | undefined;
}>;
export declare const CompleteAssessmentSchema: z.ZodObject<{
    overallScore: z.ZodNumber;
    recommendations: z.ZodArray<z.ZodString, "many">;
    approverNotes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    overallScore: number;
    recommendations: string[];
    approverNotes?: string | undefined;
}, {
    overallScore: number;
    recommendations: string[];
    approverNotes?: string | undefined;
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
        uptime?: number | undefined;
        responseTime?: number | undefined;
        resolutionTime?: number | undefined;
    }, {
        uptime?: number | undefined;
        responseTime?: number | undefined;
        resolutionTime?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    contractValue: number;
    vendorId: string;
    contractType: "OTHER" | "MSA" | "SOW" | "SLA" | "DPA" | "NDA" | "BAA" | "AMENDMENT";
    effectiveDate: string;
    expirationDate: string;
    autoRenewal: boolean;
    noticePeriodDays: number;
    currency: string;
    description?: string | undefined;
    contractNumber?: string | undefined;
    paymentTerms?: string | undefined;
    terminationClause?: string | undefined;
    dataProtectionClause?: string | undefined;
    slaTargets?: {
        uptime?: number | undefined;
        responseTime?: number | undefined;
        resolutionTime?: number | undefined;
    } | undefined;
}, {
    title: string;
    contractValue: number;
    vendorId: string;
    contractType: "OTHER" | "MSA" | "SOW" | "SLA" | "DPA" | "NDA" | "BAA" | "AMENDMENT";
    effectiveDate: string;
    expirationDate: string;
    description?: string | undefined;
    contractNumber?: string | undefined;
    autoRenewal?: boolean | undefined;
    noticePeriodDays?: number | undefined;
    currency?: string | undefined;
    paymentTerms?: string | undefined;
    terminationClause?: string | undefined;
    dataProtectionClause?: string | undefined;
    slaTargets?: {
        uptime?: number | undefined;
        responseTime?: number | undefined;
        resolutionTime?: number | undefined;
    } | undefined;
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
        uptime?: number | undefined;
        responseTime?: number | undefined;
        resolutionTime?: number | undefined;
    }, {
        uptime?: number | undefined;
        responseTime?: number | undefined;
        resolutionTime?: number | undefined;
    }>>>;
}, "vendorId">, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    description?: string | undefined;
    contractValue?: number | undefined;
    contractType?: "OTHER" | "MSA" | "SOW" | "SLA" | "DPA" | "NDA" | "BAA" | "AMENDMENT" | undefined;
    contractNumber?: string | undefined;
    effectiveDate?: string | undefined;
    expirationDate?: string | undefined;
    autoRenewal?: boolean | undefined;
    noticePeriodDays?: number | undefined;
    currency?: string | undefined;
    paymentTerms?: string | undefined;
    terminationClause?: string | undefined;
    dataProtectionClause?: string | undefined;
    slaTargets?: {
        uptime?: number | undefined;
        responseTime?: number | undefined;
        resolutionTime?: number | undefined;
    } | undefined;
}, {
    title?: string | undefined;
    description?: string | undefined;
    contractValue?: number | undefined;
    contractType?: "OTHER" | "MSA" | "SOW" | "SLA" | "DPA" | "NDA" | "BAA" | "AMENDMENT" | undefined;
    contractNumber?: string | undefined;
    effectiveDate?: string | undefined;
    expirationDate?: string | undefined;
    autoRenewal?: boolean | undefined;
    noticePeriodDays?: number | undefined;
    currency?: string | undefined;
    paymentTerms?: string | undefined;
    terminationClause?: string | undefined;
    dataProtectionClause?: string | undefined;
    slaTargets?: {
        uptime?: number | undefined;
        responseTime?: number | undefined;
        resolutionTime?: number | undefined;
    } | undefined;
}>;
export declare const RenewContractSchema: z.ZodObject<{
    newExpirationDate: z.ZodString;
    newContractValue: z.ZodOptional<z.ZodNumber>;
    amendmentNotes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    newExpirationDate: string;
    newContractValue?: number | undefined;
    amendmentNotes?: string | undefined;
}, {
    newExpirationDate: string;
    newContractValue?: number | undefined;
    amendmentNotes?: string | undefined;
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
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    title: string;
    description: string;
    category: string;
    vendorId: string;
    assignedTo?: string | undefined;
    dueDate?: string | undefined;
    discoveredDate?: string | undefined;
    potentialImpact?: string | undefined;
    remediationPlan?: string | undefined;
}, {
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    title: string;
    description: string;
    category: string;
    vendorId: string;
    assignedTo?: string | undefined;
    dueDate?: string | undefined;
    discoveredDate?: string | undefined;
    potentialImpact?: string | undefined;
    remediationPlan?: string | undefined;
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
    severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | undefined;
    assignedTo?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    dueDate?: string | undefined;
    category?: string | undefined;
    discoveredDate?: string | undefined;
    potentialImpact?: string | undefined;
    remediationPlan?: string | undefined;
}, {
    severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | undefined;
    assignedTo?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    dueDate?: string | undefined;
    category?: string | undefined;
    discoveredDate?: string | undefined;
    potentialImpact?: string | undefined;
    remediationPlan?: string | undefined;
}>;
export declare const UpdateRemediationPlanSchema: z.ZodObject<{
    remediationPlan: z.ZodString;
    estimatedResolutionDate: z.ZodOptional<z.ZodString>;
    assignedTo: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    remediationPlan: string;
    assignedTo?: string | undefined;
    notes?: string | undefined;
    estimatedResolutionDate?: string | undefined;
}, {
    remediationPlan: string;
    assignedTo?: string | undefined;
    notes?: string | undefined;
    estimatedResolutionDate?: string | undefined;
}>;
export declare const UploadDocumentMetadataSchema: z.ZodObject<{
    vendorId: z.ZodString;
    documentType: z.ZodString;
    fileName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    expirationDate: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    vendorId: string;
    documentType: string;
    fileName: string;
    description?: string | undefined;
    expirationDate?: string | undefined;
    tags?: string[] | undefined;
}, {
    vendorId: string;
    documentType: string;
    fileName: string;
    description?: string | undefined;
    expirationDate?: string | undefined;
    tags?: string[] | undefined;
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
    vendorId: string;
    reviewType: "ANNUAL" | "QUARTERLY" | "AD_HOC" | "OFFBOARDING" | "TIER_CHANGE";
    overallRating: number;
    nextReviewDate?: string | undefined;
    recommendations?: string[] | undefined;
    reviewDate?: string | undefined;
    performanceScore?: number | undefined;
    complianceScore?: number | undefined;
    securityScore?: number | undefined;
    financialStabilityScore?: number | undefined;
    findings?: string[] | undefined;
    actionItems?: string[] | undefined;
    reviewerNotes?: string | undefined;
}, {
    vendorId: string;
    reviewType: "ANNUAL" | "QUARTERLY" | "AD_HOC" | "OFFBOARDING" | "TIER_CHANGE";
    overallRating: number;
    nextReviewDate?: string | undefined;
    recommendations?: string[] | undefined;
    reviewDate?: string | undefined;
    performanceScore?: number | undefined;
    complianceScore?: number | undefined;
    securityScore?: number | undefined;
    financialStabilityScore?: number | undefined;
    findings?: string[] | undefined;
    actionItems?: string[] | undefined;
    reviewerNotes?: string | undefined;
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
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    title: string;
    description: string;
    vendorId: string;
    signalType: "OTHER" | "NEWS_ALERT" | "FINANCIAL_CHANGE" | "SECURITY_INCIDENT" | "COMPLIANCE_VIOLATION" | "PERFORMANCE_DEGRADATION" | "SLA_BREACH";
    requiresAction: boolean;
    source?: string | undefined;
    sourceUrl?: string | undefined;
    detectedDate?: string | undefined;
    impactAssessment?: string | undefined;
}, {
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    title: string;
    description: string;
    vendorId: string;
    signalType: "OTHER" | "NEWS_ALERT" | "FINANCIAL_CHANGE" | "SECURITY_INCIDENT" | "COMPLIANCE_VIOLATION" | "PERFORMANCE_DEGRADATION" | "SLA_BREACH";
    source?: string | undefined;
    sourceUrl?: string | undefined;
    detectedDate?: string | undefined;
    requiresAction?: boolean | undefined;
    impactAssessment?: string | undefined;
}>;
export declare const AcknowledgeSignalSchema: z.ZodObject<{
    notes: z.ZodOptional<z.ZodString>;
    actionTaken: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    notes?: string | undefined;
    actionTaken?: string | undefined;
}, {
    notes?: string | undefined;
    actionTaken?: string | undefined;
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
    description: string;
    contractId: string;
    incidentType: "OTHER" | "UPTIME_BREACH" | "RESPONSE_TIME_BREACH" | "RESOLUTION_TIME_BREACH" | "PERFORMANCE_ISSUE";
    incidentDate: string;
    impactDuration?: number | undefined;
    resolutionDate?: string | undefined;
    rootCause?: string | undefined;
    creditApplied?: number | undefined;
}, {
    description: string;
    contractId: string;
    incidentType: "OTHER" | "UPTIME_BREACH" | "RESPONSE_TIME_BREACH" | "RESOLUTION_TIME_BREACH" | "PERFORMANCE_ISSUE";
    incidentDate: string;
    impactDuration?: number | undefined;
    resolutionDate?: string | undefined;
    rootCause?: string | undefined;
    creditApplied?: number | undefined;
}>;
export declare const BulkUpdateStatusSchema: z.ZodObject<{
    vendorIds: z.ZodArray<z.ZodString, "many">;
    status: z.ZodEnum<["ACTIVE", "PENDING_ONBOARDING", "UNDER_REVIEW", "SUSPENDED", "TERMINATED", "OFFBOARDED"]>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "SUSPENDED" | "OFFBOARDED" | "UNDER_REVIEW" | "PENDING_ONBOARDING" | "TERMINATED";
    vendorIds: string[];
    reason?: string | undefined;
}, {
    status: "ACTIVE" | "SUSPENDED" | "OFFBOARDED" | "UNDER_REVIEW" | "PENDING_ONBOARDING" | "TERMINATED";
    vendorIds: string[];
    reason?: string | undefined;
}>;
export declare const BulkAssignTierSchema: z.ZodObject<{
    vendorIds: z.ZodArray<z.ZodString, "many">;
    tier: z.ZodEnum<["CRITICAL", "HIGH", "MEDIUM", "LOW"]>;
    justification: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tier: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    vendorIds: string[];
    justification?: string | undefined;
}, {
    tier: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    vendorIds: string[];
    justification?: string | undefined;
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
    page: number;
    pageSize: number;
    sortOrder: "asc" | "desc";
    status?: "ACTIVE" | "SUSPENDED" | "OFFBOARDED" | "UNDER_REVIEW" | "PENDING_ONBOARDING" | "TERMINATED" | undefined;
    vendorType?: "SOFTWARE" | "INFRASTRUCTURE" | "PROFESSIONAL_SERVICES" | "MANAGED_SERVICES" | "CONSULTING" | "HARDWARE" | "OTHER" | undefined;
    tier?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | undefined;
    search?: string | undefined;
    sortBy?: "name" | "status" | "createdAt" | "tier" | "nextReviewDate" | "inherentRiskScore" | "residualRiskScore" | undefined;
}, {
    page?: string | undefined;
    pageSize?: string | undefined;
    status?: "ACTIVE" | "SUSPENDED" | "OFFBOARDED" | "UNDER_REVIEW" | "PENDING_ONBOARDING" | "TERMINATED" | undefined;
    vendorType?: "SOFTWARE" | "INFRASTRUCTURE" | "PROFESSIONAL_SERVICES" | "MANAGED_SERVICES" | "CONSULTING" | "HARDWARE" | "OTHER" | undefined;
    tier?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | undefined;
    search?: string | undefined;
    sortBy?: "name" | "status" | "createdAt" | "tier" | "nextReviewDate" | "inherentRiskScore" | "residualRiskScore" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
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
    page: number;
    pageSize: number;
    sortOrder: "asc" | "desc";
    status?: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "APPROVED" | "PENDING_REVIEW" | undefined;
    vendorId?: string | undefined;
    assessmentType?: "CONTINUOUS" | "DUE_DILIGENCE" | "ANNUAL_REVIEW" | "INCIDENT_DRIVEN" | "CONTRACT_RENEWAL" | "SIG" | "CAIQ" | "CUSTOM" | undefined;
    sortBy?: "createdAt" | "dueDate" | "assessmentDate" | "overallScore" | undefined;
}, {
    page?: string | undefined;
    pageSize?: string | undefined;
    status?: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "APPROVED" | "PENDING_REVIEW" | undefined;
    vendorId?: string | undefined;
    assessmentType?: "CONTINUOUS" | "DUE_DILIGENCE" | "ANNUAL_REVIEW" | "INCIDENT_DRIVEN" | "CONTRACT_RENEWAL" | "SIG" | "CAIQ" | "CUSTOM" | undefined;
    sortBy?: "createdAt" | "dueDate" | "assessmentDate" | "overallScore" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
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
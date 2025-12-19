/**
 * Zod Validation Schemas for Vendor Management
 * Comprehensive input validation for TPRM operations
 */

import { z } from 'zod';

// Enums
export const VendorTierSchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
export const VendorTypeSchema = z.enum(['SOFTWARE', 'INFRASTRUCTURE', 'PROFESSIONAL_SERVICES', 'MANAGED_SERVICES', 'CONSULTING', 'HARDWARE', 'OTHER']);
export const VendorStatusSchema = z.enum(['ACTIVE', 'PENDING_ONBOARDING', 'UNDER_REVIEW', 'SUSPENDED', 'TERMINATED', 'OFFBOARDED']);
export const AssessmentTypeSchema = z.enum(['DUE_DILIGENCE', 'ANNUAL_REVIEW', 'CONTINUOUS', 'INCIDENT_DRIVEN', 'CONTRACT_RENEWAL', 'SIG', 'CAIQ', 'CUSTOM']);
export const AssessmentStatusSchema = z.enum(['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'APPROVED']);
export const IssueSeveritySchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
export const IssueStatusSchema = z.enum(['OPEN', 'IN_REMEDIATION', 'PENDING_VERIFICATION', 'RESOLVED', 'ACCEPTED_RISK', 'CLOSED']);
export const ContractTypeSchema = z.enum(['MSA', 'SOW', 'SLA', 'DPA', 'NDA', 'BAA', 'AMENDMENT', 'OTHER']);
export const ContractStatusSchema = z.enum(['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'TERMINATED', 'RENEWED']);

// Create Vendor Schema
export const CreateVendorSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
    legalName: z.string().max(255).optional(),
    vendorType: VendorTypeSchema,
    category: z.string().min(1, 'Category is required').max(100),
    tier: VendorTierSchema,
    description: z.string().max(2000).optional(),
    website: z.string().url('Invalid URL').max(255).optional().or(z.literal('')),
    primaryContact: z.string().email('Invalid email').max(255).optional(),
    primaryContactPhone: z.string().max(50).optional(),
    businessOwner: z.string().max(255).optional(),
    technicalOwner: z.string().max(255).optional(),
    headquarters: z.string().max(255).optional(),
    dataProcessingLocations: z.array(z.string().max(100)).optional(),
    servicesProvided: z.array(z.string().max(255)).optional(),
    criticalityJustification: z.string().max(1000).optional(),
    annualSpend: z.number().min(0).optional(),
    contractValue: z.number().min(0).optional(),
    onboardingDate: z.string().datetime().optional(),
    nextReviewDate: z.string().datetime().optional()
});

// Update Vendor Schema
export const UpdateVendorSchema = CreateVendorSchema.partial();

// Vendor Assessment Schemas
export const CreateAssessmentSchema = z.object({
    vendorId: z.string().uuid('Invalid vendor ID'),
    assessmentType: AssessmentTypeSchema,
    assessmentDate: z.string().datetime().optional(),
    dueDate: z.string().datetime().optional(),
    description: z.string().max(1000).optional(),
    questionnaire: z.array(z.object({
        id: z.string(),
        question: z.string(),
        category: z.string(),
        weight: z.number().min(0).max(10),
        options: z.array(z.string()).optional()
    })).optional()
});

export const SubmitAssessmentResponseSchema = z.object({
    questionId: z.string().min(1, 'Question ID required'),
    answer: z.string().min(1, 'Answer is required').max(5000),
    score: z.number().min(0).max(10).optional(),
    evidence: z.array(z.string()).optional(),
    notes: z.string().max(2000).optional()
});

export const CompleteAssessmentSchema = z.object({
    overallScore: z.number().min(0).max(100),
    recommendations: z.array(z.string().max(500)),
    approverNotes: z.string().max(2000).optional()
});

// Vendor Contract Schemas
export const CreateContractSchema = z.object({
    vendorId: z.string().uuid('Invalid vendor ID'),
    contractType: ContractTypeSchema,
    contractNumber: z.string().max(100).optional(),
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().max(2000).optional(),
    effectiveDate: z.string().datetime(),
    expirationDate: z.string().datetime(),
    autoRenewal: z.boolean().default(false),
    noticePeriodDays: z.number().int().min(0).default(30),
    contractValue: z.number().min(0),
    currency: z.string().length(3, 'Currency must be 3 characters (ISO 4217)').default('USD'),
    paymentTerms: z.string().max(500).optional(),
    terminationClause: z.string().max(2000).optional(),
    dataProtectionClause: z.string().max(2000).optional(),
    slaTargets: z.object({
        uptime: z.number().min(0).max(100).optional(),
        responseTime: z.number().min(0).optional(),
        resolutionTime: z.number().min(0).optional()
    }).optional()
});

export const UpdateContractSchema = CreateContractSchema.partial().omit({ vendorId: true });

export const RenewContractSchema = z.object({
    newExpirationDate: z.string().datetime(),
    newContractValue: z.number().min(0).optional(),
    amendmentNotes: z.string().max(2000).optional()
});

// Vendor Issue Schemas
export const CreateVendorIssueSchema = z.object({
    vendorId: z.string().uuid('Invalid vendor ID'),
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().min(1, 'Description is required').max(5000),
    severity: IssueSeveritySchema,
    category: z.string().max(100),
    discoveredDate: z.string().datetime().optional(),
    dueDate: z.string().datetime().optional(),
    assignedTo: z.string().max(255).optional(),
    potentialImpact: z.string().max(2000).optional(),
    remediationPlan: z.string().max(5000).optional()
});

export const UpdateVendorIssueSchema = CreateVendorIssueSchema.partial().omit({ vendorId: true });

export const UpdateRemediationPlanSchema = z.object({
    remediationPlan: z.string().min(1, 'Remediation plan is required').max(5000),
    estimatedResolutionDate: z.string().datetime().optional(),
    assignedTo: z.string().max(255).optional(),
    notes: z.string().max(2000).optional()
});

// Vendor Document Schemas
export const UploadDocumentMetadataSchema = z.object({
    vendorId: z.string().uuid('Invalid vendor ID'),
    documentType: z.string().min(1, 'Document type is required').max(100),
    fileName: z.string().min(1, 'File name is required').max(255),
    description: z.string().max(1000).optional(),
    expirationDate: z.string().datetime().optional(),
    tags: z.array(z.string().max(50)).optional()
});

// Vendor Review Schemas
export const CreateVendorReviewSchema = z.object({
    vendorId: z.string().uuid('Invalid vendor ID'),
    reviewType: z.enum(['ANNUAL', 'QUARTERLY', 'AD_HOC', 'OFFBOARDING', 'TIER_CHANGE']),
    reviewDate: z.string().datetime().optional(),
    performanceScore: z.number().min(0).max(100).optional(),
    complianceScore: z.number().min(0).max(100).optional(),
    securityScore: z.number().min(0).max(100).optional(),
    financialStabilityScore: z.number().min(0).max(100).optional(),
    overallRating: z.number().min(0).max(100),
    findings: z.array(z.string().max(1000)).optional(),
    recommendations: z.array(z.string().max(500)).optional(),
    actionItems: z.array(z.string().max(500)).optional(),
    nextReviewDate: z.string().datetime().optional(),
    reviewerNotes: z.string().max(5000).optional()
});

// Monitoring Schemas
export const CreateMonitoringSignalSchema = z.object({
    vendorId: z.string().uuid('Invalid vendor ID'),
    signalType: z.enum(['NEWS_ALERT', 'FINANCIAL_CHANGE', 'SECURITY_INCIDENT', 'COMPLIANCE_VIOLATION', 'PERFORMANCE_DEGRADATION', 'SLA_BREACH', 'OTHER']),
    severity: IssueSeveritySchema,
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().min(1, 'Description is required').max(5000),
    source: z.string().max(255).optional(),
    sourceUrl: z.string().url().max(500).optional().or(z.literal('')),
    detectedDate: z.string().datetime().optional(),
    requiresAction: z.boolean().default(false),
    impactAssessment: z.string().max(2000).optional()
});

export const AcknowledgeSignalSchema = z.object({
    notes: z.string().max(2000).optional(),
    actionTaken: z.string().max(1000).optional()
});

// SLA Tracking Schemas
export const RecordSLAIncidentSchema = z.object({
    contractId: z.string().uuid('Invalid contract ID'),
    incidentType: z.enum(['UPTIME_BREACH', 'RESPONSE_TIME_BREACH', 'RESOLUTION_TIME_BREACH', 'PERFORMANCE_ISSUE', 'OTHER']),
    incidentDate: z.string().datetime(),
    description: z.string().min(1, 'Description is required').max(2000),
    impactDuration: z.number().min(0).optional(),
    resolutionDate: z.string().datetime().optional(),
    rootCause: z.string().max(2000).optional(),
    creditApplied: z.number().min(0).optional()
});

// Bulk Operations
export const BulkUpdateStatusSchema = z.object({
    vendorIds: z.array(z.string().uuid()).min(1, 'At least one vendor ID required').max(100, 'Maximum 100 vendors'),
    status: VendorStatusSchema,
    reason: z.string().max(500).optional()
});

export const BulkAssignTierSchema = z.object({
    vendorIds: z.array(z.string().uuid()).min(1, 'At least one vendor ID required').max(100, 'Maximum 100 vendors'),
    tier: VendorTierSchema,
    justification: z.string().max(1000).optional()
});

// Query/Filter Schemas
export const VendorListQuerySchema = z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    pageSize: z.string().regex(/^\d+$/).transform(val => Math.min(Number(val), 100)).optional().default('20'),
    status: VendorStatusSchema.optional(),
    tier: VendorTierSchema.optional(),
    vendorType: VendorTypeSchema.optional(),
    search: z.string().max(255).optional(),
    sortBy: z.enum(['name', 'tier', 'status', 'inherentRiskScore', 'residualRiskScore', 'nextReviewDate', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
});

export const AssessmentListQuerySchema = z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    pageSize: z.string().regex(/^\d+$/).transform(val => Math.min(Number(val), 100)).optional().default('20'),
    vendorId: z.string().uuid().optional(),
    assessmentType: AssessmentTypeSchema.optional(),
    status: AssessmentStatusSchema.optional(),
    sortBy: z.enum(['assessmentDate', 'dueDate', 'overallScore', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

// Type exports for use in routes/services
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

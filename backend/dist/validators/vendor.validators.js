"use strict";
/**
 * Zod Validation Schemas for Vendor Management
 * Comprehensive input validation for TPRM operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentListQuerySchema = exports.VendorListQuerySchema = exports.BulkAssignTierSchema = exports.BulkUpdateStatusSchema = exports.RecordSLAIncidentSchema = exports.AcknowledgeSignalSchema = exports.CreateMonitoringSignalSchema = exports.CreateVendorReviewSchema = exports.UploadDocumentMetadataSchema = exports.UpdateRemediationPlanSchema = exports.UpdateVendorIssueSchema = exports.CreateVendorIssueSchema = exports.RenewContractSchema = exports.UpdateContractSchema = exports.CreateContractSchema = exports.CompleteAssessmentSchema = exports.SubmitAssessmentResponseSchema = exports.CreateAssessmentSchema = exports.UpdateVendorSchema = exports.CreateVendorSchema = exports.ContractStatusSchema = exports.ContractTypeSchema = exports.IssueStatusSchema = exports.IssueSeveritySchema = exports.AssessmentStatusSchema = exports.AssessmentTypeSchema = exports.VendorStatusSchema = exports.VendorTypeSchema = exports.VendorTierSchema = void 0;
const zod_1 = require("zod");
// Enums
exports.VendorTierSchema = zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
exports.VendorTypeSchema = zod_1.z.enum(['SOFTWARE', 'INFRASTRUCTURE', 'PROFESSIONAL_SERVICES', 'MANAGED_SERVICES', 'CONSULTING', 'HARDWARE', 'OTHER']);
exports.VendorStatusSchema = zod_1.z.enum(['ACTIVE', 'PENDING_ONBOARDING', 'UNDER_REVIEW', 'SUSPENDED', 'TERMINATED', 'OFFBOARDED']);
exports.AssessmentTypeSchema = zod_1.z.enum(['DUE_DILIGENCE', 'ANNUAL_REVIEW', 'CONTINUOUS', 'INCIDENT_DRIVEN', 'CONTRACT_RENEWAL', 'SIG', 'CAIQ', 'CUSTOM']);
exports.AssessmentStatusSchema = zod_1.z.enum(['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'APPROVED']);
exports.IssueSeveritySchema = zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
exports.IssueStatusSchema = zod_1.z.enum(['OPEN', 'IN_REMEDIATION', 'PENDING_VERIFICATION', 'RESOLVED', 'ACCEPTED_RISK', 'CLOSED']);
exports.ContractTypeSchema = zod_1.z.enum(['MSA', 'SOW', 'SLA', 'DPA', 'NDA', 'BAA', 'AMENDMENT', 'OTHER']);
exports.ContractStatusSchema = zod_1.z.enum(['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'TERMINATED', 'RENEWED']);
// Create Vendor Schema
exports.CreateVendorSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required').max(255, 'Name too long'),
    legalName: zod_1.z.string().max(255).optional(),
    vendorType: exports.VendorTypeSchema,
    category: zod_1.z.string().min(1, 'Category is required').max(100),
    tier: exports.VendorTierSchema,
    description: zod_1.z.string().max(2000).optional(),
    website: zod_1.z.string().url('Invalid URL').max(255).optional().or(zod_1.z.literal('')),
    primaryContact: zod_1.z.string().email('Invalid email').max(255).optional(),
    primaryContactPhone: zod_1.z.string().max(50).optional(),
    businessOwner: zod_1.z.string().max(255).optional(),
    technicalOwner: zod_1.z.string().max(255).optional(),
    headquarters: zod_1.z.string().max(255).optional(),
    dataProcessingLocations: zod_1.z.array(zod_1.z.string().max(100)).optional(),
    servicesProvided: zod_1.z.array(zod_1.z.string().max(255)).optional(),
    criticalityJustification: zod_1.z.string().max(1000).optional(),
    annualSpend: zod_1.z.number().min(0).optional(),
    contractValue: zod_1.z.number().min(0).optional(),
    onboardingDate: zod_1.z.string().datetime().optional(),
    nextReviewDate: zod_1.z.string().datetime().optional()
});
// Update Vendor Schema
exports.UpdateVendorSchema = exports.CreateVendorSchema.partial();
// Vendor Assessment Schemas
exports.CreateAssessmentSchema = zod_1.z.object({
    vendorId: zod_1.z.string().uuid('Invalid vendor ID'),
    assessmentType: exports.AssessmentTypeSchema,
    assessmentDate: zod_1.z.string().datetime().optional(),
    dueDate: zod_1.z.string().datetime().optional(),
    description: zod_1.z.string().max(1000).optional(),
    questionnaire: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        question: zod_1.z.string(),
        category: zod_1.z.string(),
        weight: zod_1.z.number().min(0).max(10),
        options: zod_1.z.array(zod_1.z.string()).optional()
    })).optional()
});
exports.SubmitAssessmentResponseSchema = zod_1.z.object({
    questionId: zod_1.z.string().min(1, 'Question ID required'),
    answer: zod_1.z.string().min(1, 'Answer is required').max(5000),
    score: zod_1.z.number().min(0).max(10).optional(),
    evidence: zod_1.z.array(zod_1.z.string()).optional(),
    notes: zod_1.z.string().max(2000).optional()
});
exports.CompleteAssessmentSchema = zod_1.z.object({
    overallScore: zod_1.z.number().min(0).max(100),
    recommendations: zod_1.z.array(zod_1.z.string().max(500)),
    approverNotes: zod_1.z.string().max(2000).optional()
});
// Vendor Contract Schemas
exports.CreateContractSchema = zod_1.z.object({
    vendorId: zod_1.z.string().uuid('Invalid vendor ID'),
    contractType: exports.ContractTypeSchema,
    contractNumber: zod_1.z.string().max(100).optional(),
    title: zod_1.z.string().min(1, 'Title is required').max(255),
    description: zod_1.z.string().max(2000).optional(),
    effectiveDate: zod_1.z.string().datetime(),
    expirationDate: zod_1.z.string().datetime(),
    autoRenewal: zod_1.z.boolean().default(false),
    noticePeriodDays: zod_1.z.number().int().min(0).default(30),
    contractValue: zod_1.z.number().min(0),
    currency: zod_1.z.string().length(3, 'Currency must be 3 characters (ISO 4217)').default('USD'),
    paymentTerms: zod_1.z.string().max(500).optional(),
    terminationClause: zod_1.z.string().max(2000).optional(),
    dataProtectionClause: zod_1.z.string().max(2000).optional(),
    slaTargets: zod_1.z.object({
        uptime: zod_1.z.number().min(0).max(100).optional(),
        responseTime: zod_1.z.number().min(0).optional(),
        resolutionTime: zod_1.z.number().min(0).optional()
    }).optional()
});
exports.UpdateContractSchema = exports.CreateContractSchema.partial().omit({ vendorId: true });
exports.RenewContractSchema = zod_1.z.object({
    newExpirationDate: zod_1.z.string().datetime(),
    newContractValue: zod_1.z.number().min(0).optional(),
    amendmentNotes: zod_1.z.string().max(2000).optional()
});
// Vendor Issue Schemas
exports.CreateVendorIssueSchema = zod_1.z.object({
    vendorId: zod_1.z.string().uuid('Invalid vendor ID'),
    title: zod_1.z.string().min(1, 'Title is required').max(255),
    description: zod_1.z.string().min(1, 'Description is required').max(5000),
    severity: exports.IssueSeveritySchema,
    category: zod_1.z.string().max(100),
    discoveredDate: zod_1.z.string().datetime().optional(),
    dueDate: zod_1.z.string().datetime().optional(),
    assignedTo: zod_1.z.string().max(255).optional(),
    potentialImpact: zod_1.z.string().max(2000).optional(),
    remediationPlan: zod_1.z.string().max(5000).optional()
});
exports.UpdateVendorIssueSchema = exports.CreateVendorIssueSchema.partial().omit({ vendorId: true });
exports.UpdateRemediationPlanSchema = zod_1.z.object({
    remediationPlan: zod_1.z.string().min(1, 'Remediation plan is required').max(5000),
    estimatedResolutionDate: zod_1.z.string().datetime().optional(),
    assignedTo: zod_1.z.string().max(255).optional(),
    notes: zod_1.z.string().max(2000).optional()
});
// Vendor Document Schemas
exports.UploadDocumentMetadataSchema = zod_1.z.object({
    vendorId: zod_1.z.string().uuid('Invalid vendor ID'),
    documentType: zod_1.z.string().min(1, 'Document type is required').max(100),
    fileName: zod_1.z.string().min(1, 'File name is required').max(255),
    description: zod_1.z.string().max(1000).optional(),
    expirationDate: zod_1.z.string().datetime().optional(),
    tags: zod_1.z.array(zod_1.z.string().max(50)).optional()
});
// Vendor Review Schemas
exports.CreateVendorReviewSchema = zod_1.z.object({
    vendorId: zod_1.z.string().uuid('Invalid vendor ID'),
    reviewType: zod_1.z.enum(['ANNUAL', 'QUARTERLY', 'AD_HOC', 'OFFBOARDING', 'TIER_CHANGE']),
    reviewDate: zod_1.z.string().datetime().optional(),
    performanceScore: zod_1.z.number().min(0).max(100).optional(),
    complianceScore: zod_1.z.number().min(0).max(100).optional(),
    securityScore: zod_1.z.number().min(0).max(100).optional(),
    financialStabilityScore: zod_1.z.number().min(0).max(100).optional(),
    overallRating: zod_1.z.number().min(0).max(100),
    findings: zod_1.z.array(zod_1.z.string().max(1000)).optional(),
    recommendations: zod_1.z.array(zod_1.z.string().max(500)).optional(),
    actionItems: zod_1.z.array(zod_1.z.string().max(500)).optional(),
    nextReviewDate: zod_1.z.string().datetime().optional(),
    reviewerNotes: zod_1.z.string().max(5000).optional()
});
// Monitoring Schemas
exports.CreateMonitoringSignalSchema = zod_1.z.object({
    vendorId: zod_1.z.string().uuid('Invalid vendor ID'),
    signalType: zod_1.z.enum(['NEWS_ALERT', 'FINANCIAL_CHANGE', 'SECURITY_INCIDENT', 'COMPLIANCE_VIOLATION', 'PERFORMANCE_DEGRADATION', 'SLA_BREACH', 'OTHER']),
    severity: exports.IssueSeveritySchema,
    title: zod_1.z.string().min(1, 'Title is required').max(255),
    description: zod_1.z.string().min(1, 'Description is required').max(5000),
    source: zod_1.z.string().max(255).optional(),
    sourceUrl: zod_1.z.string().url().max(500).optional().or(zod_1.z.literal('')),
    detectedDate: zod_1.z.string().datetime().optional(),
    requiresAction: zod_1.z.boolean().default(false),
    impactAssessment: zod_1.z.string().max(2000).optional()
});
exports.AcknowledgeSignalSchema = zod_1.z.object({
    notes: zod_1.z.string().max(2000).optional(),
    actionTaken: zod_1.z.string().max(1000).optional()
});
// SLA Tracking Schemas
exports.RecordSLAIncidentSchema = zod_1.z.object({
    contractId: zod_1.z.string().uuid('Invalid contract ID'),
    incidentType: zod_1.z.enum(['UPTIME_BREACH', 'RESPONSE_TIME_BREACH', 'RESOLUTION_TIME_BREACH', 'PERFORMANCE_ISSUE', 'OTHER']),
    incidentDate: zod_1.z.string().datetime(),
    description: zod_1.z.string().min(1, 'Description is required').max(2000),
    impactDuration: zod_1.z.number().min(0).optional(),
    resolutionDate: zod_1.z.string().datetime().optional(),
    rootCause: zod_1.z.string().max(2000).optional(),
    creditApplied: zod_1.z.number().min(0).optional()
});
// Bulk Operations
exports.BulkUpdateStatusSchema = zod_1.z.object({
    vendorIds: zod_1.z.array(zod_1.z.string().uuid()).min(1, 'At least one vendor ID required').max(100, 'Maximum 100 vendors'),
    status: exports.VendorStatusSchema,
    reason: zod_1.z.string().max(500).optional()
});
exports.BulkAssignTierSchema = zod_1.z.object({
    vendorIds: zod_1.z.array(zod_1.z.string().uuid()).min(1, 'At least one vendor ID required').max(100, 'Maximum 100 vendors'),
    tier: exports.VendorTierSchema,
    justification: zod_1.z.string().max(1000).optional()
});
// Query/Filter Schemas
exports.VendorListQuerySchema = zod_1.z.object({
    page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    pageSize: zod_1.z.string().regex(/^\d+$/).transform(val => Math.min(Number(val), 100)).optional().default('20'),
    status: exports.VendorStatusSchema.optional(),
    tier: exports.VendorTierSchema.optional(),
    vendorType: exports.VendorTypeSchema.optional(),
    search: zod_1.z.string().max(255).optional(),
    sortBy: zod_1.z.enum(['name', 'tier', 'status', 'inherentRiskScore', 'residualRiskScore', 'nextReviewDate', 'createdAt']).optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('asc')
});
exports.AssessmentListQuerySchema = zod_1.z.object({
    page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    pageSize: zod_1.z.string().regex(/^\d+$/).transform(val => Math.min(Number(val), 100)).optional().default('20'),
    vendorId: zod_1.z.string().uuid().optional(),
    assessmentType: exports.AssessmentTypeSchema.optional(),
    status: exports.AssessmentStatusSchema.optional(),
    sortBy: zod_1.z.enum(['assessmentDate', 'dueDate', 'overallScore', 'createdAt']).optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc')
});
//# sourceMappingURL=vendor.validators.js.map
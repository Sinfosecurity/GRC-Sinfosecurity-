"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSchemas = exports.controlSchemas = exports.riskSchemas = exports.assessmentSchemas = exports.vendorSchemas = exports.commonSchemas = void 0;
exports.validateRequest = validateRequest;
exports.validateDataIntegrity = validateDataIntegrity;
const zod_1 = require("zod");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Validation utilities using Zod
 */
/**
 * Validate request data against schema
 */
function validateRequest(schema) {
    return async (req, res, next) => {
        try {
            // Validate body
            if (schema.body) {
                req.body = await schema.body.parseAsync(req.body);
            }
            // Validate query
            if (schema.query) {
                req.query = await schema.query.parseAsync(req.query);
            }
            // Validate params
            if (schema.params) {
                req.params = await schema.params.parseAsync(req.params);
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const formattedErrors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code,
                }));
                logger_1.default.warn('Request validation failed', {
                    path: req.path,
                    method: req.method,
                    errors: formattedErrors,
                });
                next(new errorHandler_1.ValidationError('Request validation failed', {
                    errors: formattedErrors,
                }));
            }
            else {
                next(error);
            }
        }
    };
}
/**
 * Common validation schemas
 */
exports.commonSchemas = {
    // UUID validation
    uuid: zod_1.z.string().uuid({ message: 'Invalid UUID format' }),
    // Email validation
    email: zod_1.z.string().email({ message: 'Invalid email address' }),
    // Pagination
    pagination: zod_1.z.object({
        page: zod_1.z.coerce.number().int().positive().default(1),
        limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
    // Date range
    dateRange: zod_1.z.object({
        startDate: zod_1.z.coerce.date(),
        endDate: zod_1.z.coerce.date(),
    }),
    // Status filter
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED']),
    // Risk level
    riskLevel: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    // Vendor tier
    vendorTier: zod_1.z.enum(['TIER_1', 'TIER_2', 'TIER_3']),
};
/**
 * Vendor validation schemas
 */
exports.vendorSchemas = {
    create: zod_1.z.object({
        body: zod_1.z.object({
            name: zod_1.z.string().min(1).max(255),
            description: zod_1.z.string().optional(),
            website: zod_1.z.string().url().optional(),
            contactEmail: exports.commonSchemas.email,
            contactPhone: zod_1.z.string().optional(),
            tier: exports.commonSchemas.vendorTier,
            businessCritical: zod_1.z.boolean().default(false),
            dataProcessingAgreement: zod_1.z.boolean().default(false),
        }),
    }),
    update: zod_1.z.object({
        params: zod_1.z.object({
            id: exports.commonSchemas.uuid,
        }),
        body: zod_1.z.object({
            name: zod_1.z.string().min(1).max(255).optional(),
            description: zod_1.z.string().optional(),
            website: zod_1.z.string().url().optional(),
            contactEmail: exports.commonSchemas.email.optional(),
            contactPhone: zod_1.z.string().optional(),
            tier: exports.commonSchemas.vendorTier.optional(),
            businessCritical: zod_1.z.boolean().optional(),
            dataProcessingAgreement: zod_1.z.boolean().optional(),
            status: exports.commonSchemas.status.optional(),
        }),
    }),
    get: zod_1.z.object({
        params: zod_1.z.object({
            id: exports.commonSchemas.uuid,
        }),
    }),
    list: zod_1.z.object({
        query: exports.commonSchemas.pagination.extend({
            tier: exports.commonSchemas.vendorTier.optional(),
            status: exports.commonSchemas.status.optional(),
            search: zod_1.z.string().optional(),
            businessCritical: zod_1.z.coerce.boolean().optional(),
        }),
    }),
};
/**
 * Assessment validation schemas
 */
exports.assessmentSchemas = {
    create: zod_1.z.object({
        body: zod_1.z.object({
            vendorId: exports.commonSchemas.uuid,
            type: zod_1.z.enum(['INITIAL', 'ANNUAL', 'TRIGGER_BASED', 'CONTINUOUS']),
            dueDate: zod_1.z.coerce.date(),
            assignedTo: exports.commonSchemas.uuid.optional(),
        }),
    }),
    update: zod_1.z.object({
        params: zod_1.z.object({
            id: exports.commonSchemas.uuid,
        }),
        body: zod_1.z.object({
            status: zod_1.z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']).optional(),
            dueDate: zod_1.z.coerce.date().optional(),
            assignedTo: exports.commonSchemas.uuid.optional(),
            completedAt: zod_1.z.coerce.date().optional(),
            findings: zod_1.z.string().optional(),
            recommendations: zod_1.z.string().optional(),
        }),
    }),
    submitResponse: zod_1.z.object({
        params: zod_1.z.object({
            id: exports.commonSchemas.uuid,
        }),
        body: zod_1.z.object({
            responses: zod_1.z.array(zod_1.z.object({
                questionId: exports.commonSchemas.uuid,
                answer: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean()]),
                evidence: zod_1.z.array(zod_1.z.string()).optional(),
                notes: zod_1.z.string().optional(),
            })),
        }),
    }),
    list: zod_1.z.object({
        query: exports.commonSchemas.pagination.extend({
            vendorId: exports.commonSchemas.uuid.optional(),
            status: zod_1.z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']).optional(),
            type: zod_1.z.enum(['INITIAL', 'ANNUAL', 'TRIGGER_BASED', 'CONTINUOUS']).optional(),
            assignedTo: exports.commonSchemas.uuid.optional(),
        }),
    }),
};
/**
 * Risk validation schemas
 */
exports.riskSchemas = {
    create: zod_1.z.object({
        body: zod_1.z.object({
            title: zod_1.z.string().min(1).max(255),
            description: zod_1.z.string(),
            category: zod_1.z.enum([
                'OPERATIONAL',
                'FINANCIAL',
                'COMPLIANCE',
                'STRATEGIC',
                'REPUTATIONAL',
                'CYBERSECURITY',
            ]),
            likelihood: zod_1.z.enum(['RARE', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'ALMOST_CERTAIN']),
            impact: zod_1.z.enum(['INSIGNIFICANT', 'MINOR', 'MODERATE', 'MAJOR', 'CATASTROPHIC']),
            vendorId: exports.commonSchemas.uuid.optional(),
            ownerId: exports.commonSchemas.uuid,
        }),
    }),
    update: zod_1.z.object({
        params: zod_1.z.object({
            id: exports.commonSchemas.uuid,
        }),
        body: zod_1.z.object({
            title: zod_1.z.string().min(1).max(255).optional(),
            description: zod_1.z.string().optional(),
            category: zod_1.z
                .enum([
                'OPERATIONAL',
                'FINANCIAL',
                'COMPLIANCE',
                'STRATEGIC',
                'REPUTATIONAL',
                'CYBERSECURITY',
            ])
                .optional(),
            likelihood: zod_1.z.enum(['RARE', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'ALMOST_CERTAIN']).optional(),
            impact: zod_1.z.enum(['INSIGNIFICANT', 'MINOR', 'MODERATE', 'MAJOR', 'CATASTROPHIC']).optional(),
            mitigation: zod_1.z.string().optional(),
            status: zod_1.z.enum(['IDENTIFIED', 'ASSESSING', 'TREATING', 'MONITORING', 'CLOSED']).optional(),
            residualLikelihood: zod_1.z.enum(['RARE', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'ALMOST_CERTAIN']).optional(),
            residualImpact: zod_1.z.enum(['INSIGNIFICANT', 'MINOR', 'MODERATE', 'MAJOR', 'CATASTROPHIC']).optional(),
        }),
    }),
    list: zod_1.z.object({
        query: exports.commonSchemas.pagination.extend({
            vendorId: exports.commonSchemas.uuid.optional(),
            category: zod_1.z
                .enum([
                'OPERATIONAL',
                'FINANCIAL',
                'COMPLIANCE',
                'STRATEGIC',
                'REPUTATIONAL',
                'CYBERSECURITY',
            ])
                .optional(),
            riskLevel: exports.commonSchemas.riskLevel.optional(),
            status: zod_1.z.enum(['IDENTIFIED', 'ASSESSING', 'TREATING', 'MONITORING', 'CLOSED']).optional(),
            ownerId: exports.commonSchemas.uuid.optional(),
        }),
    }),
};
/**
 * Control validation schemas
 */
exports.controlSchemas = {
    create: zod_1.z.object({
        body: zod_1.z.object({
            title: zod_1.z.string().min(1).max(255),
            description: zod_1.z.string(),
            category: zod_1.z.enum(['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE', 'COMPENSATING']),
            framework: zod_1.z.enum(['SOC2', 'ISO27001', 'NIST', 'HIPAA', 'GDPR', 'CUSTOM']),
            frequency: zod_1.z.enum(['CONTINUOUS', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']),
            ownerId: exports.commonSchemas.uuid,
            automated: zod_1.z.boolean().default(false),
        }),
    }),
    update: zod_1.z.object({
        params: zod_1.z.object({
            id: exports.commonSchemas.uuid,
        }),
        body: zod_1.z.object({
            title: zod_1.z.string().min(1).max(255).optional(),
            description: zod_1.z.string().optional(),
            category: zod_1.z.enum(['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE', 'COMPENSATING']).optional(),
            framework: zod_1.z.enum(['SOC2', 'ISO27001', 'NIST', 'HIPAA', 'GDPR', 'CUSTOM']).optional(),
            frequency: zod_1.z
                .enum(['CONTINUOUS', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'])
                .optional(),
            status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
            effectiveness: zod_1.z.enum(['EFFECTIVE', 'INEFFECTIVE', 'NEEDS_IMPROVEMENT']).optional(),
            automated: zod_1.z.boolean().optional(),
        }),
    }),
    testControl: zod_1.z.object({
        params: zod_1.z.object({
            id: exports.commonSchemas.uuid,
        }),
        body: zod_1.z.object({
            testDate: zod_1.z.coerce.date(),
            testResult: zod_1.z.enum(['PASS', 'FAIL', 'PARTIAL']),
            findings: zod_1.z.string(),
            evidence: zod_1.z.array(zod_1.z.string()).optional(),
            testedBy: exports.commonSchemas.uuid,
        }),
    }),
    list: zod_1.z.object({
        query: exports.commonSchemas.pagination.extend({
            category: zod_1.z.enum(['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE', 'COMPENSATING']).optional(),
            framework: zod_1.z.enum(['SOC2', 'ISO27001', 'NIST', 'HIPAA', 'GDPR', 'CUSTOM']).optional(),
            status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
            ownerId: exports.commonSchemas.uuid.optional(),
            automated: zod_1.z.coerce.boolean().optional(),
        }),
    }),
};
/**
 * User validation schemas
 */
exports.userSchemas = {
    register: zod_1.z.object({
        body: zod_1.z.object({
            email: exports.commonSchemas.email,
            password: zod_1.z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
                message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            }),
            firstName: zod_1.z.string().min(1).max(50),
            lastName: zod_1.z.string().min(1).max(50),
            organizationName: zod_1.z.string().min(1).max(255).optional(),
        }),
    }),
    login: zod_1.z.object({
        body: zod_1.z.object({
            email: exports.commonSchemas.email,
            password: zod_1.z.string(),
        }),
    }),
    updateProfile: zod_1.z.object({
        body: zod_1.z.object({
            firstName: zod_1.z.string().min(1).max(50).optional(),
            lastName: zod_1.z.string().min(1).max(50).optional(),
            phone: zod_1.z.string().optional(),
            timezone: zod_1.z.string().optional(),
        }),
    }),
    changePassword: zod_1.z.object({
        body: zod_1.z.object({
            currentPassword: zod_1.z.string(),
            newPassword: zod_1.z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
                message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            }),
        }),
    }),
};
/**
 * Data integrity validation
 */
function validateDataIntegrity(data, rules) {
    const errors = [];
    // Check required fields
    if (rules.requiredFields) {
        for (const field of rules.requiredFields) {
            if (!data[field]) {
                errors.push(`Missing required field: ${String(field)}`);
            }
        }
    }
    // Check numeric fields
    if (rules.numericFields) {
        for (const field of rules.numericFields) {
            if (data[field] !== undefined && typeof data[field] !== 'number') {
                errors.push(`Field ${String(field)} must be a number`);
            }
        }
    }
    // Check date fields
    if (rules.dateFields) {
        for (const field of rules.dateFields) {
            if (data[field] !== undefined) {
                const date = new Date(data[field]);
                if (isNaN(date.getTime())) {
                    errors.push(`Field ${String(field)} must be a valid date`);
                }
            }
        }
    }
    // Check email fields
    if (rules.emailFields) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const field of rules.emailFields) {
            if (data[field] && !emailRegex.test(data[field])) {
                errors.push(`Field ${String(field)} must be a valid email`);
            }
        }
    }
    // Check UUID fields
    if (rules.uuidFields) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        for (const field of rules.uuidFields) {
            if (data[field] && !uuidRegex.test(data[field])) {
                errors.push(`Field ${String(field)} must be a valid UUID`);
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=validation.js.map
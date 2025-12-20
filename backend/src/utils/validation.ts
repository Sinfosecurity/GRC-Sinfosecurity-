import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../middleware/errorHandler';
import logger from '../config/logger';

/**
 * Validation utilities using Zod
 */

/**
 * Validate request data against schema
 */
export function validateRequest(schema: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
}) {
    return async (req: Request, res: Response, next: NextFunction) => {
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
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                const formattedErrors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code,
                }));

                logger.warn('Request validation failed', {
                    path: req.path,
                    method: req.method,
                    errors: formattedErrors,
                });

                next(
                    new ValidationError('Request validation failed', {
                        errors: formattedErrors,
                    })
                );
            } else {
                next(error);
            }
        }
    };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
    // UUID validation
    uuid: z.string().uuid({ message: 'Invalid UUID format' }),

    // Email validation
    email: z.string().email({ message: 'Invalid email address' }),

    // Pagination
    pagination: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),

    // Date range
    dateRange: z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
    }),

    // Status filter
    status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED']),

    // Risk level
    riskLevel: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),

    // Vendor tier
    vendorTier: z.enum(['TIER_1', 'TIER_2', 'TIER_3']),
};

/**
 * Vendor validation schemas
 */
export const vendorSchemas = {
    create: z.object({
        body: z.object({
            name: z.string().min(1).max(255),
            description: z.string().optional(),
            website: z.string().url().optional(),
            contactEmail: commonSchemas.email,
            contactPhone: z.string().optional(),
            tier: commonSchemas.vendorTier,
            businessCritical: z.boolean().default(false),
            dataProcessingAgreement: z.boolean().default(false),
        }),
    }),

    update: z.object({
        params: z.object({
            id: commonSchemas.uuid,
        }),
        body: z.object({
            name: z.string().min(1).max(255).optional(),
            description: z.string().optional(),
            website: z.string().url().optional(),
            contactEmail: commonSchemas.email.optional(),
            contactPhone: z.string().optional(),
            tier: commonSchemas.vendorTier.optional(),
            businessCritical: z.boolean().optional(),
            dataProcessingAgreement: z.boolean().optional(),
            status: commonSchemas.status.optional(),
        }),
    }),

    get: z.object({
        params: z.object({
            id: commonSchemas.uuid,
        }),
    }),

    list: z.object({
        query: commonSchemas.pagination.extend({
            tier: commonSchemas.vendorTier.optional(),
            status: commonSchemas.status.optional(),
            search: z.string().optional(),
            businessCritical: z.coerce.boolean().optional(),
        }),
    }),
};

/**
 * Assessment validation schemas
 */
export const assessmentSchemas = {
    create: z.object({
        body: z.object({
            vendorId: commonSchemas.uuid,
            type: z.enum(['INITIAL', 'ANNUAL', 'TRIGGER_BASED', 'CONTINUOUS']),
            dueDate: z.coerce.date(),
            assignedTo: commonSchemas.uuid.optional(),
        }),
    }),

    update: z.object({
        params: z.object({
            id: commonSchemas.uuid,
        }),
        body: z.object({
            status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']).optional(),
            dueDate: z.coerce.date().optional(),
            assignedTo: commonSchemas.uuid.optional(),
            completedAt: z.coerce.date().optional(),
            findings: z.string().optional(),
            recommendations: z.string().optional(),
        }),
    }),

    submitResponse: z.object({
        params: z.object({
            id: commonSchemas.uuid,
        }),
        body: z.object({
            responses: z.array(
                z.object({
                    questionId: commonSchemas.uuid,
                    answer: z.union([z.string(), z.number(), z.boolean()]),
                    evidence: z.array(z.string()).optional(),
                    notes: z.string().optional(),
                })
            ),
        }),
    }),

    list: z.object({
        query: commonSchemas.pagination.extend({
            vendorId: commonSchemas.uuid.optional(),
            status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']).optional(),
            type: z.enum(['INITIAL', 'ANNUAL', 'TRIGGER_BASED', 'CONTINUOUS']).optional(),
            assignedTo: commonSchemas.uuid.optional(),
        }),
    }),
};

/**
 * Risk validation schemas
 */
export const riskSchemas = {
    create: z.object({
        body: z.object({
            title: z.string().min(1).max(255),
            description: z.string(),
            category: z.enum([
                'OPERATIONAL',
                'FINANCIAL',
                'COMPLIANCE',
                'STRATEGIC',
                'REPUTATIONAL',
                'CYBERSECURITY',
            ]),
            likelihood: z.enum(['RARE', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'ALMOST_CERTAIN']),
            impact: z.enum(['INSIGNIFICANT', 'MINOR', 'MODERATE', 'MAJOR', 'CATASTROPHIC']),
            vendorId: commonSchemas.uuid.optional(),
            ownerId: commonSchemas.uuid,
        }),
    }),

    update: z.object({
        params: z.object({
            id: commonSchemas.uuid,
        }),
        body: z.object({
            title: z.string().min(1).max(255).optional(),
            description: z.string().optional(),
            category: z
                .enum([
                    'OPERATIONAL',
                    'FINANCIAL',
                    'COMPLIANCE',
                    'STRATEGIC',
                    'REPUTATIONAL',
                    'CYBERSECURITY',
                ])
                .optional(),
            likelihood: z.enum(['RARE', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'ALMOST_CERTAIN']).optional(),
            impact: z.enum(['INSIGNIFICANT', 'MINOR', 'MODERATE', 'MAJOR', 'CATASTROPHIC']).optional(),
            mitigation: z.string().optional(),
            status: z.enum(['IDENTIFIED', 'ASSESSING', 'TREATING', 'MONITORING', 'CLOSED']).optional(),
            residualLikelihood: z.enum(['RARE', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'ALMOST_CERTAIN']).optional(),
            residualImpact: z.enum(['INSIGNIFICANT', 'MINOR', 'MODERATE', 'MAJOR', 'CATASTROPHIC']).optional(),
        }),
    }),

    list: z.object({
        query: commonSchemas.pagination.extend({
            vendorId: commonSchemas.uuid.optional(),
            category: z
                .enum([
                    'OPERATIONAL',
                    'FINANCIAL',
                    'COMPLIANCE',
                    'STRATEGIC',
                    'REPUTATIONAL',
                    'CYBERSECURITY',
                ])
                .optional(),
            riskLevel: commonSchemas.riskLevel.optional(),
            status: z.enum(['IDENTIFIED', 'ASSESSING', 'TREATING', 'MONITORING', 'CLOSED']).optional(),
            ownerId: commonSchemas.uuid.optional(),
        }),
    }),
};

/**
 * Control validation schemas
 */
export const controlSchemas = {
    create: z.object({
        body: z.object({
            title: z.string().min(1).max(255),
            description: z.string(),
            category: z.enum(['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE', 'COMPENSATING']),
            framework: z.enum(['SOC2', 'ISO27001', 'NIST', 'HIPAA', 'GDPR', 'CUSTOM']),
            frequency: z.enum(['CONTINUOUS', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']),
            ownerId: commonSchemas.uuid,
            automated: z.boolean().default(false),
        }),
    }),

    update: z.object({
        params: z.object({
            id: commonSchemas.uuid,
        }),
        body: z.object({
            title: z.string().min(1).max(255).optional(),
            description: z.string().optional(),
            category: z.enum(['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE', 'COMPENSATING']).optional(),
            framework: z.enum(['SOC2', 'ISO27001', 'NIST', 'HIPAA', 'GDPR', 'CUSTOM']).optional(),
            frequency: z
                .enum(['CONTINUOUS', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'])
                .optional(),
            status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
            effectiveness: z.enum(['EFFECTIVE', 'INEFFECTIVE', 'NEEDS_IMPROVEMENT']).optional(),
            automated: z.boolean().optional(),
        }),
    }),

    testControl: z.object({
        params: z.object({
            id: commonSchemas.uuid,
        }),
        body: z.object({
            testDate: z.coerce.date(),
            testResult: z.enum(['PASS', 'FAIL', 'PARTIAL']),
            findings: z.string(),
            evidence: z.array(z.string()).optional(),
            testedBy: commonSchemas.uuid,
        }),
    }),

    list: z.object({
        query: commonSchemas.pagination.extend({
            category: z.enum(['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE', 'COMPENSATING']).optional(),
            framework: z.enum(['SOC2', 'ISO27001', 'NIST', 'HIPAA', 'GDPR', 'CUSTOM']).optional(),
            status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
            ownerId: commonSchemas.uuid.optional(),
            automated: z.coerce.boolean().optional(),
        }),
    }),
};

/**
 * User validation schemas
 */
export const userSchemas = {
    register: z.object({
        body: z.object({
            email: commonSchemas.email,
            password: z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
                message:
                    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            }),
            firstName: z.string().min(1).max(50),
            lastName: z.string().min(1).max(50),
            organizationName: z.string().min(1).max(255).optional(),
        }),
    }),

    login: z.object({
        body: z.object({
            email: commonSchemas.email,
            password: z.string(),
        }),
    }),

    updateProfile: z.object({
        body: z.object({
            firstName: z.string().min(1).max(50).optional(),
            lastName: z.string().min(1).max(50).optional(),
            phone: z.string().optional(),
            timezone: z.string().optional(),
        }),
    }),

    changePassword: z.object({
        body: z.object({
            currentPassword: z.string(),
            newPassword: z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
                message:
                    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            }),
        }),
    }),
};

/**
 * Data integrity validation
 */
export function validateDataIntegrity<T>(
    data: T,
    rules: {
        requiredFields?: Array<keyof T>;
        numericFields?: Array<keyof T>;
        dateFields?: Array<keyof T>;
        emailFields?: Array<keyof T>;
        uuidFields?: Array<keyof T>;
    }
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

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
                const date = new Date(data[field] as any);
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
            if (data[field] && !emailRegex.test(data[field] as any)) {
                errors.push(`Field ${String(field)} must be a valid email`);
            }
        }
    }

    // Check UUID fields
    if (rules.uuidFields) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        for (const field of rules.uuidFields) {
            if (data[field] && !uuidRegex.test(data[field] as any)) {
                errors.push(`Field ${String(field)} must be a valid UUID`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

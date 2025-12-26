import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
/**
 * Validation utilities using Zod
 */
/**
 * Validate request data against schema
 */
export declare function validateRequest(schema: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
}): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Common validation schemas
 */
export declare const commonSchemas: {
    uuid: z.ZodString;
    email: z.ZodString;
    pagination: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }, {
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }>;
    dateRange: z.ZodObject<{
        startDate: z.ZodDate;
        endDate: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        startDate?: Date;
        endDate?: Date;
    }, {
        startDate?: Date;
        endDate?: Date;
    }>;
    status: z.ZodEnum<["ACTIVE", "INACTIVE", "PENDING", "SUSPENDED"]>;
    riskLevel: z.ZodEnum<["CRITICAL", "HIGH", "MEDIUM", "LOW"]>;
    vendorTier: z.ZodEnum<["TIER_1", "TIER_2", "TIER_3"]>;
};
/**
 * Vendor validation schemas
 */
export declare const vendorSchemas: {
    create: z.ZodObject<{
        body: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            website: z.ZodOptional<z.ZodString>;
            contactEmail: z.ZodString;
            contactPhone: z.ZodOptional<z.ZodString>;
            tier: z.ZodEnum<["TIER_1", "TIER_2", "TIER_3"]>;
            businessCritical: z.ZodDefault<z.ZodBoolean>;
            dataProcessingAgreement: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            description?: string;
            tier?: "TIER_1" | "TIER_2" | "TIER_3";
            website?: string;
            contactEmail?: string;
            contactPhone?: string;
            businessCritical?: boolean;
            dataProcessingAgreement?: boolean;
        }, {
            name?: string;
            description?: string;
            tier?: "TIER_1" | "TIER_2" | "TIER_3";
            website?: string;
            contactEmail?: string;
            contactPhone?: string;
            businessCritical?: boolean;
            dataProcessingAgreement?: boolean;
        }>;
    }, "strip", z.ZodTypeAny, {
        body?: {
            name?: string;
            description?: string;
            tier?: "TIER_1" | "TIER_2" | "TIER_3";
            website?: string;
            contactEmail?: string;
            contactPhone?: string;
            businessCritical?: boolean;
            dataProcessingAgreement?: boolean;
        };
    }, {
        body?: {
            name?: string;
            description?: string;
            tier?: "TIER_1" | "TIER_2" | "TIER_3";
            website?: string;
            contactEmail?: string;
            contactPhone?: string;
            businessCritical?: boolean;
            dataProcessingAgreement?: boolean;
        };
    }>;
    update: z.ZodObject<{
        params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id?: string;
        }, {
            id?: string;
        }>;
        body: z.ZodObject<{
            name: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            website: z.ZodOptional<z.ZodString>;
            contactEmail: z.ZodOptional<z.ZodString>;
            contactPhone: z.ZodOptional<z.ZodString>;
            tier: z.ZodOptional<z.ZodEnum<["TIER_1", "TIER_2", "TIER_3"]>>;
            businessCritical: z.ZodOptional<z.ZodBoolean>;
            dataProcessingAgreement: z.ZodOptional<z.ZodBoolean>;
            status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE", "PENDING", "SUSPENDED"]>>;
        }, "strip", z.ZodTypeAny, {
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";
            name?: string;
            description?: string;
            tier?: "TIER_1" | "TIER_2" | "TIER_3";
            website?: string;
            contactEmail?: string;
            contactPhone?: string;
            businessCritical?: boolean;
            dataProcessingAgreement?: boolean;
        }, {
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";
            name?: string;
            description?: string;
            tier?: "TIER_1" | "TIER_2" | "TIER_3";
            website?: string;
            contactEmail?: string;
            contactPhone?: string;
            businessCritical?: boolean;
            dataProcessingAgreement?: boolean;
        }>;
    }, "strip", z.ZodTypeAny, {
        body?: {
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";
            name?: string;
            description?: string;
            tier?: "TIER_1" | "TIER_2" | "TIER_3";
            website?: string;
            contactEmail?: string;
            contactPhone?: string;
            businessCritical?: boolean;
            dataProcessingAgreement?: boolean;
        };
        params?: {
            id?: string;
        };
    }, {
        body?: {
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";
            name?: string;
            description?: string;
            tier?: "TIER_1" | "TIER_2" | "TIER_3";
            website?: string;
            contactEmail?: string;
            contactPhone?: string;
            businessCritical?: boolean;
            dataProcessingAgreement?: boolean;
        };
        params?: {
            id?: string;
        };
    }>;
    get: z.ZodObject<{
        params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id?: string;
        }, {
            id?: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        params?: {
            id?: string;
        };
    }, {
        params?: {
            id?: string;
        };
    }>;
    list: z.ZodObject<{
        query: z.ZodObject<{
            page: z.ZodDefault<z.ZodNumber>;
            limit: z.ZodDefault<z.ZodNumber>;
            sortBy: z.ZodOptional<z.ZodString>;
            sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
        } & {
            tier: z.ZodOptional<z.ZodEnum<["TIER_1", "TIER_2", "TIER_3"]>>;
            status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE", "PENDING", "SUSPENDED"]>>;
            search: z.ZodOptional<z.ZodString>;
            businessCritical: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            page?: number;
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";
            search?: string;
            limit?: number;
            tier?: "TIER_1" | "TIER_2" | "TIER_3";
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            businessCritical?: boolean;
        }, {
            page?: number;
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";
            search?: string;
            limit?: number;
            tier?: "TIER_1" | "TIER_2" | "TIER_3";
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            businessCritical?: boolean;
        }>;
    }, "strip", z.ZodTypeAny, {
        query?: {
            page?: number;
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";
            search?: string;
            limit?: number;
            tier?: "TIER_1" | "TIER_2" | "TIER_3";
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            businessCritical?: boolean;
        };
    }, {
        query?: {
            page?: number;
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";
            search?: string;
            limit?: number;
            tier?: "TIER_1" | "TIER_2" | "TIER_3";
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            businessCritical?: boolean;
        };
    }>;
};
/**
 * Assessment validation schemas
 */
export declare const assessmentSchemas: {
    create: z.ZodObject<{
        body: z.ZodObject<{
            vendorId: z.ZodString;
            type: z.ZodEnum<["INITIAL", "ANNUAL", "TRIGGER_BASED", "CONTINUOUS"]>;
            dueDate: z.ZodDate;
            assignedTo: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type?: "INITIAL" | "ANNUAL" | "CONTINUOUS" | "TRIGGER_BASED";
            assignedTo?: string;
            dueDate?: Date;
            vendorId?: string;
        }, {
            type?: "INITIAL" | "ANNUAL" | "CONTINUOUS" | "TRIGGER_BASED";
            assignedTo?: string;
            dueDate?: Date;
            vendorId?: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        body?: {
            type?: "INITIAL" | "ANNUAL" | "CONTINUOUS" | "TRIGGER_BASED";
            assignedTo?: string;
            dueDate?: Date;
            vendorId?: string;
        };
    }, {
        body?: {
            type?: "INITIAL" | "ANNUAL" | "CONTINUOUS" | "TRIGGER_BASED";
            assignedTo?: string;
            dueDate?: Date;
            vendorId?: string;
        };
    }>;
    update: z.ZodObject<{
        params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id?: string;
        }, {
            id?: string;
        }>;
        body: z.ZodObject<{
            status: z.ZodOptional<z.ZodEnum<["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "OVERDUE"]>>;
            dueDate: z.ZodOptional<z.ZodDate>;
            assignedTo: z.ZodOptional<z.ZodString>;
            completedAt: z.ZodOptional<z.ZodDate>;
            findings: z.ZodOptional<z.ZodString>;
            recommendations: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status?: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "OVERDUE";
            assignedTo?: string;
            dueDate?: Date;
            completedAt?: Date;
            recommendations?: string;
            findings?: string;
        }, {
            status?: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "OVERDUE";
            assignedTo?: string;
            dueDate?: Date;
            completedAt?: Date;
            recommendations?: string;
            findings?: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        body?: {
            status?: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "OVERDUE";
            assignedTo?: string;
            dueDate?: Date;
            completedAt?: Date;
            recommendations?: string;
            findings?: string;
        };
        params?: {
            id?: string;
        };
    }, {
        body?: {
            status?: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "OVERDUE";
            assignedTo?: string;
            dueDate?: Date;
            completedAt?: Date;
            recommendations?: string;
            findings?: string;
        };
        params?: {
            id?: string;
        };
    }>;
    submitResponse: z.ZodObject<{
        params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id?: string;
        }, {
            id?: string;
        }>;
        body: z.ZodObject<{
            responses: z.ZodArray<z.ZodObject<{
                questionId: z.ZodString;
                answer: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                evidence: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                notes: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                notes?: string;
                questionId?: string;
                answer?: string | number | boolean;
                evidence?: string[];
            }, {
                notes?: string;
                questionId?: string;
                answer?: string | number | boolean;
                evidence?: string[];
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            responses?: {
                notes?: string;
                questionId?: string;
                answer?: string | number | boolean;
                evidence?: string[];
            }[];
        }, {
            responses?: {
                notes?: string;
                questionId?: string;
                answer?: string | number | boolean;
                evidence?: string[];
            }[];
        }>;
    }, "strip", z.ZodTypeAny, {
        body?: {
            responses?: {
                notes?: string;
                questionId?: string;
                answer?: string | number | boolean;
                evidence?: string[];
            }[];
        };
        params?: {
            id?: string;
        };
    }, {
        body?: {
            responses?: {
                notes?: string;
                questionId?: string;
                answer?: string | number | boolean;
                evidence?: string[];
            }[];
        };
        params?: {
            id?: string;
        };
    }>;
    list: z.ZodObject<{
        query: z.ZodObject<{
            page: z.ZodDefault<z.ZodNumber>;
            limit: z.ZodDefault<z.ZodNumber>;
            sortBy: z.ZodOptional<z.ZodString>;
            sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
        } & {
            vendorId: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodEnum<["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "OVERDUE"]>>;
            type: z.ZodOptional<z.ZodEnum<["INITIAL", "ANNUAL", "TRIGGER_BASED", "CONTINUOUS"]>>;
            assignedTo: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            page?: number;
            status?: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "OVERDUE";
            type?: "INITIAL" | "ANNUAL" | "CONTINUOUS" | "TRIGGER_BASED";
            limit?: number;
            assignedTo?: string;
            vendorId?: string;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
        }, {
            page?: number;
            status?: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "OVERDUE";
            type?: "INITIAL" | "ANNUAL" | "CONTINUOUS" | "TRIGGER_BASED";
            limit?: number;
            assignedTo?: string;
            vendorId?: string;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
        }>;
    }, "strip", z.ZodTypeAny, {
        query?: {
            page?: number;
            status?: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "OVERDUE";
            type?: "INITIAL" | "ANNUAL" | "CONTINUOUS" | "TRIGGER_BASED";
            limit?: number;
            assignedTo?: string;
            vendorId?: string;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
        };
    }, {
        query?: {
            page?: number;
            status?: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "OVERDUE";
            type?: "INITIAL" | "ANNUAL" | "CONTINUOUS" | "TRIGGER_BASED";
            limit?: number;
            assignedTo?: string;
            vendorId?: string;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
        };
    }>;
};
/**
 * Risk validation schemas
 */
export declare const riskSchemas: {
    create: z.ZodObject<{
        body: z.ZodObject<{
            title: z.ZodString;
            description: z.ZodString;
            category: z.ZodEnum<["OPERATIONAL", "FINANCIAL", "COMPLIANCE", "STRATEGIC", "REPUTATIONAL", "CYBERSECURITY"]>;
            likelihood: z.ZodEnum<["RARE", "UNLIKELY", "POSSIBLE", "LIKELY", "ALMOST_CERTAIN"]>;
            impact: z.ZodEnum<["INSIGNIFICANT", "MINOR", "MODERATE", "MAJOR", "CATASTROPHIC"]>;
            vendorId: z.ZodOptional<z.ZodString>;
            ownerId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            description?: string;
            title?: string;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC";
            vendorId?: string;
            likelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
            impact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC";
            ownerId?: string;
        }, {
            description?: string;
            title?: string;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC";
            vendorId?: string;
            likelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
            impact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC";
            ownerId?: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        body?: {
            description?: string;
            title?: string;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC";
            vendorId?: string;
            likelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
            impact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC";
            ownerId?: string;
        };
    }, {
        body?: {
            description?: string;
            title?: string;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC";
            vendorId?: string;
            likelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
            impact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC";
            ownerId?: string;
        };
    }>;
    update: z.ZodObject<{
        params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id?: string;
        }, {
            id?: string;
        }>;
        body: z.ZodObject<{
            title: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            category: z.ZodOptional<z.ZodEnum<["OPERATIONAL", "FINANCIAL", "COMPLIANCE", "STRATEGIC", "REPUTATIONAL", "CYBERSECURITY"]>>;
            likelihood: z.ZodOptional<z.ZodEnum<["RARE", "UNLIKELY", "POSSIBLE", "LIKELY", "ALMOST_CERTAIN"]>>;
            impact: z.ZodOptional<z.ZodEnum<["INSIGNIFICANT", "MINOR", "MODERATE", "MAJOR", "CATASTROPHIC"]>>;
            mitigation: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodEnum<["IDENTIFIED", "ASSESSING", "TREATING", "MONITORING", "CLOSED"]>>;
            residualLikelihood: z.ZodOptional<z.ZodEnum<["RARE", "UNLIKELY", "POSSIBLE", "LIKELY", "ALMOST_CERTAIN"]>>;
            residualImpact: z.ZodOptional<z.ZodEnum<["INSIGNIFICANT", "MINOR", "MODERATE", "MAJOR", "CATASTROPHIC"]>>;
        }, "strip", z.ZodTypeAny, {
            status?: "IDENTIFIED" | "CLOSED" | "ASSESSING" | "TREATING" | "MONITORING";
            description?: string;
            title?: string;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC";
            likelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
            impact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC";
            mitigation?: string;
            residualLikelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
            residualImpact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC";
        }, {
            status?: "IDENTIFIED" | "CLOSED" | "ASSESSING" | "TREATING" | "MONITORING";
            description?: string;
            title?: string;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC";
            likelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
            impact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC";
            mitigation?: string;
            residualLikelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
            residualImpact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC";
        }>;
    }, "strip", z.ZodTypeAny, {
        body?: {
            status?: "IDENTIFIED" | "CLOSED" | "ASSESSING" | "TREATING" | "MONITORING";
            description?: string;
            title?: string;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC";
            likelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
            impact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC";
            mitigation?: string;
            residualLikelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
            residualImpact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC";
        };
        params?: {
            id?: string;
        };
    }, {
        body?: {
            status?: "IDENTIFIED" | "CLOSED" | "ASSESSING" | "TREATING" | "MONITORING";
            description?: string;
            title?: string;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC";
            likelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
            impact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC";
            mitigation?: string;
            residualLikelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
            residualImpact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC";
        };
        params?: {
            id?: string;
        };
    }>;
    list: z.ZodObject<{
        query: z.ZodObject<{
            page: z.ZodDefault<z.ZodNumber>;
            limit: z.ZodDefault<z.ZodNumber>;
            sortBy: z.ZodOptional<z.ZodString>;
            sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
        } & {
            vendorId: z.ZodOptional<z.ZodString>;
            category: z.ZodOptional<z.ZodEnum<["OPERATIONAL", "FINANCIAL", "COMPLIANCE", "STRATEGIC", "REPUTATIONAL", "CYBERSECURITY"]>>;
            riskLevel: z.ZodOptional<z.ZodEnum<["CRITICAL", "HIGH", "MEDIUM", "LOW"]>>;
            status: z.ZodOptional<z.ZodEnum<["IDENTIFIED", "ASSESSING", "TREATING", "MONITORING", "CLOSED"]>>;
            ownerId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            page?: number;
            status?: "IDENTIFIED" | "CLOSED" | "ASSESSING" | "TREATING" | "MONITORING";
            limit?: number;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC";
            vendorId?: string;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            riskLevel?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
            ownerId?: string;
        }, {
            page?: number;
            status?: "IDENTIFIED" | "CLOSED" | "ASSESSING" | "TREATING" | "MONITORING";
            limit?: number;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC";
            vendorId?: string;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            riskLevel?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
            ownerId?: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        query?: {
            page?: number;
            status?: "IDENTIFIED" | "CLOSED" | "ASSESSING" | "TREATING" | "MONITORING";
            limit?: number;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC";
            vendorId?: string;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            riskLevel?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
            ownerId?: string;
        };
    }, {
        query?: {
            page?: number;
            status?: "IDENTIFIED" | "CLOSED" | "ASSESSING" | "TREATING" | "MONITORING";
            limit?: number;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC";
            vendorId?: string;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            riskLevel?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
            ownerId?: string;
        };
    }>;
};
/**
 * Control validation schemas
 */
export declare const controlSchemas: {
    create: z.ZodObject<{
        body: z.ZodObject<{
            title: z.ZodString;
            description: z.ZodString;
            category: z.ZodEnum<["PREVENTIVE", "DETECTIVE", "CORRECTIVE", "COMPENSATING"]>;
            framework: z.ZodEnum<["SOC2", "ISO27001", "NIST", "HIPAA", "GDPR", "CUSTOM"]>;
            frequency: z.ZodEnum<["CONTINUOUS", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY"]>;
            ownerId: z.ZodString;
            automated: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            description?: string;
            title?: string;
            automated?: boolean;
            frequency?: "CONTINUOUS" | "QUARTERLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUALLY";
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING";
            ownerId?: string;
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST";
        }, {
            description?: string;
            title?: string;
            automated?: boolean;
            frequency?: "CONTINUOUS" | "QUARTERLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUALLY";
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING";
            ownerId?: string;
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST";
        }>;
    }, "strip", z.ZodTypeAny, {
        body?: {
            description?: string;
            title?: string;
            automated?: boolean;
            frequency?: "CONTINUOUS" | "QUARTERLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUALLY";
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING";
            ownerId?: string;
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST";
        };
    }, {
        body?: {
            description?: string;
            title?: string;
            automated?: boolean;
            frequency?: "CONTINUOUS" | "QUARTERLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUALLY";
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING";
            ownerId?: string;
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST";
        };
    }>;
    update: z.ZodObject<{
        params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id?: string;
        }, {
            id?: string;
        }>;
        body: z.ZodObject<{
            title: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            category: z.ZodOptional<z.ZodEnum<["PREVENTIVE", "DETECTIVE", "CORRECTIVE", "COMPENSATING"]>>;
            framework: z.ZodOptional<z.ZodEnum<["SOC2", "ISO27001", "NIST", "HIPAA", "GDPR", "CUSTOM"]>>;
            frequency: z.ZodOptional<z.ZodEnum<["CONTINUOUS", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY"]>>;
            status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE", "PENDING"]>>;
            effectiveness: z.ZodOptional<z.ZodEnum<["EFFECTIVE", "INEFFECTIVE", "NEEDS_IMPROVEMENT"]>>;
            automated: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            status?: "ACTIVE" | "INACTIVE" | "PENDING";
            description?: string;
            title?: string;
            automated?: boolean;
            frequency?: "CONTINUOUS" | "QUARTERLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUALLY";
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING";
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST";
            effectiveness?: "INEFFECTIVE" | "EFFECTIVE" | "NEEDS_IMPROVEMENT";
        }, {
            status?: "ACTIVE" | "INACTIVE" | "PENDING";
            description?: string;
            title?: string;
            automated?: boolean;
            frequency?: "CONTINUOUS" | "QUARTERLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUALLY";
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING";
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST";
            effectiveness?: "INEFFECTIVE" | "EFFECTIVE" | "NEEDS_IMPROVEMENT";
        }>;
    }, "strip", z.ZodTypeAny, {
        body?: {
            status?: "ACTIVE" | "INACTIVE" | "PENDING";
            description?: string;
            title?: string;
            automated?: boolean;
            frequency?: "CONTINUOUS" | "QUARTERLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUALLY";
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING";
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST";
            effectiveness?: "INEFFECTIVE" | "EFFECTIVE" | "NEEDS_IMPROVEMENT";
        };
        params?: {
            id?: string;
        };
    }, {
        body?: {
            status?: "ACTIVE" | "INACTIVE" | "PENDING";
            description?: string;
            title?: string;
            automated?: boolean;
            frequency?: "CONTINUOUS" | "QUARTERLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUALLY";
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING";
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST";
            effectiveness?: "INEFFECTIVE" | "EFFECTIVE" | "NEEDS_IMPROVEMENT";
        };
        params?: {
            id?: string;
        };
    }>;
    testControl: z.ZodObject<{
        params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id?: string;
        }, {
            id?: string;
        }>;
        body: z.ZodObject<{
            testDate: z.ZodDate;
            testResult: z.ZodEnum<["PASS", "FAIL", "PARTIAL"]>;
            findings: z.ZodString;
            evidence: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            testedBy: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            evidence?: string[];
            findings?: string;
            testDate?: Date;
            testResult?: "PASS" | "FAIL" | "PARTIAL";
            testedBy?: string;
        }, {
            evidence?: string[];
            findings?: string;
            testDate?: Date;
            testResult?: "PASS" | "FAIL" | "PARTIAL";
            testedBy?: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        body?: {
            evidence?: string[];
            findings?: string;
            testDate?: Date;
            testResult?: "PASS" | "FAIL" | "PARTIAL";
            testedBy?: string;
        };
        params?: {
            id?: string;
        };
    }, {
        body?: {
            evidence?: string[];
            findings?: string;
            testDate?: Date;
            testResult?: "PASS" | "FAIL" | "PARTIAL";
            testedBy?: string;
        };
        params?: {
            id?: string;
        };
    }>;
    list: z.ZodObject<{
        query: z.ZodObject<{
            page: z.ZodDefault<z.ZodNumber>;
            limit: z.ZodDefault<z.ZodNumber>;
            sortBy: z.ZodOptional<z.ZodString>;
            sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
        } & {
            category: z.ZodOptional<z.ZodEnum<["PREVENTIVE", "DETECTIVE", "CORRECTIVE", "COMPENSATING"]>>;
            framework: z.ZodOptional<z.ZodEnum<["SOC2", "ISO27001", "NIST", "HIPAA", "GDPR", "CUSTOM"]>>;
            status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE", "PENDING"]>>;
            ownerId: z.ZodOptional<z.ZodString>;
            automated: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            page?: number;
            status?: "ACTIVE" | "INACTIVE" | "PENDING";
            limit?: number;
            automated?: boolean;
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING";
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            ownerId?: string;
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST";
        }, {
            page?: number;
            status?: "ACTIVE" | "INACTIVE" | "PENDING";
            limit?: number;
            automated?: boolean;
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING";
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            ownerId?: string;
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST";
        }>;
    }, "strip", z.ZodTypeAny, {
        query?: {
            page?: number;
            status?: "ACTIVE" | "INACTIVE" | "PENDING";
            limit?: number;
            automated?: boolean;
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING";
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            ownerId?: string;
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST";
        };
    }, {
        query?: {
            page?: number;
            status?: "ACTIVE" | "INACTIVE" | "PENDING";
            limit?: number;
            automated?: boolean;
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING";
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            ownerId?: string;
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST";
        };
    }>;
};
/**
 * User validation schemas
 */
export declare const userSchemas: {
    register: z.ZodObject<{
        body: z.ZodObject<{
            email: z.ZodString;
            password: z.ZodString;
            firstName: z.ZodString;
            lastName: z.ZodString;
            organizationName: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            email?: string;
            password?: string;
            firstName?: string;
            lastName?: string;
            organizationName?: string;
        }, {
            email?: string;
            password?: string;
            firstName?: string;
            lastName?: string;
            organizationName?: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        body?: {
            email?: string;
            password?: string;
            firstName?: string;
            lastName?: string;
            organizationName?: string;
        };
    }, {
        body?: {
            email?: string;
            password?: string;
            firstName?: string;
            lastName?: string;
            organizationName?: string;
        };
    }>;
    login: z.ZodObject<{
        body: z.ZodObject<{
            email: z.ZodString;
            password: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            email?: string;
            password?: string;
        }, {
            email?: string;
            password?: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        body?: {
            email?: string;
            password?: string;
        };
    }, {
        body?: {
            email?: string;
            password?: string;
        };
    }>;
    updateProfile: z.ZodObject<{
        body: z.ZodObject<{
            firstName: z.ZodOptional<z.ZodString>;
            lastName: z.ZodOptional<z.ZodString>;
            phone: z.ZodOptional<z.ZodString>;
            timezone: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            firstName?: string;
            lastName?: string;
            phone?: string;
            timezone?: string;
        }, {
            firstName?: string;
            lastName?: string;
            phone?: string;
            timezone?: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        body?: {
            firstName?: string;
            lastName?: string;
            phone?: string;
            timezone?: string;
        };
    }, {
        body?: {
            firstName?: string;
            lastName?: string;
            phone?: string;
            timezone?: string;
        };
    }>;
    changePassword: z.ZodObject<{
        body: z.ZodObject<{
            currentPassword: z.ZodString;
            newPassword: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            currentPassword?: string;
            newPassword?: string;
        }, {
            currentPassword?: string;
            newPassword?: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        body?: {
            currentPassword?: string;
            newPassword?: string;
        };
    }, {
        body?: {
            currentPassword?: string;
            newPassword?: string;
        };
    }>;
};
/**
 * Data integrity validation
 */
export declare function validateDataIntegrity<T>(data: T, rules: {
    requiredFields?: Array<keyof T>;
    numericFields?: Array<keyof T>;
    dateFields?: Array<keyof T>;
    emailFields?: Array<keyof T>;
    uuidFields?: Array<keyof T>;
}): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=validation.d.ts.map
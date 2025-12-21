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
        page: number;
        limit: number;
        sortOrder: "asc" | "desc";
        sortBy?: string | undefined;
    }, {
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: string | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }>;
    dateRange: z.ZodObject<{
        startDate: z.ZodDate;
        endDate: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        startDate: Date;
        endDate: Date;
    }, {
        startDate: Date;
        endDate: Date;
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
            name: string;
            tier: "TIER_1" | "TIER_2" | "TIER_3";
            contactEmail: string;
            businessCritical: boolean;
            dataProcessingAgreement: boolean;
            description?: string | undefined;
            website?: string | undefined;
            contactPhone?: string | undefined;
        }, {
            name: string;
            tier: "TIER_1" | "TIER_2" | "TIER_3";
            contactEmail: string;
            description?: string | undefined;
            website?: string | undefined;
            contactPhone?: string | undefined;
            businessCritical?: boolean | undefined;
            dataProcessingAgreement?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            name: string;
            tier: "TIER_1" | "TIER_2" | "TIER_3";
            contactEmail: string;
            businessCritical: boolean;
            dataProcessingAgreement: boolean;
            description?: string | undefined;
            website?: string | undefined;
            contactPhone?: string | undefined;
        };
    }, {
        body: {
            name: string;
            tier: "TIER_1" | "TIER_2" | "TIER_3";
            contactEmail: string;
            description?: string | undefined;
            website?: string | undefined;
            contactPhone?: string | undefined;
            businessCritical?: boolean | undefined;
            dataProcessingAgreement?: boolean | undefined;
        };
    }>;
    update: z.ZodObject<{
        params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
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
            name?: string | undefined;
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED" | undefined;
            description?: string | undefined;
            tier?: "TIER_1" | "TIER_2" | "TIER_3" | undefined;
            website?: string | undefined;
            contactEmail?: string | undefined;
            contactPhone?: string | undefined;
            businessCritical?: boolean | undefined;
            dataProcessingAgreement?: boolean | undefined;
        }, {
            name?: string | undefined;
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED" | undefined;
            description?: string | undefined;
            tier?: "TIER_1" | "TIER_2" | "TIER_3" | undefined;
            website?: string | undefined;
            contactEmail?: string | undefined;
            contactPhone?: string | undefined;
            businessCritical?: boolean | undefined;
            dataProcessingAgreement?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            name?: string | undefined;
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED" | undefined;
            description?: string | undefined;
            tier?: "TIER_1" | "TIER_2" | "TIER_3" | undefined;
            website?: string | undefined;
            contactEmail?: string | undefined;
            contactPhone?: string | undefined;
            businessCritical?: boolean | undefined;
            dataProcessingAgreement?: boolean | undefined;
        };
        params: {
            id: string;
        };
    }, {
        body: {
            name?: string | undefined;
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED" | undefined;
            description?: string | undefined;
            tier?: "TIER_1" | "TIER_2" | "TIER_3" | undefined;
            website?: string | undefined;
            contactEmail?: string | undefined;
            contactPhone?: string | undefined;
            businessCritical?: boolean | undefined;
            dataProcessingAgreement?: boolean | undefined;
        };
        params: {
            id: string;
        };
    }>;
    get: z.ZodObject<{
        params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            id: string;
        };
    }, {
        params: {
            id: string;
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
            page: number;
            limit: number;
            sortOrder: "asc" | "desc";
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED" | undefined;
            tier?: "TIER_1" | "TIER_2" | "TIER_3" | undefined;
            search?: string | undefined;
            sortBy?: string | undefined;
            businessCritical?: boolean | undefined;
        }, {
            page?: number | undefined;
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED" | undefined;
            limit?: number | undefined;
            tier?: "TIER_1" | "TIER_2" | "TIER_3" | undefined;
            search?: string | undefined;
            sortBy?: string | undefined;
            sortOrder?: "asc" | "desc" | undefined;
            businessCritical?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        query: {
            page: number;
            limit: number;
            sortOrder: "asc" | "desc";
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED" | undefined;
            tier?: "TIER_1" | "TIER_2" | "TIER_3" | undefined;
            search?: string | undefined;
            sortBy?: string | undefined;
            businessCritical?: boolean | undefined;
        };
    }, {
        query: {
            page?: number | undefined;
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED" | undefined;
            limit?: number | undefined;
            tier?: "TIER_1" | "TIER_2" | "TIER_3" | undefined;
            search?: string | undefined;
            sortBy?: string | undefined;
            sortOrder?: "asc" | "desc" | undefined;
            businessCritical?: boolean | undefined;
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
            type: "INITIAL" | "ANNUAL" | "CONTINUOUS" | "TRIGGER_BASED";
            dueDate: Date;
            vendorId: string;
            assignedTo?: string | undefined;
        }, {
            type: "INITIAL" | "ANNUAL" | "CONTINUOUS" | "TRIGGER_BASED";
            dueDate: Date;
            vendorId: string;
            assignedTo?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            type: "INITIAL" | "ANNUAL" | "CONTINUOUS" | "TRIGGER_BASED";
            dueDate: Date;
            vendorId: string;
            assignedTo?: string | undefined;
        };
    }, {
        body: {
            type: "INITIAL" | "ANNUAL" | "CONTINUOUS" | "TRIGGER_BASED";
            dueDate: Date;
            vendorId: string;
            assignedTo?: string | undefined;
        };
    }>;
    update: z.ZodObject<{
        params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        body: z.ZodObject<{
            status: z.ZodOptional<z.ZodEnum<["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "OVERDUE"]>>;
            dueDate: z.ZodOptional<z.ZodDate>;
            assignedTo: z.ZodOptional<z.ZodString>;
            completedAt: z.ZodOptional<z.ZodDate>;
            findings: z.ZodOptional<z.ZodString>;
            recommendations: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status?: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "OVERDUE" | undefined;
            assignedTo?: string | undefined;
            dueDate?: Date | undefined;
            completedAt?: Date | undefined;
            recommendations?: string | undefined;
            findings?: string | undefined;
        }, {
            status?: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "OVERDUE" | undefined;
            assignedTo?: string | undefined;
            dueDate?: Date | undefined;
            completedAt?: Date | undefined;
            recommendations?: string | undefined;
            findings?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            status?: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "OVERDUE" | undefined;
            assignedTo?: string | undefined;
            dueDate?: Date | undefined;
            completedAt?: Date | undefined;
            recommendations?: string | undefined;
            findings?: string | undefined;
        };
        params: {
            id: string;
        };
    }, {
        body: {
            status?: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "OVERDUE" | undefined;
            assignedTo?: string | undefined;
            dueDate?: Date | undefined;
            completedAt?: Date | undefined;
            recommendations?: string | undefined;
            findings?: string | undefined;
        };
        params: {
            id: string;
        };
    }>;
    submitResponse: z.ZodObject<{
        params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        body: z.ZodObject<{
            responses: z.ZodArray<z.ZodObject<{
                questionId: z.ZodString;
                answer: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                evidence: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                notes: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                questionId: string;
                answer: string | number | boolean;
                notes?: string | undefined;
                evidence?: string[] | undefined;
            }, {
                questionId: string;
                answer: string | number | boolean;
                notes?: string | undefined;
                evidence?: string[] | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            responses: {
                questionId: string;
                answer: string | number | boolean;
                notes?: string | undefined;
                evidence?: string[] | undefined;
            }[];
        }, {
            responses: {
                questionId: string;
                answer: string | number | boolean;
                notes?: string | undefined;
                evidence?: string[] | undefined;
            }[];
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            responses: {
                questionId: string;
                answer: string | number | boolean;
                notes?: string | undefined;
                evidence?: string[] | undefined;
            }[];
        };
        params: {
            id: string;
        };
    }, {
        body: {
            responses: {
                questionId: string;
                answer: string | number | boolean;
                notes?: string | undefined;
                evidence?: string[] | undefined;
            }[];
        };
        params: {
            id: string;
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
            page: number;
            limit: number;
            sortOrder: "asc" | "desc";
            status?: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "OVERDUE" | undefined;
            type?: "INITIAL" | "ANNUAL" | "CONTINUOUS" | "TRIGGER_BASED" | undefined;
            assignedTo?: string | undefined;
            vendorId?: string | undefined;
            sortBy?: string | undefined;
        }, {
            page?: number | undefined;
            status?: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "OVERDUE" | undefined;
            type?: "INITIAL" | "ANNUAL" | "CONTINUOUS" | "TRIGGER_BASED" | undefined;
            limit?: number | undefined;
            assignedTo?: string | undefined;
            vendorId?: string | undefined;
            sortBy?: string | undefined;
            sortOrder?: "asc" | "desc" | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        query: {
            page: number;
            limit: number;
            sortOrder: "asc" | "desc";
            status?: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "OVERDUE" | undefined;
            type?: "INITIAL" | "ANNUAL" | "CONTINUOUS" | "TRIGGER_BASED" | undefined;
            assignedTo?: string | undefined;
            vendorId?: string | undefined;
            sortBy?: string | undefined;
        };
    }, {
        query: {
            page?: number | undefined;
            status?: "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED" | "OVERDUE" | undefined;
            type?: "INITIAL" | "ANNUAL" | "CONTINUOUS" | "TRIGGER_BASED" | undefined;
            limit?: number | undefined;
            assignedTo?: string | undefined;
            vendorId?: string | undefined;
            sortBy?: string | undefined;
            sortOrder?: "asc" | "desc" | undefined;
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
            title: string;
            description: string;
            category: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC";
            likelihood: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
            impact: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC";
            ownerId: string;
            vendorId?: string | undefined;
        }, {
            title: string;
            description: string;
            category: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC";
            likelihood: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
            impact: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC";
            ownerId: string;
            vendorId?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            title: string;
            description: string;
            category: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC";
            likelihood: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
            impact: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC";
            ownerId: string;
            vendorId?: string | undefined;
        };
    }, {
        body: {
            title: string;
            description: string;
            category: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC";
            likelihood: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN";
            impact: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC";
            ownerId: string;
            vendorId?: string | undefined;
        };
    }>;
    update: z.ZodObject<{
        params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
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
            status?: "IDENTIFIED" | "CLOSED" | "ASSESSING" | "TREATING" | "MONITORING" | undefined;
            title?: string | undefined;
            description?: string | undefined;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC" | undefined;
            likelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN" | undefined;
            impact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC" | undefined;
            mitigation?: string | undefined;
            residualLikelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN" | undefined;
            residualImpact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC" | undefined;
        }, {
            status?: "IDENTIFIED" | "CLOSED" | "ASSESSING" | "TREATING" | "MONITORING" | undefined;
            title?: string | undefined;
            description?: string | undefined;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC" | undefined;
            likelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN" | undefined;
            impact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC" | undefined;
            mitigation?: string | undefined;
            residualLikelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN" | undefined;
            residualImpact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC" | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            status?: "IDENTIFIED" | "CLOSED" | "ASSESSING" | "TREATING" | "MONITORING" | undefined;
            title?: string | undefined;
            description?: string | undefined;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC" | undefined;
            likelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN" | undefined;
            impact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC" | undefined;
            mitigation?: string | undefined;
            residualLikelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN" | undefined;
            residualImpact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC" | undefined;
        };
        params: {
            id: string;
        };
    }, {
        body: {
            status?: "IDENTIFIED" | "CLOSED" | "ASSESSING" | "TREATING" | "MONITORING" | undefined;
            title?: string | undefined;
            description?: string | undefined;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC" | undefined;
            likelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN" | undefined;
            impact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC" | undefined;
            mitigation?: string | undefined;
            residualLikelihood?: "RARE" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "ALMOST_CERTAIN" | undefined;
            residualImpact?: "INSIGNIFICANT" | "MINOR" | "MODERATE" | "MAJOR" | "CATASTROPHIC" | undefined;
        };
        params: {
            id: string;
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
            page: number;
            limit: number;
            sortOrder: "asc" | "desc";
            status?: "IDENTIFIED" | "CLOSED" | "ASSESSING" | "TREATING" | "MONITORING" | undefined;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC" | undefined;
            vendorId?: string | undefined;
            sortBy?: string | undefined;
            riskLevel?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | undefined;
            ownerId?: string | undefined;
        }, {
            page?: number | undefined;
            status?: "IDENTIFIED" | "CLOSED" | "ASSESSING" | "TREATING" | "MONITORING" | undefined;
            limit?: number | undefined;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC" | undefined;
            vendorId?: string | undefined;
            sortBy?: string | undefined;
            sortOrder?: "asc" | "desc" | undefined;
            riskLevel?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | undefined;
            ownerId?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        query: {
            page: number;
            limit: number;
            sortOrder: "asc" | "desc";
            status?: "IDENTIFIED" | "CLOSED" | "ASSESSING" | "TREATING" | "MONITORING" | undefined;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC" | undefined;
            vendorId?: string | undefined;
            sortBy?: string | undefined;
            riskLevel?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | undefined;
            ownerId?: string | undefined;
        };
    }, {
        query: {
            page?: number | undefined;
            status?: "IDENTIFIED" | "CLOSED" | "ASSESSING" | "TREATING" | "MONITORING" | undefined;
            limit?: number | undefined;
            category?: "CYBERSECURITY" | "FINANCIAL" | "OPERATIONAL" | "COMPLIANCE" | "REPUTATIONAL" | "STRATEGIC" | undefined;
            vendorId?: string | undefined;
            sortBy?: string | undefined;
            sortOrder?: "asc" | "desc" | undefined;
            riskLevel?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | undefined;
            ownerId?: string | undefined;
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
            title: string;
            description: string;
            automated: boolean;
            frequency: "CONTINUOUS" | "QUARTERLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUALLY";
            category: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING";
            ownerId: string;
            framework: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST";
        }, {
            title: string;
            description: string;
            frequency: "CONTINUOUS" | "QUARTERLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUALLY";
            category: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING";
            ownerId: string;
            framework: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST";
            automated?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            title: string;
            description: string;
            automated: boolean;
            frequency: "CONTINUOUS" | "QUARTERLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUALLY";
            category: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING";
            ownerId: string;
            framework: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST";
        };
    }, {
        body: {
            title: string;
            description: string;
            frequency: "CONTINUOUS" | "QUARTERLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUALLY";
            category: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING";
            ownerId: string;
            framework: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST";
            automated?: boolean | undefined;
        };
    }>;
    update: z.ZodObject<{
        params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
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
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | undefined;
            title?: string | undefined;
            description?: string | undefined;
            automated?: boolean | undefined;
            frequency?: "CONTINUOUS" | "QUARTERLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUALLY" | undefined;
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING" | undefined;
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST" | undefined;
            effectiveness?: "INEFFECTIVE" | "EFFECTIVE" | "NEEDS_IMPROVEMENT" | undefined;
        }, {
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | undefined;
            title?: string | undefined;
            description?: string | undefined;
            automated?: boolean | undefined;
            frequency?: "CONTINUOUS" | "QUARTERLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUALLY" | undefined;
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING" | undefined;
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST" | undefined;
            effectiveness?: "INEFFECTIVE" | "EFFECTIVE" | "NEEDS_IMPROVEMENT" | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | undefined;
            title?: string | undefined;
            description?: string | undefined;
            automated?: boolean | undefined;
            frequency?: "CONTINUOUS" | "QUARTERLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUALLY" | undefined;
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING" | undefined;
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST" | undefined;
            effectiveness?: "INEFFECTIVE" | "EFFECTIVE" | "NEEDS_IMPROVEMENT" | undefined;
        };
        params: {
            id: string;
        };
    }, {
        body: {
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | undefined;
            title?: string | undefined;
            description?: string | undefined;
            automated?: boolean | undefined;
            frequency?: "CONTINUOUS" | "QUARTERLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUALLY" | undefined;
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING" | undefined;
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST" | undefined;
            effectiveness?: "INEFFECTIVE" | "EFFECTIVE" | "NEEDS_IMPROVEMENT" | undefined;
        };
        params: {
            id: string;
        };
    }>;
    testControl: z.ZodObject<{
        params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        body: z.ZodObject<{
            testDate: z.ZodDate;
            testResult: z.ZodEnum<["PASS", "FAIL", "PARTIAL"]>;
            findings: z.ZodString;
            evidence: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            testedBy: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            findings: string;
            testDate: Date;
            testResult: "PASS" | "FAIL" | "PARTIAL";
            testedBy: string;
            evidence?: string[] | undefined;
        }, {
            findings: string;
            testDate: Date;
            testResult: "PASS" | "FAIL" | "PARTIAL";
            testedBy: string;
            evidence?: string[] | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            findings: string;
            testDate: Date;
            testResult: "PASS" | "FAIL" | "PARTIAL";
            testedBy: string;
            evidence?: string[] | undefined;
        };
        params: {
            id: string;
        };
    }, {
        body: {
            findings: string;
            testDate: Date;
            testResult: "PASS" | "FAIL" | "PARTIAL";
            testedBy: string;
            evidence?: string[] | undefined;
        };
        params: {
            id: string;
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
            page: number;
            limit: number;
            sortOrder: "asc" | "desc";
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | undefined;
            automated?: boolean | undefined;
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING" | undefined;
            sortBy?: string | undefined;
            ownerId?: string | undefined;
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST" | undefined;
        }, {
            page?: number | undefined;
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | undefined;
            limit?: number | undefined;
            automated?: boolean | undefined;
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING" | undefined;
            sortBy?: string | undefined;
            sortOrder?: "asc" | "desc" | undefined;
            ownerId?: string | undefined;
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST" | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        query: {
            page: number;
            limit: number;
            sortOrder: "asc" | "desc";
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | undefined;
            automated?: boolean | undefined;
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING" | undefined;
            sortBy?: string | undefined;
            ownerId?: string | undefined;
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST" | undefined;
        };
    }, {
        query: {
            page?: number | undefined;
            status?: "ACTIVE" | "INACTIVE" | "PENDING" | undefined;
            limit?: number | undefined;
            automated?: boolean | undefined;
            category?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING" | undefined;
            sortBy?: string | undefined;
            sortOrder?: "asc" | "desc" | undefined;
            ownerId?: string | undefined;
            framework?: "GDPR" | "HIPAA" | "CUSTOM" | "SOC2" | "ISO27001" | "NIST" | undefined;
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
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            organizationName?: string | undefined;
        }, {
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            organizationName?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            organizationName?: string | undefined;
        };
    }, {
        body: {
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            organizationName?: string | undefined;
        };
    }>;
    login: z.ZodObject<{
        body: z.ZodObject<{
            email: z.ZodString;
            password: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            email: string;
            password: string;
        }, {
            email: string;
            password: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            email: string;
            password: string;
        };
    }, {
        body: {
            email: string;
            password: string;
        };
    }>;
    updateProfile: z.ZodObject<{
        body: z.ZodObject<{
            firstName: z.ZodOptional<z.ZodString>;
            lastName: z.ZodOptional<z.ZodString>;
            phone: z.ZodOptional<z.ZodString>;
            timezone: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            firstName?: string | undefined;
            lastName?: string | undefined;
            phone?: string | undefined;
            timezone?: string | undefined;
        }, {
            firstName?: string | undefined;
            lastName?: string | undefined;
            phone?: string | undefined;
            timezone?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            firstName?: string | undefined;
            lastName?: string | undefined;
            phone?: string | undefined;
            timezone?: string | undefined;
        };
    }, {
        body: {
            firstName?: string | undefined;
            lastName?: string | undefined;
            phone?: string | undefined;
            timezone?: string | undefined;
        };
    }>;
    changePassword: z.ZodObject<{
        body: z.ZodObject<{
            currentPassword: z.ZodString;
            newPassword: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            currentPassword: string;
            newPassword: string;
        }, {
            currentPassword: string;
            newPassword: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            currentPassword: string;
            newPassword: string;
        };
    }, {
        body: {
            currentPassword: string;
            newPassword: string;
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
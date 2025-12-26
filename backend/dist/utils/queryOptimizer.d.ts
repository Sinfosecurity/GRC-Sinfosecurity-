import { Prisma } from '@prisma/client';
/**
 * Query optimization utilities for Prisma
 */
/**
 * Optimized pagination with cursor-based pagination for better performance
 */
export interface PaginationOptions {
    page?: number;
    limit?: number;
    cursor?: string;
    orderBy?: any;
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
        cursor?: string;
    };
}
/**
 * Paginate query results efficiently
 */
export declare function paginateQuery<T>(model: any, options: PaginationOptions, where?: any, include?: any): Promise<PaginatedResponse<T>>;
/**
 * Optimized vendor queries with selective field loading
 */
export declare const vendorQueries: {
    /**
     * Get vendor list with minimal fields (for dashboards/listings)
     */
    getVendorList(organizationId: string, options?: PaginationOptions): Promise<PaginatedResponse<unknown>>;
    /**
     * Get vendor details with full relations (for detail view)
     */
    getVendorDetails(vendorId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.VendorStatus;
        name: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        legalName: string | null;
        vendorType: import(".prisma/client").$Enums.VendorType;
        category: import(".prisma/client").$Enums.VendorCategory;
        tier: import(".prisma/client").$Enums.VendorTier;
        website: string | null;
        primaryContact: string;
        businessOwner: string | null;
        servicesProvided: string;
        contractValue: Prisma.Decimal | null;
        nextReviewDate: Date | null;
        currency: string | null;
        inherentRiskScore: number;
        residualRiskScore: number;
        contactEmail: string;
        contactPhone: string | null;
        criticalityLevel: import(".prisma/client").$Enums.CriticalityLevel;
        relationshipOwner: string | null;
        dataTypesAccessed: string[];
        geographicFootprint: string[];
        regulatoryScope: string[];
        hasSubcontractors: boolean;
        fourthParties: Prisma.JsonValue | null;
        onboardedAt: Date | null;
        lastReviewDate: Date | null;
        terminatedAt: Date | null;
    }>;
    /**
     * Get vendors due for review (optimized query)
     */
    getVendorsDueForReview(organizationId: string, daysAhead?: number): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.VendorStatus;
        name: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        legalName: string | null;
        vendorType: import(".prisma/client").$Enums.VendorType;
        category: import(".prisma/client").$Enums.VendorCategory;
        tier: import(".prisma/client").$Enums.VendorTier;
        website: string | null;
        primaryContact: string;
        businessOwner: string | null;
        servicesProvided: string;
        contractValue: Prisma.Decimal | null;
        nextReviewDate: Date | null;
        currency: string | null;
        inherentRiskScore: number;
        residualRiskScore: number;
        contactEmail: string;
        contactPhone: string | null;
        criticalityLevel: import(".prisma/client").$Enums.CriticalityLevel;
        relationshipOwner: string | null;
        dataTypesAccessed: string[];
        geographicFootprint: string[];
        regulatoryScope: string[];
        hasSubcontractors: boolean;
        fourthParties: Prisma.JsonValue | null;
        onboardedAt: Date | null;
        lastReviewDate: Date | null;
        terminatedAt: Date | null;
    }[]>;
};
/**
 * Batch operations for better performance
 */
export declare const batchOperations: {
    /**
     * Batch update vendors
     */
    updateVendorsBatch(updates: Array<{
        id: string;
        data: any;
    }>): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.VendorStatus;
        name: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        legalName: string | null;
        vendorType: import(".prisma/client").$Enums.VendorType;
        category: import(".prisma/client").$Enums.VendorCategory;
        tier: import(".prisma/client").$Enums.VendorTier;
        website: string | null;
        primaryContact: string;
        businessOwner: string | null;
        servicesProvided: string;
        contractValue: Prisma.Decimal | null;
        nextReviewDate: Date | null;
        currency: string | null;
        inherentRiskScore: number;
        residualRiskScore: number;
        contactEmail: string;
        contactPhone: string | null;
        criticalityLevel: import(".prisma/client").$Enums.CriticalityLevel;
        relationshipOwner: string | null;
        dataTypesAccessed: string[];
        geographicFootprint: string[];
        regulatoryScope: string[];
        hasSubcontractors: boolean;
        fourthParties: Prisma.JsonValue | null;
        onboardedAt: Date | null;
        lastReviewDate: Date | null;
        terminatedAt: Date | null;
    }[]>;
    /**
     * Batch create with transaction
     */
    createBatch<T>(model: any, data: any[]): Promise<T[]>;
};
/**
 * Query performance monitoring
 */
export declare class QueryMonitor {
    private static slowQueryThreshold;
    static monitorQuery<T>(queryName: string, queryFn: () => Promise<T>): Promise<T>;
}
/**
 * Optimized count queries with approximation for large datasets
 */
export declare function approximateCount(model: any, where?: any, useCache?: boolean): Promise<number>;
/**
 * Database query builder with automatic optimization
 */
export declare class OptimizedQueryBuilder<T> {
    private model;
    private whereClause;
    private includeClause;
    private selectClause;
    private orderByClause;
    private paginationOptions;
    private useCache;
    private cacheTTL;
    private cacheNamespace;
    constructor(model: any);
    where(conditions: any): this;
    include(relations: any): this;
    select(fields: any): this;
    orderBy(order: any): this;
    paginate(options: PaginationOptions): this;
    cache(ttl?: number, namespace?: string): this;
    execute(): Promise<T[]>;
    executeOne(): Promise<T | null>;
}
export declare function createQueryBuilder<T>(model: any): OptimizedQueryBuilder<T>;
//# sourceMappingURL=queryOptimizer.d.ts.map
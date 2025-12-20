import { Prisma } from '@prisma/client';
/**
 * Common query optimization helpers for Prisma
 */
/**
 * Standard pagination options
 */
export interface PaginationOptions {
    page: number;
    pageSize: number;
}
/**
 * Calculate skip and take for pagination
 */
export declare function getPaginationParams(page: number, pageSize: number): {
    skip: number;
    take: number;
};
/**
 * Common vendor select fields (optimize queries by only selecting needed fields)
 */
export declare const vendorSelectFields: {
    id: true;
    name: true;
    tier: true;
    status: true;
    primaryContact: true;
    website: true;
    inherentRiskScore: true;
    residualRiskScore: true;
    organizationId: true;
    createdAt: true;
    updatedAt: true;
};
/**
 * Minimal vendor select (for lists)
 */
export declare const vendorMinimalSelect: {
    id: true;
    name: true;
    tier: true;
    status: true;
    residualRiskScore: true;
};
/**
 * Common assessment select fields
 */
export declare const assessmentSelectFields: {
    id: true;
    vendorId: true;
    type: boolean;
    status: true;
    dueDate: true;
    completedDate: boolean;
    overallScore: true;
    createdAt: true;
    updatedAt: true;
};
/**
 * Common contract select fields
 */
export declare const contractSelectFields: {
    id: true;
    vendorId: true;
    contractNumber: true;
    startDate: boolean;
    endDate: boolean;
    value: boolean;
    status: true;
    autoRenew: boolean;
    createdAt: true;
    updatedAt: true;
};
/**
 * Build where clause for text search
 */
export declare function buildSearchWhere(search: string | undefined, fields: string[]): {
    OR?: undefined;
} | {
    OR: {
        [x: string]: {
            contains: string;
            mode: Prisma.QueryMode;
        };
    }[];
};
/**
 * Build order by clause with defaults
 */
export declare function buildOrderBy(sortBy?: string, sortOrder?: 'asc' | 'desc'): Prisma.VendorOrderByWithRelationInput[];
/**
 * Optimize include queries (use sparingly, prefer select)
 */
export declare const vendorWithAssessments: {
    assessments: {
        select: {
            id: true;
            vendorId: true;
            type: boolean;
            status: true;
            dueDate: true;
            completedDate: boolean;
            overallScore: true;
            createdAt: true;
            updatedAt: true;
        };
        orderBy: {
            createdAt: "desc";
        };
        take: number;
    };
};
export declare const vendorWithContracts: {
    contracts: {
        select: {
            id: true;
            vendorId: true;
            contractNumber: true;
            startDate: boolean;
            endDate: boolean;
            value: boolean;
            status: true;
            autoRenew: boolean;
            createdAt: true;
            updatedAt: true;
        };
        where: {
            status: "ACTIVE";
        };
        orderBy: {
            endDate: "asc";
        };
    };
};
/**
 * Batch query helper - prevents N+1 queries
 */
export declare function batchQuery<T, K extends keyof T>(items: T[], key: K, queryFn: (ids: T[K][]) => Promise<Map<T[K], any>>): Promise<T[]>;
/**
 * Cursor-based pagination for large datasets
 */
export interface CursorPaginationOptions {
    cursor?: string;
    take: number;
}
export declare function getCursorParams(options: CursorPaginationOptions): {
    take: number;
    skip?: undefined;
    cursor?: undefined;
} | {
    take: number;
    skip: number;
    cursor: {
        id: string;
    };
};
/**
 * Count query with timeout
 */
export declare function countWithTimeout<T>(queryFn: () => Promise<number>, timeoutMs?: number): Promise<number>;
/**
 * Bulk upsert helper (more efficient than individual upserts)
 */
export declare function bulkUpsert<T>(items: T[], upsertFn: (item: T) => Promise<any>): Promise<any[]>;
/**
 * Index hints for complex queries
 */
export declare const indexHints: {
    forceIndex: (indexName: string) => string;
    useIndex: (indexName: string) => string;
};
/**
 * Query performance logger
 */
export declare function logSlowQuery(queryName: string, duration: number, threshold?: number): void;
/**
 * Recommended indexes for vendor queries
 */
export declare const recommendedIndexes: {
    vendor: string[];
    assessment: string[];
    contract: string[];
};
//# sourceMappingURL=queryOptimization.d.ts.map
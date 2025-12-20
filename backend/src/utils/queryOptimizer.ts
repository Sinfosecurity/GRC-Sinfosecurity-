import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { cacheManager } from './cacheManager';
import logger from '../config/logger';

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
export async function paginateQuery<T>(
    model: any,
    options: PaginationOptions,
    where?: any,
    include?: any
): Promise<PaginatedResponse<T>> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100); // Max 100 items per page
    const skip = (page - 1) * limit;

    // Use cursor-based pagination if cursor provided (more efficient for large datasets)
    if (options.cursor) {
        const data = await model.findMany({
            where,
            include,
            take: limit + 1, // Take one extra to check if there's a next page
            cursor: { id: options.cursor },
            skip: 1, // Skip the cursor
            orderBy: options.orderBy || { createdAt: 'desc' },
        });

        const hasNext = data.length > limit;
        const results = hasNext ? data.slice(0, -1) : data;

        return {
            data: results as T[],
            pagination: {
                total: -1, // Don't count total for cursor pagination (performance)
                page,
                limit,
                totalPages: -1,
                hasNext,
                hasPrev: true, // Assume true if cursor provided
                cursor: hasNext ? results[results.length - 1].id : undefined,
            },
        };
    }

    // Standard offset pagination (easier but slower for large datasets)
    const [data, total] = await Promise.all([
        model.findMany({
            where,
            include,
            skip,
            take: limit,
            orderBy: options.orderBy || { createdAt: 'desc' },
        }),
        model.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
        data: data as T[],
        pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
}

/**
 * Optimized vendor queries with selective field loading
 */
export const vendorQueries = {
    /**
     * Get vendor list with minimal fields (for dashboards/listings)
     */
    async getVendorList(organizationId: string, options: PaginationOptions = {}) {
        const cacheKey = `${organizationId}:${JSON.stringify(options)}`;
        
        return cacheManager.getOrSet(
            'vendors:list',
            cacheKey,
            async () => {
                return paginateQuery(
                    prisma.vendor,
                    options,
                    { organizationId },
                    {
                        // Only load necessary fields for list view
                        select: {
                            id: true,
                            name: true,
                            tier: true,
                            status: true,
                            riskScore: true,
                            lastReviewDate: true,
                            nextReviewDate: true,
                            vendorType: true,
                        },
                    }
                );
            },
            300 // Cache for 5 minutes
        );
    },

    /**
     * Get vendor details with full relations (for detail view)
     */
    async getVendorDetails(vendorId: string) {
        return cacheManager.getOrSet(
            'vendors:details',
            vendorId,
            async () => {
                return prisma.vendor.findUnique({
                    where: { id: vendorId },
                    include: {
                        contacts: {
                            where: { isPrimary: true },
                            take: 1,
                        },
                        assessments: {
                            where: { status: 'COMPLETED' },
                            orderBy: { completedDate: 'desc' },
                            take: 1,
                        },
                        issues: {
                            where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
                            orderBy: { severity: 'desc' },
                            take: 5,
                        },
                        contracts: {
                            where: { 
                                expirationDate: { gte: new Date() } 
                            },
                            orderBy: { expirationDate: 'asc' },
                            take: 1,
                        },
                    },
                });
            },
            180 // Cache for 3 minutes
        );
    },

    /**
     * Get vendors due for review (optimized query)
     */
    async getVendorsDueForReview(organizationId: string, daysAhead: number = 30) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        return prisma.vendor.findMany({
            where: {
                organizationId,
                status: 'ACTIVE',
                nextReviewDate: {
                    lte: futureDate,
                },
            },
            select: {
                id: true,
                name: true,
                tier: true,
                nextReviewDate: true,
                riskScore: true,
            },
            orderBy: {
                nextReviewDate: 'asc',
            },
        });
    },
};

/**
 * Batch operations for better performance
 */
export const batchOperations = {
    /**
     * Batch update vendors
     */
    async updateVendorsBatch(updates: Array<{ id: string; data: any }>) {
        const transactions = updates.map((update) =>
            prisma.vendor.update({
                where: { id: update.id },
                data: update.data,
            })
        );

        const results = await prisma.$transaction(transactions);
        
        // Invalidate cache for all updated vendors
        for (const update of updates) {
            await cacheManager.delete('vendors:details', update.id);
        }

        return results;
    },

    /**
     * Batch create with transaction
     */
    async createBatch<T>(model: any, data: any[]): Promise<T[]> {
        const transactions = data.map((item) => model.create({ data: item }));
        return prisma.$transaction(transactions);
    },
};

/**
 * Query performance monitoring
 */
export class QueryMonitor {
    private static slowQueryThreshold = 1000; // 1 second

    static async monitorQuery<T>(
        queryName: string,
        queryFn: () => Promise<T>
    ): Promise<T> {
        const startTime = Date.now();
        
        try {
            const result = await queryFn();
            const duration = Date.now() - startTime;

            if (duration > this.slowQueryThreshold) {
                logger.warn(`Slow query detected: ${queryName} took ${duration}ms`);
            }

            return result;
        } catch (error) {
            logger.error(`Query failed: ${queryName}`, error);
            throw error;
        }
    }
}

/**
 * Optimized count queries with approximation for large datasets
 */
export async function approximateCount(
    model: any,
    where?: any,
    useCache: boolean = true
): Promise<number> {
    if (useCache) {
        const cacheKey = `count:${JSON.stringify(where)}`;
        const cached = await cacheManager.get<number>('counts', cacheKey);
        if (cached !== null) return cached;
    }

    const count = await model.count({ where });
    
    if (useCache) {
        const cacheKey = `count:${JSON.stringify(where)}`;
        await cacheManager.set('counts', cacheKey, count, 60); // Cache for 1 minute
    }

    return count;
}

/**
 * Database query builder with automatic optimization
 */
export class OptimizedQueryBuilder<T> {
    private model: any;
    private whereClause: any = {};
    private includeClause: any = {};
    private selectClause: any = {};
    private orderByClause: any = {};
    private paginationOptions: PaginationOptions = {};
    private useCache: boolean = false;
    private cacheTTL: number = 300;
    private cacheNamespace: string = 'queries';

    constructor(model: any) {
        this.model = model;
    }

    where(conditions: any): this {
        this.whereClause = { ...this.whereClause, ...conditions };
        return this;
    }

    include(relations: any): this {
        this.includeClause = { ...this.includeClause, ...relations };
        return this;
    }

    select(fields: any): this {
        this.selectClause = { ...this.selectClause, ...fields };
        return this;
    }

    orderBy(order: any): this {
        this.orderByClause = order;
        return this;
    }

    paginate(options: PaginationOptions): this {
        this.paginationOptions = options;
        return this;
    }

    cache(ttl: number = 300, namespace: string = 'queries'): this {
        this.useCache = true;
        this.cacheTTL = ttl;
        this.cacheNamespace = namespace;
        return this;
    }

    async execute(): Promise<T[]> {
        const queryFn = async () => {
            const query: any = {
                where: this.whereClause,
            };

            if (Object.keys(this.selectClause).length > 0) {
                query.select = this.selectClause;
            } else if (Object.keys(this.includeClause).length > 0) {
                query.include = this.includeClause;
            }

            if (Object.keys(this.orderByClause).length > 0) {
                query.orderBy = this.orderByClause;
            }

            if (this.paginationOptions.limit) {
                query.take = this.paginationOptions.limit;
                query.skip = ((this.paginationOptions.page || 1) - 1) * this.paginationOptions.limit;
            }

            return this.model.findMany(query);
        };

        if (this.useCache) {
            const cacheKey = JSON.stringify({
                where: this.whereClause,
                select: this.selectClause,
                include: this.includeClause,
                orderBy: this.orderByClause,
                pagination: this.paginationOptions,
            });

            return cacheManager.getOrSet<T[]>(
                this.cacheNamespace,
                cacheKey,
                queryFn,
                this.cacheTTL
            );
        }

        return queryFn();
    }

    async executeOne(): Promise<T | null> {
        const results = await this.execute();
        return results[0] || null;
    }
}

// Export factory function
export function createQueryBuilder<T>(model: any): OptimizedQueryBuilder<T> {
    return new OptimizedQueryBuilder<T>(model);
}

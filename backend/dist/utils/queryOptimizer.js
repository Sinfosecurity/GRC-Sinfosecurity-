"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizedQueryBuilder = exports.QueryMonitor = exports.batchOperations = exports.vendorQueries = void 0;
exports.paginateQuery = paginateQuery;
exports.approximateCount = approximateCount;
exports.createQueryBuilder = createQueryBuilder;
const database_1 = require("../config/database");
const cacheManager_1 = require("./cacheManager");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Paginate query results efficiently
 */
async function paginateQuery(model, options, where, include) {
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
            data: results,
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
        data: data,
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
exports.vendorQueries = {
    /**
     * Get vendor list with minimal fields (for dashboards/listings)
     */
    async getVendorList(organizationId, options = {}) {
        const cacheKey = `${organizationId}:${JSON.stringify(options)}`;
        return cacheManager_1.cacheManager.getOrSet('vendors:list', cacheKey, async () => {
            return paginateQuery(database_1.prisma.vendor, options, { organizationId }, {
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
            });
        }, 300 // Cache for 5 minutes
        );
    },
    /**
     * Get vendor details with full relations (for detail view)
     */
    async getVendorDetails(vendorId) {
        return cacheManager_1.cacheManager.getOrSet('vendors:details', vendorId, async () => {
            return database_1.prisma.vendor.findUnique({
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
        }, 180 // Cache for 3 minutes
        );
    },
    /**
     * Get vendors due for review (optimized query)
     */
    async getVendorsDueForReview(organizationId, daysAhead = 30) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);
        return database_1.prisma.vendor.findMany({
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
exports.batchOperations = {
    /**
     * Batch update vendors
     */
    async updateVendorsBatch(updates) {
        const transactions = updates.map((update) => database_1.prisma.vendor.update({
            where: { id: update.id },
            data: update.data,
        }));
        const results = await database_1.prisma.$transaction(transactions);
        // Invalidate cache for all updated vendors
        for (const update of updates) {
            await cacheManager_1.cacheManager.delete('vendors:details', update.id);
        }
        return results;
    },
    /**
     * Batch create with transaction
     */
    async createBatch(model, data) {
        const transactions = data.map((item) => model.create({ data: item }));
        return database_1.prisma.$transaction(transactions);
    },
};
/**
 * Query performance monitoring
 */
class QueryMonitor {
    static async monitorQuery(queryName, queryFn) {
        const startTime = Date.now();
        try {
            const result = await queryFn();
            const duration = Date.now() - startTime;
            if (duration > this.slowQueryThreshold) {
                logger_1.default.warn(`Slow query detected: ${queryName} took ${duration}ms`);
            }
            return result;
        }
        catch (error) {
            logger_1.default.error(`Query failed: ${queryName}`, error);
            throw error;
        }
    }
}
exports.QueryMonitor = QueryMonitor;
QueryMonitor.slowQueryThreshold = 1000; // 1 second
/**
 * Optimized count queries with approximation for large datasets
 */
async function approximateCount(model, where, useCache = true) {
    if (useCache) {
        const cacheKey = `count:${JSON.stringify(where)}`;
        const cached = await cacheManager_1.cacheManager.get('counts', cacheKey);
        if (cached !== null)
            return cached;
    }
    const count = await model.count({ where });
    if (useCache) {
        const cacheKey = `count:${JSON.stringify(where)}`;
        await cacheManager_1.cacheManager.set('counts', cacheKey, count, 60); // Cache for 1 minute
    }
    return count;
}
/**
 * Database query builder with automatic optimization
 */
class OptimizedQueryBuilder {
    constructor(model) {
        this.whereClause = {};
        this.includeClause = {};
        this.selectClause = {};
        this.orderByClause = {};
        this.paginationOptions = {};
        this.useCache = false;
        this.cacheTTL = 300;
        this.cacheNamespace = 'queries';
        this.model = model;
    }
    where(conditions) {
        this.whereClause = { ...this.whereClause, ...conditions };
        return this;
    }
    include(relations) {
        this.includeClause = { ...this.includeClause, ...relations };
        return this;
    }
    select(fields) {
        this.selectClause = { ...this.selectClause, ...fields };
        return this;
    }
    orderBy(order) {
        this.orderByClause = order;
        return this;
    }
    paginate(options) {
        this.paginationOptions = options;
        return this;
    }
    cache(ttl = 300, namespace = 'queries') {
        this.useCache = true;
        this.cacheTTL = ttl;
        this.cacheNamespace = namespace;
        return this;
    }
    async execute() {
        const queryFn = async () => {
            const query = {
                where: this.whereClause,
            };
            if (Object.keys(this.selectClause).length > 0) {
                query.select = this.selectClause;
            }
            else if (Object.keys(this.includeClause).length > 0) {
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
            return cacheManager_1.cacheManager.getOrSet(this.cacheNamespace, cacheKey, queryFn, this.cacheTTL);
        }
        return queryFn();
    }
    async executeOne() {
        const results = await this.execute();
        return results[0] || null;
    }
}
exports.OptimizedQueryBuilder = OptimizedQueryBuilder;
// Export factory function
function createQueryBuilder(model) {
    return new OptimizedQueryBuilder(model);
}
//# sourceMappingURL=queryOptimizer.js.map
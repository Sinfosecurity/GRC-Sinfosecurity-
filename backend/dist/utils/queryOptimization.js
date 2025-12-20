"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendedIndexes = exports.indexHints = exports.vendorWithContracts = exports.vendorWithAssessments = exports.contractSelectFields = exports.assessmentSelectFields = exports.vendorMinimalSelect = exports.vendorSelectFields = void 0;
exports.getPaginationParams = getPaginationParams;
exports.buildSearchWhere = buildSearchWhere;
exports.buildOrderBy = buildOrderBy;
exports.batchQuery = batchQuery;
exports.getCursorParams = getCursorParams;
exports.countWithTimeout = countWithTimeout;
exports.bulkUpsert = bulkUpsert;
exports.logSlowQuery = logSlowQuery;
/**
 * Calculate skip and take for pagination
 */
function getPaginationParams(page, pageSize) {
    const skip = (page - 1) * pageSize;
    const take = Math.min(pageSize, 100); // Max 100 items per page
    return { skip, take };
}
/**
 * Common vendor select fields (optimize queries by only selecting needed fields)
 */
exports.vendorSelectFields = {
    id: true,
    name: true,
    tier: true,
    status: true,
    primaryContact: true,
    website: true,
    inherentRiskScore: true,
    residualRiskScore: true,
    organizationId: true,
    createdAt: true,
    updatedAt: true,
};
/**
 * Minimal vendor select (for lists)
 */
exports.vendorMinimalSelect = {
    id: true,
    name: true,
    tier: true,
    status: true,
    residualRiskScore: true,
};
/**
 * Common assessment select fields
 */
exports.assessmentSelectFields = {
    id: true,
    vendorId: true,
    type: true,
    status: true,
    dueDate: true,
    completedDate: true,
    overallScore: true,
    createdAt: true,
    updatedAt: true,
};
/**
 * Common contract select fields
 */
exports.contractSelectFields = {
    id: true,
    vendorId: true,
    contractNumber: true,
    startDate: true,
    endDate: true,
    value: true,
    status: true,
    autoRenew: true,
    createdAt: true,
    updatedAt: true,
};
/**
 * Build where clause for text search
 */
function buildSearchWhere(search, fields) {
    if (!search)
        return {};
    return {
        OR: fields.map(field => ({
            [field]: {
                contains: search,
                mode: 'insensitive',
            },
        })),
    };
}
/**
 * Build order by clause with defaults
 */
function buildOrderBy(sortBy, sortOrder = 'desc') {
    if (!sortBy) {
        return [{ createdAt: 'desc' }];
    }
    return [{ [sortBy]: sortOrder }, { createdAt: 'desc' }];
}
/**
 * Optimize include queries (use sparingly, prefer select)
 */
exports.vendorWithAssessments = {
    assessments: {
        select: exports.assessmentSelectFields,
        orderBy: { createdAt: 'desc' },
        take: 5, // Only last 5 assessments
    },
};
exports.vendorWithContracts = {
    contracts: {
        select: exports.contractSelectFields,
        where: { status: 'ACTIVE' },
        orderBy: { endDate: 'asc' },
    },
};
/**
 * Batch query helper - prevents N+1 queries
 */
async function batchQuery(items, key, queryFn) {
    if (items.length === 0)
        return items;
    // Extract unique IDs
    const ids = [...new Set(items.map(item => item[key]))];
    // Batch query
    const relatedData = await queryFn(ids);
    // Attach related data to items
    return items.map(item => ({
        ...item,
        related: relatedData.get(item[key]),
    }));
}
function getCursorParams(options) {
    if (!options.cursor) {
        return {
            take: options.take,
        };
    }
    return {
        take: options.take,
        skip: 1, // Skip the cursor
        cursor: {
            id: options.cursor,
        },
    };
}
/**
 * Count query with timeout
 */
async function countWithTimeout(queryFn, timeoutMs = 5000) {
    return Promise.race([
        queryFn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Count query timeout')), timeoutMs)),
    ]);
}
/**
 * Bulk upsert helper (more efficient than individual upserts)
 */
async function bulkUpsert(items, upsertFn) {
    // Process in batches of 50
    const batchSize = 50;
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(upsertFn));
        results.push(...batchResults);
    }
    return results;
}
/**
 * Index hints for complex queries
 */
exports.indexHints = {
    // Use these in raw queries for performance
    forceIndex: (indexName) => `FORCE INDEX (${indexName})`,
    useIndex: (indexName) => `USE INDEX (${indexName})`,
};
/**
 * Query performance logger
 */
function logSlowQuery(queryName, duration, threshold = 1000) {
    if (duration > threshold) {
        console.warn(`[SLOW QUERY] ${queryName} took ${duration}ms (threshold: ${threshold}ms)`);
    }
}
/**
 * Recommended indexes for vendor queries
 */
exports.recommendedIndexes = {
    vendor: [
        'CREATE INDEX IF NOT EXISTS idx_vendor_org_status ON Vendor(organizationId, status)',
        'CREATE INDEX IF NOT EXISTS idx_vendor_org_tier ON Vendor(organizationId, tier)',
        'CREATE INDEX IF NOT EXISTS idx_vendor_org_search ON Vendor(organizationId, name)',
        'CREATE INDEX IF NOT EXISTS idx_vendor_risk_score ON Vendor(residualRiskScore)',
    ],
    assessment: [
        'CREATE INDEX IF NOT EXISTS idx_assessment_vendor_status ON VendorAssessment(vendorId, status)',
        'CREATE INDEX IF NOT EXISTS idx_assessment_due_date ON VendorAssessment(dueDate)',
        'CREATE INDEX IF NOT EXISTS idx_assessment_org ON VendorAssessment(organizationId)',
    ],
    contract: [
        'CREATE INDEX IF NOT EXISTS idx_contract_vendor_status ON VendorContract(vendorId, status)',
        'CREATE INDEX IF NOT EXISTS idx_contract_end_date ON VendorContract(endDate)',
    ],
};
//# sourceMappingURL=queryOptimization.js.map
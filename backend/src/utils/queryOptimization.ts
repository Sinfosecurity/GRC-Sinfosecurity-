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
export function getPaginationParams(page: number, pageSize: number) {
  const skip = (page - 1) * pageSize;
  const take = Math.min(pageSize, 100); // Max 100 items per page
  
  return { skip, take };
}

/**
 * Common vendor select fields (optimize queries by only selecting needed fields)
 */
export const vendorSelectFields = {
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
} satisfies Prisma.VendorSelect;

/**
 * Minimal vendor select (for lists)
 */
export const vendorMinimalSelect = {
  id: true,
  name: true,
  tier: true,
  status: true,
  residualRiskScore: true,
} satisfies Prisma.VendorSelect;

/**
 * Common assessment select fields
 */
export const assessmentSelectFields = {
  id: true,
  vendorId: true,
  type: true,
  status: true,
  dueDate: true,
  completedDate: true,
  overallScore: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VendorAssessmentSelect;

/**
 * Common contract select fields
 */
export const contractSelectFields = {
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
} satisfies Prisma.VendorContractSelect;

/**
 * Build where clause for text search
 */
export function buildSearchWhere(search: string | undefined, fields: string[]) {
  if (!search) return {};

  return {
    OR: fields.map(field => ({
      [field]: {
        contains: search,
        mode: 'insensitive' as Prisma.QueryMode,
      },
    })),
  };
}

/**
 * Build order by clause with defaults
 */
export function buildOrderBy(
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): Prisma.VendorOrderByWithRelationInput[] {
  if (!sortBy) {
    return [{ createdAt: 'desc' }];
  }

  return [{ [sortBy]: sortOrder }, { createdAt: 'desc' }];
}

/**
 * Optimize include queries (use sparingly, prefer select)
 */
export const vendorWithAssessments = {
  assessments: {
    select: assessmentSelectFields,
    orderBy: { createdAt: 'desc' as const },
    take: 5, // Only last 5 assessments
  },
} satisfies Prisma.VendorInclude;

export const vendorWithContracts = {
  contracts: {
    select: contractSelectFields,
    where: { status: 'ACTIVE' },
    orderBy: { endDate: 'asc' as const },
  },
} satisfies Prisma.VendorInclude;

/**
 * Batch query helper - prevents N+1 queries
 */
export async function batchQuery<T, K extends keyof T>(
  items: T[],
  key: K,
  queryFn: (ids: T[K][]) => Promise<Map<T[K], any>>
): Promise<T[]> {
  if (items.length === 0) return items;

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

/**
 * Cursor-based pagination for large datasets
 */
export interface CursorPaginationOptions {
  cursor?: string;
  take: number;
}

export function getCursorParams(options: CursorPaginationOptions) {
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
export async function countWithTimeout<T>(
  queryFn: () => Promise<number>,
  timeoutMs: number = 5000
): Promise<number> {
  return Promise.race([
    queryFn(),
    new Promise<number>((_, reject) =>
      setTimeout(() => reject(new Error('Count query timeout')), timeoutMs)
    ),
  ]);
}

/**
 * Bulk upsert helper (more efficient than individual upserts)
 */
export async function bulkUpsert<T>(
  items: T[],
  upsertFn: (item: T) => Promise<any>
): Promise<any[]> {
  // Process in batches of 50
  const batchSize = 50;
  const results: any[] = [];

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
export const indexHints = {
  // Use these in raw queries for performance
  forceIndex: (indexName: string) => `FORCE INDEX (${indexName})`,
  useIndex: (indexName: string) => `USE INDEX (${indexName})`,
};

/**
 * Query performance logger
 */
export function logSlowQuery(queryName: string, duration: number, threshold: number = 1000) {
  if (duration > threshold) {
    console.warn(`[SLOW QUERY] ${queryName} took ${duration}ms (threshold: ${threshold}ms)`);
  }
}

/**
 * Recommended indexes for vendor queries
 */
export const recommendedIndexes = {
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

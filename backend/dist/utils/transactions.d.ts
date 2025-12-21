import { Prisma } from '@prisma/client';
/**
 * Transaction Management Utilities
 * Provides safe transaction handling with automatic rollback
 */
export interface TransactionOptions {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
}
/**
 * Execute code in a transaction with automatic rollback on error
 */
export declare function withTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>, options?: TransactionOptions): Promise<T>;
/**
 * Execute multiple operations in parallel within a transaction
 */
export declare function withParallelTransaction<T extends any[]>(operations: [(tx: Prisma.TransactionClient) => Promise<T[number]>], options?: TransactionOptions): Promise<T>;
/**
 * Retry transaction on serialization failures
 */
export declare function withRetryableTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>, maxRetries?: number, options?: TransactionOptions): Promise<T>;
/**
 * Batch operations with automatic batching and transaction management
 */
export declare class BatchProcessor<T, R> {
    private batchSize;
    private operations;
    private processor;
    constructor(processor: (items: T[], tx?: Prisma.TransactionClient) => Promise<R[]>, batchSize?: number);
    /**
     * Add operation to batch
     */
    add(operation: T): void;
    /**
     * Execute all operations in batches
     */
    execute(useTransaction?: boolean): Promise<R[]>;
    /**
     * Split array into chunks
     */
    private chunk;
    /**
     * Get pending operations count
     */
    getPendingCount(): number;
    /**
     * Clear pending operations
     */
    clear(): void;
}
/**
 * Idempotent operation wrapper
 * Prevents duplicate operations using a unique key
 */
export declare class IdempotencyManager {
    private static processedKeys;
    private static readonly TTL;
    /**
     * Execute operation with idempotency guarantee
     */
    static execute<T>(idempotencyKey: string, operation: () => Promise<T>): Promise<T>;
    /**
     * Clean up expired entries
     */
    private static cleanup;
    /**
     * Clear all idempotency keys (for testing)
     */
    static clear(): void;
}
/**
 * Optimistic locking helper
 */
export declare function withOptimisticLocking<T extends {
    version?: number;
}>(findOperation: () => Promise<T | null>, updateOperation: (current: T) => Promise<T>, maxRetries?: number): Promise<T>;
/**
 * Saga pattern helper for distributed transactions
 */
export declare class Saga {
    private steps;
    private executedSteps;
    /**
     * Add step to saga
     */
    addStep(execute: () => Promise<any>, compensate: () => Promise<void>): this;
    /**
     * Execute saga
     */
    execute(): Promise<any[]>;
    /**
     * Compensate executed steps in reverse order
     */
    private compensate;
}
//# sourceMappingURL=transactions.d.ts.map
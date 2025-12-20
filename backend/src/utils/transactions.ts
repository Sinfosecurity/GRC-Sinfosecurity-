import { prisma } from '../config/database';
import logger from '../config/logger';
import { Prisma } from '@prisma/client';

/**
 * Transaction Management Utilities
 * Provides safe transaction handling with automatic rollback
 */

export interface TransactionOptions {
    maxWait?: number;      // Max time to wait for transaction start (ms)
    timeout?: number;      // Max transaction time (ms)
    isolationLevel?: Prisma.TransactionIsolationLevel;
}

/**
 * Execute code in a transaction with automatic rollback on error
 */
export async function withTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: TransactionOptions
): Promise<T> {
    const startTime = Date.now();
    
    try {
        const result = await prisma.$transaction(
            async (tx) => {
                return await callback(tx);
            },
            {
                maxWait: options?.maxWait || 5000,      // 5 seconds
                timeout: options?.timeout || 30000,      // 30 seconds
                isolationLevel: options?.isolationLevel,
            }
        );

        const duration = Date.now() - startTime;
        logger.debug(`Transaction completed successfully in ${duration}ms`);
        
        return result;
    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error(`Transaction failed after ${duration}ms:`, {
            error: error.message,
            stack: error.stack,
        });
        throw error;
    }
}

/**
 * Execute multiple operations in parallel within a transaction
 */
export async function withParallelTransaction<T extends any[]>(
    operations: [(tx: Prisma.TransactionClient) => Promise<T[number]>],
    options?: TransactionOptions
): Promise<T> {
    return withTransaction(
        async (tx) => {
            return Promise.all(operations.map(op => op(tx))) as Promise<T>;
        },
        options
    );
}

/**
 * Retry transaction on serialization failures
 */
export async function withRetryableTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    maxRetries: number = 3,
    options?: TransactionOptions
): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await withTransaction(callback, options);
        } catch (error: any) {
            lastError = error;
            
            // Check if error is retryable (serialization failure, deadlock, etc.)
            const isRetryable = 
                error.code === 'P2034' ||  // Transaction conflict
                error.code === '40001' ||  // Serialization failure
                error.code === '40P01';    // Deadlock detected
            
            if (!isRetryable || attempt === maxRetries) {
                throw error;
            }
            
            // Exponential backoff
            const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000);
            logger.warn(`Transaction failed, retrying (attempt ${attempt}/${maxRetries})`, {
                error: error.message,
                delay,
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

/**
 * Batch operations with automatic batching and transaction management
 */
export class BatchProcessor<T, R> {
    private batchSize: number;
    private operations: T[] = [];
    private processor: (items: T[], tx?: Prisma.TransactionClient) => Promise<R[]>;
    
    constructor(
        processor: (items: T[], tx?: Prisma.TransactionClient) => Promise<R[]>,
        batchSize: number = 100
    ) {
        this.processor = processor;
        this.batchSize = batchSize;
    }
    
    /**
     * Add operation to batch
     */
    add(operation: T): void {
        this.operations.push(operation);
    }
    
    /**
     * Execute all operations in batches
     */
    async execute(useTransaction: boolean = true): Promise<R[]> {
        const results: R[] = [];
        const batches = this.chunk(this.operations, this.batchSize);
        
        logger.info(`Processing ${this.operations.length} operations in ${batches.length} batches`);
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            logger.debug(`Processing batch ${i + 1}/${batches.length} (${batch.length} items)`);
            
            try {
                let batchResults: R[];
                
                if (useTransaction) {
                    batchResults = await withTransaction(
                        async (tx) => await this.processor(batch, tx)
                    );
                } else {
                    batchResults = await this.processor(batch);
                }
                
                results.push(...batchResults);
            } catch (error: any) {
                logger.error(`Batch ${i + 1} failed:`, {
                    error: error.message,
                    batchSize: batch.length,
                });
                throw error;
            }
        }
        
        logger.info(`Successfully processed ${results.length} operations`);
        this.operations = []; // Clear operations
        
        return results;
    }
    
    /**
     * Split array into chunks
     */
    private chunk(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    
    /**
     * Get pending operations count
     */
    getPendingCount(): number {
        return this.operations.length;
    }
    
    /**
     * Clear pending operations
     */
    clear(): void {
        this.operations = [];
    }
}

/**
 * Idempotent operation wrapper
 * Prevents duplicate operations using a unique key
 */
export class IdempotencyManager {
    private static processedKeys = new Map<string, { result: any; timestamp: number }>();
    private static readonly TTL = 86400000; // 24 hours
    
    /**
     * Execute operation with idempotency guarantee
     */
    static async execute<T>(
        idempotencyKey: string,
        operation: () => Promise<T>
    ): Promise<T> {
        // Check if operation was already processed
        const cached = this.processedKeys.get(idempotencyKey);
        if (cached) {
            logger.info(`Idempotent operation: returning cached result for key ${idempotencyKey}`);
            return cached.result;
        }
        
        // Execute operation
        const result = await operation();
        
        // Store result
        this.processedKeys.set(idempotencyKey, {
            result,
            timestamp: Date.now(),
        });
        
        // Clean up old entries
        this.cleanup();
        
        return result;
    }
    
    /**
     * Clean up expired entries
     */
    private static cleanup(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];
        
        this.processedKeys.forEach((value, key) => {
            if (now - value.timestamp > this.TTL) {
                keysToDelete.push(key);
            }
        });
        
        keysToDelete.forEach(key => this.processedKeys.delete(key));
        
        if (keysToDelete.length > 0) {
            logger.debug(`Cleaned up ${keysToDelete.length} expired idempotency keys`);
        }
    }
    
    /**
     * Clear all idempotency keys (for testing)
     */
    static clear(): void {
        this.processedKeys.clear();
    }
}

/**
 * Optimistic locking helper
 */
export async function withOptimisticLocking<T extends { version?: number }>(
    findOperation: () => Promise<T | null>,
    updateOperation: (current: T) => Promise<T>,
    maxRetries: number = 3
): Promise<T> {
    let attempt = 0;
    
    while (attempt < maxRetries) {
        attempt++;
        
        // Get current version
        const current = await findOperation();
        if (!current) {
            throw new Error('Record not found');
        }
        
        try {
            // Attempt update
            return await updateOperation(current);
        } catch (error: any) {
            // Check if it's a version conflict
            if (error.code === 'P2034' || error.message?.includes('version')) {
                if (attempt >= maxRetries) {
                    logger.error('Optimistic locking failed after max retries', {
                        attempts: attempt,
                    });
                    throw new Error('Concurrent modification detected, please retry');
                }
                
                logger.warn(`Optimistic locking conflict, retrying (attempt ${attempt}/${maxRetries})`);
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 50 * attempt));
                continue;
            }
            
            throw error;
        }
    }
    
    throw new Error('Optimistic locking failed');
}

/**
 * Saga pattern helper for distributed transactions
 */
export class Saga {
    private steps: Array<{
        execute: () => Promise<any>;
        compensate: () => Promise<void>;
    }> = [];
    private executedSteps: number = 0;
    
    /**
     * Add step to saga
     */
    addStep(
        execute: () => Promise<any>,
        compensate: () => Promise<void>
    ): this {
        this.steps.push({ execute, compensate });
        return this;
    }
    
    /**
     * Execute saga
     */
    async execute(): Promise<any[]> {
        const results: any[] = [];
        
        try {
            for (let i = 0; i < this.steps.length; i++) {
                const step = this.steps[i];
                logger.debug(`Executing saga step ${i + 1}/${this.steps.length}`);
                
                const result = await step.execute();
                results.push(result);
                this.executedSteps++;
            }
            
            logger.info(`Saga completed successfully (${this.executedSteps} steps)`);
            return results;
        } catch (error: any) {
            logger.error(`Saga failed at step ${this.executedSteps + 1}, initiating compensation`);
            await this.compensate();
            throw error;
        }
    }
    
    /**
     * Compensate executed steps in reverse order
     */
    private async compensate(): Promise<void> {
        for (let i = this.executedSteps - 1; i >= 0; i--) {
            const step = this.steps[i];
            try {
                logger.debug(`Compensating saga step ${i + 1}`);
                await step.compensate();
            } catch (error: any) {
                logger.error(`Compensation failed for step ${i + 1}:`, {
                    error: error.message,
                });
                // Continue with other compensations
            }
        }
        
        logger.info(`Saga compensation completed (${this.executedSteps} steps rolled back)`);
    }
}

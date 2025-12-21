"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Saga = exports.IdempotencyManager = exports.BatchProcessor = void 0;
exports.withTransaction = withTransaction;
exports.withParallelTransaction = withParallelTransaction;
exports.withRetryableTransaction = withRetryableTransaction;
exports.withOptimisticLocking = withOptimisticLocking;
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Execute code in a transaction with automatic rollback on error
 */
async function withTransaction(callback, options) {
    const startTime = Date.now();
    try {
        const result = await database_1.prisma.$transaction(async (tx) => {
            return await callback(tx);
        }, {
            maxWait: options?.maxWait || 5000, // 5 seconds
            timeout: options?.timeout || 30000, // 30 seconds
            isolationLevel: options?.isolationLevel,
        });
        const duration = Date.now() - startTime;
        logger_1.default.debug(`Transaction completed successfully in ${duration}ms`);
        return result;
    }
    catch (error) {
        const duration = Date.now() - startTime;
        logger_1.default.error(`Transaction failed after ${duration}ms:`, {
            error: error.message,
            stack: error.stack,
        });
        throw error;
    }
}
/**
 * Execute multiple operations in parallel within a transaction
 */
async function withParallelTransaction(operations, options) {
    return withTransaction(async (tx) => {
        return Promise.all(operations.map(op => op(tx)));
    }, options);
}
/**
 * Retry transaction on serialization failures
 */
async function withRetryableTransaction(callback, maxRetries = 3, options) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await withTransaction(callback, options);
        }
        catch (error) {
            lastError = error;
            // Check if error is retryable (serialization failure, deadlock, etc.)
            const isRetryable = error.code === 'P2034' || // Transaction conflict
                error.code === '40001' || // Serialization failure
                error.code === '40P01'; // Deadlock detected
            if (!isRetryable || attempt === maxRetries) {
                throw error;
            }
            // Exponential backoff
            const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000);
            logger_1.default.warn(`Transaction failed, retrying (attempt ${attempt}/${maxRetries})`, {
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
class BatchProcessor {
    constructor(processor, batchSize = 100) {
        this.operations = [];
        this.processor = processor;
        this.batchSize = batchSize;
    }
    /**
     * Add operation to batch
     */
    add(operation) {
        this.operations.push(operation);
    }
    /**
     * Execute all operations in batches
     */
    async execute(useTransaction = true) {
        const results = [];
        const batches = this.chunk(this.operations, this.batchSize);
        logger_1.default.info(`Processing ${this.operations.length} operations in ${batches.length} batches`);
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            logger_1.default.debug(`Processing batch ${i + 1}/${batches.length} (${batch.length} items)`);
            try {
                let batchResults;
                if (useTransaction) {
                    batchResults = await withTransaction(async (tx) => await this.processor(batch, tx));
                }
                else {
                    batchResults = await this.processor(batch);
                }
                results.push(...batchResults);
            }
            catch (error) {
                logger_1.default.error(`Batch ${i + 1} failed:`, {
                    error: error.message,
                    batchSize: batch.length,
                });
                throw error;
            }
        }
        logger_1.default.info(`Successfully processed ${results.length} operations`);
        this.operations = []; // Clear operations
        return results;
    }
    /**
     * Split array into chunks
     */
    chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    /**
     * Get pending operations count
     */
    getPendingCount() {
        return this.operations.length;
    }
    /**
     * Clear pending operations
     */
    clear() {
        this.operations = [];
    }
}
exports.BatchProcessor = BatchProcessor;
/**
 * Idempotent operation wrapper
 * Prevents duplicate operations using a unique key
 */
class IdempotencyManager {
    /**
     * Execute operation with idempotency guarantee
     */
    static async execute(idempotencyKey, operation) {
        // Check if operation was already processed
        const cached = this.processedKeys.get(idempotencyKey);
        if (cached) {
            logger_1.default.info(`Idempotent operation: returning cached result for key ${idempotencyKey}`);
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
    static cleanup() {
        const now = Date.now();
        const keysToDelete = [];
        this.processedKeys.forEach((value, key) => {
            if (now - value.timestamp > this.TTL) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.processedKeys.delete(key));
        if (keysToDelete.length > 0) {
            logger_1.default.debug(`Cleaned up ${keysToDelete.length} expired idempotency keys`);
        }
    }
    /**
     * Clear all idempotency keys (for testing)
     */
    static clear() {
        this.processedKeys.clear();
    }
}
exports.IdempotencyManager = IdempotencyManager;
IdempotencyManager.processedKeys = new Map();
IdempotencyManager.TTL = 86400000; // 24 hours
/**
 * Optimistic locking helper
 */
async function withOptimisticLocking(findOperation, updateOperation, maxRetries = 3) {
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
        }
        catch (error) {
            // Check if it's a version conflict
            if (error.code === 'P2034' || error.message?.includes('version')) {
                if (attempt >= maxRetries) {
                    logger_1.default.error('Optimistic locking failed after max retries', {
                        attempts: attempt,
                    });
                    throw new Error('Concurrent modification detected, please retry');
                }
                logger_1.default.warn(`Optimistic locking conflict, retrying (attempt ${attempt}/${maxRetries})`);
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
class Saga {
    constructor() {
        this.steps = [];
        this.executedSteps = 0;
    }
    /**
     * Add step to saga
     */
    addStep(execute, compensate) {
        this.steps.push({ execute, compensate });
        return this;
    }
    /**
     * Execute saga
     */
    async execute() {
        const results = [];
        try {
            for (let i = 0; i < this.steps.length; i++) {
                const step = this.steps[i];
                logger_1.default.debug(`Executing saga step ${i + 1}/${this.steps.length}`);
                const result = await step.execute();
                results.push(result);
                this.executedSteps++;
            }
            logger_1.default.info(`Saga completed successfully (${this.executedSteps} steps)`);
            return results;
        }
        catch (error) {
            logger_1.default.error(`Saga failed at step ${this.executedSteps + 1}, initiating compensation`);
            await this.compensate();
            throw error;
        }
    }
    /**
     * Compensate executed steps in reverse order
     */
    async compensate() {
        for (let i = this.executedSteps - 1; i >= 0; i--) {
            const step = this.steps[i];
            try {
                logger_1.default.debug(`Compensating saga step ${i + 1}`);
                await step.compensate();
            }
            catch (error) {
                logger_1.default.error(`Compensation failed for step ${i + 1}:`, {
                    error: error.message,
                });
                // Continue with other compensations
            }
        }
        logger_1.default.info(`Saga compensation completed (${this.executedSteps} steps rolled back)`);
    }
}
exports.Saga = Saga;
//# sourceMappingURL=transactions.js.map
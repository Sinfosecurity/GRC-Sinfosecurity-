import logger from '../config/logger';

/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 */

export enum CircuitState {
    CLOSED = 'CLOSED',     // Normal operation
    OPEN = 'OPEN',         // Failing, reject requests
    HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerOptions {
    failureThreshold: number;      // Number of failures before opening
    successThreshold: number;      // Number of successes to close from half-open
    timeout: number;               // Time to wait before trying again (ms)
    monitoringPeriod: number;      // Time window for failure counting (ms)
}

export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private successCount: number = 0;
    private lastFailureTime: number = 0;
    private nextAttemptTime: number = 0;
    private readonly options: CircuitBreakerOptions;
    private readonly name: string;

    constructor(name: string, options?: Partial<CircuitBreakerOptions>) {
        this.name = name;
        this.options = {
            failureThreshold: options?.failureThreshold || 5,
            successThreshold: options?.successThreshold || 2,
            timeout: options?.timeout || 60000, // 60 seconds
            monitoringPeriod: options?.monitoringPeriod || 120000, // 2 minutes
        };
    }

    /**
     * Execute function with circuit breaker protection
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === CircuitState.OPEN) {
            if (Date.now() < this.nextAttemptTime) {
                const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
                logger.warn(`Circuit breaker rejected request: ${this.name}`);
                throw error;
            }
            // Transition to half-open to test the service
            this.state = CircuitState.HALF_OPEN;
            this.successCount = 0;
            logger.info(`Circuit breaker transitioning to HALF_OPEN: ${this.name}`);
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    /**
     * Handle successful execution
     */
    private onSuccess(): void {
        this.failureCount = 0;

        if (this.state === CircuitState.HALF_OPEN) {
            this.successCount++;
            if (this.successCount >= this.options.successThreshold) {
                this.state = CircuitState.CLOSED;
                this.successCount = 0;
                logger.info(`Circuit breaker CLOSED: ${this.name}`);
            }
        }
    }

    /**
     * Handle failed execution
     */
    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        // Reset old failures outside monitoring period
        if (this.lastFailureTime - this.lastFailureTime > this.options.monitoringPeriod) {
            this.failureCount = 1;
        }

        if (this.state === CircuitState.HALF_OPEN) {
            this.state = CircuitState.OPEN;
            this.nextAttemptTime = Date.now() + this.options.timeout;
            logger.error(`Circuit breaker OPENED from HALF_OPEN: ${this.name}`);
        } else if (this.failureCount >= this.options.failureThreshold) {
            this.state = CircuitState.OPEN;
            this.nextAttemptTime = Date.now() + this.options.timeout;
            logger.error(`Circuit breaker OPENED: ${this.name} (failures: ${this.failureCount})`);
        }
    }

    /**
     * Get current state
     */
    getState(): CircuitState {
        return this.state;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            nextAttemptTime: this.nextAttemptTime,
        };
    }

    /**
     * Manually reset circuit breaker
     */
    reset(): void {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttemptTime = 0;
        logger.info(`Circuit breaker manually reset: ${this.name}`);
    }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerManager {
    private breakers: Map<string, CircuitBreaker> = new Map();

    /**
     * Get or create circuit breaker
     */
    getBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
        if (!this.breakers.has(name)) {
            this.breakers.set(name, new CircuitBreaker(name, options));
        }
        return this.breakers.get(name)!;
    }

    /**
     * Execute with circuit breaker
     */
    async execute<T>(
        name: string,
        fn: () => Promise<T>,
        options?: Partial<CircuitBreakerOptions>
    ): Promise<T> {
        const breaker = this.getBreaker(name, options);
        return breaker.execute(fn);
    }

    /**
     * Get all circuit breaker stats
     */
    getAllStats() {
        const stats: any[] = [];
        this.breakers.forEach((breaker) => {
            stats.push(breaker.getStats());
        });
        return stats;
    }

    /**
     * Reset all circuit breakers
     */
    resetAll(): void {
        this.breakers.forEach((breaker) => breaker.reset());
        logger.info('All circuit breakers reset');
    }

    /**
     * Reset specific circuit breaker
     */
    reset(name: string): void {
        const breaker = this.breakers.get(name);
        if (breaker) {
            breaker.reset();
        }
    }
}

// Export singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();

/**
 * Retry Logic with Exponential Backoff
 */

export interface RetryOptions {
    maxRetries: number;
    initialDelay: number;       // Initial delay in ms
    maxDelay: number;           // Maximum delay in ms
    backoffMultiplier: number;  // Multiplier for exponential backoff
    retryableErrors?: string[]; // List of error codes/types to retry
    onRetry?: (attempt: number, error: any) => void;
}

export class RetryHandler {
    private readonly options: RetryOptions;

    constructor(options?: Partial<RetryOptions>) {
        this.options = {
            maxRetries: options?.maxRetries || 3,
            initialDelay: options?.initialDelay || 1000,
            maxDelay: options?.maxDelay || 30000,
            backoffMultiplier: options?.backoffMultiplier || 2,
            retryableErrors: options?.retryableErrors || [
                'ECONNRESET',
                'ETIMEDOUT',
                'ECONNREFUSED',
                'ENOTFOUND',
                '503',
                '504',
                '429',
            ],
            onRetry: options?.onRetry,
        };
    }

    /**
     * Execute function with retry logic
     */
    async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
        let lastError: any;
        let attempt = 0;

        while (attempt <= this.options.maxRetries) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;
                attempt++;

                // Check if error is retryable
                if (!this.isRetryable(error) || attempt > this.options.maxRetries) {
                    logger.error(`Non-retryable error or max retries reached`, {
                        context,
                        attempt,
                        error: error.message,
                    });
                    throw error;
                }

                // Calculate delay with exponential backoff
                const delay = Math.min(
                    this.options.initialDelay * Math.pow(this.options.backoffMultiplier, attempt - 1),
                    this.options.maxDelay
                );

                // Add jitter (random 0-25% of delay)
                const jitter = Math.random() * delay * 0.25;
                const totalDelay = delay + jitter;

                logger.warn(`Retrying after error`, {
                    context,
                    attempt,
                    maxRetries: this.options.maxRetries,
                    delay: totalDelay,
                    error: error.message,
                });

                // Call retry callback if provided
                if (this.options.onRetry) {
                    this.options.onRetry(attempt, error);
                }

                // Wait before retrying
                await this.sleep(totalDelay);
            }
        }

        throw lastError;
    }

    /**
     * Check if error is retryable
     */
    private isRetryable(error: any): boolean {
        if (!error) return false;

        // Check error code
        if (error.code && this.options.retryableErrors?.includes(error.code)) {
            return true;
        }

        // Check HTTP status code
        if (error.status && this.options.retryableErrors?.includes(String(error.status))) {
            return true;
        }

        // Check error message
        if (error.message) {
            const lowerMessage = error.message.toLowerCase();
            return (
                lowerMessage.includes('timeout') ||
                lowerMessage.includes('connection') ||
                lowerMessage.includes('network') ||
                lowerMessage.includes('unavailable')
            );
        }

        return false;
    }

    /**
     * Sleep helper
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

// Export singleton instance
export const defaultRetryHandler = new RetryHandler();

/**
 * Combined Circuit Breaker + Retry Pattern
 */
export class ResilientExecutor {
    private circuitBreaker: CircuitBreaker;
    private retryHandler: RetryHandler;

    constructor(
        name: string,
        circuitOptions?: Partial<CircuitBreakerOptions>,
        retryOptions?: Partial<RetryOptions>
    ) {
        this.circuitBreaker = new CircuitBreaker(name, circuitOptions);
        this.retryHandler = new RetryHandler(retryOptions);
    }

    /**
     * Execute with circuit breaker and retry logic
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        return this.retryHandler.execute(async () => {
            return this.circuitBreaker.execute(fn);
        }, this.circuitBreaker.getStats().name);
    }

    getStats() {
        return this.circuitBreaker.getStats();
    }

    reset() {
        this.circuitBreaker.reset();
    }
}

/**
 * Decorator for automatic circuit breaker and retry
 */
export function Resilient(
    name: string,
    options?: {
        circuit?: Partial<CircuitBreakerOptions>;
        retry?: Partial<RetryOptions>;
    }
) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const executor = new ResilientExecutor(
            `${target.constructor.name}.${propertyKey}`,
            options?.circuit,
            options?.retry
        );

        descriptor.value = async function (...args: any[]) {
            return executor.execute(() => originalMethod.apply(this, args));
        };

        return descriptor;
    };
}

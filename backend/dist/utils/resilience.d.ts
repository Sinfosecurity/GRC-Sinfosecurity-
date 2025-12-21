/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 */
export declare enum CircuitState {
    CLOSED = "CLOSED",// Normal operation
    OPEN = "OPEN",// Failing, reject requests
    HALF_OPEN = "HALF_OPEN"
}
export interface CircuitBreakerOptions {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    monitoringPeriod: number;
}
export declare class CircuitBreaker {
    private state;
    private failureCount;
    private successCount;
    private lastFailureTime;
    private nextAttemptTime;
    private readonly options;
    private readonly name;
    constructor(name: string, options?: Partial<CircuitBreakerOptions>);
    /**
     * Execute function with circuit breaker protection
     */
    execute<T>(fn: () => Promise<T>): Promise<T>;
    /**
     * Handle successful execution
     */
    private onSuccess;
    /**
     * Handle failed execution
     */
    private onFailure;
    /**
     * Get current state
     */
    getState(): CircuitState;
    /**
     * Get statistics
     */
    getStats(): {
        name: string;
        state: CircuitState;
        failureCount: number;
        successCount: number;
        nextAttemptTime: number;
    };
    /**
     * Manually reset circuit breaker
     */
    reset(): void;
}
/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
export declare class CircuitBreakerManager {
    private breakers;
    /**
     * Get or create circuit breaker
     */
    getBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker;
    /**
     * Execute with circuit breaker
     */
    execute<T>(name: string, fn: () => Promise<T>, options?: Partial<CircuitBreakerOptions>): Promise<T>;
    /**
     * Get all circuit breaker stats
     */
    getAllStats(): any[];
    /**
     * Reset all circuit breakers
     */
    resetAll(): void;
    /**
     * Reset specific circuit breaker
     */
    reset(name: string): void;
}
export declare const circuitBreakerManager: CircuitBreakerManager;
/**
 * Retry Logic with Exponential Backoff
 */
export interface RetryOptions {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    retryableErrors?: string[];
    onRetry?: (attempt: number, error: any) => void;
}
export declare class RetryHandler {
    private readonly options;
    constructor(options?: Partial<RetryOptions>);
    /**
     * Execute function with retry logic
     */
    execute<T>(fn: () => Promise<T>, context?: string): Promise<T>;
    /**
     * Check if error is retryable
     */
    private isRetryable;
    /**
     * Sleep helper
     */
    private sleep;
}
export declare const defaultRetryHandler: RetryHandler;
/**
 * Combined Circuit Breaker + Retry Pattern
 */
export declare class ResilientExecutor {
    private circuitBreaker;
    private retryHandler;
    constructor(name: string, circuitOptions?: Partial<CircuitBreakerOptions>, retryOptions?: Partial<RetryOptions>);
    /**
     * Execute with circuit breaker and retry logic
     */
    execute<T>(fn: () => Promise<T>): Promise<T>;
    getStats(): {
        name: string;
        state: CircuitState;
        failureCount: number;
        successCount: number;
        nextAttemptTime: number;
    };
    reset(): void;
}
/**
 * Decorator for automatic circuit breaker and retry
 */
export declare function Resilient(name: string, options?: {
    circuit?: Partial<CircuitBreakerOptions>;
    retry?: Partial<RetryOptions>;
}): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
//# sourceMappingURL=resilience.d.ts.map
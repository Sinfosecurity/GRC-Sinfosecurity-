"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResilientExecutor = exports.defaultRetryHandler = exports.RetryHandler = exports.circuitBreakerManager = exports.CircuitBreakerManager = exports.CircuitBreaker = exports.CircuitState = void 0;
exports.Resilient = Resilient;
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 */
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN"; // Testing if service recovered
})(CircuitState || (exports.CircuitState = CircuitState = {}));
class CircuitBreaker {
    constructor(name, options) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = 0;
        this.nextAttemptTime = 0;
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
    async execute(fn) {
        if (this.state === CircuitState.OPEN) {
            if (Date.now() < this.nextAttemptTime) {
                const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
                logger_1.default.warn(`Circuit breaker rejected request: ${this.name}`);
                throw error;
            }
            // Transition to half-open to test the service
            this.state = CircuitState.HALF_OPEN;
            this.successCount = 0;
            logger_1.default.info(`Circuit breaker transitioning to HALF_OPEN: ${this.name}`);
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    /**
     * Handle successful execution
     */
    onSuccess() {
        this.failureCount = 0;
        if (this.state === CircuitState.HALF_OPEN) {
            this.successCount++;
            if (this.successCount >= this.options.successThreshold) {
                this.state = CircuitState.CLOSED;
                this.successCount = 0;
                logger_1.default.info(`Circuit breaker CLOSED: ${this.name}`);
            }
        }
    }
    /**
     * Handle failed execution
     */
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        // Reset old failures outside monitoring period
        if (this.lastFailureTime - this.lastFailureTime > this.options.monitoringPeriod) {
            this.failureCount = 1;
        }
        if (this.state === CircuitState.HALF_OPEN) {
            this.state = CircuitState.OPEN;
            this.nextAttemptTime = Date.now() + this.options.timeout;
            logger_1.default.error(`Circuit breaker OPENED from HALF_OPEN: ${this.name}`);
        }
        else if (this.failureCount >= this.options.failureThreshold) {
            this.state = CircuitState.OPEN;
            this.nextAttemptTime = Date.now() + this.options.timeout;
            logger_1.default.error(`Circuit breaker OPENED: ${this.name} (failures: ${this.failureCount})`);
        }
    }
    /**
     * Get current state
     */
    getState() {
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
    reset() {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttemptTime = 0;
        logger_1.default.info(`Circuit breaker manually reset: ${this.name}`);
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
class CircuitBreakerManager {
    constructor() {
        this.breakers = new Map();
    }
    /**
     * Get or create circuit breaker
     */
    getBreaker(name, options) {
        if (!this.breakers.has(name)) {
            this.breakers.set(name, new CircuitBreaker(name, options));
        }
        return this.breakers.get(name);
    }
    /**
     * Execute with circuit breaker
     */
    async execute(name, fn, options) {
        const breaker = this.getBreaker(name, options);
        return breaker.execute(fn);
    }
    /**
     * Get all circuit breaker stats
     */
    getAllStats() {
        const stats = [];
        this.breakers.forEach((breaker) => {
            stats.push(breaker.getStats());
        });
        return stats;
    }
    /**
     * Reset all circuit breakers
     */
    resetAll() {
        this.breakers.forEach((breaker) => breaker.reset());
        logger_1.default.info('All circuit breakers reset');
    }
    /**
     * Reset specific circuit breaker
     */
    reset(name) {
        const breaker = this.breakers.get(name);
        if (breaker) {
            breaker.reset();
        }
    }
}
exports.CircuitBreakerManager = CircuitBreakerManager;
// Export singleton instance
exports.circuitBreakerManager = new CircuitBreakerManager();
class RetryHandler {
    constructor(options) {
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
    async execute(fn, context) {
        let lastError;
        let attempt = 0;
        while (attempt <= this.options.maxRetries) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                attempt++;
                // Check if error is retryable
                if (!this.isRetryable(error) || attempt > this.options.maxRetries) {
                    logger_1.default.error(`Non-retryable error or max retries reached`, {
                        context,
                        attempt,
                        error: error.message,
                    });
                    throw error;
                }
                // Calculate delay with exponential backoff
                const delay = Math.min(this.options.initialDelay * Math.pow(this.options.backoffMultiplier, attempt - 1), this.options.maxDelay);
                // Add jitter (random 0-25% of delay)
                const jitter = Math.random() * delay * 0.25;
                const totalDelay = delay + jitter;
                logger_1.default.warn(`Retrying after error`, {
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
    isRetryable(error) {
        if (!error)
            return false;
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
            return (lowerMessage.includes('timeout') ||
                lowerMessage.includes('connection') ||
                lowerMessage.includes('network') ||
                lowerMessage.includes('unavailable'));
        }
        return false;
    }
    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.RetryHandler = RetryHandler;
// Export singleton instance
exports.defaultRetryHandler = new RetryHandler();
/**
 * Combined Circuit Breaker + Retry Pattern
 */
class ResilientExecutor {
    constructor(name, circuitOptions, retryOptions) {
        this.circuitBreaker = new CircuitBreaker(name, circuitOptions);
        this.retryHandler = new RetryHandler(retryOptions);
    }
    /**
     * Execute with circuit breaker and retry logic
     */
    async execute(fn) {
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
exports.ResilientExecutor = ResilientExecutor;
/**
 * Decorator for automatic circuit breaker and retry
 */
function Resilient(name, options) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const executor = new ResilientExecutor(`${target.constructor.name}.${propertyKey}`, options?.circuit, options?.retry);
        descriptor.value = async function (...args) {
            return executor.execute(() => originalMethod.apply(this, args));
        };
        return descriptor;
    };
}
//# sourceMappingURL=resilience.js.map
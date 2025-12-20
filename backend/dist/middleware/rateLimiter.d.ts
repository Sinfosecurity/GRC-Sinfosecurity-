/**
 * Advanced Rate Limiting Configuration
 * Per-user and per-IP rate limiting for different endpoint types
 */
export declare const rateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const authRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const mfaLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const passwordResetLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const uploadLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const reportLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const bulkOperationLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const ssoLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const strictLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rateLimiter.d.ts.map
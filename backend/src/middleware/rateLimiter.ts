/**
 * Advanced Rate Limiting Configuration
 * Per-user and per-IP rate limiting for different endpoint types
 */

import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// General API rate limiter
export const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        success: false,
        error: {
            message: 'Too many requests from this IP, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => req.path === '/health',
});

// Authentication rate limiter - 5 attempts per 15 minutes
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: {
            message: 'Too many login attempts, please try again after 15 minutes',
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
        },
    },
    skipSuccessfulRequests: true,
});

// MFA verification limiter - 5 attempts per 15 minutes
export const mfaLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: {
            message: 'Too many MFA verification attempts, please try again later',
            code: 'MFA_RATE_LIMIT_EXCEEDED',
        },
    },
    skipSuccessfulRequests: true,
});

// Password reset limiter - 3 per hour
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        error: {
            message: 'Too many password reset attempts, please try again after an hour',
            code: 'PASSWORD_RESET_LIMIT_EXCEEDED',
        },
    },
});

// File upload limiter - 20 per hour per user
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: {
            message: 'Upload limit exceeded, please try again later',
            code: 'UPLOAD_LIMIT_EXCEEDED',
        },
    },
    keyGenerator: (req: Request) => (req as any).user?.id || req.ip,
});

// Report generation limiter - 10 per hour per user
export const reportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: {
            message: 'Report generation limit exceeded, please try again later',
            code: 'REPORT_LIMIT_EXCEEDED',
        },
    },
    keyGenerator: (req: Request) => (req as any).user?.id || req.ip,
});

// Bulk operations limiter - 5 per hour per user
export const bulkOperationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: {
            message: 'Bulk operation limit exceeded, please try again later',
            code: 'BULK_OPERATION_LIMIT_EXCEEDED',
        },
    },
    keyGenerator: (req: Request) => (req as any).user?.id || req.ip,
});

// SSO callback limiter - 10 per 15 minutes
export const ssoLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: {
            message: 'Too many SSO attempts, please try again later',
            code: 'SSO_RATE_LIMIT_EXCEEDED',
        },
    },
});

// Strict limiter for sensitive operations - 3 per 15 minutes
export const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        error: {
            message: 'Rate limit exceeded for sensitive operation',
            code: 'STRICT_RATE_LIMIT_EXCEEDED',
        },
    },
    keyGenerator: (req: Request) => (req as any).user?.id || req.ip,
});

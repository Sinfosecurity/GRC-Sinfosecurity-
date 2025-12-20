"use strict";
/**
 * Advanced Rate Limiting Configuration
 * Per-user and per-IP rate limiting for different endpoint types
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.strictLimiter = exports.ssoLimiter = exports.bulkOperationLimiter = exports.reportLimiter = exports.uploadLimiter = exports.passwordResetLimiter = exports.mfaLimiter = exports.authRateLimiter = exports.rateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// General API rate limiter
exports.rateLimiter = (0, express_rate_limit_1.default)({
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
    skip: (req) => req.path === '/health',
});
// Authentication rate limiter - 5 attempts per 15 minutes
exports.authRateLimiter = (0, express_rate_limit_1.default)({
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
exports.mfaLimiter = (0, express_rate_limit_1.default)({
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
exports.passwordResetLimiter = (0, express_rate_limit_1.default)({
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
exports.uploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: {
            message: 'Upload limit exceeded, please try again later',
            code: 'UPLOAD_LIMIT_EXCEEDED',
        },
    },
    keyGenerator: (req) => req.user?.id || req.ip,
});
// Report generation limiter - 10 per hour per user
exports.reportLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: {
            message: 'Report generation limit exceeded, please try again later',
            code: 'REPORT_LIMIT_EXCEEDED',
        },
    },
    keyGenerator: (req) => req.user?.id || req.ip,
});
// Bulk operations limiter - 5 per hour per user
exports.bulkOperationLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: {
            message: 'Bulk operation limit exceeded, please try again later',
            code: 'BULK_OPERATION_LIMIT_EXCEEDED',
        },
    },
    keyGenerator: (req) => req.user?.id || req.ip,
});
// SSO callback limiter - 10 per 15 minutes
exports.ssoLimiter = (0, express_rate_limit_1.default)({
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
exports.strictLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        error: {
            message: 'Rate limit exceeded for sensitive operation',
            code: 'STRICT_RATE_LIMIT_EXCEEDED',
        },
    },
    keyGenerator: (req) => req.user?.id || req.ip,
});
//# sourceMappingURL=rateLimiter.js.map
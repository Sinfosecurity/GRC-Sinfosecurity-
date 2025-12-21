"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.TimeoutError = exports.ServiceUnavailableError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.ApiError = void 0;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
exports.handleUnhandledRejection = handleUnhandledRejection;
exports.handleUncaughtException = handleUncaughtException;
const logger_1 = __importDefault(require("../config/logger"));
const library_1 = require("@prisma/client/runtime/library");
/**
 * Enhanced error handler with better categorization and monitoring
 */
function errorHandler(err, req, res, next) {
    // Set default values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errorType = 'ServerError';
    let details = {};
    // Handle specific error types
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
        errorType = err.constructor.name;
        details = err.meta || {};
    }
    else if (err instanceof library_1.PrismaClientKnownRequestError) {
        // Prisma database errors
        const prismaError = handlePrismaError(err);
        statusCode = prismaError.statusCode;
        message = prismaError.message;
        errorType = 'DatabaseError';
        details = prismaError.details;
    }
    else if (err instanceof library_1.PrismaClientValidationError) {
        statusCode = 400;
        message = 'Invalid data provided';
        errorType = 'ValidationError';
    }
    else if (err.name === 'ValidationError') {
        statusCode = 400;
        message = err.message;
        errorType = 'ValidationError';
    }
    else if (err.name === 'UnauthorizedError' || statusCode === 401) {
        message = 'Authentication required';
        errorType = 'AuthenticationError';
    }
    else if (err.name === 'ForbiddenError' || statusCode === 403) {
        message = 'Insufficient permissions';
        errorType = 'AuthorizationError';
    }
    else if (err.code === 'ECONNREFUSED') {
        statusCode = 503;
        message = 'Service temporarily unavailable';
        errorType = 'ServiceUnavailable';
    }
    else if (err.code === 'ETIMEDOUT') {
        statusCode = 504;
        message = 'Request timeout';
        errorType = 'TimeoutError';
    }
    // Determine if error should be reported to monitoring
    const shouldReport = !err.isOperational || statusCode >= 500;
    // Log error with appropriate level
    const logData = {
        errorType,
        statusCode,
        message,
        code: err.code,
        url: req.url,
        method: req.method,
        userId: req.user?.id,
        organizationId: req.user?.organizationId,
        requestId: req.id,
        userAgent: req.get('user-agent'),
        ip: req.ip,
        ...details,
    };
    if (statusCode >= 500) {
        logger_1.default.error('Server Error:', { ...logData, stack: err.stack });
    }
    else if (statusCode >= 400) {
        logger_1.default.warn('Client Error:', logData);
    }
    else {
        logger_1.default.info('Request Error:', logData);
    }
    // Send error response
    const errorResponse = {
        success: false,
        error: {
            type: errorType,
            message,
            code: err.code,
            statusCode,
            timestamp: new Date().toISOString(),
            requestId: req.id,
        },
    };
    // Include details in development or for operational errors
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = err.stack;
        errorResponse.error.details = details;
    }
    else if (err.isOperational && Object.keys(details).length > 0) {
        errorResponse.error.details = details;
    }
    res.status(statusCode).json(errorResponse);
}
/**
 * Handle Prisma errors
 */
function handlePrismaError(error) {
    switch (error.code) {
        case 'P2002':
            // Unique constraint violation
            const field = error.meta?.target?.[0] || 'field';
            return {
                statusCode: 409,
                message: `A record with this ${field} already exists`,
                details: { field, constraint: 'unique' },
            };
        case 'P2003':
            // Foreign key constraint violation
            return {
                statusCode: 400,
                message: 'Invalid reference to related record',
                details: { constraint: 'foreign_key' },
            };
        case 'P2025':
            // Record not found
            return {
                statusCode: 404,
                message: 'Record not found',
                details: { constraint: 'not_found' },
            };
        case 'P2014':
            // Required relation violation
            return {
                statusCode: 400,
                message: 'Required relation missing',
                details: { constraint: 'required_relation' },
            };
        default:
            return {
                statusCode: 500,
                message: 'Database operation failed',
                details: { code: error.code },
            };
    }
}
/**
 * Enhanced API Error classes
 */
class ApiError extends Error {
    constructor(statusCode, message, isOperational = true, meta) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.meta = meta;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
class ValidationError extends ApiError {
    constructor(message, details) {
        super(400, message, true, details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends ApiError {
    constructor(resource = 'Resource') {
        super(404, `${resource} not found`, true);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends ApiError {
    constructor(message = 'Authentication required') {
        super(401, message, true);
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends ApiError {
    constructor(message = 'Insufficient permissions') {
        super(403, message, true);
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends ApiError {
    constructor(message, details) {
        super(409, message, true, details);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class ServiceUnavailableError extends ApiError {
    constructor(service = 'Service') {
        super(503, `${service} temporarily unavailable`, true);
        this.name = 'ServiceUnavailableError';
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
class TimeoutError extends ApiError {
    constructor(message = 'Request timeout') {
        super(504, message, true);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
/**
 * Async error wrapper - catches errors in async route handlers
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
}
/**
 * Unhandled rejection handler
 */
function handleUnhandledRejection() {
    process.on('unhandledRejection', (reason, promise) => {
        logger_1.default.error('Unhandled Rejection:', {
            reason: reason?.message || reason,
            stack: reason?.stack,
            promise,
        });
        // Don't exit process in production, but log critical error
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    });
}
/**
 * Uncaught exception handler
 */
function handleUncaughtException() {
    process.on('uncaughtException', (error) => {
        logger_1.default.error('Uncaught Exception:', {
            message: error.message,
            stack: error.stack,
        });
        // Exit process on uncaught exception
        process.exit(1);
    });
}
//# sourceMappingURL=errorHandler.js.map
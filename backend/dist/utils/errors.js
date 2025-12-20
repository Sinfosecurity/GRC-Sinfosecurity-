"use strict";
/**
 * Enhanced Error Classes
 * Specific error types for better error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessLogicError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.DatabaseError = exports.ValidationError = exports.ApiError = void 0;
exports.handlePrismaError = handlePrismaError;
exports.withErrorHandling = withErrorHandling;
class ApiError extends Error {
    constructor(statusCode, message, code, details) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.code = code || 'API_ERROR';
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
class ValidationError extends ApiError {
    constructor(message, details) {
        super(400, message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class DatabaseError extends ApiError {
    constructor(message, originalError) {
        super(500, message, 'DATABASE_ERROR', { originalError: originalError?.message });
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
class NotFoundError extends ApiError {
    constructor(resource, id) {
        const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
        super(404, message, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized access') {
        super(401, message, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends ApiError {
    constructor(message = 'Forbidden - insufficient permissions') {
        super(403, message, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends ApiError {
    constructor(message, details) {
        super(409, message, 'CONFLICT', details);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class BusinessLogicError extends ApiError {
    constructor(message, details) {
        super(422, message, 'BUSINESS_LOGIC_ERROR', details);
        this.name = 'BusinessLogicError';
    }
}
exports.BusinessLogicError = BusinessLogicError;
/**
 * Prisma Error Handler
 * Converts Prisma errors to user-friendly API errors
 */
function handlePrismaError(error) {
    // Prisma Client Known Request Error
    if (error.code) {
        switch (error.code) {
            case 'P2002':
                // Unique constraint violation
                const target = error.meta?.target || 'field';
                return new ConflictError(`A record with this ${target} already exists`, { field: target });
            case 'P2003':
                // Foreign key constraint violation
                return new ValidationError('Invalid reference - related record does not exist', { field: error.meta?.field_name });
            case 'P2025':
                // Record not found
                return new NotFoundError('Record');
            case 'P2014':
                // Required relation violation
                return new ValidationError('Cannot perform operation - related records exist', { relation: error.meta?.relation_name });
            case 'P2016':
                // Query interpretation error
                return new ValidationError('Invalid query parameters');
            case 'P1001':
                // Cannot reach database
                return new DatabaseError('Database connection failed');
            case 'P1002':
                // Database timeout
                return new DatabaseError('Database query timed out');
            case 'P1008':
                // Operations timed out
                return new DatabaseError('Database operation timed out');
            case 'P2024':
                // Connection pool timeout
                return new DatabaseError('Database connection pool exhausted');
            default:
                return new DatabaseError('Database operation failed', error);
        }
    }
    // Generic Prisma error
    if (error.name === 'PrismaClientValidationError') {
        return new ValidationError('Invalid data provided');
    }
    // Unknown error
    return new DatabaseError('An unexpected database error occurred', error);
}
/**
 * Service Error Wrapper
 * Wraps service methods with error handling
 */
function withErrorHandling(fn) {
    return (async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            // If it's already an ApiError, rethrow it
            if (error instanceof ApiError) {
                throw error;
            }
            // Handle Prisma errors
            if (error.code && error.code.startsWith('P')) {
                throw handlePrismaError(error);
            }
            // Generic error
            throw new ApiError(500, error.message || 'Internal server error');
        }
    });
}
//# sourceMappingURL=errors.js.map
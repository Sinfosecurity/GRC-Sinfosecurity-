/**
 * Enhanced Error Classes
 * Specific error types for better error handling
 */

export class ApiError extends Error {
    public statusCode: number;
    public code: string;
    public details?: any;

    constructor(statusCode: number, message: string, code?: string, details?: any) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.code = code || 'API_ERROR';
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends ApiError {
    constructor(message: string, details?: any) {
        super(400, message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

export class DatabaseError extends ApiError {
    constructor(message: string, originalError?: any) {
        super(500, message, 'DATABASE_ERROR', { originalError: originalError?.message });
        this.name = 'DatabaseError';
    }
}

export class NotFoundError extends ApiError {
    constructor(resource: string, id?: string) {
        const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
        super(404, message, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message: string = 'Unauthorized access') {
        super(401, message, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends ApiError {
    constructor(message: string = 'Forbidden - insufficient permissions') {
        super(403, message, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}

export class ConflictError extends ApiError {
    constructor(message: string, details?: any) {
        super(409, message, 'CONFLICT', details);
        this.name = 'ConflictError';
    }
}

export class BusinessLogicError extends ApiError {
    constructor(message: string, details?: any) {
        super(422, message, 'BUSINESS_LOGIC_ERROR', details);
        this.name = 'BusinessLogicError';
    }
}

/**
 * Prisma Error Handler
 * Converts Prisma errors to user-friendly API errors
 */
export function handlePrismaError(error: any): ApiError {
    // Prisma Client Known Request Error
    if (error.code) {
        switch (error.code) {
            case 'P2002':
                // Unique constraint violation
                const target = error.meta?.target || 'field';
                return new ConflictError(
                    `A record with this ${target} already exists`,
                    { field: target }
                );

            case 'P2003':
                // Foreign key constraint violation
                return new ValidationError(
                    'Invalid reference - related record does not exist',
                    { field: error.meta?.field_name }
                );

            case 'P2025':
                // Record not found
                return new NotFoundError('Record');

            case 'P2014':
                // Required relation violation
                return new ValidationError(
                    'Cannot perform operation - related records exist',
                    { relation: error.meta?.relation_name }
                );

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
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
    fn: T
): T {
    return (async (...args: Parameters<T>) => {
        try {
            return await fn(...args);
        } catch (error: any) {
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
    }) as T;
}

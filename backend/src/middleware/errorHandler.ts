import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';

export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
    code?: string;
    meta?: any;
}

/**
 * Enhanced error handler with better categorization and monitoring
 */
export function errorHandler(
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) {
    // Set default values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errorType = 'ServerError';
    let details: any = {};

    // Handle specific error types
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
        errorType = err.constructor.name;
        details = err.meta || {};
    } else if (err instanceof PrismaClientKnownRequestError) {
        // Prisma database errors
        const prismaError = handlePrismaError(err);
        statusCode = prismaError.statusCode;
        message = prismaError.message;
        errorType = 'DatabaseError';
        details = prismaError.details;
    } else if (err instanceof PrismaClientValidationError) {
        statusCode = 400;
        message = 'Invalid data provided';
        errorType = 'ValidationError';
    } else if (err.name === 'ValidationError') {
        statusCode = 400;
        message = err.message;
        errorType = 'ValidationError';
    } else if (err.name === 'UnauthorizedError' || statusCode === 401) {
        message = 'Authentication required';
        errorType = 'AuthenticationError';
    } else if (err.name === 'ForbiddenError' || statusCode === 403) {
        message = 'Insufficient permissions';
        errorType = 'AuthorizationError';
    } else if (err.code === 'ECONNREFUSED') {
        statusCode = 503;
        message = 'Service temporarily unavailable';
        errorType = 'ServiceUnavailable';
    } else if (err.code === 'ETIMEDOUT') {
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
        userId: (req as any).user?.id,
        organizationId: (req as any).user?.organizationId,
        requestId: (req as any).id,
        userAgent: req.get('user-agent'),
        ip: req.ip,
        ...details,
    };

    if (statusCode >= 500) {
        logger.error('Server Error:', { ...logData, stack: err.stack });
    } else if (statusCode >= 400) {
        logger.warn('Client Error:', logData);
    } else {
        logger.info('Request Error:', logData);
    }

    // Send error response
    const errorResponse: any = {
        success: false,
        error: {
            type: errorType,
            message,
            code: err.code,
            statusCode,
            timestamp: new Date().toISOString(),
            requestId: (req as any).id,
        },
    };

    // Include details in development or for operational errors
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = err.stack;
        errorResponse.error.details = details;
    } else if (err.isOperational && Object.keys(details).length > 0) {
        errorResponse.error.details = details;
    }

    res.status(statusCode).json(errorResponse);
}

/**
 * Handle Prisma errors
 */
function handlePrismaError(error: PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
    details: any;
} {
    switch (error.code) {
        case 'P2002':
            // Unique constraint violation
            const field = (error.meta?.target as string[])?.[0] || 'field';
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
export class ApiError extends Error implements AppError {
    statusCode: number;
    isOperational: boolean;
    code?: string;
    meta?: any;

    constructor(statusCode: number, message: string, isOperational = true, meta?: any) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.meta = meta;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends ApiError {
    constructor(message: string, details?: any) {
        super(400, message, true, details);
        this.name = 'ValidationError';
    }
}

export class NotFoundError extends ApiError {
    constructor(resource: string = 'Resource') {
        super(404, `${resource} not found`, true);
        this.name = 'NotFoundError';
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message: string = 'Authentication required') {
        super(401, message, true);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends ApiError {
    constructor(message: string = 'Insufficient permissions') {
        super(403, message, true);
        this.name = 'ForbiddenError';
    }
}

export class ConflictError extends ApiError {
    constructor(message: string, details?: any) {
        super(409, message, true, details);
        this.name = 'ConflictError';
    }
}

export class ServiceUnavailableError extends ApiError {
    constructor(service: string = 'Service') {
        super(503, `${service} temporarily unavailable`, true);
        this.name = 'ServiceUnavailableError';
    }
}

export class TimeoutError extends ApiError {
    constructor(message: string = 'Request timeout') {
        super(504, message, true);
        this.name = 'TimeoutError';
    }
}

/**
 * Async error wrapper - catches errors in async route handlers
 */
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
}

/**
 * Unhandled rejection handler
 */
export function handleUnhandledRejection() {
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
        logger.error('Unhandled Rejection:', {
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
export function handleUncaughtException() {
    process.on('uncaughtException', (error: Error) => {
        logger.error('Uncaught Exception:', {
            message: error.message,
            stack: error.stack,
        });
        // Exit process on uncaught exception
        process.exit(1);
    });
}

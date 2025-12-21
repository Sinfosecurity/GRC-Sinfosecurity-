import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
    code?: string;
    meta?: any;
}
/**
 * Enhanced error handler with better categorization and monitoring
 */
export declare function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction): void;
/**
 * Enhanced API Error classes
 */
export declare class ApiError extends Error implements AppError {
    statusCode: number;
    isOperational: boolean;
    code?: string;
    meta?: any;
    constructor(statusCode: number, message: string, isOperational?: boolean, meta?: any);
}
export declare class ValidationError extends ApiError {
    constructor(message: string, details?: any);
}
export declare class NotFoundError extends ApiError {
    constructor(resource?: string);
}
export declare class UnauthorizedError extends ApiError {
    constructor(message?: string);
}
export declare class ForbiddenError extends ApiError {
    constructor(message?: string);
}
export declare class ConflictError extends ApiError {
    constructor(message: string, details?: any);
}
export declare class ServiceUnavailableError extends ApiError {
    constructor(service?: string);
}
export declare class TimeoutError extends ApiError {
    constructor(message?: string);
}
/**
 * Async error wrapper - catches errors in async route handlers
 */
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * 404 Not Found handler
 */
export declare function notFoundHandler(req: Request, res: Response, next: NextFunction): void;
/**
 * Unhandled rejection handler
 */
export declare function handleUnhandledRejection(): void;
/**
 * Uncaught exception handler
 */
export declare function handleUncaughtException(): void;
//# sourceMappingURL=errorHandler.d.ts.map
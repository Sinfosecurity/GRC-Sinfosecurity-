/**
 * Enhanced Error Classes
 * Specific error types for better error handling
 */
export declare class ApiError extends Error {
    statusCode: number;
    code: string;
    details?: any;
    constructor(statusCode: number, message: string, code?: string, details?: any);
}
export declare class ValidationError extends ApiError {
    constructor(message: string, details?: any);
}
export declare class DatabaseError extends ApiError {
    constructor(message: string, originalError?: any);
}
export declare class NotFoundError extends ApiError {
    constructor(resource: string, id?: string);
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
export declare class BusinessLogicError extends ApiError {
    constructor(message: string, details?: any);
}
/**
 * Prisma Error Handler
 * Converts Prisma errors to user-friendly API errors
 */
export declare function handlePrismaError(error: any): ApiError;
/**
 * Service Error Wrapper
 * Wraps service methods with error handling
 */
export declare function withErrorHandling<T extends (...args: any[]) => Promise<any>>(fn: T): T;
//# sourceMappingURL=errors.d.ts.map
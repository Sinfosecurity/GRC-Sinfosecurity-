import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}
export declare function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction): void;
export declare class ApiError extends Error implements AppError {
    statusCode: number;
    isOperational: boolean;
    constructor(statusCode: number, message: string, isOperational?: boolean);
}
//# sourceMappingURL=errorHandler.d.ts.map
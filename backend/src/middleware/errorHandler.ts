import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}

export function errorHandler(
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Log error
    logger.error('Error:', {
        statusCode,
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
    });

    // Send response
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
}

export class ApiError extends Error implements AppError {
    statusCode: number;
    isOperational: boolean;

    constructor(statusCode: number, message: string, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

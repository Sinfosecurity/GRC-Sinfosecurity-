/**
 * Request/Response Logging Middleware
 * Comprehensive logging with request ID tracking
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export interface LoggingOptions {
    skipPaths?: string[];
    logBody?: boolean;
    logResponse?: boolean;
}

/**
 * Request ID middleware - adds unique ID to each request
 */
export const requestId = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Generate or use existing request ID
        const id = req.headers['x-request-id'] as string || uuidv4();
        
        (req as any).id = id;
        res.setHeader('X-Request-ID', id);
        
        next();
    };
};

/**
 * Request/Response logging middleware
 */
export const requestLogger = (options: LoggingOptions = {}) => {
    const {
        skipPaths = ['/health', '/favicon.ico'],
        logBody = false,
        logResponse = false,
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        // Skip logging for certain paths
        if (skipPaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        const startTime = Date.now();
        const requestId = (req as any).id;

        // Log incoming request
        const requestLog: any = {
            requestId,
            method: req.method,
            path: req.path,
            query: Object.keys(req.query).length > 0 ? req.query : undefined,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            userId: (req as any).user?.id,
            organizationId: (req as any).user?.organizationId,
        };

        // Optionally log request body (exclude sensitive fields)
        if (logBody && req.body && Object.keys(req.body).length > 0) {
            const sanitizedBody = { ...req.body };
            // Remove sensitive fields
            delete sanitizedBody.password;
            delete sanitizedBody.token;
            delete sanitizedBody.apiKey;
            requestLog.body = sanitizedBody;
        }

        logger.info('Incoming request', requestLog);

        // Capture response
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        let responseBody: any;

        res.json = function (body: any) {
            responseBody = body;
            return originalJson(body);
        };

        res.send = function (body: any) {
            if (!responseBody) {
                responseBody = body;
            }
            return originalSend(body);
        };

        // Log response when finished
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const { statusCode } = res;

            const responseLog: any = {
                requestId,
                method: req.method,
                path: req.path,
                statusCode,
                duration: `${duration}ms`,
                userId: (req as any).user?.id,
            };

            // Optionally log response body
            if (logResponse && responseBody) {
                try {
                    // Only log first 1000 chars of response
                    const bodyStr = typeof responseBody === 'string' 
                        ? responseBody 
                        : JSON.stringify(responseBody);
                    responseLog.responsePreview = bodyStr.substring(0, 1000);
                } catch (e) {
                    // Ignore serialization errors
                }
            }

            // Log at appropriate level based on status code
            if (statusCode >= 500) {
                logger.error('Request failed', responseLog);
            } else if (statusCode >= 400) {
                logger.warn('Request error', responseLog);
            } else if (duration > 5000) {
                logger.warn('Slow request', responseLog);
            } else {
                logger.info('Request completed', responseLog);
            }
        });

        next();
    };
};

/**
 * Performance monitoring middleware
 */
export const performanceMonitor = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        const startTime = process.hrtime.bigint();

        res.on('finish', () => {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000; // Convert to ms

            // Log slow requests
            if (duration > 1000) {
                logger.warn('Slow request detected', {
                    requestId: (req as any).id,
                    method: req.method,
                    path: req.path,
                    duration: `${duration.toFixed(2)}ms`,
                    statusCode: res.statusCode,
                });
            }

            // Add performance header (only if headers not sent)
            if (!res.headersSent) {
                res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
            }
        });

        next();
    };
};

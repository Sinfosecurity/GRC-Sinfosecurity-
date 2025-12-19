/**
 * Request Timeout Middleware
 * Prevents long-running requests from hanging
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export interface TimeoutOptions {
    timeout?: number; // milliseconds
    onTimeout?: (req: Request, res: Response) => void;
}

/**
 * Request timeout middleware factory
 * @param options - Timeout configuration
 */
export const requestTimeout = (options: TimeoutOptions = {}) => {
    const timeout = options.timeout || 30000; // 30 seconds default

    return (req: Request, res: Response, next: NextFunction) => {
        // Skip timeout for SSE/WebSocket connections
        if (req.headers.accept?.includes('text/event-stream') || req.headers.upgrade) {
            return next();
        }

        let isTimeout = false;

        // Set timeout
        const timer = setTimeout(() => {
            isTimeout = true;

            logger.warn('Request timeout', {
                method: req.method,
                path: req.path,
                timeout,
                ip: req.ip,
                userId: (req as any).user?.id,
            });

            if (!res.headersSent) {
                if (options.onTimeout) {
                    options.onTimeout(req, res);
                } else {
                    res.status(408).json({
                        success: false,
                        error: {
                            message: 'Request timeout - operation took too long',
                            code: 'REQUEST_TIMEOUT',
                            timeout,
                        },
                    });
                }
            }
        }, timeout);

        // Clear timeout when response finishes
        res.on('finish', () => {
            clearTimeout(timer);
        });

        res.on('close', () => {
            clearTimeout(timer);
        });

        // Override res.json to check for timeout
        const originalJson = res.json.bind(res);
        res.json = function (body: any) {
            if (isTimeout) {
                return res;
            }
            clearTimeout(timer);
            return originalJson(body);
        };

        // Override res.send to check for timeout
        const originalSend = res.send.bind(res);
        res.send = function (body: any) {
            if (isTimeout) {
                return res;
            }
            clearTimeout(timer);
            return originalSend(body);
        };

        next();
    };
};

/**
 * Different timeout configs for different route types
 */
export const standardTimeout = requestTimeout({ timeout: 30000 }); // 30s
export const longTimeout = requestTimeout({ timeout: 120000 }); // 2 minutes for reports/exports
export const shortTimeout = requestTimeout({ timeout: 10000 }); // 10s for quick operations

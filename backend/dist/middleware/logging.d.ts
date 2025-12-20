/**
 * Request/Response Logging Middleware
 * Comprehensive logging with request ID tracking
 */
import { Request, Response, NextFunction } from 'express';
export interface LoggingOptions {
    skipPaths?: string[];
    logBody?: boolean;
    logResponse?: boolean;
}
/**
 * Request ID middleware - adds unique ID to each request
 */
export declare const requestId: () => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Request/Response logging middleware
 */
export declare const requestLogger: (options?: LoggingOptions) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Performance monitoring middleware
 */
export declare const performanceMonitor: () => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=logging.d.ts.map
/**
 * Request Timeout Middleware
 * Prevents long-running requests from hanging
 */
import { Request, Response, NextFunction } from 'express';
export interface TimeoutOptions {
    timeout?: number;
    onTimeout?: (req: Request, res: Response) => void;
}
/**
 * Request timeout middleware factory
 * @param options - Timeout configuration
 */
export declare const requestTimeout: (options?: TimeoutOptions) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Different timeout configs for different route types
 */
export declare const standardTimeout: (req: Request, res: Response, next: NextFunction) => void;
export declare const longTimeout: (req: Request, res: Response, next: NextFunction) => void;
export declare const shortTimeout: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=timeout.d.ts.map
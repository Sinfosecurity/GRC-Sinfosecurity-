import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';
export declare const register: client.Registry<"text/plain; version=0.0.4; charset=utf-8">;
export declare const httpRequestDuration: client.Histogram<"route" | "method" | "status_code">;
export declare const httpRequestTotal: client.Counter<"route" | "method" | "status_code">;
export declare const activeConnections: client.Gauge<string>;
export declare const databaseQueryDuration: client.Histogram<"operation" | "model">;
export declare const databaseQueryTotal: client.Counter<"operation" | "model" | "status">;
export declare const cacheHitRate: client.Counter<"result">;
export declare const vendorAssessmentStatus: client.Gauge<"status">;
export declare const riskScore: client.Gauge<"type">;
export declare const authenticationAttempts: client.Counter<"result">;
export declare const apiErrors: client.Counter<"type" | "endpoint">;
/**
 * Middleware to track HTTP metrics
 */
export declare const metricsMiddleware: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Endpoint to expose metrics
 */
export declare const metricsEndpoint: (req: Request, res: Response) => Promise<void>;
/**
 * Helper function to time database queries
 */
export declare const timeDatabaseQuery: <T>(operation: string, model: string, queryFn: () => Promise<T>) => Promise<T>;
/**
 * Helper to track cache hits/misses
 */
export declare const trackCacheRequest: (hit: boolean) => void;
/**
 * Helper to track authentication attempts
 */
export declare const trackAuthAttempt: (success: boolean) => void;
//# sourceMappingURL=metrics.d.ts.map
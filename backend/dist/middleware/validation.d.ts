/**
 * Validation Middleware
 * Centralized request validation using Zod schemas
 */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
/**
 * Generic validation middleware factory
 * @param schema - Zod schema to validate against
 * @param source - Where to validate: 'body', 'query', 'params'
 */
export declare const validate: (schema: z.ZodSchema, source?: "body" | "query" | "params") => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Shorthand for body validation
 */
export declare const validateBody: (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Shorthand for query validation
 */
export declare const validateQuery: (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Shorthand for params validation
 */
export declare const validateParams: (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * UUID param validator
 */
export declare const validateUUID: (paramName?: string) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=validation.d.ts.map
/**
 * Validation Middleware
 * Centralized request validation using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ApiError } from '../middleware/errorHandler';

/**
 * Generic validation middleware factory
 * @param schema - Zod schema to validate against
 * @param source - Where to validate: 'body', 'query', 'params'
 */
export const validate = (
    schema: z.ZodSchema,
    source: 'body' | 'query' | 'params' = 'body'
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Validate the request data
            const validated = await schema.parseAsync(req[source]);
            
            // Replace request data with validated/sanitized data
            req[source] = validated;
            
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                // Format Zod validation errors
                const errors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code
                }));
                
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Validation failed',
                        code: 'VALIDATION_ERROR',
                        details: errors
                    }
                });
            }
            
            // Pass other errors to error handler
            next(error);
        }
    };
};

/**
 * Shorthand for body validation
 */
export const validateBody = (schema: z.ZodSchema) => validate(schema, 'body');

/**
 * Shorthand for query validation
 */
export const validateQuery = (schema: z.ZodSchema) => validate(schema, 'query');

/**
 * Shorthand for params validation
 */
export const validateParams = (schema: z.ZodSchema) => validate(schema, 'params');

/**
 * UUID param validator
 */
export const validateUUID = (paramName: string = 'id') => {
    const schema = z.object({
        [paramName]: z.string().uuid(`Invalid ${paramName}`)
    });
    return validateParams(schema);
};

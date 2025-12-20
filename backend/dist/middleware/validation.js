"use strict";
/**
 * Validation Middleware
 * Centralized request validation using Zod schemas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUUID = exports.validateParams = exports.validateQuery = exports.validateBody = exports.validate = void 0;
const zod_1 = require("zod");
/**
 * Generic validation middleware factory
 * @param schema - Zod schema to validate against
 * @param source - Where to validate: 'body', 'query', 'params'
 */
const validate = (schema, source = 'body') => {
    return async (req, res, next) => {
        try {
            // Validate the request data
            const validated = await schema.parseAsync(req[source]);
            // Replace request data with validated/sanitized data
            req[source] = validated;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
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
exports.validate = validate;
/**
 * Shorthand for body validation
 */
const validateBody = (schema) => (0, exports.validate)(schema, 'body');
exports.validateBody = validateBody;
/**
 * Shorthand for query validation
 */
const validateQuery = (schema) => (0, exports.validate)(schema, 'query');
exports.validateQuery = validateQuery;
/**
 * Shorthand for params validation
 */
const validateParams = (schema) => (0, exports.validate)(schema, 'params');
exports.validateParams = validateParams;
/**
 * UUID param validator
 */
const validateUUID = (paramName = 'id') => {
    const schema = zod_1.z.object({
        [paramName]: zod_1.z.string().uuid(`Invalid ${paramName}`)
    });
    return (0, exports.validateParams)(schema);
};
exports.validateUUID = validateUUID;
//# sourceMappingURL=validation.js.map
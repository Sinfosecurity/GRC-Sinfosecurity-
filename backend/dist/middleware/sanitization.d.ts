import { Request, Response, NextFunction } from 'express';
import { ValidationChain } from 'express-validator';
/**
 * Sanitize input data to prevent XSS and injection attacks
 */
export declare const sanitizeInput: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Validate common email format
 */
export declare const validateEmail: () => ValidationChain;
/**
 * Validate password strength
 */
export declare const validatePassword: () => ValidationChain;
/**
 * Validate UUID format
 */
export declare const validateUUID: (field: string) => ValidationChain;
/**
 * Check validation result and return errors
 */
export declare const checkValidation: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Prevent SQL injection by escaping dangerous characters
 */
export declare const escapeSQLInput: (input: string) => string;
/**
 * Validate and sanitize search query
 */
export declare const validateSearchQuery: () => ValidationChain;
/**
 * Rate limit validation for file uploads
 */
export declare const validateFileUpload: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
declare const _default: {
    sanitizeInput: (req: Request, res: Response, next: NextFunction) => void;
    validateEmail: () => ValidationChain;
    validatePassword: () => ValidationChain;
    validateUUID: (field: string) => ValidationChain;
    checkValidation: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    escapeSQLInput: (input: string) => string;
    validateSearchQuery: () => ValidationChain;
    validateFileUpload: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
};
export default _default;
//# sourceMappingURL=sanitization.d.ts.map
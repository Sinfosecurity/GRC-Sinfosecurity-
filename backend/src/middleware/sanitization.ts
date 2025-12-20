import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize input data to prevent XSS and injection attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }

    // Sanitize params
    if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params);
    }

    next();
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    if (typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }

    if (typeof obj === 'string') {
        // Remove HTML tags and sanitize
        return DOMPurify.sanitize(obj, { 
            ALLOWED_TAGS: [], 
            ALLOWED_ATTR: [] 
        }).trim();
    }

    return obj;
}

/**
 * Validate common email format
 */
export const validateEmail = (): ValidationChain => {
    return body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Invalid email format');
};

/**
 * Validate password strength
 */
export const validatePassword = (): ValidationChain => {
    return body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number and special character');
};

/**
 * Validate UUID format
 */
export const validateUUID = (field: string): ValidationChain => {
    return body(field)
        .isUUID()
        .withMessage(`${field} must be a valid UUID`);
};

/**
 * Check validation result and return errors
 */
export const checkValidation = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

/**
 * Prevent SQL injection by escaping dangerous characters
 */
export const escapeSQLInput = (input: string): string => {
    if (typeof input !== 'string') return input;
    return input.replace(/['";\\]/g, '\\$&');
};

/**
 * Validate and sanitize search query
 */
export const validateSearchQuery = (): ValidationChain => {
    return body('query')
        .isLength({ min: 1, max: 200 })
        .withMessage('Search query must be between 1 and 200 characters')
        .matches(/^[a-zA-Z0-9\s\-_.@]+$/)
        .withMessage('Search query contains invalid characters');
};

/**
 * Rate limit validation for file uploads
 */
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
    if (!req.file && !req.files) {
        return res.status(400).json({
            success: false,
            error: 'No file uploaded'
        });
    }

    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    const file = req.file || (Array.isArray(req.files) ? req.files[0] : Object.values(req.files || {})[0]);
    
    if (file && (file as any).size > maxSize) {
        return res.status(400).json({
            success: false,
            error: 'File size exceeds 10MB limit'
        });
    }

    // Validate file type
    const allowedMimeTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'text/plain',
        'text/csv'
    ];

    if (file && !(file as any).mimetype) {
        return res.status(400).json({
            success: false,
            error: 'Invalid file type'
        });
    }

    if (file && !allowedMimeTypes.includes((file as any).mimetype)) {
        return res.status(400).json({
            success: false,
            error: `File type not allowed. Allowed types: PDF, DOCX, XLSX, JPEG, PNG, TXT, CSV`
        });
    }

    next();
};

export default {
    sanitizeInput,
    validateEmail,
    validatePassword,
    validateUUID,
    checkValidation,
    escapeSQLInput,
    validateSearchQuery,
    validateFileUpload
};

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFileUpload = exports.validateSearchQuery = exports.escapeSQLInput = exports.checkValidation = exports.validateUUID = exports.validatePassword = exports.validateEmail = exports.sanitizeInput = void 0;
const express_validator_1 = require("express-validator");
const isomorphic_dompurify_1 = __importDefault(require("isomorphic-dompurify"));
/**
 * Sanitize input data to prevent XSS and injection attacks
 */
const sanitizeInput = (req, res, next) => {
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
exports.sanitizeInput = sanitizeInput;
/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    if (typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }
    if (typeof obj === 'string') {
        // Remove HTML tags and sanitize
        return isomorphic_dompurify_1.default.sanitize(obj, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: []
        }).trim();
    }
    return obj;
}
/**
 * Validate common email format
 */
const validateEmail = () => {
    return (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Invalid email format');
};
exports.validateEmail = validateEmail;
/**
 * Validate password strength
 */
const validatePassword = () => {
    return (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number and special character');
};
exports.validatePassword = validatePassword;
/**
 * Validate UUID format
 */
const validateUUID = (field) => {
    return (0, express_validator_1.body)(field)
        .isUUID()
        .withMessage(`${field} must be a valid UUID`);
};
exports.validateUUID = validateUUID;
/**
 * Check validation result and return errors
 */
const checkValidation = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};
exports.checkValidation = checkValidation;
/**
 * Prevent SQL injection by escaping dangerous characters
 */
const escapeSQLInput = (input) => {
    if (typeof input !== 'string')
        return input;
    return input.replace(/['";\\]/g, '\\$&');
};
exports.escapeSQLInput = escapeSQLInput;
/**
 * Validate and sanitize search query
 */
const validateSearchQuery = () => {
    return (0, express_validator_1.body)('query')
        .isLength({ min: 1, max: 200 })
        .withMessage('Search query must be between 1 and 200 characters')
        .matches(/^[a-zA-Z0-9\s\-_.@]+$/)
        .withMessage('Search query contains invalid characters');
};
exports.validateSearchQuery = validateSearchQuery;
/**
 * Rate limit validation for file uploads
 */
const validateFileUpload = (req, res, next) => {
    if (!req.file && !req.files) {
        return res.status(400).json({
            success: false,
            error: 'No file uploaded'
        });
    }
    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    const file = req.file || (Array.isArray(req.files) ? req.files[0] : Object.values(req.files || {})[0]);
    if (file && file.size > maxSize) {
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
    if (file && !file.mimetype) {
        return res.status(400).json({
            success: false,
            error: 'Invalid file type'
        });
    }
    if (file && !allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
            success: false,
            error: `File type not allowed. Allowed types: PDF, DOCX, XLSX, JPEG, PNG, TXT, CSV`
        });
    }
    next();
};
exports.validateFileUpload = validateFileUpload;
exports.default = {
    sanitizeInput: exports.sanitizeInput,
    validateEmail: exports.validateEmail,
    validatePassword: exports.validatePassword,
    validateUUID: exports.validateUUID,
    checkValidation: exports.checkValidation,
    escapeSQLInput: exports.escapeSQLInput,
    validateSearchQuery: exports.validateSearchQuery,
    validateFileUpload: exports.validateFileUpload
};
//# sourceMappingURL=sanitization.js.map
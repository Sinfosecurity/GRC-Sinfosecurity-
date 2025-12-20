"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
exports.authenticate = authenticate;
exports.authorize = authorize;
exports.requirePermission = requirePermission;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("./errorHandler");
const userService_1 = __importDefault(require("../services/userService"));
async function authenticate(req, res, next) {
    try {
        // Try JWT token from cookie first, then Authorization header
        let token = req.cookies?.token;
        if (!token) {
            token = req.headers.authorization?.replace('Bearer ', '');
        }
        if (token) {
            if (!process.env.JWT_SECRET) {
                throw new errorHandler_1.ApiError(500, 'JWT_SECRET not configured');
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const user = userService_1.default.getUserById(decoded.id);
            if (!user || user.status !== 'active') {
                throw new errorHandler_1.ApiError(401, 'Invalid or inactive user');
            }
            req.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            };
            // Update last login
            userService_1.default.updateLastLogin(user.id);
        }
        else {
            throw new errorHandler_1.ApiError(401, 'Authentication token required');
        }
        next();
    }
    catch (error) {
        next(new errorHandler_1.ApiError(401, 'Invalid or expired token'));
    }
}
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new errorHandler_1.ApiError(401, 'Authentication required'));
        }
        if (roles.length && !roles.includes(req.user.role)) {
            return next(new errorHandler_1.ApiError(403, 'Insufficient permissions'));
        }
        next();
    };
}
// Alias for backward compatibility
exports.requireRole = authorize;
/**
 * Check if user has required permission
 */
function requirePermission(...permissions) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new errorHandler_1.ApiError(401, 'Authentication required'));
        }
        const hasPermission = permissions.some(permission => userService_1.default.hasPermission(req.user.id, permission));
        if (!hasPermission) {
            return next(new errorHandler_1.ApiError(403, 'Forbidden: Insufficient permissions'));
        }
        next();
    };
}
/**
 * Optional authentication - attaches user if available but doesn't require it
 */
function optionalAuth(req, res, next) {
    const userId = req.headers['x-user-id'];
    if (userId) {
        const user = userService_1.default.getUserById(userId);
        if (user && user.status === 'active') {
            req.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            };
        }
    }
    next();
}
//# sourceMappingURL=auth.js.map
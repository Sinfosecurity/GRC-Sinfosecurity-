"use strict";
/**
 * Request/Response Logging Middleware
 * Comprehensive logging with request ID tracking
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceMonitor = exports.requestLogger = exports.requestId = void 0;
const uuid_1 = require("uuid");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Request ID middleware - adds unique ID to each request
 */
const requestId = () => {
    return (req, res, next) => {
        // Generate or use existing request ID
        const id = req.headers['x-request-id'] || (0, uuid_1.v4)();
        req.id = id;
        res.setHeader('X-Request-ID', id);
        next();
    };
};
exports.requestId = requestId;
/**
 * Request/Response logging middleware
 */
const requestLogger = (options = {}) => {
    const { skipPaths = ['/health', '/favicon.ico'], logBody = false, logResponse = false, } = options;
    return (req, res, next) => {
        // Skip logging for certain paths
        if (skipPaths.some(path => req.path.startsWith(path))) {
            return next();
        }
        const startTime = Date.now();
        const requestId = req.id;
        // Log incoming request
        const requestLog = {
            requestId,
            method: req.method,
            path: req.path,
            query: Object.keys(req.query).length > 0 ? req.query : undefined,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            userId: req.user?.id,
            organizationId: req.user?.organizationId,
        };
        // Optionally log request body (exclude sensitive fields)
        if (logBody && req.body && Object.keys(req.body).length > 0) {
            const sanitizedBody = { ...req.body };
            // Remove sensitive fields
            delete sanitizedBody.password;
            delete sanitizedBody.token;
            delete sanitizedBody.apiKey;
            requestLog.body = sanitizedBody;
        }
        logger_1.default.info('Incoming request', requestLog);
        // Capture response
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);
        let responseBody;
        res.json = function (body) {
            responseBody = body;
            return originalJson(body);
        };
        res.send = function (body) {
            if (!responseBody) {
                responseBody = body;
            }
            return originalSend(body);
        };
        // Log response when finished
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const { statusCode } = res;
            const responseLog = {
                requestId,
                method: req.method,
                path: req.path,
                statusCode,
                duration: `${duration}ms`,
                userId: req.user?.id,
            };
            // Optionally log response body
            if (logResponse && responseBody) {
                try {
                    // Only log first 1000 chars of response
                    const bodyStr = typeof responseBody === 'string'
                        ? responseBody
                        : JSON.stringify(responseBody);
                    responseLog.responsePreview = bodyStr.substring(0, 1000);
                }
                catch (e) {
                    // Ignore serialization errors
                }
            }
            // Log at appropriate level based on status code
            if (statusCode >= 500) {
                logger_1.default.error('Request failed', responseLog);
            }
            else if (statusCode >= 400) {
                logger_1.default.warn('Request error', responseLog);
            }
            else if (duration > 5000) {
                logger_1.default.warn('Slow request', responseLog);
            }
            else {
                logger_1.default.info('Request completed', responseLog);
            }
        });
        next();
    };
};
exports.requestLogger = requestLogger;
/**
 * Performance monitoring middleware
 */
const performanceMonitor = () => {
    return (req, res, next) => {
        const startTime = process.hrtime.bigint();
        res.on('finish', () => {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000; // Convert to ms
            // Log slow requests
            if (duration > 1000) {
                logger_1.default.warn('Slow request detected', {
                    requestId: req.id,
                    method: req.method,
                    path: req.path,
                    duration: `${duration.toFixed(2)}ms`,
                    statusCode: res.statusCode,
                });
            }
            // Add performance header (only if headers not sent)
            if (!res.headersSent) {
                res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
            }
        });
        next();
    };
};
exports.performanceMonitor = performanceMonitor;
//# sourceMappingURL=logging.js.map
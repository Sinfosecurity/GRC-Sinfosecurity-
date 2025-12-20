"use strict";
/**
 * Request Timeout Middleware
 * Prevents long-running requests from hanging
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shortTimeout = exports.longTimeout = exports.standardTimeout = exports.requestTimeout = void 0;
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Request timeout middleware factory
 * @param options - Timeout configuration
 */
const requestTimeout = (options = {}) => {
    const timeout = options.timeout || 30000; // 30 seconds default
    return (req, res, next) => {
        // Skip timeout for SSE/WebSocket connections
        if (req.headers.accept?.includes('text/event-stream') || req.headers.upgrade) {
            return next();
        }
        let isTimeout = false;
        // Set timeout
        const timer = setTimeout(() => {
            isTimeout = true;
            logger_1.default.warn('Request timeout', {
                method: req.method,
                path: req.path,
                timeout,
                ip: req.ip,
                userId: req.user?.id,
            });
            if (!res.headersSent) {
                if (options.onTimeout) {
                    options.onTimeout(req, res);
                }
                else {
                    res.status(408).json({
                        success: false,
                        error: {
                            message: 'Request timeout - operation took too long',
                            code: 'REQUEST_TIMEOUT',
                            timeout,
                        },
                    });
                }
            }
        }, timeout);
        // Clear timeout when response finishes
        res.on('finish', () => {
            clearTimeout(timer);
        });
        res.on('close', () => {
            clearTimeout(timer);
        });
        // Override res.json to check for timeout
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            if (isTimeout) {
                return res;
            }
            clearTimeout(timer);
            return originalJson(body);
        };
        // Override res.send to check for timeout
        const originalSend = res.send.bind(res);
        res.send = function (body) {
            if (isTimeout) {
                return res;
            }
            clearTimeout(timer);
            return originalSend(body);
        };
        next();
    };
};
exports.requestTimeout = requestTimeout;
/**
 * Different timeout configs for different route types
 */
exports.standardTimeout = (0, exports.requestTimeout)({ timeout: 30000 }); // 30s
exports.longTimeout = (0, exports.requestTimeout)({ timeout: 120000 }); // 2 minutes for reports/exports
exports.shortTimeout = (0, exports.requestTimeout)({ timeout: 10000 }); // 10s for quick operations
//# sourceMappingURL=timeout.js.map
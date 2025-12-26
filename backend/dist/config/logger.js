"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logDebug = exports.logInfo = exports.logError = void 0;
const winston_1 = __importDefault(require("winston"));
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
const logColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};
winston_1.default.addColors(logColors);
const format = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`));
const transports = [
    new winston_1.default.transports.Console(),
    new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
    }),
    new winston_1.default.transports.File({ filename: 'logs/all.log' }),
];
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels: logLevels,
    format,
    transports,
});
// Create error logger with additional context
const logError = (error, context) => {
    logger.error({
        message: error.message,
        stack: error.stack,
        ...context,
    });
};
exports.logError = logError;
// Create info logger with context
const logInfo = (message, context) => {
    logger.info({
        message,
        ...context,
    });
};
exports.logInfo = logInfo;
// Create debug logger
const logDebug = (message, data) => {
    logger.debug({
        message,
        data,
    });
};
exports.logDebug = logDebug;
exports.default = logger;
//# sourceMappingURL=logger.js.map
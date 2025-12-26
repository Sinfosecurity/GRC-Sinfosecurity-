import winston from 'winston';

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

winston.addColors(logColors);

const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
);

const transports = [
    new winston.transports.Console(),
    new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
    }),
    new winston.transports.File({ filename: 'logs/all.log' }),
];

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels: logLevels,
    format,
    transports,
});

// Create error logger with additional context
export const logError = (error: Error, context?: Record<string, any>) => {
    logger.error({
        message: error.message,
        stack: error.stack,
        ...context,
    });
};

// Create info logger with context
export const logInfo = (message: string, context?: Record<string, any>) => {
    logger.info({
        message,
        ...context,
    });
};

// Create debug logger
export const logDebug = (message: string, data?: any) => {
    logger.debug({
        message,
        data,
    });
};

export default logger;

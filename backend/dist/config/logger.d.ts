import winston from 'winston';
declare const logger: winston.Logger;
export declare const logError: (error: Error, context?: Record<string, any>) => void;
export declare const logInfo: (message: string, context?: Record<string, any>) => void;
export declare const logDebug: (message: string, data?: any) => void;
export default logger;
//# sourceMappingURL=logger.d.ts.map
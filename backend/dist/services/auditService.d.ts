import { Request, Response, NextFunction } from 'express';
interface AuditLog {
    id: string;
    timestamp: Date;
    userId: string;
    userName: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    resourceName?: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
    status: 'success' | 'failure';
    details?: string;
}
export declare class AuditService {
    /**
     * Log an audit event
     */
    static log(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog;
    /**
     * Get audit logs with optional filters
     */
    static getLogs(filters?: {
        userId?: string;
        action?: string;
        resourceType?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): AuditLog[];
    /**
     * Get logs for a specific resource
     */
    static getResourceHistory(resourceType: string, resourceId: string): AuditLog[];
    /**
     * Get recent activity (last 50 logs)
     */
    static getRecentActivity(limit?: number): AuditLog[];
    /**
     * Get statistics
     */
    static getStats(): {
        total: number;
        last24h: number;
        last7d: number;
        byAction: Record<string, number>;
        byResourceType: Record<string, number>;
        byUser: Record<string, number>;
    };
    private static groupBy;
}
/**
 * Middleware to automatically log HTTP requests
 */
export declare function auditMiddleware(action: string, resourceType: string): (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=auditService.d.ts.map
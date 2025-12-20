import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

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

// In-memory store for now (will be replaced with database)
const auditLogs: AuditLog[] = [];

export class AuditService {
    /**
     * Log an audit event
     */
    static log(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
        const auditEntry: AuditLog = {
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            ...entry
        };

        auditLogs.push(auditEntry);
        logger.info('[AUDIT]', JSON.stringify(auditEntry, null, 2));

        // Keep only last 1000 entries in memory
        if (auditLogs.length > 1000) {
            auditLogs.shift();
        }

        return auditEntry;
    }

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
    }): AuditLog[] {
        let filteredLogs = [...auditLogs];

        if (filters) {
            if (filters.userId) {
                filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
            }
            if (filters.action) {
                filteredLogs = filteredLogs.filter(log => log.action === filters.action);
            }
            if (filters.resourceType) {
                filteredLogs = filteredLogs.filter(log => log.resourceType === filters.resourceType);
            }
            if (filters.startDate) {
                filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
            }
            if (filters.endDate) {
                filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
            }
        }

        // Sort by timestamp descending (newest first)
        filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Apply limit
        const limit = filters?.limit || 100;
        return filteredLogs.slice(0, limit);
    }

    /**
     * Get logs for a specific resource
     */
    static getResourceHistory(resourceType: string, resourceId: string): AuditLog[] {
        return auditLogs
            .filter(log => log.resourceType === resourceType && log.resourceId === resourceId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    /**
     * Get recent activity (last 50 logs)
     */
    static getRecentActivity(limit: number = 50): AuditLog[] {
        return auditLogs
            .slice(-limit)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    /**
     * Get statistics
     */
    static getStats() {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const logs24h = auditLogs.filter(log => log.timestamp >= last24h);
        const logs7d = auditLogs.filter(log => log.timestamp >= last7d);

        return {
            total: auditLogs.length,
            last24h: logs24h.length,
            last7d: logs7d.length,
            byAction: this.groupBy(auditLogs, 'action'),
            byResourceType: this.groupBy(auditLogs, 'resourceType'),
            byUser: this.groupBy(auditLogs, 'userName'),
        };
    }

    private static groupBy(logs: AuditLog[], key: keyof AuditLog): Record<string, number> {
        return logs.reduce((acc, log) => {
            const value = String(log[key] || 'unknown');
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }
}

/**
 * Middleware to automatically log HTTP requests
 */
export function auditMiddleware(action: string, resourceType: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const originalJson = res.json.bind(res);

        res.json = function (body: any) {
            // Log after successful response
            if (res.statusCode >= 200 && res.statusCode < 300) {
                AuditService.log({
                    userId: (req as any).user?.id || 'anonymous',
                    userName: (req as any).user?.name || 'Anonymous User',
                    action,
                    resourceType,
                    resourceId: body?.id || req.params.id,
                    resourceName: body?.title || body?.name,
                    changes: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                    status: 'success',
                    details: `${req.method} ${req.path}`
                });
            }

            return originalJson(body);
        };

        next();
    };
}

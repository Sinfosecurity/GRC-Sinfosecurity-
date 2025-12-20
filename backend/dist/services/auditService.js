"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
exports.auditMiddleware = auditMiddleware;
const logger_1 = __importDefault(require("../config/logger"));
// In-memory store for now (will be replaced with database)
const auditLogs = [];
class AuditService {
    /**
     * Log an audit event
     */
    static log(entry) {
        const auditEntry = {
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            ...entry
        };
        auditLogs.push(auditEntry);
        logger_1.default.info('[AUDIT]', JSON.stringify(auditEntry, null, 2));
        // Keep only last 1000 entries in memory
        if (auditLogs.length > 1000) {
            auditLogs.shift();
        }
        return auditEntry;
    }
    /**
     * Get audit logs with optional filters
     */
    static getLogs(filters) {
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
                filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate);
            }
            if (filters.endDate) {
                filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate);
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
    static getResourceHistory(resourceType, resourceId) {
        return auditLogs
            .filter(log => log.resourceType === resourceType && log.resourceId === resourceId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    /**
     * Get recent activity (last 50 logs)
     */
    static getRecentActivity(limit = 50) {
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
    static groupBy(logs, key) {
        return logs.reduce((acc, log) => {
            const value = String(log[key] || 'unknown');
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {});
    }
}
exports.AuditService = AuditService;
/**
 * Middleware to automatically log HTTP requests
 */
function auditMiddleware(action, resourceType) {
    return (req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            // Log after successful response
            if (res.statusCode >= 200 && res.statusCode < 300) {
                AuditService.log({
                    userId: req.user?.id || 'anonymous',
                    userName: req.user?.name || 'Anonymous User',
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
//# sourceMappingURL=auditService.js.map
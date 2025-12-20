"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Evidence Collection Service
 * Automated collection and management of audit evidence
 */
const auditService_1 = require("./auditService");
class EvidenceCollectionService {
    constructor() {
        this.evidence = new Map();
        this.mappings = [];
        this.packages = new Map();
        this.collectionRules = new Map();
        this.initializeDemoData();
    }
    /**
     * Initialize demo data
     */
    initializeDemoData() {
        // Demo evidence
        const demoEvidence = [
            {
                id: 'ev_1',
                title: 'Access Control Policy Document',
                description: 'Current version of access control policy',
                type: 'policy',
                status: 'valid',
                collectedDate: new Date('2024-01-15'),
                expiryDate: new Date('2025-01-15'),
                controlIds: ['AC-01', 'AC-02'],
                requirementIds: ['ISO-A.9.1.1', 'SOC2-CC6.1'],
                frameworkIds: ['ISO 27001', 'SOC 2'],
                collectionMethod: 'manual',
                fileUrl: '/evidence/access-control-policy.pdf',
                fileSize: '2.4 MB',
                fileType: 'PDF',
                metadata: { version: '2.1', approvedBy: 'CISO' },
                collectedBy: 'admin@company.com',
                tags: ['policy', 'access-control', 'ISO-27001'],
            },
            {
                id: 'ev_2',
                title: 'Firewall Configuration Screenshot',
                description: 'Current firewall rules configuration',
                type: 'screenshot',
                status: 'valid',
                collectedDate: new Date(),
                controlIds: ['SC-07'],
                requirementIds: ['ISO-A.13.1.1'],
                frameworkIds: ['ISO 27001'],
                collectionMethod: 'automated',
                fileUrl: '/evidence/firewall-config.png',
                fileSize: '856 KB',
                fileType: 'PNG',
                metadata: { source: 'production-firewall', rules: 247 },
                collectedBy: 'system',
                tags: ['security', 'firewall', 'automated'],
            },
            {
                id: 'ev_3',
                title: 'Security Awareness Training Report',
                description: 'Q4 2024 training completion report',
                type: 'report',
                status: 'valid',
                collectedDate: new Date('2024-12-01'),
                controlIds: ['AT-02'],
                requirementIds: ['ISO-A.7.2.2'],
                frameworkIds: ['ISO 27001'],
                collectionMethod: 'automated',
                fileUrl: '/evidence/training-report-q4-2024.pdf',
                fileSize: '1.2 MB',
                fileType: 'PDF',
                metadata: { completionRate: '95%', totalEmployees: 120 },
                collectedBy: 'system',
                tags: ['training', 'awareness', 'quarterly'],
            },
            {
                id: 'ev_4',
                title: 'Backup Verification Log',
                description: 'Weekly backup verification results',
                type: 'log',
                status: 'valid',
                collectedDate: new Date(),
                controlIds: ['CP-09'],
                requirementIds: ['ISO-A.12.3.1'],
                frameworkIds: ['ISO 27001'],
                collectionMethod: 'automated',
                fileUrl: '/evidence/backup-verification.log',
                fileSize: '124 KB',
                fileType: 'LOG',
                metadata: { backupSize: '2.4 TB', duration: '4h 32m' },
                collectedBy: 'system',
                tags: ['backup', 'disaster-recovery', 'automated'],
            },
            {
                id: 'ev_5',
                title: 'SSL Certificate',
                description: 'Current SSL/TLS certificate for web application',
                type: 'certificate',
                status: 'valid',
                collectedDate: new Date('2024-06-01'),
                expiryDate: new Date('2025-06-01'),
                controlIds: ['SC-08'],
                requirementIds: ['ISO-A.10.1.1'],
                frameworkIds: ['ISO 27001', 'SOC 2'],
                collectionMethod: 'automated',
                fileUrl: '/evidence/ssl-cert.pem',
                fileSize: '4 KB',
                fileType: 'PEM',
                metadata: { issuer: 'DigiCert', algorithm: 'RSA-2048' },
                collectedBy: 'system',
                tags: ['certificate', 'encryption', 'web-security'],
            },
        ];
        demoEvidence.forEach(ev => {
            this.evidence.set(ev.id, ev);
        });
        // Demo collection rules
        const demoRules = [
            {
                id: 'rule_1',
                name: 'Daily Firewall Config',
                description: 'Collect firewall configuration daily',
                evidenceType: 'screenshot',
                controlIds: ['SC-07'],
                schedule: 'daily',
                enabled: true,
                lastCollection: new Date(),
                nextCollection: new Date(Date.now() + 86400000),
            },
            {
                id: 'rule_2',
                name: 'Weekly Backup Logs',
                description: 'Collect backup verification logs weekly',
                evidenceType: 'log',
                controlIds: ['CP-09'],
                schedule: 'weekly',
                enabled: true,
                lastCollection: new Date(Date.now() - 604800000),
                nextCollection: new Date(),
            },
            {
                id: 'rule_3',
                name: 'Quarterly Training Reports',
                description: 'Collect training completion reports quarterly',
                evidenceType: 'report',
                controlIds: ['AT-02'],
                schedule: 'quarterly',
                enabled: true,
                lastCollection: new Date('2024-12-01'),
                nextCollection: new Date('2025-03-01'),
            },
        ];
        demoRules.forEach(rule => {
            this.collectionRules.set(rule.id, rule);
        });
    }
    /**
     * Create new evidence manually
     */
    createEvidence(data) {
        const evidence = {
            id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            collectedDate: new Date(),
            status: 'pending',
            ...data,
        };
        this.evidence.set(evidence.id, evidence);
        auditService_1.AuditService.log({
            userId: data.collectedBy,
            userName: 'User',
            action: 'create_evidence',
            resourceType: 'Evidence',
            resourceId: evidence.id,
            resourceName: evidence.title,
            status: 'success',
            details: `Created evidence: ${evidence.title}`,
        });
        return evidence;
    }
    /**
     * Collect evidence automatically
     */
    async collectAutomatedEvidence(ruleId) {
        const rule = this.collectionRules.get(ruleId);
        if (!rule || !rule.enabled) {
            return null;
        }
        logger_1.default.info(`🤖 Auto-collecting evidence: ${rule.name}`);
        // Simulate evidence collection
        const evidence = {
            id: `ev_${Date.now()}_auto`,
            title: `${rule.name} - ${new Date().toLocaleDateString()}`,
            description: `Automatically collected: ${rule.description}`,
            type: rule.evidenceType,
            status: 'valid',
            collectedDate: new Date(),
            controlIds: rule.controlIds,
            requirementIds: [],
            frameworkIds: [],
            collectionMethod: 'automated',
            metadata: { ruleId: rule.id, automated: true },
            collectedBy: 'system',
            tags: ['automated', rule.schedule],
        };
        this.evidence.set(evidence.id, evidence);
        // Update rule
        rule.lastCollection = new Date();
        rule.nextCollection = this.calculateNextCollection(rule.schedule);
        return evidence;
    }
    /**
     * Calculate next collection date
     */
    calculateNextCollection(schedule) {
        const now = new Date();
        switch (schedule) {
            case 'daily':
                return new Date(now.getTime() + 86400000);
            case 'weekly':
                return new Date(now.getTime() + 604800000);
            case 'monthly':
                return new Date(now.setMonth(now.getMonth() + 1));
            case 'quarterly':
                return new Date(now.setMonth(now.getMonth() + 3));
            default:
                return new Date(now.getTime() + 86400000);
        }
    }
    /**
     * Get all evidence with filters
     */
    getEvidence(filters) {
        let filtered = Array.from(this.evidence.values());
        if (filters) {
            if (filters.status) {
                filtered = filtered.filter(ev => ev.status === filters.status);
            }
            if (filters.type) {
                filtered = filtered.filter(ev => ev.type === filters.type);
            }
            if (filters.controlId) {
                filtered = filtered.filter(ev => ev.controlIds.includes(filters.controlId));
            }
            if (filters.frameworkId) {
                filtered = filtered.filter(ev => ev.frameworkIds.includes(filters.frameworkId));
            }
            if (filters.collectionMethod) {
                filtered = filtered.filter(ev => ev.collectionMethod === filters.collectionMethod);
            }
            if (filters.tags && filters.tags.length > 0) {
                filtered = filtered.filter(ev => filters.tags.some(tag => ev.tags.includes(tag)));
            }
        }
        // Sort by collected date desc
        return filtered.sort((a, b) => b.collectedDate.getTime() - a.collectedDate.getTime());
    }
    /**
     * Get evidence by ID
     */
    getEvidenceById(id) {
        return this.evidence.get(id);
    }
    /**
     * Update evidence status
     */
    updateEvidenceStatus(id, status, reviewedBy) {
        const evidence = this.evidence.get(id);
        if (!evidence) {
            return null;
        }
        evidence.status = status;
        if (reviewedBy) {
            evidence.reviewedBy = reviewedBy;
            evidence.reviewedAt = new Date();
        }
        auditService_1.AuditService.log({
            userId: reviewedBy || 'system',
            userName: reviewedBy || 'System',
            action: 'update_evidence_status',
            resourceType: 'Evidence',
            resourceId: id,
            resourceName: evidence.title,
            changes: { status },
            status: 'success',
        });
        return evidence;
    }
    /**
     * Create evidence package for audit
     */
    createPackage(data) {
        const pkg = {
            id: `pkg_${Date.now()}`,
            createdAt: new Date(),
            status: 'draft',
            ...data,
        };
        this.packages.set(pkg.id, pkg);
        auditService_1.AuditService.log({
            userId: data.createdBy,
            userName: 'User',
            action: 'create_evidence_package',
            resourceType: 'EvidencePackage',
            resourceId: pkg.id,
            resourceName: pkg.name,
            status: 'success',
        });
        return pkg;
    }
    /**
     * Get evidence packages
     */
    getPackages() {
        return Array.from(this.packages.values());
    }
    /**
     * Get collection rules
     */
    getCollectionRules() {
        return Array.from(this.collectionRules.values());
    }
    /**
     * Get evidence statistics
     */
    getStatistics() {
        const allEvidence = Array.from(this.evidence.values());
        return {
            total: allEvidence.length,
            byStatus: {
                valid: allEvidence.filter(ev => ev.status === 'valid').length,
                expired: allEvidence.filter(ev => ev.status === 'expired').length,
                pending: allEvidence.filter(ev => ev.status === 'pending').length,
                rejected: allEvidence.filter(ev => ev.status === 'rejected').length,
            },
            byType: {
                screenshot: allEvidence.filter(ev => ev.type === 'screenshot').length,
                log: allEvidence.filter(ev => ev.type === 'log').length,
                document: allEvidence.filter(ev => ev.type === 'document').length,
                config: allEvidence.filter(ev => ev.type === 'config').length,
                report: allEvidence.filter(ev => ev.type === 'report').length,
                certificate: allEvidence.filter(ev => ev.type === 'certificate').length,
                policy: allEvidence.filter(ev => ev.type === 'policy').length,
                other: allEvidence.filter(ev => ev.type === 'other').length,
            },
            byMethod: {
                automated: allEvidence.filter(ev => ev.collectionMethod === 'automated').length,
                manual: allEvidence.filter(ev => ev.collectionMethod === 'manual').length,
            },
            expiringSoon: allEvidence.filter(ev => {
                if (!ev.expiryDate)
                    return false;
                const daysUntilExpiry = Math.ceil((ev.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
            }).length,
        };
    }
    /**
     * Run scheduled evidence collection
     * Should be called by cron job
     */
    async runScheduledCollection() {
        logger_1.default.info('📋 Running scheduled evidence collection...');
        const collected = [];
        const now = new Date();
        for (const [_, rule] of this.collectionRules) {
            if (rule.enabled && rule.nextCollection && rule.nextCollection <= now) {
                const evidence = await this.collectAutomatedEvidence(rule.id);
                if (evidence) {
                    collected.push(evidence);
                }
            }
        }
        logger_1.default.info(`✅ Collected ${collected.length} evidence items`);
        return collected;
    }
}
// Export singleton
exports.default = new EvidenceCollectionService();
//# sourceMappingURL=evidenceCollectionService.js.map
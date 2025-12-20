/**
 * Regulatory Change Management Service
 * Track regulatory changes, automated framework updates, compliance horizon scanning
 */

export interface RegulatoryChange {
    id: string;
    regulation: string;
    changeType: 'new_regulation' | 'amendment' | 'guidance' | 'enforcement';
    title: string;
    description: string;
    effectiveDate: Date;
    jurisdiction: string;
    impact: 'critical' | 'high' | 'medium' | 'low';
    affectedFrameworks: string[];
    status: 'monitoring' | 'assessing' | 'implementing' | 'completed';
    source: string;
    url?: string;
    publishedAt: Date;
}

export interface FrameworkUpdate {
    id: string;
    framework: string;
    version: string;
    updateType: 'major' | 'minor' | 'patch';
    changes: string[];
    releaseDate: Date;
    complianceDeadline?: Date;
    affectedControls: string[];
    status: 'available' | 'reviewing' | 'implementing' | 'completed';
}

export interface ComplianceAlert {
    id: string;
    type: 'regulatory_change' | 'framework_update' | 'deadline_approaching';
    title: string;
    description: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    actionRequired: boolean;
    deadline?: Date;
    createdAt: Date;
}

// In-memory storage
const regulatoryChanges = new Map<string, RegulatoryChange>();
const frameworkUpdates = new Map<string, FrameworkUpdate>();
const complianceAlerts = new Map<string, ComplianceAlert>();

// Initialize with demo data
regulatoryChanges.set('reg_1', {
    id: 'reg_1',
    regulation: 'GDPR',
    changeType: 'amendment',
    title: 'EU AI Act Compliance Requirements for GDPR',
    description: 'New requirements for AI systems processing personal data under GDPR',
    effectiveDate: new Date('2025-06-01'),
    jurisdiction: 'European Union',
    impact: 'high',
    affectedFrameworks: ['GDPR', 'ISO 27001', 'SOC 2'],
    status: 'monitoring',
    source: 'European Commission',
    url: 'https://eur-lex.europa.eu/ai-act',
    publishedAt: new Date('2024-12-01'),
});

frameworkUpdates.set('update_1', {
    id: 'update_1',
    framework: 'ISO 27001',
    version: '2022',
    updateType: 'major',
    changes: [
        'Updated Annex A with 93 controls (previously 114)',
        'New controls for cloud security',
        'Enhanced threat intelligence requirements',
        'Updated risk assessment methodology',
    ],
    releaseDate: new Date('2022-10-25'),
    complianceDeadline: new Date('2025-10-25'),
    affectedControls: ['A.5', 'A.8', 'A.12', 'A.17'],
    status: 'implementing',
});

class RegulatoryChangeService {
    private scanInterval: NodeJS.Timeout | null = null;

    /**
     * Start automated regulatory scanning
     */
    startRegulatoryScan() {
        if (this.scanInterval) return;

        logger.info('🔍 Starting regulatory change scanning...');

        // Initial scan
        this.performRegulatoryScan();

        // Schedule daily scans
        this.scanInterval = setInterval(() => {
            this.performRegulatoryScan();
        }, 24 * 60 * 60 * 1000); // Daily
    }

    /**
     * Stop regulatory scanning
     */
    stopRegulatoryScan() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
            logger.info('⏹️  Stopped regulatory scanning');
        }
    }

    /**
     * Perform regulatory scan
     */
    private async performRegulatoryScan() {
        logger.info('🔍 Scanning for regulatory changes...');

        // In production, integrate with:
        // - Thomson Reuters Regulatory Intelligence
        // - LexisNexis
        // - Compliance.ai
        // - Government RSS feeds

        // Simulate finding new regulatory changes
        if (Math.random() > 0.7) {
            this.createRegulatoryChange({
                regulation: ['GDPR', 'HIPAA', 'SOX', 'PCI DSS'][Math.floor(Math.random() * 4)],
                changeType: 'guidance',
                title: 'New Compliance Guidance Released',
                description: 'Updated guidance on implementation requirements',
                effectiveDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                jurisdiction: 'United States',
                impact: 'medium',
                affectedFrameworks: ['SOC 2', 'ISO 27001'],
                source: 'Regulatory Authority',
                publishedAt: new Date(),
            });
        }
    }

    /**
     * Create regulatory change entry
     */
    createRegulatoryChange(data: Omit<RegulatoryChange, 'id' | 'status'>): RegulatoryChange {
        const change: RegulatoryChange = {
            id: `reg_${Date.now()}`,
            ...data,
            status: 'monitoring',
        };

        regulatoryChanges.set(change.id, change);

        // Create compliance alert
        this.createComplianceAlert({
            type: 'regulatory_change',
            title: `New Regulatory Change: ${change.title}`,
            description: change.description,
            priority: change.impact === 'critical' ? 'urgent' : change.impact === 'high' ? 'high' : 'medium',
            actionRequired: true,
            deadline: change.effectiveDate,
        });

        logger.info(`📋 Regulatory change tracked: ${change.title}`);
        return change;
    }

    /**
     * Get all regulatory changes
     */
    getRegulatoryChanges(filters?: {
        status?: RegulatoryChange['status'];
        regulation?: string;
        impact?: RegulatoryChange['impact'];
    }): RegulatoryChange[] {
        let changes = Array.from(regulatoryChanges.values());

        if (filters?.status) {
            changes = changes.filter(c => c.status === filters.status);
        }
        if (filters?.regulation) {
            changes = changes.filter(c => c.regulation === filters.regulation);
        }
        if (filters?.impact) {
            changes = changes.filter(c => c.impact === filters.impact);
        }

        return changes.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    }

    /**
     * Update regulatory change status
     */
    updateChangeStatus(changeId: string, status: RegulatoryChange['status']): boolean {
        const change = regulatoryChanges.get(changeId);
        if (change) {
            change.status = status;
            return true;
        }
        return false;
    }

    /**
     * Create framework update
     */
    createFrameworkUpdate(data: Omit<FrameworkUpdate, 'id'>): FrameworkUpdate {
        const update: FrameworkUpdate = {
            id: `update_${Date.now()}`,
            ...data,
        };

        frameworkUpdates.set(update.id, update);

        // Create compliance alert
        this.createComplianceAlert({
            type: 'framework_update',
            title: `Framework Update Available: ${update.framework} ${update.version}`,
            description: `${update.changes.length} changes in this update`,
            priority: update.updateType === 'major' ? 'high' : 'medium',
            actionRequired: true,
            deadline: update.complianceDeadline,
        });

        logger.info(`🔄 Framework update tracked: ${update.framework} ${update.version}`);
        return update;
    }

    /**
     * Get framework updates
     */
    getFrameworkUpdates(framework?: string): FrameworkUpdate[] {
        let updates = Array.from(frameworkUpdates.values());

        if (framework) {
            updates = updates.filter(u => u.framework === framework);
        }

        return updates.sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime());
    }

    /**
     * Create compliance alert
     */
    private createComplianceAlert(data: Omit<ComplianceAlert, 'id' | 'createdAt'>): ComplianceAlert {
        const alert: ComplianceAlert = {
            id: `alert_${Date.now()}`,
            ...data,
            createdAt: new Date(),
        };

        complianceAlerts.set(alert.id, alert);
        return alert;
    }

    /**
     * Get compliance alerts
     */
    getComplianceAlerts(filters?: {
        type?: ComplianceAlert['type'];
        priority?: ComplianceAlert['priority'];
        actionRequired?: boolean;
    }): ComplianceAlert[] {
        let alerts = Array.from(complianceAlerts.values());

        if (filters?.type) {
            alerts = alerts.filter(a => a.type === filters.type);
        }
        if (filters?.priority) {
            alerts = alerts.filter(a => a.priority === filters.priority);
        }
        if (filters?.actionRequired !== undefined) {
            alerts = alerts.filter(a => a.actionRequired === filters.actionRequired);
        }

        return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * Get compliance horizon (upcoming changes)
     */
    getComplianceHorizon(days: number = 90): {
        upcomingChanges: RegulatoryChange[];
        upcomingDeadlines: FrameworkUpdate[];
        totalImpact: number;
    } {
        const now = new Date();
        const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        const upcomingChanges = Array.from(regulatoryChanges.values())
            .filter(c => c.effectiveDate >= now && c.effectiveDate <= futureDate)
            .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());

        const upcomingDeadlines = Array.from(frameworkUpdates.values())
            .filter(u => u.complianceDeadline && u.complianceDeadline >= now && u.complianceDeadline <= futureDate)
            .sort((a, b) => (a.complianceDeadline!.getTime() - b.complianceDeadline!.getTime()));

        return {
            upcomingChanges,
            upcomingDeadlines,
            totalImpact: upcomingChanges.length + upcomingDeadlines.length,
        };
    }

    /**
     * Get regulatory change statistics
     */
    getStats() {
        const allChanges = Array.from(regulatoryChanges.values());
        const allUpdates = Array.from(frameworkUpdates.values());

        return {
            totalChanges: allChanges.length,
            activeChanges: allChanges.filter(c => c.status === 'monitoring' || c.status === 'assessing').length,
            criticalChanges: allChanges.filter(c => c.impact === 'critical').length,
            totalUpdates: allUpdates.length,
            pendingUpdates: allUpdates.filter(u => u.status === 'available' || u.status === 'reviewing').length,
            upcomingIn30Days: this.getComplianceHorizon(30).totalImpact,
        };
    }
}

export default new RegulatoryChangeService();

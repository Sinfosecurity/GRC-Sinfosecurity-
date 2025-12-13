/**
 * Evidence Collection Service
 * Automated evidence collection and repository for audit proof
 */

export interface Evidence {
    id: string;
    type: 'screenshot' | 'document' | 'log' | 'config' | 'certificate' | 'report';
    title: string;
    description: string;
    controlId: string;
    frameworkRequirement: string;
    collectedAt: Date;
    collectionMethod: 'automated' | 'manual';
    fileUrl?: string;
    metadata: Record<string, any>;
    validUntil?: Date;
    tags: string[];
}

export interface EvidenceRequest {
    controlId: string;
    frameworkRequirement: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    collectionType: 'logs' | 'screenshots' | 'reports' | 'configs';
    enabled: boolean;
}

// In-memory storage
const evidenceRepository = new Map<string, Evidence>();
const evidenceRequests = new Map<string, EvidenceRequest>();

class EvidenceCollectionService {
    private collectionInterval: NodeJS.Timeout | null = null;

    /**
     * Start automated evidence collection
     */
    startAutomatedCollection() {
        if (this.collectionInterval) return;

        console.log('📸 Starting automated evidence collection...');

        // Initial collection
        this.performCollection();

        // Schedule recurring collection (every hour)
        this.collectionInterval = setInterval(() => {
            this.performCollection();
        }, 60 * 60 * 1000); // Every hour
    }

    /**
     * Stop automated collection
     */
    stopAutomatedCollection() {
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null;
            console.log('⏹️  Stopped evidence collection');
        }
    }

    /**
     * Perform evidence collection
     */
    private async performCollection() {
        console.log('📸 Collecting evidence...');

        const activeRequests = Array.from(evidenceRequests.values()).filter(r => r.enabled);

        for (const request of activeRequests) {
            await this.collectEvidence(request);
        }
    }

    /**
     * Collect evidence for a specific request
     */
    private async collectEvidence(request: EvidenceRequest) {
        // Simulate evidence collection
        const evidence: Evidence = {
            id: `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: this.getEvidenceType(request.collectionType),
            title: `${request.frameworkRequirement} - ${request.controlId}`,
            description: `Automated evidence collection for control ${request.controlId}`,
            controlId: request.controlId,
            frameworkRequirement: request.frameworkRequirement,
            collectedAt: new Date(),
            collectionMethod: 'automated',
            fileUrl: `/evidence/${request.controlId}/${Date.now()}.pdf`,
            metadata: {
                collectionType: request.collectionType,
                frequency: request.frequency,
                automated: true,
            },
            validUntil: this.calculateValidityDate(request.frequency),
            tags: [request.frameworkRequirement, request.controlId, 'automated'],
        };

        evidenceRepository.set(evidence.id, evidence);
        console.log(`✅ Evidence collected: ${evidence.title}`);
    }

    /**
     * Get evidence type from collection type
     */
    private getEvidenceType(collectionType: string): Evidence['type'] {
        const typeMap: Record<string, Evidence['type']> = {
            logs: 'log',
            screenshots: 'screenshot',
            reports: 'report',
            configs: 'config',
        };
        return typeMap[collectionType] || 'document';
    }

    /**
     * Calculate validity date based on frequency
     */
    private calculateValidityDate(frequency: string): Date {
        const now = new Date();
        const daysMap: Record<string, number> = {
            daily: 1,
            weekly: 7,
            monthly: 30,
            quarterly: 90,
        };
        const days = daysMap[frequency] || 30;
        return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }

    /**
     * Create evidence collection request
     */
    createEvidenceRequest(request: EvidenceRequest): string {
        const id = `req_${Date.now()}`;
        evidenceRequests.set(id, request);
        return id;
    }

    /**
     * Get all evidence for a control
     */
    getEvidenceForControl(controlId: string): Evidence[] {
        return Array.from(evidenceRepository.values())
            .filter(e => e.controlId === controlId)
            .sort((a, b) => b.collectedAt.getTime() - a.collectedAt.getTime());
    }

    /**
     * Get all evidence for a framework
     */
    getEvidenceForFramework(framework: string): Evidence[] {
        return Array.from(evidenceRepository.values())
            .filter(e => e.frameworkRequirement.includes(framework))
            .sort((a, b) => b.collectedAt.getTime() - a.collectedAt.getTime());
    }

    /**
     * Get evidence summary/statistics
     */
    getEvidenceSummary() {
        const allEvidence = Array.from(evidenceRepository.values());

        return {
            total: allEvidence.length,
            automated: allEvidence.filter(e => e.collectionMethod === 'automated').length,
            manual: allEvidence.filter(e => e.collectionMethod === 'manual').length,
            byType: {
                screenshot: allEvidence.filter(e => e.type === 'screenshot').length,
                document: allEvidence.filter(e => e.type === 'document').length,
                log: allEvidence.filter(e => e.type === 'log').length,
                config: allEvidence.filter(e => e.type === 'config').length,
                certificate: allEvidence.filter(e => e.type === 'certificate').length,
                report: allEvidence.filter(e => e.type === 'report').length,
            },
            recentlyCollected: allEvidence
                .sort((a, b) => b.collectedAt.getTime() - a.collectedAt.getTime())
                .slice(0, 10),
        };
    }

    /**
     * Upload manual evidence
     */
    uploadManualEvidence(data: {
        title: string;
        description: string;
        controlId: string;
        frameworkRequirement: string;
        type: Evidence['type'];
        fileUrl: string;
        tags?: string[];
    }): Evidence {
        const evidence: Evidence = {
            id: `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...data,
            collectedAt: new Date(),
            collectionMethod: 'manual',
            metadata: {},
            tags: data.tags || [],
        };

        evidenceRepository.set(evidence.id, evidence);
        return evidence;
    }

    /**
     * Get audit-ready evidence package
     */
    getAuditPackage(framework: string): {
        framework: string;
        generatedAt: Date;
        evidenceCount: number;
        controls: {
            controlId: string;
            evidenceCount: number;
            latestEvidence: Date;
            status: 'current' | 'expiring_soon' | 'expired';
        }[];
    } {
        const frameworkEvidence = this.getEvidenceForFramework(framework);
        const controlMap = new Map<string, Evidence[]>();

        // Group by control
        frameworkEvidence.forEach(e => {
            if (!controlMap.has(e.controlId)) {
                controlMap.set(e.controlId, []);
            }
            controlMap.get(e.controlId)!.push(e);
        });

        // Build controls summary
        const controls = Array.from(controlMap.entries()).map(([controlId, evidence]) => {
            const latest = evidence.sort((a, b) => b.collectedAt.getTime() - a.collectedAt.getTime())[0];
            const now = new Date();
            const validUntil = latest.validUntil || new Date(latest.collectedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

            let status: 'current' | 'expiring_soon' | 'expired' = 'current';
            if (validUntil < now) {
                status = 'expired';
            } else if (validUntil.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
                status = 'expiring_soon';
            }

            return {
                controlId,
                evidenceCount: evidence.length,
                latestEvidence: latest.collectedAt,
                status,
            };
        });

        return {
            framework,
            generatedAt: new Date(),
            evidenceCount: frameworkEvidence.length,
            controls,
        };
    }
}

export default new EvidenceCollectionService();

export type EvidenceType = 'screenshot' | 'log' | 'document' | 'config' | 'report' | 'certificate' | 'policy' | 'other';
export type EvidenceStatus = 'valid' | 'expired' | 'pending' | 'rejected';
export interface Evidence {
    id: string;
    title: string;
    description: string;
    type: EvidenceType;
    status: EvidenceStatus;
    collectedDate: Date;
    expiryDate?: Date;
    controlIds: string[];
    requirementIds: string[];
    frameworkIds: string[];
    collectionMethod: 'automated' | 'manual';
    fileUrl?: string;
    fileSize?: string;
    fileType?: string;
    metadata: Record<string, any>;
    collectedBy: string;
    reviewedBy?: string;
    reviewedAt?: Date;
    tags: string[];
}
export interface EvidenceMapping {
    evidenceId: string;
    controlId: string;
    requirementId: string;
    frameworkId: string;
    mandatory: boolean;
    frequency: 'continuous' | 'monthly' | 'quarterly' | 'annually';
}
export interface EvidencePackage {
    id: string;
    name: string;
    description: string;
    framework: string;
    audit: string;
    evidenceIds: string[];
    createdAt: Date;
    createdBy: string;
    status: 'draft' | 'ready' | 'submitted';
}
export interface EvidenceCollectionRule {
    id: string;
    name: string;
    description: string;
    evidenceType: EvidenceType;
    controlIds: string[];
    schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    enabled: boolean;
    lastCollection?: Date;
    nextCollection?: Date;
}
declare class EvidenceCollectionService {
    private evidence;
    private mappings;
    private packages;
    private collectionRules;
    constructor();
    /**
     * Initialize demo data
     */
    private initializeDemoData;
    /**
     * Create new evidence manually
     */
    createEvidence(data: Omit<Evidence, 'id' | 'collectedDate' | 'status'>): Evidence;
    /**
     * Collect evidence automatically
     */
    collectAutomatedEvidence(ruleId: string): Promise<Evidence | null>;
    /**
     * Calculate next collection date
     */
    private calculateNextCollection;
    /**
     * Get all evidence with filters
     */
    getEvidence(filters?: {
        status?: EvidenceStatus;
        type?: EvidenceType;
        controlId?: string;
        frameworkId?: string;
        tags?: string[];
        collectionMethod?: 'automated' | 'manual';
    }): Evidence[];
    /**
     * Get evidence by ID
     */
    getEvidenceById(id: string): Evidence | undefined;
    /**
     * Update evidence status
     */
    updateEvidenceStatus(id: string, status: EvidenceStatus, reviewedBy?: string): Evidence | null;
    /**
     * Create evidence package for audit
     */
    createPackage(data: Omit<EvidencePackage, 'id' | 'createdAt' | 'status'>): EvidencePackage;
    /**
     * Get evidence packages
     */
    getPackages(): EvidencePackage[];
    /**
     * Get collection rules
     */
    getCollectionRules(): EvidenceCollectionRule[];
    /**
     * Get evidence statistics
     */
    getStatistics(): {
        total: number;
        byStatus: {
            valid: number;
            expired: number;
            pending: number;
            rejected: number;
        };
        byType: {
            screenshot: number;
            log: number;
            document: number;
            config: number;
            report: number;
            certificate: number;
            policy: number;
            other: number;
        };
        byMethod: {
            automated: number;
            manual: number;
        };
        expiringSoon: number;
    };
    /**
     * Run scheduled evidence collection
     * Should be called by cron job
     */
    runScheduledCollection(): Promise<Evidence[]>;
}
declare const _default: EvidenceCollectionService;
export default _default;
//# sourceMappingURL=evidenceCollectionService.d.ts.map
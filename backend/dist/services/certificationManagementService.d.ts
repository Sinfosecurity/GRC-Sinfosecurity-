/**
import logger from '../config/logger';
 * Compliance Certification Management Service
 * Track certification timelines, readiness scoring, renewal alerts
 */
export interface Certification {
    id: string;
    framework: string;
    certificationBody: string;
    status: 'not_started' | 'in_progress' | 'certified' | 'expired';
    currentVersion?: string;
    targetDate?: Date;
    certifiedDate?: Date;
    expiryDate?: Date;
    renewalDate?: Date;
    readinessScore: number;
    gaps: string[];
    completedControls: number;
    totalControls: number;
    auditor?: {
        name: string;
        company: string;
        contactEmail: string;
    };
    certificateUrl?: string;
    reportUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CertificationMilestone {
    certificationId: string;
    milestone: string;
    dueDate: Date;
    status: 'pending' | 'in_progress' | 'completed' | 'overdue';
    completedDate?: Date;
    notes?: string;
}
export interface ReadinessCheck {
    id: string;
    certificationId: string;
    checkedAt: Date;
    score: number;
    findings: {
        category: string;
        issue: string;
        severity: 'high' | 'medium' | 'low';
    }[];
}
declare class CertificationManagementService {
    /**
     * Create certification tracking
     */
    createCertification(data: Omit<Certification, 'id' | 'createdAt' | 'updatedAt'>): Certification;
    /**
     * Get all certifications
     */
    getCertifications(status?: Certification['status']): Certification[];
    /**
     * Get certification by ID
     */
    getCertification(certId: string): Certification | undefined;
    /**
     * Update certification status
     */
    updateStatus(certId: string, status: Certification['status'], data?: {
        certifiedDate?: Date;
        expiryDate?: Date;
        certificateUrl?: string;
    }): boolean;
    /**
     * Update readiness score
     */
    updateReadiness(certId: string, score: number, gaps: string[]): boolean;
    /**
     * Add milestone
     */
    addMilestone(milestone: Omit<CertificationMilestone, 'status'>): CertificationMilestone;
    /**
     * Get milestones for certification
     */
    getMilestones(certId: string): CertificationMilestone[];
    /**
     * Update milestone status
     */
    updateMilestone(milestoneKey: string, status: CertificationMilestone['status']): boolean;
    /**
     * Get certifications needing renewal
     */
    getRenewalAlerts(daysAhead?: number): Certification[];
    /**
     * Get expired certifications
     */
    getExpiredCertifications(): Certification[];
    /**
     * Calculate overall readiness
     */
    getOverallReadiness(): {
        averageScore: number;
        certifications: {
            framework: string;
            score: number;
            status: string;
        }[];
        upcomingRenewals: number;
        activeCertifications: number;
    };
    /**
     * Get readiness history
     */
    getReadinessHistory(certId: string): ReadinessCheck[];
    /**
     * Get certification dashboard data
     */
    getDashboard(): {
        totalCertifications: number;
        certified: number;
        inProgress: number;
        expired: number;
        averageReadiness: number;
        upcomingRenewals: Certification[];
        upcomingMilestones: CertificationMilestone[];
    };
}
declare const _default: CertificationManagementService;
export default _default;
//# sourceMappingURL=certificationManagementService.d.ts.map
/**
import logger from '../config/logger';
 * Data Privacy Management Service
 * DSR portal, data mapping, Privacy Impact Assessments (PIA)
 */
export interface DataSubjectRequest {
    id: string;
    type: 'access' | 'deletion' | 'portability' | 'rectification' | 'restriction';
    subjectName: string;
    subjectEmail: string;
    requestDate: Date;
    dueDate: Date;
    status: 'submitted' | 'in_review' | 'in_progress' | 'completed' | 'rejected';
    assignedTo?: string;
    completedDate?: Date;
    notes?: string;
    attachments?: string[];
}
export interface DataMapping {
    id: string;
    dataCategory: string;
    personalData: string[];
    sensitiveData: string[];
    source: string;
    purpose: string;
    legalBasis: string;
    retention: string;
    location: string;
    thirdParties?: string[];
    lastUpdated: Date;
}
export interface PrivacyImpactAssessment {
    id: string;
    project: string;
    description: string;
    dataTypes: string[];
    riskLevel: 'low' | 'medium' | 'high';
    status: 'draft' | 'in_review' | 'approved' | 'rejected';
    assessor: string;
    assessmentDate: Date;
    findings: string[];
    mitigations: string[];
    approved?: boolean;
    approvedBy?: string;
    approvedDate?: Date;
}
declare class DataPrivacyService {
    /**
     * Submit Data Subject Request
     */
    submitDSR(data: Omit<DataSubjectRequest, 'id' | 'requestDate' | 'dueDate' | 'status'>): DataSubjectRequest;
    /**
     * Get all DSRs
     */
    getDSRs(filters?: {
        status?: DataSubjectRequest['status'];
        type?: DataSubjectRequest['type'];
    }): DataSubjectRequest[];
    /**
     * Update DSR status
     */
    updateDSRStatus(dsrId: string, status: DataSubjectRequest['status'], notes?: string): boolean;
    /**
     * Add data mapping
     */
    addDataMapping(data: Omit<DataMapping, 'id' | 'lastUpdated'>): DataMapping;
    /**
     * Get all data mappings
     */
    getDataMappings(): DataMapping[];
    /**
     * Create Privacy Impact Assessment
     */
    createPIA(data: Omit<PrivacyImpactAssessment, 'id' | 'status' | 'assessmentDate'>): PrivacyImpactAssessment;
    /**
     * Get all PIAs
     */
    getPIAs(status?: PrivacyImpactAssessment['status']): PrivacyImpactAssessment[];
    /**
     * Approve PIA
     */
    approvePIA(piaId: string, approver: string): boolean;
    /**
     * Get DSR statistics
     */
    getDSRStats(): {
        total: number;
        submitted: number;
        inProgress: number;
        completed: number;
        overdue: number;
        byType: {
            access: number;
            deletion: number;
            portability: number;
            rectification: number;
            restriction: number;
        };
    };
    /**
     * Get privacy compliance dashboard
     */
    getDashboard(): {
        dsrStats: {
            total: number;
            submitted: number;
            inProgress: number;
            completed: number;
            overdue: number;
            byType: {
                access: number;
                deletion: number;
                portability: number;
                rectification: number;
                restriction: number;
            };
        };
        dataMappings: number;
        piasPending: number;
        highRiskPIAs: number;
    };
}
declare const _default: DataPrivacyService;
export default _default;
//# sourceMappingURL=dataPrivacyService.d.ts.map
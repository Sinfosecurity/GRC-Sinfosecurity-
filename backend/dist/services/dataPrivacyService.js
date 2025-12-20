"use strict";
/**
import logger from '../config/logger';
 * Data Privacy Management Service
 * DSR portal, data mapping, Privacy Impact Assessments (PIA)
 */
Object.defineProperty(exports, "__esModule", { value: true });
// In-memory storage
const dsrRequests = new Map();
const dataMappings = new Map();
const piaAssessments = new Map();
// Initialize with demo data
dsrRequests.set('dsr_1', {
    id: 'dsr_1',
    type: 'access',
    subjectName: 'John Doe',
    subjectEmail: 'john.doe@example.com',
    requestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 30 days from request
    status: 'in_progress',
    assignedTo: 'privacy@sinfosecurity.com',
});
dataMappings.set('mapping_1', {
    id: 'mapping_1',
    dataCategory: 'Customer Data',
    personalData: ['Name', 'Email', 'Phone', 'Address'],
    sensitiveData: [],
    source: 'Customer Registration Form',
    purpose: 'Service Delivery',
    legalBasis: 'Contract',
    retention: '7 years after account closure',
    location: 'US-East (AWS)',
    thirdParties: ['Payment Processor', 'Email Service Provider'],
    lastUpdated: new Date(),
});
class DataPrivacyService {
    /**
     * Submit Data Subject Request
     */
    submitDSR(data) {
        const requestDate = new Date();
        const dueDate = new Date(requestDate);
        dueDate.setDate(dueDate.getDate() + 30); // GDPR: 30 days
        const dsr = {
            id: `dsr_${Date.now()}`,
            ...data,
            requestDate,
            dueDate,
            status: 'submitted',
        };
        dsrRequests.set(dsr.id, dsr);
        logger.info(`📨 DSR submitted: ${dsr.type} for ${dsr.subjectEmail}`);
        return dsr;
    }
    /**
     * Get all DSRs
     */
    getDSRs(filters) {
        let requests = Array.from(dsrRequests.values());
        if (filters?.status) {
            requests = requests.filter(r => r.status === filters.status);
        }
        if (filters?.type) {
            requests = requests.filter(r => r.type === filters.type);
        }
        return requests.sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());
    }
    /**
     * Update DSR status
     */
    updateDSRStatus(dsrId, status, notes) {
        const dsr = dsrRequests.get(dsrId);
        if (!dsr)
            return false;
        dsr.status = status;
        if (notes)
            dsr.notes = notes;
        if (status === 'completed') {
            dsr.completedDate = new Date();
        }
        return true;
    }
    /**
     * Add data mapping
     */
    addDataMapping(data) {
        const mapping = {
            id: `mapping_${Date.now()}`,
            ...data,
            lastUpdated: new Date(),
        };
        dataMappings.set(mapping.id, mapping);
        logger.info(`🗺️ Data mapping added: ${mapping.dataCategory}`);
        return mapping;
    }
    /**
     * Get all data mappings
     */
    getDataMappings() {
        return Array.from(dataMappings.values())
            .sort((a, b) => a.dataCategory.localeCompare(b.dataCategory));
    }
    /**
     * Create Privacy Impact Assessment
     */
    createPIA(data) {
        const pia = {
            id: `pia_${Date.now()}`,
            ...data,
            status: 'draft',
            assessmentDate: new Date(),
        };
        piaAssessments.set(pia.id, pia);
        logger.info(`🔒 PIA created: ${pia.project}`);
        return pia;
    }
    /**
     * Get all PIAs
     */
    getPIAs(status) {
        let assessments = Array.from(piaAssessments.values());
        if (status) {
            assessments = assessments.filter(p => p.status === status);
        }
        return assessments.sort((a, b) => b.assessmentDate.getTime() - a.assessmentDate.getTime());
    }
    /**
     * Approve PIA
     */
    approvePIA(piaId, approver) {
        const pia = piaAssessments.get(piaId);
        if (!pia)
            return false;
        pia.status = 'approved';
        pia.approved = true;
        pia.approvedBy = approver;
        pia.approvedDate = new Date();
        return true;
    }
    /**
     * Get DSR statistics
     */
    getDSRStats() {
        const allRequests = Array.from(dsrRequests.values());
        const now = new Date();
        return {
            total: allRequests.length,
            submitted: allRequests.filter(r => r.status === 'submitted').length,
            inProgress: allRequests.filter(r => r.status === 'in_progress').length,
            completed: allRequests.filter(r => r.status === 'completed').length,
            overdue: allRequests.filter(r => r.dueDate < now && r.status !== 'completed').length,
            byType: {
                access: allRequests.filter(r => r.type === 'access').length,
                deletion: allRequests.filter(r => r.type === 'deletion').length,
                portability: allRequests.filter(r => r.type === 'portability').length,
                rectification: allRequests.filter(r => r.type === 'rectification').length,
                restriction: allRequests.filter(r => r.type === 'restriction').length,
            },
        };
    }
    /**
     * Get privacy compliance dashboard
     */
    getDashboard() {
        return {
            dsrStats: this.getDSRStats(),
            dataMappings: dataMappings.size,
            piasPending: Array.from(piaAssessments.values()).filter(p => p.status === 'draft' || p.status === 'in_review').length,
            highRiskPIAs: Array.from(piaAssessments.values()).filter(p => p.riskLevel === 'high').length,
        };
    }
}
exports.default = new DataPrivacyService();
//# sourceMappingURL=dataPrivacyService.js.map
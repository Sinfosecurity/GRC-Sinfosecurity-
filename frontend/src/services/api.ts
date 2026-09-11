import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000/api/v1' : '');

if (!API_BASE_URL && import.meta.env.PROD) {
    console.error('VITE_API_URL is not configured');
}

const api = axios.create({
    baseURL: API_BASE_URL || '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

export class ApiClientError extends Error {
    status?: number;
    code?: string;
    constructor(message: string, status?: number, code?: string) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<{ error?: string | { message?: string }; message?: string }>) => {
        const status = error.response?.status;
        const payload = error.response?.data;
        const nestedError = payload?.error;
        const details = typeof nestedError === 'object' && nestedError
            ? (nestedError as { details?: Array<{ field?: string; message?: string }> }).details
            : undefined;
        const detailMessage = Array.isArray(details)
            ? details.map((item) => (item.field ? `${item.field}: ${item.message}` : item.message)).filter(Boolean).join('; ')
            : '';
        const message =
            detailMessage ||
            (typeof nestedError === 'string' ? nestedError : nestedError?.message) ||
            payload?.message ||
            (status === 403
                ? 'You do not have permission to perform this action.'
                : status === 404
                    ? 'The requested record was not found.'
                    : status === 429
                        ? 'Too many requests. Wait and try again.'
                        : status === 503
                            ? 'A required provider is unavailable.'
                            : !error.response
                                ? 'Network error. The server did not respond.'
                                : 'The request failed.');

        if (status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.startsWith('/login') && window.location.pathname !== '/') {
                window.location.href = '/login';
            }
        }

        return Promise.reject(new ApiClientError(message, status, error.code));
    }
);

export const authAPI = {
    login: (credentials: { email: string; password: string }) =>
        api.post('/auth/login', credentials),
    signup: (data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        organizationName: string;
        country?: string;
    }) => api.post('/auth/signup', data),
    logout: () => api.post('/auth/logout'),
    refreshToken: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
    getCurrentUser: () => api.get('/auth/me'),
    forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
    changePassword: (currentPassword: string, newPassword: string) =>
        api.post('/auth/change-password', { currentPassword, newPassword }),
    activate: (data: { token: string; password: string; firstName: string; lastName: string }) =>
        api.post('/auth/activate', data),
};

export const risksAPI = {
    getAll: () => api.get('/risks'),
    getById: (id: string) => api.get(`/risks/${id}`),
    create: (data: unknown) => api.post('/risks', data),
    update: (id: string, data: unknown) => api.put(`/risks/${id}`, data),
    delete: (id: string) => api.delete(`/risks/${id}`),
};

export const complianceAPI = {
    getFrameworks: () => api.get('/compliance'),
    runGapAnalysis: (frameworkId: string) => api.post('/compliance/gap-analysis', { frameworkId }),
};

export const controlsAPI = {
    getAll: () => api.get('/controls'),
    create: (data: unknown) => api.post('/controls', data),
};

export const incidentsAPI = {
    getAll: () => api.get('/incidents'),
    create: (data: unknown) => api.post('/incidents', data),
};

export const policiesAPI = {
    getAll: () => api.get('/policies'),
};

export const documentsAPI = {
    getAll: () => api.get('/documents'),
};

export const usersAPI = {
    getAll: () => api.get('/users'),
    invite: (data: { email: string; role: string }) => api.post('/users/invite', data),
    invitations: () => api.get('/users/invitations'),
    resendInvitation: (id: string) => api.post(`/users/invitations/${id}/resend`),
    revokeInvitation: (id: string) => api.post(`/users/invitations/${id}/revoke`),
    updateRole: (id: string, role: string) => api.patch(`/users/${id}/role`, { role }),
    setStatus: (id: string, status: 'ACTIVE' | 'DISABLED') => api.patch(`/users/${id}/status`, { status }),
};

export const auditAPI = {
    logs: (params?: Record<string, string | number | undefined>) => api.get('/audit/logs', { params }),
};

export const organizationAPI = {
    getCurrent: () => api.get('/organization/current'),
    update: (data: unknown) => api.patch('/organization/current', data),
};

export const systemAPI = {
    status: () => api.get('/system/status'),
};

export const billingAPI = {
    status: () => api.get('/billing/status'),
    checkout: (plan: string) => api.post('/billing/checkout', { plan }),
    portal: () => api.post('/billing/portal'),
};

export const aiAPI = {
    status: () => api.get('/ai/status'),
    analyze: (feature: string, context: string) => api.post('/ai/analyze', { feature, context }),
};

export const integrationAPI = {
    status: () => api.get('/integrations/status'),
    test: (provider: string) => api.post(`/integrations/${provider}/test`),
};

export const questionnaireAPI = {
    list: () => api.get('/questionnaires'),
};

export const exportAPI = {
    vendorsCsv: () => api.get('/exports/vendors.csv', { responseType: 'blob' }),
    findingsCsv: () => api.get('/exports/findings.csv', { responseType: 'blob' }),
    board: () => api.get('/exports/board.json'),
};

export const tprmAPI = {
    attention: () => api.get('/tprm/attention'),
    riskExplanation: (vendorId: string) => api.get(`/tprm/vendors/${vendorId}/risk-explanation`),
    scoreHistory: (vendorId: string) => api.get(`/tprm/vendors/${vendorId}/score-history`),
    recalculateRisk: (vendorId: string) => api.post(`/tprm/vendors/${vendorId}/recalculate-risk`),
    listBriefs: (vendorId?: string) => api.get('/tprm/decision-briefs', { params: vendorId ? { vendorId } : undefined }),
    generateBrief: (vendorId: string) => api.post(`/tprm/vendors/${vendorId}/decision-briefs`),
    getBrief: (briefId: string) => api.get(`/tprm/decision-briefs/${briefId}`),
    decideBrief: (briefId: string, data: unknown) => api.post(`/tprm/decision-briefs/${briefId}/decide`, data),
    downloadBriefPdf: (briefId: string) => api.get(`/tprm/decision-briefs/${briefId}/pdf`, { responseType: 'blob' }),
    evidence: (vendorId?: string) => api.get('/tprm/evidence', { params: vendorId ? { vendorId } : undefined }),
    uploadEvidence: (form: FormData) =>
        api.post('/tprm/evidence/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
    monitoringSignals: () => api.get('/tprm/monitoring/signals'),
    questionnaires: () => api.get('/tprm/questionnaires'),
    listAssessments: () => api.get('/tprm/assessments'),
    listVendorAssessments: (vendorId: string) => api.get(`/tprm/vendors/${vendorId}/assessments`),
    createAssessment: (vendorId: string, data: unknown) => api.post(`/tprm/vendors/${vendorId}/assessments`, data),
    getAssessment: (vendorId: string, assessmentId: string) =>
        api.get(`/tprm/vendors/${vendorId}/assessments/${assessmentId}`),
    submitAssessmentResponse: (vendorId: string, assessmentId: string, data: unknown) =>
        api.post(`/tprm/vendors/${vendorId}/assessments/${assessmentId}/responses`, data),
    completeAssessment: (vendorId: string, assessmentId: string) =>
        api.post(`/tprm/vendors/${vendorId}/assessments/${assessmentId}/complete`),
    listFindings: (params?: unknown) => api.get('/tprm/findings', { params }),
    createFinding: (vendorId: string, data: unknown) => api.post(`/tprm/vendors/${vendorId}/findings`, data),
    updateFindingCap: (issueId: string, data: unknown) => api.post(`/tprm/findings/${issueId}/cap`, data),
    validateFinding: (issueId: string, data: unknown) => api.post(`/tprm/findings/${issueId}/validate`, data),
    closeFinding: (issueId: string, data: unknown) => api.post(`/tprm/findings/${issueId}/close`, data),
    scoringMethodology: () => api.get('/tprm/scoring-methodology'),
    publishScoringMethodology: (data: unknown) => api.put('/tprm/scoring-methodology', data),
    downloadExecutivePdf: (params?: unknown) => api.get('/tprm/reports/executive.pdf', { responseType: 'blob', params }),
    downloadScorecardPdf: (vendorId: string) =>
        api.get(`/tprm/reports/vendors/${vendorId}/scorecard.pdf`, { responseType: 'blob' }),
    downloadAssessmentPdf: (assessmentId: string) =>
        api.get(`/tprm/reports/assessments/${assessmentId}/pdf`, { responseType: 'blob' }),
    downloadFindings: (format: 'pdf' | 'csv' | 'xlsx', params?: unknown) =>
        api.get(`/tprm/reports/findings.${format}`, { responseType: 'blob', params }),
    downloadMonitoring: (format: 'pdf' | 'csv', params?: unknown) =>
        api.get(`/tprm/reports/monitoring.${format}`, { responseType: 'blob', params }),
    downloadBoard: (format: 'pdf' | 'pptx', params?: unknown) =>
        api.get(`/tprm/reports/board.${format}`, { responseType: 'blob', params }),
};

export const vendorAPI = {
    getAll: (filters?: unknown) => api.get('/vendors', { params: filters }),
    getById: (id: string) => api.get(`/vendors/${id}`),
    create: (data: unknown) => api.post('/vendors', data),
    update: (id: string, data: unknown) => api.put(`/vendors/${id}`, data),
    delete: (id: string) => api.delete(`/vendors/${id}`),
    getStatistics: () => api.get('/vendors/statistics'),
    getRequiringAttention: () => api.get('/vendors/attention'),
    offboard: (id: string, data: unknown) => api.post(`/vendors/${id}/offboard`, data),
    getAssessments: (vendorId: string) => api.get(`/tprm/vendors/${vendorId}/assessments`),
    createAssessment: (vendorId: string, data: unknown) => api.post(`/tprm/vendors/${vendorId}/assessments`, data),
    getAssessmentById: (vendorId: string, assessmentId: string) =>
        api.get(`/tprm/vendors/${vendorId}/assessments/${assessmentId}`),
    submitResponse: (vendorId: string, assessmentId: string, data: unknown) =>
        api.post(`/tprm/vendors/${vendorId}/assessments/${assessmentId}/responses`, data),
    completeAssessment: (vendorId: string, assessmentId: string) =>
        api.post(`/tprm/vendors/${vendorId}/assessments/${assessmentId}/complete`),
    getContracts: (vendorId: string) => api.get(`/vendors/${vendorId}/contracts`),
    createContract: (vendorId: string, data: unknown) => api.post(`/vendors/${vendorId}/contracts`, data),
    getIssues: (vendorId: string) => api.get(`/vendors/${vendorId}/issues`),
    createIssue: (vendorId: string, data: unknown) => api.post(`/vendors/${vendorId}/issues`, data),
    getMonitoring: (vendorId: string) => api.get(`/vendors/${vendorId}/monitoring`),
    getRiskSummary: (vendorId: string) => api.get(`/vendors/${vendorId}/ai/risk-summary`),
    analyzeAssessment: (vendorId: string, assessmentId: string) =>
        api.get(`/vendors/${vendorId}/ai/assessment-analysis/${assessmentId}`),
    reviewContract: (vendorId: string, contractId: string) =>
        api.get(`/vendors/${vendorId}/ai/contract-review/${contractId}`),
    generateAuditPackage: (vendorId: string) => api.get(`/vendors/${vendorId}/ai/audit-package`),
    getExecutiveDashboard: () => api.get('/vendors/reports/executive-dashboard'),
    getRiskHeatmap: () => api.get('/vendors/reports/risk-heatmap'),
    getVendorScorecard: (vendorId: string) => api.get(`/vendors/${vendorId}/reports/scorecard`),
    getTrendAnalysis: (months?: number) => api.get('/vendors/reports/trends', { params: { months } }),
    exportBoardReport: (format: string) => api.get('/vendors/reports/board-report', { params: { format } }),
    getContractById: (vendorId: string, contractId: string) =>
        api.get(`/vendors/${vendorId}/contracts/${contractId}`),
    updateContract: (vendorId: string, contractId: string, data: unknown) =>
        api.put(`/vendors/${vendorId}/contracts/${contractId}`, data),
    trackSLA: (vendorId: string, contractId: string, data: unknown) =>
        api.post(`/vendors/${vendorId}/contracts/${contractId}/sla`, data),
    getExpiringContracts: (days?: number) => api.get('/vendors/contracts/expiring', { params: { days } }),
    getIssueById: (vendorId: string, issueId: string) => api.get(`/vendors/${vendorId}/issues/${issueId}`),
    updateIssue: (vendorId: string, issueId: string, data: unknown) =>
        api.put(`/vendors/${vendorId}/issues/${issueId}`, data),
    submitCAP: (vendorId: string, issueId: string, data: unknown) =>
        api.post(`/vendors/${vendorId}/issues/${issueId}/corrective-action`, data),
    validateRemediation: (vendorId: string, issueId: string, data: unknown) =>
        api.post(`/vendors/${vendorId}/issues/${issueId}/validate`, data),
    recordSignal: (vendorId: string, data: unknown) => api.post(`/vendors/${vendorId}/monitoring`, data),
};

export const healthCheck = async () => {
    if (!API_BASE_URL && import.meta.env.PROD) {
        throw new ApiClientError('API URL is not configured', 503, 'NOT_CONFIGURED');
    }
    const baseUrl = API_BASE_URL || 'http://localhost:4000/api/v1';
    const healthUrl = baseUrl.replace('/api/v1', '/health');
    const response = await axios.get(healthUrl, { timeout: 4000 });
    return response.data;
};

export default api;

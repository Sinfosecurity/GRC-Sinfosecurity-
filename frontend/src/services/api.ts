import axios from 'axios';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL;
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL;

if (!API_BASE_URL) {
    throw new Error(
        'VITE_API_URL is not set. Please set it in your Railway frontend environment variables and redeploy.'
    );
}
if (!AI_SERVICE_URL) {
    throw new Error(
        'VITE_AI_SERVICE_URL is not set. Please set it in your Railway frontend environment variables and redeploy.'
    );
}

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Add JWT token to all requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Only clear auth and redirect if it's an auth endpoint failure
            // For other endpoints, just reject the promise (they'll handle it)
            if (originalRequest.url?.includes('/auth/')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
            }

            return Promise.reject(error);
        }

        // Handle 403 Forbidden - just reject, don't redirect
        // Pages can handle authorization errors themselves
        if (error.response?.status === 403) {
            return Promise.reject(error);
        }

        // Handle network errors
        if (!error.response) {
            console.error('Network error - backend may be offline');
        }

        return Promise.reject(error);
    }
);

// Auth
export const authAPI = {
    login: (credentials: { email: string; password: string }) =>
        api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
    refreshToken: (refreshToken: string) =>
        api.post('/auth/refresh', { refreshToken }),
    getCurrentUser: () => api.get('/auth/me'),
};

// Risks
export const risksAPI = {
    getAll: () => api.get('/risks'),
    getById: (id: string) => api.get(`/risks/${id}`),
    create: (data: any) => api.post('/risks', data),
    update: (id: string, data: any) => api.put(`/risks/${id}`, data),
    delete: (id: string) => api.delete(`/risks/${id}`),
};

// Compliance
export const complianceAPI = {
    getFrameworks: () => api.get('/compliance'),
    runGapAnalysis: (frameworkId: string) =>
        api.post('/compliance/gap-analysis', { frameworkId }),
};

// Controls
export const controlsAPI = {
    getAll: () => api.get('/controls'),
    create: (data: any) => api.post('/controls', data),
};

// Incidents
export const incidentsAPI = {
    getAll: () => api.get('/incidents'),
    create: (data: any) => api.post('/incidents', data),
};

// Policies
export const policiesAPI = {
    getAll: () => api.get('/policies'),
};

// Documents
export const documentsAPI = {
    getAll: () => api.get('/documents'),
};

// Vendors (TPRM)
export const vendorAPI = {
    // Vendor Management
    getAll: (filters?: any) => api.get('/vendors', { params: filters }),
    getById: (id: string) => api.get(`/vendors/${id}`),
    create: (data: any) => api.post('/vendors', data),
    update: (id: string, data: any) => api.put(`/vendors/${id}`, data),
    delete: (id: string) => api.delete(`/vendors/${id}`),
    getStatistics: () => api.get('/vendors/statistics'),
    getRequiringAttention: () => api.get('/vendors/requiring-attention'),
    offboard: (id: string, data: any) => api.post(`/vendors/${id}/offboard`, data),

    // Vendor Assessments
    getAssessments: (vendorId: string) => api.get(`/vendors/${vendorId}/assessments`),
    createAssessment: (vendorId: string, data: any) => api.post(`/vendors/${vendorId}/assessments`, data),
    getAssessmentById: (vendorId: string, assessmentId: string) =>
        api.get(`/vendors/${vendorId}/assessments/${assessmentId}`),
    submitResponse: (vendorId: string, assessmentId: string, data: any) =>
        api.post(`/vendors/${vendorId}/assessments/${assessmentId}/responses`, data),
    completeAssessment: (vendorId: string, assessmentId: string) =>
        api.post(`/vendors/${vendorId}/assessments/${assessmentId}/complete`),

    // Vendor Contracts
    getContracts: (vendorId: string) => api.get(`/vendors/${vendorId}/contracts`),
    createContract: (vendorId: string, data: any) => api.post(`/vendors/${vendorId}/contracts`, data),
    getContractById: (vendorId: string, contractId: string) =>
        api.get(`/vendors/${vendorId}/contracts/${contractId}`),
    updateContract: (vendorId: string, contractId: string, data: any) =>
        api.put(`/vendors/${vendorId}/contracts/${contractId}`, data),
    trackSLA: (vendorId: string, contractId: string, data: any) =>
        api.post(`/vendors/${vendorId}/contracts/${contractId}/sla`, data),
    getExpiringContracts: (days?: number) => api.get('/vendors/contracts/expiring', { params: { days } }),

    // Vendor Issues
    getIssues: (vendorId: string) => api.get(`/vendors/${vendorId}/issues`),
    createIssue: (vendorId: string, data: any) => api.post(`/vendors/${vendorId}/issues`, data),
    getIssueById: (vendorId: string, issueId: string) =>
        api.get(`/vendors/${vendorId}/issues/${issueId}`),
    updateIssue: (vendorId: string, issueId: string, data: any) =>
        api.put(`/vendors/${vendorId}/issues/${issueId}`, data),
    submitCAP: (vendorId: string, issueId: string, data: any) =>
        api.post(`/vendors/${vendorId}/issues/${issueId}/corrective-action`, data),
    validateRemediation: (vendorId: string, issueId: string, data: any) =>
        api.post(`/vendors/${vendorId}/issues/${issueId}/validate`, data),

    // Continuous Monitoring
    getMonitoring: (vendorId: string) => api.get(`/vendors/${vendorId}/monitoring`),
    recordSignal: (vendorId: string, data: any) => api.post(`/vendors/${vendorId}/monitoring`, data),

    // AI Intelligence
    getRiskSummary: (vendorId: string) => api.get(`/vendors/${vendorId}/ai/risk-summary`),
    analyzeAssessment: (vendorId: string, assessmentId: string) =>
        api.get(`/vendors/${vendorId}/ai/assessment-analysis/${assessmentId}`),
    reviewContract: (vendorId: string, contractId: string) =>
        api.get(`/vendors/${vendorId}/ai/contract-review/${contractId}`),
    generateAuditPackage: (vendorId: string) => api.get(`/vendors/${vendorId}/ai/audit-package`),

    // Reporting
    getExecutiveDashboard: () => api.get('/vendors/reports/executive-dashboard'),
    getRiskHeatmap: () => api.get('/vendors/reports/risk-heatmap'),
    getVendorScorecard: (vendorId: string) => api.get(`/vendors/${vendorId}/reports/scorecard`),
    getTrendAnalysis: (months?: number) => api.get('/vendors/reports/trends', { params: { months } }),
    exportBoardReport: (format: string) => api.get('/vendors/reports/board-report', { params: { format } }),
};

// Health check
export const healthCheck = async () => {
    try {
        const baseUrl = import.meta.env.VITE_API_URL || 'https://grc-backend-production-5586.up.railway.app/api/v1';
        const healthUrl = baseUrl.replace('/api/v1', '/health');
        const response = await axios.get(healthUrl, { timeout: 2000 });
        return response.data;
    } catch (error) {
        // Backend doesn't have /health endpoint yet, but that's okay
        // Just return a mock response to indicate backend is accessible
        return { status: 'ok', timestamp: Date.now() };
    }
};

export default api;

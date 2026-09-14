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
    fields?: Array<{ field?: string; message?: string }>;
    constructor(message: string, status?: number, code?: string, fields?: Array<{ field?: string; message?: string }>) {
        super(message);
        this.status = status;
        this.code = code;
        this.fields = fields;
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
        const rawDetails = typeof nestedError === 'object' && nestedError
            ? (nestedError as { details?: Array<{ field?: string; message?: string }> | unknown }).details
            : undefined;
        const details = Array.isArray(rawDetails)
            ? rawDetails
            : Array.isArray(nestedError)
                ? nestedError
                : undefined;
        const detailMessage = Array.isArray(details)
            ? details.map((item) => (item.field ? `${item.field}: ${item.message}` : item.message)).filter(Boolean).join('; ')
            : '';
        const apiCode = typeof nestedError === 'object' && nestedError
            ? (nestedError as { code?: string }).code
            : undefined;
        const rateLimitedMessage =
            (typeof nestedError === 'object' && nestedError?.message) ||
            'Too many requests were made in a short period. Please wait a moment and try again.';
        const message =
            (status === 429
                ? rateLimitedMessage
                : detailMessage ||
                    (typeof nestedError === 'string' ? nestedError : nestedError?.message) ||
                    payload?.message) ||
            (status === 403
                ? 'You do not have permission to perform this action.'
                : status === 404
                    ? 'The requested record was not found.'
                    : status === 503
                        ? 'A required provider is unavailable.'
                        : !error.response
                            ? 'Some services are temporarily unavailable.'
                            : 'The request failed.');

        if (status === 401) {
            const path = window.location.pathname;
            if (path.startsWith('/vendor-assessment')) {
                localStorage.removeItem('vendorToken');
                if (!path.startsWith('/vendor-assessment/activate')) {
                    window.location.href = '/vendor-assessment/activate';
                }
                return Promise.reject(new ApiClientError(message, status, apiCode || error.code, details));
            }
            const authFlow = path.startsWith('/login') || path.startsWith('/admin/') || path === '/';
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!authFlow) {
                window.location.href = path.startsWith('/platform') ? '/admin/login' : '/login';
            }
        }

        return Promise.reject(new ApiClientError(message, status, apiCode || error.code, details));
    }
);

export const authAPI = {
    login: (credentials: { email: string; password: string; plane?: 'CUSTOMER' | 'PLATFORM' }) =>
        api.post('/auth/login', credentials),
    verifyMfa: (data: { challengeToken: string; code: string }) => api.post('/auth/mfa/verify', data),
    startMfaEnrollment: () => api.post('/auth/mfa/enroll/start'),
    confirmMfaEnrollment: (code: string) => api.post('/auth/mfa/enroll/confirm', { code }),
    stepUp: (code: string) => api.post('/auth/step-up', { code }),
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
    getFrameworks: () => api.get('/compliance/catalog'),
    runGapAnalysis: (frameworkId: string) => api.post('/compliance/gap-analysis', { frameworkId }),
    dashboard: () => api.get('/compliance/dashboard'),
    catalog: () => api.get('/compliance/catalog'),
    activate: (data: unknown) => api.post('/compliance/activations', data),
    activation: (publicId: string) => api.get(`/compliance/activations/${publicId}`),
    refreshGaps: (publicId: string) => api.post(`/compliance/activations/${publicId}/gaps/refresh`),
    changeVersion: (publicId: string, data: unknown) => api.post(`/compliance/activations/${publicId}/version`, data),
    requirements: (params?: unknown) => api.get('/compliance/requirements', { params }),
    requirement: (publicId: string) => api.get(`/compliance/requirements/${publicId}`),
    setApplicability: (publicId: string, data: unknown) => api.patch(`/compliance/requirements/${publicId}/applicability`, data),
    setOwner: (publicId: string, data: unknown) => api.patch(`/compliance/requirements/${publicId}/owner`, data),
    gaps: () => api.get('/compliance/gaps'),
    createGap: (data: unknown) => api.post('/compliance/gaps', data),
    updateGap: (publicId: string, data: unknown) => api.patch(`/compliance/gaps/${publicId}`, data),
    exceptions: () => api.get('/compliance/exceptions'),
    createException: (data: unknown) => api.post('/compliance/exceptions', data),
    decideException: (publicId: string, data: unknown) => api.post(`/compliance/exceptions/${publicId}/decision`, data),
    createCampaign: (data: unknown) => api.post('/compliance/campaigns', data),
    campaign: (publicId: string) => api.get(`/compliance/campaigns/${publicId}`),
    attest: (data: unknown) => api.post('/compliance/attestations', data),
    reviewAttestation: (publicId: string, data: unknown) => api.post(`/compliance/attestations/${publicId}/review`, data),
    createPeriod: (data: unknown) => api.post('/compliance/periods', data),
    period: (publicId: string) => api.get(`/compliance/periods/${publicId}`),
    addPeriodItem: (publicId: string, data: unknown) => api.post(`/compliance/periods/${publicId}/items`, data),
    crossFramework: (params?: unknown) => api.get('/compliance/cross-framework', { params }),
    evidenceReuse: (storedObjectId: string) => api.get(`/compliance/evidence/${storedObjectId}/reuse`),
    owners: () => api.get('/compliance/owners'),
    previewImport: (rows: unknown[]) => api.post('/compliance/import/preview', { rows }),
    commitImport: (rows: unknown[]) => api.post('/compliance/import/commit', { rows }),
    exportRegister: (format: 'csv' | 'xlsx') => api.get(`/compliance/export/${format}`, { responseType: 'blob' }),
    downloadReport: (kind: string) => api.get(`/compliance/reports/${kind}.pdf`, { responseType: 'blob' }),
    downloadBoardPptx: () => api.get('/compliance/reports/board.pptx', { responseType: 'blob' }),
};

export const privacyAPI = {
    dashboard: () => api.get('/privacy/dashboard'),
    catalog: () => api.get('/privacy/catalog'),
    activities: (params?: unknown) => api.get('/privacy/activities', { params }),
    activity: (publicId: string) => api.get(`/privacy/activities/${publicId}`),
    createActivity: (data: unknown) => api.post('/privacy/activities', data),
    updateActivity: (publicId: string, data: unknown) => api.patch(`/privacy/activities/${publicId}`, data),
    addPurpose: (publicId: string, data: unknown) => api.post(`/privacy/activities/${publicId}/purposes`, data),
    addBasis: (publicId: string, data: unknown) => api.post(`/privacy/activities/${publicId}/basis`, data),
    addData: (publicId: string, data: unknown) => api.post(`/privacy/activities/${publicId}/data`, data),
    addSubject: (publicId: string, data: unknown) => api.post(`/privacy/activities/${publicId}/subjects`, data),
    addParty: (publicId: string, data: unknown) => api.post(`/privacy/activities/${publicId}/parties`, data),
    link: (publicId: string, data: unknown) => api.post(`/privacy/activities/${publicId}/links`, data),
    dataMap: (params?: unknown) => api.get('/privacy/data-map', { params }),
    transfers: () => api.get('/privacy/transfers'),
    createTransfer: (data: unknown) => api.post('/privacy/transfers', data),
    createTransferAssessment: (publicId: string, data: unknown) => api.post(`/privacy/transfers/${publicId}/assessments`, data),
    dpias: () => api.get('/privacy/dpias'),
    createDpia: (data: unknown) => api.post('/privacy/dpias', data),
    decideDpia: (publicId: string, data: unknown) => api.post(`/privacy/dpias/${publicId}/decision`, data),
    rights: () => api.get('/privacy/rights'),
    rightsDetail: (publicId: string) => api.get(`/privacy/rights/${publicId}`),
    createRights: (data: unknown) => api.post('/privacy/rights', data),
    updateRights: (publicId: string, data: unknown) => api.patch(`/privacy/rights/${publicId}`, data),
    addRightsTask: (publicId: string, data: unknown) => api.post(`/privacy/rights/${publicId}/tasks`, data),
    retention: () => api.get('/privacy/retention'),
    createRetention: (data: unknown) => api.post('/privacy/retention', data),
    deletions: () => api.get('/privacy/deletions'),
    createDeletion: (data: unknown) => api.post('/privacy/deletions', data),
    updateDeletion: (publicId: string, data: unknown) => api.patch(`/privacy/deletions/${publicId}`, data),
    consents: () => api.get('/privacy/consent'),
    createConsent: (data: unknown) => api.post('/privacy/consent', data),
    withdrawConsent: (publicId: string) => api.post(`/privacy/consent/${publicId}/withdraw`),
    incidents: () => api.get('/privacy/incidents'),
    createIncident: (data: unknown) => api.post('/privacy/incidents', data),
    decideIncident: (publicId: string, data: unknown) => api.post(`/privacy/incidents/${publicId}/decision`, data),
    vendors: () => api.get('/privacy/vendors'),
    vendor: (vendorId: string) => api.get(`/privacy/vendors/${vendorId}`),
    importTemplate: () => api.get('/privacy/import/template'),
    affected: (params: unknown) => api.get('/privacy/affected', { params }),
    previewImport: (rows: unknown[]) => api.post('/privacy/import/preview', { rows }),
    commitImport: (rows: unknown[]) => api.post('/privacy/import/commit', { rows }),
    exportRegister: (format: 'csv' | 'xlsx') => api.get(`/privacy/export/${format}`, { responseType: 'blob' }),
    downloadReport: (kind: string) => api.get(`/privacy/reports/${kind}.pdf`, { responseType: 'blob' }),
    downloadBoardPptx: () => api.get('/privacy/reports/board.pptx', { responseType: 'blob' }),
};

export const aiGovernanceAPI = {
    dashboard: () => api.get('/ai-governance/dashboard'),
    catalog: () => api.get('/ai-governance/catalog'),
    systems: (params?: unknown) => api.get('/ai-governance/systems', { params }),
    system: (publicId: string) => api.get(`/ai-governance/systems/${publicId}`),
    createSystem: (data: unknown) => api.post('/ai-governance/systems', data),
    updateSystem: (publicId: string, data: unknown) => api.patch(`/ai-governance/systems/${publicId}`, data),
    addUseCase: (publicId: string, data: unknown) => api.post(`/ai-governance/systems/${publicId}/use-cases`, data),
    useCase: (publicId: string) => api.get(`/ai-governance/use-cases/${publicId}`),
    providers: () => api.get('/ai-governance/providers'),
    provider: (publicId: string) => api.get(`/ai-governance/providers/${publicId}`),
    createProvider: (data: unknown) => api.post('/ai-governance/providers', data),
    updateProvider: (publicId: string, data: unknown) => api.patch(`/ai-governance/providers/${publicId}`, data),
    attachProvider: (systemId: string, providerId: string, data?: unknown) => api.post(`/ai-governance/systems/${systemId}/providers/${providerId}`, data || {}),
    changeVersion: (publicId: string, data: unknown) => api.post(`/ai-governance/systems/${publicId}/versions`, data),
    controls: () => api.get('/ai-governance/controls'),
    readiness: (frameworkKey: string) => api.get(`/ai-governance/readiness/${frameworkKey}`),
    vendorLinks: (vendorId: string) => api.get(`/ai-governance/vendors/${vendorId}`),
    setOversight: (publicId: string, data: unknown) => api.post(`/ai-governance/systems/${publicId}/oversight`, data),
    addRisk: (publicId: string, data: unknown) => api.post(`/ai-governance/systems/${publicId}/risks`, data),
    score: (publicId: string, data: unknown) => api.post(`/ai-governance/systems/${publicId}/scores`, data),
    assessments: () => api.get('/ai-governance/assessments'),
    createAssessment: (data: unknown) => api.post('/ai-governance/assessments', data),
    decideAssessment: (publicId: string, data: unknown) => api.post(`/ai-governance/assessments/${publicId}/decision`, data),
    tests: () => api.get('/ai-governance/tests'),
    recordTest: (data: unknown) => api.post('/ai-governance/tests', data),
    approvals: () => api.get('/ai-governance/approvals'),
    approve: (data: unknown) => api.post('/ai-governance/approvals', data),
    incidents: () => api.get('/ai-governance/incidents'),
    recordIncident: (data: unknown) => api.post('/ai-governance/incidents', data),
    closeIncident: (publicId: string, data: unknown) => api.post(`/ai-governance/incidents/${publicId}/close`, data),
    regulatory: () => api.get('/ai-governance/regulatory-reviews'),
    recordRegulatory: (data: unknown) => api.post('/ai-governance/regulatory-reviews', data),
    exceptions: () => api.get('/ai-governance/exceptions'),
    recordException: (data: unknown) => api.post('/ai-governance/exceptions', data),
    affected: (publicId: string) => api.get(`/ai-governance/systems/${publicId}/affected`),
    recordChange: (publicId: string, data: unknown) => api.post(`/ai-governance/systems/${publicId}/changes`, data),
    previewImport: (rows: unknown[]) => api.post('/ai-governance/import/preview', { rows }),
    commitImport: (rows: unknown[]) => api.post('/ai-governance/import/commit', { rows }),
    exportRegister: (format: 'csv' | 'xlsx') => api.get(`/ai-governance/export/${format}`, { responseType: 'blob' }),
    downloadReport: (kind: string) => api.get(`/ai-governance/reports/${kind}.pdf`, { responseType: 'blob' }),
    downloadBoardPptx: () => api.get('/ai-governance/reports/board.pptx', { responseType: 'blob' }),
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
    checkout: (plan: string, interval?: string) => api.post('/billing/checkout', { plan, interval }),
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
    offboardPreview: (vendorId: string) => api.get(`/tprm/vendors/${vendorId}/offboard`),
    offboard: (vendorId: string, data: unknown) => api.post(`/tprm/vendors/${vendorId}/offboard`, data),
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
    cloneQuestionnaire: (templateId: string, name?: string) => api.post(`/tprm/questionnaires/${templateId}/clone`, { name }),
    assessmentRecommendations: (vendorId: string) => api.get('/tprm/assessments/recommendations', { params: { vendorId } }),
    reportCapabilities: () => api.get('/tprm/reports/capabilities'),
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
    saveScoringMethodologyDraft: (data: unknown) => api.post('/tprm/scoring-methodology/draft', data),
    previewScoringMethodology: (data: unknown) => api.post('/tprm/scoring-methodology/preview', data),
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

export const sccAPI = {
    summary: () => api.get('/scc/summary'),
    controls: (params?: unknown) => api.get('/scc/controls', { params }),
    control: (id: string) => api.get(`/scc/controls/${id}`),
    updateControl: (id: string, data: unknown) => api.patch(`/scc/controls/${id}`, data),
    recordTest: (id: string, data: unknown) => api.post(`/scc/controls/${id}/tests`, data),
    frameworks: (params?: unknown) => api.get('/scc/frameworks', { params }),
    evidence: (params?: unknown) => api.get('/scc/evidence', { params }),
    linkEvidence: (data: unknown) => api.post('/scc/evidence/links', data),
    reviewLink: (linkId: string, data: unknown) => api.post(`/scc/evidence/links/${linkId}/review`, data),
    unlinkEvidence: (linkId: string, data?: unknown) => api.post(`/scc/evidence/links/${linkId}/unlink`, data || {}),
    impact: (storedObjectId: string) => api.get(`/scc/evidence/${storedObjectId}/impact`),
    downloadReport: (kind: string, format: 'json' | 'pdf' = 'pdf') =>
        api.get(`/scc/reports/${kind}`, { params: { format }, responseType: format === 'pdf' ? 'blob' : 'json' }),
};

export const ermAPI = {
    dashboard: () => api.get('/erm/dashboard'),
    list: (params?: unknown) => api.get('/erm/risks', { params }),
    get: (publicId: string) => api.get(`/erm/risks/${publicId}`),
    create: (data: unknown) => api.post('/erm/risks', data),
    update: (publicId: string, data: unknown) => api.patch(`/erm/risks/${publicId}`, data),
    archive: (publicId: string) => api.post(`/erm/risks/${publicId}/archive`),
    linkControl: (publicId: string, data: unknown) => api.post(`/erm/risks/${publicId}/controls`, data),
    linkFinding: (publicId: string, data: unknown) => api.post(`/erm/risks/${publicId}/findings`, data),
    addRelationship: (publicId: string, data: unknown) => api.post(`/erm/risks/${publicId}/relationships`, data),
    createTreatment: (publicId: string, data: unknown) => api.post(`/erm/risks/${publicId}/treatments`, data),
    decide: (publicId: string, data: unknown) => api.post(`/erm/risks/${publicId}/decisions`, data),
    createKri: (publicId: string, data: unknown) => api.post(`/erm/risks/${publicId}/kris`, data),
    measureKri: (kriPublicId: string, data: unknown) => api.post(`/erm/kris/${kriPublicId}/measurements`, data),
    appetite: () => api.get('/erm/appetite'),
    setAppetite: (data: unknown) => api.post('/erm/appetite', data),
    businessUnits: () => api.get('/erm/business-units'),
    createBusinessUnit: (data: unknown) => api.post('/erm/business-units', data),
    previewImport: (rows: unknown[]) => api.post('/erm/import/preview', { rows }),
    commitImport: (rows: unknown[]) => api.post('/erm/import/commit', { rows }),
    exportRegister: (format: 'csv' | 'xlsx') => api.get(`/erm/export/${format}`, { responseType: 'blob' }),
    downloadReport: (kind: string) => api.get(`/erm/reports/${kind}.pdf`, { responseType: 'blob' }),
    downloadBoardPptx: () => api.get('/erm/reports/board.pptx', { responseType: 'blob' }),
    owners: () => api.get('/erm/owners'),
    controlImpact: (controlId: string) => api.get(`/erm/impact/controls/${controlId}`),
};

export const governanceAPI = {
    summary: (config?: { signal?: AbortSignal }) => api.get('/governance/summary', config),
    search: (params?: unknown, config?: { signal?: AbortSignal }) => api.get('/governance/search', { params, ...config }),
    lookup: (params: { sourceModel: string; sourceId: string; nodeType?: string }, config?: { signal?: AbortSignal }) =>
        api.get('/governance/nodes/lookup', { params, ...config }),
    backfill: () => api.post('/governance/backfill'),
    reconcile: () => api.post('/governance/reconcile'),
    node: (nodeId: string, config?: { signal?: AbortSignal }) => api.get(`/governance/nodes/${nodeId}`, config),
    relationships: (nodeId: string, params?: unknown, config?: { signal?: AbortSignal }) =>
        api.get(`/governance/nodes/${nodeId}/relationships`, { params, ...config }),
    neighbors: (nodeId: string) => api.get(`/governance/nodes/${nodeId}/neighbors`),
    lineage: (nodeId: string, depth?: number, config?: { signal?: AbortSignal }) =>
        api.get(`/governance/nodes/${nodeId}/lineage`, { params: depth ? { depth } : undefined, ...config }),
    impact: (nodeId: string, depth?: number, config?: { signal?: AbortSignal }) =>
        api.get(`/governance/nodes/${nodeId}/impact`, { params: depth ? { depth } : undefined, ...config }),
    path: (fromNodeId: string, toNodeId: string) => api.get('/governance/path', { params: { fromNodeId, toNodeId } }),
    exportGraph: () => api.get('/governance/export'),
};

export const vendorOnboardingAPI = {
    list: () => api.get('/vendors/onboarding'),
    owners: () => api.get('/vendors/onboarding/owners'),
    duplicates: (data: unknown) => api.post('/vendors/onboarding/duplicates', data),
    create: (data: unknown) => api.post('/vendors/onboarding', data),
    get: (id: string) => api.get(`/vendors/onboarding/${id}`),
    saveIntake: (id: string, answers: unknown[]) => api.patch(`/vendors/onboarding/${id}/intake`, { answers }),
    completeIntake: (id: string, answers: unknown[], attested: boolean) =>
        api.post(`/vendors/onboarding/${id}/intake/complete`, { answers, attested }),
    confirmTier: (id: string, data?: unknown) => api.post(`/vendors/onboarding/${id}/tier/confirm`, data || { confirm: true }),
    confirmPlan: (id: string) => api.post(`/vendors/onboarding/${id}/plan/confirm`),
    saveContact: (id: string, data: unknown) => api.post(`/vendors/onboarding/${id}/contact`, data),
    send: (id: string, data: unknown) => api.post(`/vendors/onboarding/${id}/send`, data),
    resend: (id: string) => api.post(`/vendors/onboarding/${id}/invitation/resend`),
    activationLink: (id: string) => api.post(`/vendors/onboarding/${id}/invitation/link`),
    reviewFinding: (id: string, findingId: string, data: unknown) => api.post(`/vendors/onboarding/${id}/findings/${findingId}/review`, data),
    requestClarification: (id: string, data: unknown) => api.post(`/vendors/onboarding/${id}/clarification`, data),
    remediateFinding: (id: string, findingId: string, data: unknown) => api.post(`/vendors/onboarding/${id}/findings/${findingId}/remediate`, data),
    validateFinding: (id: string, findingId: string, data: unknown) => api.post(`/vendors/onboarding/${id}/findings/${findingId}/validate`, data),
    closeFinding: (id: string, findingId: string, data: unknown) => api.post(`/vendors/onboarding/${id}/findings/${findingId}/close`, data),
    acceptFindingRisk: (id: string, findingId: string, data: unknown) => api.post(`/vendors/onboarding/${id}/findings/${findingId}/accept-risk`, data),
    attestContract: (id: string, data: unknown) => api.post(`/vendors/onboarding/${id}/contract/attest`, data),
    decideApproval: (id: string, data: unknown) => api.post(`/vendors/onboarding/${id}/approval`, data),
    activate: (id: string) => api.post(`/vendors/onboarding/${id}/activate`),
    reassessment: (id: string) => api.get(`/vendors/onboarding/${id}/reassessment`),
    startReassessment: (id: string, data?: unknown) => api.post(`/vendors/onboarding/${id}/reassessment`, data || {}),
    offboard: (id: string, data: unknown) => api.post(`/vendors/onboarding/${id}/offboard`, data),
};

const vendorApi = axios.create({
    baseURL: API_BASE_URL || '/api/v1',
    headers: { 'Content-Type': 'application/json' },
});

vendorApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('vendorToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const vendorPortalAPI = {
    activate: (token: string) => vendorApi.post('/vendor-portal/activate', { token }),
    workspace: () => vendorApi.get('/vendor-portal/workspace'),
    assessment: (id: string) => vendorApi.get(`/vendor-portal/assessments/${id}`),
    saveResponse: (id: string, data: unknown) => vendorApi.patch(`/vendor-portal/assessments/${id}/responses`, data),
    submit: (id: string, attested: boolean) => vendorApi.post(`/vendor-portal/assessments/${id}/submit`, { attested }),
    uploadEvidence: (id: string, form: FormData) => vendorApi.post(`/vendor-portal/assessments/${id}/evidence`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    logout: () => vendorApi.post('/vendor-portal/logout'),
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

export type DemoRequestPayload = {
    name: string;
    email: string;
    company: string;
    role: string;
    companySize: string;
    primaryNeed: string;
    intent?: string;
    plan?: string;
    source?: string;
    selectedPlan?: string;
};

export const demoAPI = {
    request: (data: DemoRequestPayload) => api.post('/demo-requests', data),
};

export const healthCheck = async () => {
    if (!API_BASE_URL && import.meta.env.PROD) {
        throw new ApiClientError('API URL is not configured', 503, 'NOT_CONFIGURED');
    }
    const baseUrl = API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:4000/api/v1' : '');
    if (!baseUrl) {
        throw new ApiClientError('API URL is not configured', 503, 'NOT_CONFIGURED');
    }
    const healthUrl = baseUrl.replace(/\/api\/v1\/?$/, '/health');
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const response = await axios.get(healthUrl, { timeout: 12000 });
            return response.data;
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
};

export const notificationAPI = {
    list: () => api.get('/notifications'),
    markRead: (id: string) => api.post(`/notifications/${id}/read`),
};

export default api;

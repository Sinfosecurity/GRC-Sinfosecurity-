import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Auth
export const authAPI = {
    login: (credentials: { email: string; password: string }) =>
        api.post('/auth/login', credentials),
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

// Health check
export const healthCheck = async () => {
    try {
        const response = await axios.get('http://localhost:4000/health');
        return response.data;
    } catch (error) {
        console.error('Backend health check failed:', error);
        return null;
    }
};

export default api;

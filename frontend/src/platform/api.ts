import api from '../services/api';

export const platformAPI = {
    overview: () => api.get('/platform/overview'),
    attention: () => api.get('/platform/attention'),
    search: (q: string) => api.get('/platform/search', { params: { q } }),
    organizations: (params?: Record<string, string>) => api.get('/platform/organizations', { params }),
    organization: (id: string) => api.get(`/platform/organizations/${id}`),
    tickets: (params?: Record<string, string>) => api.get('/platform/support/tickets', { params }),
    ticket: (id: string) => api.get(`/platform/support/tickets/${id}`),
    updateTicket: (id: string, data: unknown) => api.patch(`/platform/support/tickets/${id}`, data),
    incidents: () => api.get('/platform/incidents'),
    createIncident: (data: unknown) => api.post('/platform/incidents', data),
    updateIncident: (id: string, data: unknown) => api.patch(`/platform/incidents/${id}`, data),
    leads: () => api.get('/platform/demo-requests'),
    updateLead: (id: string, data: unknown) => api.patch(`/platform/demo-requests/${id}`, data),
    providers: () => api.get('/platform/provider-health'),
    billing: () => api.get('/platform/billing'),
    notifications: () => api.get('/platform/notifications'),
    malware: () => api.get('/platform/malware'),
    reports: () => api.get('/platform/reports'),
    audit: () => api.get('/platform/audit'),
    users: () => api.get('/platform/internal-users'),
    updateUserRole: (id: string, role: string) => api.patch(`/platform/internal-users/${id}/role`, { role }),
    sessions: () => api.get('/platform/support-sessions'),
    requestSession: (data: unknown) => api.post('/platform/support-sessions', data),
    approveSession: (id: string) => api.post(`/platform/support-sessions/${id}/approve`),
    startSession: (id: string) => api.post(`/platform/support-sessions/${id}/start`),
    revokeSession: (id: string) => api.post(`/platform/support-sessions/${id}/revoke`),
};

export const tenantSupportAPI = {
    create: (data: unknown) => api.post('/support/tickets', data),
    list: () => api.get('/support/tickets'),
    get: (id: string) => api.get(`/support/tickets/${id}`),
    reply: (id: string, body: string) => api.post(`/support/tickets/${id}/messages`, { body }),
};

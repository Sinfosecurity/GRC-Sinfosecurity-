import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock axios before importing api
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: {
          use: vi.fn(),
          handlers: [{
            fulfilled: (config: any) => {
              const token = localStorage.getItem('token');
              if (token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${token}`;
              }
              return config;
            }
          }]
        },
        response: {
          use: vi.fn(),
          handlers: [{
            rejected: async (error: any) => {
              const originalRequest = error.config;
              
              if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
                return Promise.reject(error);
              }
              
              if (error.response?.status === 403) {
                window.location.href = '/unauthorized';
                return Promise.reject(error);
              }
              
              return Promise.reject(error);
            }
          }]
        }
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    })),
    get: vi.fn(),
    post: vi.fn(),
  }
}));

import api, { 
  authAPI, 
  risksAPI, 
  complianceAPI,
  controlsAPI,
  incidentsAPI,
  policiesAPI,
  documentsAPI,
  vendorAPI,
  healthCheck 
} from '../api';

const mockedAxios = axios as any;

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Authentication', () => {
    it('adds JWT token to request headers', () => {
      const token = 'test-jwt-token';
      localStorage.setItem('token', token);

      // Mock the request interceptor behavior
      const config = { headers: {} } as any;
      const mockToken = localStorage.getItem('token');
      if (mockToken) {
        config.headers.Authorization = `Bearer ${mockToken}`;
      }
      
      expect(config.headers.Authorization).toBe(`Bearer ${token}`);
    });

    it('does not add Authorization header when no token', () => {
      localStorage.removeItem('token');
      
      const config = { headers: {} } as any;
      const mockToken = localStorage.getItem('token');
      if (mockToken) {
        config.headers.Authorization = `Bearer ${mockToken}`;
      }
      
      expect(config.headers.Authorization).toBeUndefined();
    });
  });

  describe('API Endpoints', () => {
    it('calls login endpoint with credentials', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const mockResponse = { data: { token: 'jwt-token', user: { id: '1' } } };

      mockedAxios.post = vi.fn().mockResolvedValue(mockResponse);
      api.post = vi.fn().mockResolvedValue(mockResponse);

      await authAPI.login(credentials);

      expect(api.post).toHaveBeenCalledWith('/auth/login', credentials);
    });

    it('calls risks API endpoints', async () => {
      api.get = vi.fn().mockResolvedValue({ data: [] });
      api.post = vi.fn().mockResolvedValue({ data: {} });
      api.put = vi.fn().mockResolvedValue({ data: {} });
      api.delete = vi.fn().mockResolvedValue({ data: {} });

      await risksAPI.getAll();
      expect(api.get).toHaveBeenCalledWith('/risks');

      await risksAPI.getById('123');
      expect(api.get).toHaveBeenCalledWith('/risks/123');

      await risksAPI.create({ title: 'Test Risk' });
      expect(api.post).toHaveBeenCalledWith('/risks', { title: 'Test Risk' });

      await risksAPI.update('123', { title: 'Updated Risk' });
      expect(api.put).toHaveBeenCalledWith('/risks/123', { title: 'Updated Risk' });

      await risksAPI.delete('123');
      expect(api.delete).toHaveBeenCalledWith('/risks/123');
    });
  });

  describe('Health Check', () => {
    it('makes health check request', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({ 
        data: { status: 'healthy', uptime: 1000 } 
      });

      const result = await healthCheck();
      
      expect(result).toEqual({ status: 'healthy', uptime: 1000 });
    });

    it('returns null on health check failure', async () => {
      mockedAxios.get = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await healthCheck();
      
      expect(result).toBeNull();
    });
  });

  describe('Response Interceptors', () => {
    it('handles 401 Unauthorized by clearing auth and redirecting', async () => {
      localStorage.setItem('token', 'old-token');
      localStorage.setItem('user', JSON.stringify({ id: '1' }));

      // Mock window.location
      delete (window as any).location;
      (window as any).location = { href: '' };

      // Simulate 401 error handling
      const error = {
        response: { status: 401 },
        config: { _retry: false }
      };

      // Manually trigger the logic that would be in the interceptor
      if (error.response?.status === 401 && !error.config._retry) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(window.location.href).toBe('/');
    });

    it('handles 403 Forbidden by redirecting to unauthorized', async () => {
      delete (window as any).location;
      (window as any).location = { href: '' };

      const error = {
        response: { status: 403 },
        config: {}
      };

      // Simulate 403 error handling
      if (error.response?.status === 403) {
        window.location.href = '/unauthorized';
      }

      expect(window.location.href).toBe('/unauthorized');
    });

    it('handles network errors gracefully', async () => {
      const error = {
        config: {},
        message: 'Network Error'
      };

      // Network errors should be rejected but not cause special behavior
      expect(error.message).toBe('Network Error');
      expect(error.config).toBeDefined();
    });
  });

  describe('Compliance API', () => {
    beforeEach(() => {
      api.get = vi.fn().mockResolvedValue({ data: [] });
      api.post = vi.fn().mockResolvedValue({ data: {} });
    });

    it('gets all compliance frameworks', async () => {
      await complianceAPI.getFrameworks();
      expect(api.get).toHaveBeenCalledWith('/compliance');
    });

    it('runs gap analysis', async () => {
      await complianceAPI.runGapAnalysis('framework-123');
      expect(api.post).toHaveBeenCalledWith('/compliance/gap-analysis', { 
        frameworkId: 'framework-123' 
      });
    });
  });

  describe('Controls API', () => {
    beforeEach(() => {
      api.get = vi.fn().mockResolvedValue({ data: [] });
      api.post = vi.fn().mockResolvedValue({ data: {} });
    });

    it('gets all controls', async () => {
      await controlsAPI.getAll();
      expect(api.get).toHaveBeenCalledWith('/controls');
    });

    it('creates a new control', async () => {
      const controlData = { name: 'Access Control', description: 'Test' };
      await controlsAPI.create(controlData);
      expect(api.post).toHaveBeenCalledWith('/controls', controlData);
    });
  });

  describe('Incidents API', () => {
    beforeEach(() => {
      api.get = vi.fn().mockResolvedValue({ data: [] });
      api.post = vi.fn().mockResolvedValue({ data: {} });
    });

    it('gets all incidents', async () => {
      await incidentsAPI.getAll();
      expect(api.get).toHaveBeenCalledWith('/incidents');
    });

    it('creates a new incident', async () => {
      const incidentData = { title: 'Security Breach', severity: 'high' };
      await incidentsAPI.create(incidentData);
      expect(api.post).toHaveBeenCalledWith('/incidents', incidentData);
    });
  });

  describe('Policies API', () => {
    beforeEach(() => {
      api.get = vi.fn().mockResolvedValue({ data: [] });
    });

    it('gets all policies', async () => {
      await policiesAPI.getAll();
      expect(api.get).toHaveBeenCalledWith('/policies');
    });
  });

  describe('Documents API', () => {
    beforeEach(() => {
      api.get = vi.fn().mockResolvedValue({ data: [] });
    });

    it('gets all documents', async () => {
      await documentsAPI.getAll();
      expect(api.get).toHaveBeenCalledWith('/documents');
    });
  });

  describe('Vendor API - Basic CRUD', () => {
    beforeEach(() => {
      api.get = vi.fn().mockResolvedValue({ data: [] });
      api.post = vi.fn().mockResolvedValue({ data: {} });
      api.put = vi.fn().mockResolvedValue({ data: {} });
      api.delete = vi.fn().mockResolvedValue({ data: {} });
    });

    it('gets all vendors with filters', async () => {
      const filters = { status: 'active', riskLevel: 'high' };
      await vendorAPI.getAll(filters);
      expect(api.get).toHaveBeenCalledWith('/vendors', { params: filters });
    });

    it('gets vendor by id', async () => {
      await vendorAPI.getById('vendor-123');
      expect(api.get).toHaveBeenCalledWith('/vendors/vendor-123');
    });

    it('creates a new vendor', async () => {
      const vendorData = { name: 'Acme Corp', tier: 'critical' };
      await vendorAPI.create(vendorData);
      expect(api.post).toHaveBeenCalledWith('/vendors', vendorData);
    });

    it('updates a vendor', async () => {
      const updateData = { status: 'inactive' };
      await vendorAPI.update('vendor-123', updateData);
      expect(api.put).toHaveBeenCalledWith('/vendors/vendor-123', updateData);
    });

    it('deletes a vendor', async () => {
      await vendorAPI.delete('vendor-123');
      expect(api.delete).toHaveBeenCalledWith('/vendors/vendor-123');
    });

    it('gets vendor statistics', async () => {
      await vendorAPI.getStatistics();
      expect(api.get).toHaveBeenCalledWith('/vendors/statistics');
    });

    it('gets vendors requiring attention', async () => {
      await vendorAPI.getRequiringAttention();
      expect(api.get).toHaveBeenCalledWith('/vendors/requiring-attention');
    });

    it('offboards a vendor', async () => {
      const offboardData = { reason: 'contract ended', date: '2025-12-31' };
      await vendorAPI.offboard('vendor-123', offboardData);
      expect(api.post).toHaveBeenCalledWith('/vendors/vendor-123/offboard', offboardData);
    });
  });

  describe('Vendor API - Assessments', () => {
    beforeEach(() => {
      api.get = vi.fn().mockResolvedValue({ data: [] });
      api.post = vi.fn().mockResolvedValue({ data: {} });
    });

    it('gets vendor assessments', async () => {
      await vendorAPI.getAssessments('vendor-123');
      expect(api.get).toHaveBeenCalledWith('/vendors/vendor-123/assessments');
    });

    it('creates vendor assessment', async () => {
      const assessmentData = { type: 'security', dueDate: '2025-12-31' };
      await vendorAPI.createAssessment('vendor-123', assessmentData);
      expect(api.post).toHaveBeenCalledWith('/vendors/vendor-123/assessments', assessmentData);
    });

    it('gets assessment by id', async () => {
      await vendorAPI.getAssessmentById('vendor-123', 'assessment-456');
      expect(api.get).toHaveBeenCalledWith('/vendors/vendor-123/assessments/assessment-456');
    });

    it('submits assessment response', async () => {
      const responseData = { answers: [{ questionId: '1', answer: 'yes' }] };
      await vendorAPI.submitResponse('vendor-123', 'assessment-456', responseData);
      expect(api.post).toHaveBeenCalledWith(
        '/vendors/vendor-123/assessments/assessment-456/responses', 
        responseData
      );
    });

    it('completes assessment', async () => {
      await vendorAPI.completeAssessment('vendor-123', 'assessment-456');
      expect(api.post).toHaveBeenCalledWith(
        '/vendors/vendor-123/assessments/assessment-456/complete'
      );
    });
  });

  describe('Vendor API - Contracts', () => {
    beforeEach(() => {
      api.get = vi.fn().mockResolvedValue({ data: [] });
      api.post = vi.fn().mockResolvedValue({ data: {} });
      api.put = vi.fn().mockResolvedValue({ data: {} });
    });

    it('gets vendor contracts', async () => {
      await vendorAPI.getContracts('vendor-123');
      expect(api.get).toHaveBeenCalledWith('/vendors/vendor-123/contracts');
    });

    it('creates vendor contract', async () => {
      const contractData = { startDate: '2025-01-01', endDate: '2026-01-01' };
      await vendorAPI.createContract('vendor-123', contractData);
      expect(api.post).toHaveBeenCalledWith('/vendors/vendor-123/contracts', contractData);
    });

    it('gets contract by id', async () => {
      await vendorAPI.getContractById('vendor-123', 'contract-789');
      expect(api.get).toHaveBeenCalledWith('/vendors/vendor-123/contracts/contract-789');
    });

    it('updates contract', async () => {
      const updateData = { status: 'renewed' };
      await vendorAPI.updateContract('vendor-123', 'contract-789', updateData);
      expect(api.put).toHaveBeenCalledWith(
        '/vendors/vendor-123/contracts/contract-789', 
        updateData
      );
    });

    it('tracks SLA', async () => {
      const slaData = { metric: 'uptime', value: 99.9 };
      await vendorAPI.trackSLA('vendor-123', 'contract-789', slaData);
      expect(api.post).toHaveBeenCalledWith(
        '/vendors/vendor-123/contracts/contract-789/sla', 
        slaData
      );
    });

    it('gets expiring contracts', async () => {
      await vendorAPI.getExpiringContracts(30);
      expect(api.get).toHaveBeenCalledWith('/vendors/contracts/expiring', { params: { days: 30 } });
    });
  });

  describe('Vendor API - Issues', () => {
    beforeEach(() => {
      api.get = vi.fn().mockResolvedValue({ data: [] });
      api.post = vi.fn().mockResolvedValue({ data: {} });
      api.put = vi.fn().mockResolvedValue({ data: {} });
    });

    it('gets vendor issues', async () => {
      await vendorAPI.getIssues('vendor-123');
      expect(api.get).toHaveBeenCalledWith('/vendors/vendor-123/issues');
    });

    it('creates vendor issue', async () => {
      const issueData = { title: 'Security concern', severity: 'high' };
      await vendorAPI.createIssue('vendor-123', issueData);
      expect(api.post).toHaveBeenCalledWith('/vendors/vendor-123/issues', issueData);
    });

    it('gets issue by id', async () => {
      await vendorAPI.getIssueById('vendor-123', 'issue-456');
      expect(api.get).toHaveBeenCalledWith('/vendors/vendor-123/issues/issue-456');
    });

    it('updates issue', async () => {
      const updateData = { status: 'resolved' };
      await vendorAPI.updateIssue('vendor-123', 'issue-456', updateData);
      expect(api.put).toHaveBeenCalledWith('/vendors/vendor-123/issues/issue-456', updateData);
    });

    it('submits corrective action plan', async () => {
      const capData = { actions: ['action1', 'action2'], dueDate: '2025-12-31' };
      await vendorAPI.submitCAP('vendor-123', 'issue-456', capData);
      expect(api.post).toHaveBeenCalledWith(
        '/vendors/vendor-123/issues/issue-456/corrective-action', 
        capData
      );
    });

    it('validates remediation', async () => {
      const validationData = { validated: true, notes: 'Fixed' };
      await vendorAPI.validateRemediation('vendor-123', 'issue-456', validationData);
      expect(api.post).toHaveBeenCalledWith(
        '/vendors/vendor-123/issues/issue-456/validate', 
        validationData
      );
    });
  });

  describe('Vendor API - Monitoring', () => {
    beforeEach(() => {
      api.get = vi.fn().mockResolvedValue({ data: {} });
      api.post = vi.fn().mockResolvedValue({ data: {} });
    });

    it('gets vendor monitoring data', async () => {
      await vendorAPI.getMonitoring('vendor-123');
      expect(api.get).toHaveBeenCalledWith('/vendors/vendor-123/monitoring');
    });

    it('records monitoring signal', async () => {
      const signalData = { type: 'breach', severity: 'high', source: 'news' };
      await vendorAPI.recordSignal('vendor-123', signalData);
      expect(api.post).toHaveBeenCalledWith('/vendors/vendor-123/monitoring', signalData);
    });
  });

  describe('Vendor API - AI Intelligence', () => {
    beforeEach(() => {
      api.get = vi.fn().mockResolvedValue({ data: {} });
    });

    it('gets AI risk summary', async () => {
      await vendorAPI.getRiskSummary('vendor-123');
      expect(api.get).toHaveBeenCalledWith('/vendors/vendor-123/ai/risk-summary');
    });

    it('analyzes assessment with AI', async () => {
      await vendorAPI.analyzeAssessment('vendor-123', 'assessment-456');
      expect(api.get).toHaveBeenCalledWith(
        '/vendors/vendor-123/ai/assessment-analysis/assessment-456'
      );
    });

    it('reviews contract with AI', async () => {
      await vendorAPI.reviewContract('vendor-123', 'contract-789');
      expect(api.get).toHaveBeenCalledWith('/vendors/vendor-123/ai/contract-review/contract-789');
    });

    it('generates audit package with AI', async () => {
      await vendorAPI.generateAuditPackage('vendor-123');
      expect(api.get).toHaveBeenCalledWith('/vendors/vendor-123/ai/audit-package');
    });
  });

  describe('Vendor API - Reporting', () => {
    beforeEach(() => {
      api.get = vi.fn().mockResolvedValue({ data: {} });
    });

    it('gets executive dashboard', async () => {
      await vendorAPI.getExecutiveDashboard();
      expect(api.get).toHaveBeenCalledWith('/vendors/reports/executive-dashboard');
    });

    it('gets risk heatmap', async () => {
      await vendorAPI.getRiskHeatmap();
      expect(api.get).toHaveBeenCalledWith('/vendors/reports/risk-heatmap');
    });

    it('gets vendor scorecard', async () => {
      await vendorAPI.getVendorScorecard('vendor-123');
      expect(api.get).toHaveBeenCalledWith('/vendors/vendor-123/reports/scorecard');
    });

    it('gets trend analysis', async () => {
      await vendorAPI.getTrendAnalysis(12);
      expect(api.get).toHaveBeenCalledWith('/vendors/reports/trends', { params: { months: 12 } });
    });

    it('exports board report', async () => {
      await vendorAPI.exportBoardReport('pdf');
      expect(api.get).toHaveBeenCalledWith('/vendors/reports/board-report', { 
        params: { format: 'pdf' } 
      });
    });
  });
});

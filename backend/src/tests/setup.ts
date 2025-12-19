/**
 * Jest Test Setup
 * Configures test environment and global test utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/grc_test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

// Mock logger in tests
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Global test utilities
global.testUtils = {
  generateMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'ADMIN',
    organizationId: 'test-org-id',
    ...overrides,
  }),

  generateMockVendor: (overrides = {}) => ({
    id: 'test-vendor-id',
    name: 'Test Vendor Inc.',
    tier: 'HIGH',
    status: 'ACTIVE',
    vendorType: 'SOFTWARE',
    category: 'Cloud Services',
    organizationId: 'test-org-id',
    inherentRiskScore: 75,
    residualRiskScore: 50,
    ...overrides,
  }),
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

import { tenantById, tenantWhere, rejectClientTenantOverride, assertSameTenant } from '../security/tenant';
import { ApiError } from '../middleware/errorHandler';

describe('tenant isolation helpers', () => {
    it('always includes organizationId in queries', () => {
        expect(tenantById('vendor-b', 'org-a')).toEqual({ id: 'vendor-b', organizationId: 'org-a' });
        expect(tenantWhere('org-a', { status: 'ACTIVE' })).toEqual({ status: 'ACTIVE', organizationId: 'org-a' });
    });

    it('rejects browser-supplied organization overrides', () => {
        expect(() => rejectClientTenantOverride('org-a', 'org-b')).toThrow(ApiError);
        expect(rejectClientTenantOverride('org-a', 'org-a')).toBe('org-a');
    });

    it('does not leak the existence of another tenant resource', () => {
        try {
            assertSameTenant('org-a', 'org-b');
            throw new Error('should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(ApiError);
            expect((error as ApiError).statusCode).toBe(404);
        }
    });
});

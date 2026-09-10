/**
 * Negative tenant tests.
 * Organization A must never read, update, delete, assess, approve,
 * or export Organization B resources by guessing IDs.
 */

import { tenantById } from '../security/tenant';

describe('cross-tenant vendor access', () => {
    const orgA = 'org-a';
    const orgB = 'org-b';
    const vendorB = 'vendor-b';

    it('scopes vendor read by composite id + organizationId', () => {
        expect(tenantById(vendorB, orgA)).toEqual({ id: vendorB, organizationId: orgA });
        expect(tenantById(vendorB, orgA)).not.toEqual({ id: vendorB, organizationId: orgB });
    });

    it('never queries another tenant by id alone', () => {
        const query = tenantById(vendorB, orgA);
        expect(query).toHaveProperty('organizationId', orgA);
        expect(Object.keys(query).sort()).toEqual(['id', 'organizationId']);
    });
});

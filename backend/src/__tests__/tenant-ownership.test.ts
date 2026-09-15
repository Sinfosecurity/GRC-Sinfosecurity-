import { omitForeignParent } from '../security/tenantOwnership';

describe('tenantOwnership helpers', () => {
    it('omits a parent that belongs to another organization', () => {
        expect(omitForeignParent('org-a', { id: 'v1', organizationId: 'org-b', name: 'Secret' })).toBeNull();
    });

    it('keeps a parent that belongs to the caller organization', () => {
        const vendor = { id: 'v1', organizationId: 'org-a', name: 'Owned' };
        expect(omitForeignParent('org-a', vendor)).toEqual(vendor);
    });
});

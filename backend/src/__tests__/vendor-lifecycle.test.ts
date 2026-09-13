import { VendorStatus } from '@prisma/client';
import { assertVendorTransition, allowedVendorTransitions } from '../services/vendorLifecycle';

describe('vendor lifecycle', () => {
    it('allows proposed to approved or rejected', () => {
        expect(allowedVendorTransitions(VendorStatus.PROPOSED)).toEqual(
            expect.arrayContaining([VendorStatus.APPROVED, VendorStatus.REJECTED])
        );
        expect(() => assertVendorTransition(VendorStatus.PROPOSED, VendorStatus.APPROVED)).not.toThrow();
    });

    it('allows proposed vendors to enter offboarding', () => {
        expect(() => assertVendorTransition(VendorStatus.PROPOSED, VendorStatus.OFFBOARDING)).not.toThrow();
    });

    it('blocks terminated to active', () => {
        expect(() => assertVendorTransition(VendorStatus.TERMINATED, VendorStatus.ACTIVE)).toThrow();
    });
});

import { VendorStatus } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler';

const TRANSITIONS: Record<VendorStatus, VendorStatus[]> = {
    PROPOSED: [VendorStatus.APPROVED, VendorStatus.REJECTED, VendorStatus.ACTIVE],
    APPROVED: [VendorStatus.ACTIVE, VendorStatus.REJECTED, VendorStatus.OFFBOARDING],
    ACTIVE: [VendorStatus.SUSPENDED, VendorStatus.INACTIVE, VendorStatus.OFFBOARDING],
    SUSPENDED: [VendorStatus.ACTIVE, VendorStatus.OFFBOARDING, VendorStatus.TERMINATED],
    INACTIVE: [VendorStatus.ACTIVE, VendorStatus.OFFBOARDING, VendorStatus.TERMINATED],
    OFFBOARDING: [VendorStatus.TERMINATED, VendorStatus.ACTIVE],
    TERMINATED: [],
    REJECTED: [],
};

export function assertVendorTransition(from: VendorStatus, to: VendorStatus): void {
    if (from === to) {
        return;
    }
    if (!TRANSITIONS[from]?.includes(to)) {
        throw new ApiError(409, `Invalid vendor lifecycle transition from ${from} to ${to}`);
    }
}

export function allowedVendorTransitions(from: VendorStatus): VendorStatus[] {
    return TRANSITIONS[from] || [];
}

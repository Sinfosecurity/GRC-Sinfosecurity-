/**
 * Single persistence boundary for Vendor.tier.
 * Hard floors are enforced here, not as UI recommendations.
 */
import { VendorTier } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler';
import {
    TIER_RANK,
    criticalFloorAppliesFromFacts,
    minTierFromFloors,
} from './vendorOnboardingScoring';

const TIERS = new Set<string>(Object.values(VendorTier));

export function parseVendorTier(value: unknown): VendorTier | undefined {
    if (typeof value !== 'string' || !TIERS.has(value)) return undefined;
    return value as VendorTier;
}

export function resolveMinimumTier(input: {
    hardFloors?: Array<{ applies?: boolean }> | null;
    dataTypesAccessed?: string[];
    privilegedAccess?: boolean;
}): VendorTier | null {
    if (minTierFromFloors(input.hardFloors)) return VendorTier.CRITICAL;
    if (criticalFloorAppliesFromFacts(input.dataTypesAccessed, input.privilegedAccess)) return VendorTier.CRITICAL;
    return null;
}

export function assertTierMeetsFloor(requested: VendorTier, minimum: VendorTier | null): VendorTier {
    if (!minimum) return requested;
    if (TIER_RANK[requested] < TIER_RANK[minimum]) {
        throw new ApiError(409, `This vendor requires at least ${minimum} because a hard floor applies.`);
    }
    return requested;
}

export function applyHardFloorToTier(requested: VendorTier | undefined, minimum: VendorTier | null): VendorTier {
    const tier = requested || VendorTier.MEDIUM;
    return assertTierMeetsFloor(tier, minimum);
}

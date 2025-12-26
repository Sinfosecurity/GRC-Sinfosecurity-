/**
 * Organization (Tenant) Service
 * Manages multi-tenant organizations with complete data isolation
 */
import { Organization, CreateOrganizationRequest, UpdateOrganizationRequest, SubscriptionPlan, SubscriptionStatus } from '../types/organization.types';
declare class OrganizationService {
    /**
     * Create a new organization (tenant)
     */
    createOrganization(data: CreateOrganizationRequest, createdBy?: string): Organization;
    /**
     * Get organization by ID
     */
    getOrganizationById(orgId: string): Organization | null;
    /**
     * Get organization by subdomain
     */
    getOrganizationBySubdomain(subdomain: string): Organization | null;
    /**
     * Get all organizations (admin only)
     */
    getAllOrganizations(): Organization[];
    /**
     * Update organization
     */
    updateOrganization(orgId: string, updates: UpdateOrganizationRequest, updatedBy: string): Organization | null;
    /**
     * Update organization subscription
     */
    updateSubscription(orgId: string, plan: SubscriptionPlan, updatedBy: string): Organization | null;
    /**
     * Suspend organization (payment issues, policy violation)
     */
    suspendOrganization(orgId: string, reason: string, suspendedBy: string): boolean;
    /**
     * Reactivate organization
     */
    reactivateOrganization(orgId: string, reactivatedBy: string): boolean;
    /**
     * Soft delete organization
     */
    deleteOrganization(orgId: string, deletedBy: string): boolean;
    /**
     * Check if subdomain is taken
     */
    isSubdomainTaken(subdomain: string): boolean;
    /**
     * Check if organization has available seats
     */
    hasAvailableSeats(orgId: string): boolean;
    /**
     * Increment used seats (when user is added)
     */
    incrementUsedSeats(orgId: string): void;
    /**
     * Decrement used seats (when user is removed)
     */
    decrementUsedSeats(orgId: string): void;
    /**
     * Check if organization has access to a feature
     */
    hasFeature(orgId: string, feature: keyof Organization['features']): boolean;
    /**
     * Check if organization has access to a module
     */
    hasModule(orgId: string, module: string): boolean;
    /**
     * Check if trial is expired
     */
    isTrialExpired(orgId: string): boolean;
    /**
     * Get organization stats
     */
    getOrganizationStats(orgId: string): {
        totalSeats: number;
        usedSeats: number;
        availableSeats: number;
        subscriptionStatus: SubscriptionStatus;
        plan: SubscriptionPlan;
        daysUntilRenewal: number;
        isTrialExpired: boolean;
        enabledModules: string[];
        enabledFeatures: string[];
    };
}
declare const _default: OrganizationService;
export default _default;
//# sourceMappingURL=organizationService.d.ts.map
/**
 * Organization (Tenant) Service
 * Manages multi-tenant organizations with complete data isolation
 */

import {
    Organization,
    CreateOrganizationRequest,
    UpdateOrganizationRequest,
    SubscriptionPlan,
    SubscriptionStatus,
    SUBSCRIPTION_PRICING,
    PLAN_FEATURES,
} from '../types/organization.types';
import { AuditService } from './auditService';

// In-memory storage (will be moved to database with proper isolation)
const organizations = new Map<string, Organization>();
const subdomainIndex = new Map<string, string>(); // subdomain -> org ID

class OrganizationService {
    /**
     * Create a new organization (tenant)
     */
    createOrganization(data: CreateOrganizationRequest, createdBy?: string): Organization {
        // Validate subdomain is available
        if (this.isSubdomainTaken(data.subdomain)) {
            throw new Error(`Subdomain "${data.subdomain}" is already taken`);
        }

        // Validate subdomain format (lowercase, alphanumeric, hyphens)
        if (!/^[a-z0-9-]+$/.test(data.subdomain)) {
            throw new Error('Subdomain must contain only lowercase letters, numbers, and hyphens');
        }

        const planConfig = SUBSCRIPTION_PRICING[data.plan];
        const planFeatures = PLAN_FEATURES[data.plan];
        const now = new Date();
        const isTrial = data.plan === SubscriptionPlan.TRIAL;

        const organization: Organization = {
            id: `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: data.name,
            subdomain: data.subdomain.toLowerCase(),
            domain: data.domain,
            industry: data.industry,
            size: data.size,
            country: data.country,
            timezone: 'America/New_York', // Default
            primaryContactName: data.primaryContactName,
            primaryContactEmail: data.primaryContactEmail,
            primaryContactPhone: data.primaryContactPhone,
            
            subscription: {
                plan: data.plan,
                status: isTrial ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE,
                seats: planConfig.seats,
                usedSeats: 0,
                modules: planConfig.modules,
                billingCycle: 'annual',
                amount: planConfig.price,
                startDate: now,
                endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year
                trialEndDate: isTrial ? new Date(now.getTime() + planConfig.duration * 24 * 60 * 60 * 1000) : undefined,
                autoRenew: true,
            },
            
            branding: {
                companyName: data.name,
            },
            
            settings: {
                allowSSOOnly: false,
                passwordPolicy: {
                    minLength: 8,
                    requireUppercase: true,
                    requireLowercase: true,
                    requireNumbers: true,
                    requireSpecialChars: true,
                },
                mfaRequired: false,
                sessionTimeout: 30, // 30 minutes
                dataResidency: 'us',
                retentionPeriod: 90, // 90 days
                notificationEmail: data.primaryContactEmail,
                allowEmailNotifications: true,
                allowSlackIntegration: false,
            },
            
            features: planFeatures,
            
            status: isTrial ? 'trial' : 'active',
            createdAt: now,
            createdBy,
            updatedAt: now,
        };

        // Store organization
        organizations.set(organization.id, organization);
        subdomainIndex.set(organization.subdomain, organization.id);

        AuditService.log({
            userId: createdBy || 'system',
            userName: 'System',
            action: 'create_organization',
            resourceType: 'Organization',
            resourceId: organization.id,
            resourceName: organization.name,
            status: 'success',
            details: `Created organization ${organization.name} (${organization.subdomain})`,
        });

        return organization;
    }

    /**
     * Get organization by ID
     */
    getOrganizationById(orgId: string): Organization | null {
        return organizations.get(orgId) || null;
    }

    /**
     * Get organization by subdomain
     */
    getOrganizationBySubdomain(subdomain: string): Organization | null {
        const orgId = subdomainIndex.get(subdomain.toLowerCase());
        if (!orgId) return null;
        return organizations.get(orgId) || null;
    }

    /**
     * Get all organizations (admin only)
     */
    getAllOrganizations(): Organization[] {
        return Array.from(organizations.values()).filter(org => org.status !== 'deleted');
    }

    /**
     * Update organization
     */
    updateOrganization(orgId: string, updates: UpdateOrganizationRequest, updatedBy: string): Organization | null {
        const org = organizations.get(orgId);
        if (!org) return null;

        const updated: Organization = {
            ...org,
            ...updates,
            branding: updates.branding ? { ...org.branding, ...updates.branding } : org.branding,
            settings: updates.settings ? { ...org.settings, ...updates.settings } : org.settings,
            updatedAt: new Date(),
        };

        organizations.set(orgId, updated);

        AuditService.log({
            userId: updatedBy,
            userName: 'Admin',
            action: 'update_organization',
            resourceType: 'Organization',
            resourceId: orgId,
            resourceName: org.name,
            changes: updates,
            status: 'success',
            details: `Updated organization ${org.name}`,
        });

        return updated;
    }

    /**
     * Update organization subscription
     */
    updateSubscription(
        orgId: string,
        plan: SubscriptionPlan,
        updatedBy: string
    ): Organization | null {
        const org = organizations.get(orgId);
        if (!org) return null;

        const planConfig = SUBSCRIPTION_PRICING[plan];
        const planFeatures = PLAN_FEATURES[plan];
        const now = new Date();

        const updated: Organization = {
            ...org,
            subscription: {
                ...org.subscription,
                plan,
                status: SubscriptionStatus.ACTIVE,
                seats: planConfig.seats,
                modules: planConfig.modules,
                amount: planConfig.price,
                startDate: now,
                endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
            },
            features: planFeatures,
            updatedAt: now,
        };

        organizations.set(orgId, updated);

        AuditService.log({
            userId: updatedBy,
            userName: 'Admin',
            action: 'update_subscription',
            resourceType: 'Organization',
            resourceId: orgId,
            resourceName: org.name,
            changes: { plan, price: planConfig.price },
            status: 'success',
            details: `Updated subscription to ${plan} - $${planConfig.price}/year`,
        });

        return updated;
    }

    /**
     * Suspend organization (payment issues, policy violation)
     */
    suspendOrganization(orgId: string, reason: string, suspendedBy: string): boolean {
        const org = organizations.get(orgId);
        if (!org) return false;

        org.status = 'suspended';
        org.subscription.status = SubscriptionStatus.SUSPENDED;
        org.updatedAt = new Date();

        organizations.set(orgId, org);

        AuditService.log({
            userId: suspendedBy,
            userName: 'Admin',
            action: 'suspend_organization',
            resourceType: 'Organization',
            resourceId: orgId,
            resourceName: org.name,
            status: 'success',
            details: `Suspended organization: ${reason}`,
        });

        return true;
    }

    /**
     * Reactivate organization
     */
    reactivateOrganization(orgId: string, reactivatedBy: string): boolean {
        const org = organizations.get(orgId);
        if (!org) return false;

        org.status = 'active';
        org.subscription.status = SubscriptionStatus.ACTIVE;
        org.updatedAt = new Date();

        organizations.set(orgId, org);

        AuditService.log({
            userId: reactivatedBy,
            userName: 'Admin',
            action: 'reactivate_organization',
            resourceType: 'Organization',
            resourceId: orgId,
            resourceName: org.name,
            status: 'success',
            details: 'Reactivated organization',
        });

        return true;
    }

    /**
     * Soft delete organization
     */
    deleteOrganization(orgId: string, deletedBy: string): boolean {
        const org = organizations.get(orgId);
        if (!org) return false;

        org.status = 'deleted';
        org.deletedAt = new Date();
        org.updatedAt = new Date();

        organizations.set(orgId, org);

        AuditService.log({
            userId: deletedBy,
            userName: 'Admin',
            action: 'delete_organization',
            resourceType: 'Organization',
            resourceId: orgId,
            resourceName: org.name,
            status: 'success',
            details: 'Soft deleted organization',
        });

        return true;
    }

    /**
     * Check if subdomain is taken
     */
    isSubdomainTaken(subdomain: string): boolean {
        return subdomainIndex.has(subdomain.toLowerCase());
    }

    /**
     * Check if organization has available seats
     */
    hasAvailableSeats(orgId: string): boolean {
        const org = organizations.get(orgId);
        if (!org) return false;
        return org.subscription.usedSeats < org.subscription.seats;
    }

    /**
     * Increment used seats (when user is added)
     */
    incrementUsedSeats(orgId: string): void {
        const org = organizations.get(orgId);
        if (!org) return;
        
        org.subscription.usedSeats++;
        organizations.set(orgId, org);
    }

    /**
     * Decrement used seats (when user is removed)
     */
    decrementUsedSeats(orgId: string): void {
        const org = organizations.get(orgId);
        if (!org) return;
        
        if (org.subscription.usedSeats > 0) {
            org.subscription.usedSeats--;
            organizations.set(orgId, org);
        }
    }

    /**
     * Check if organization has access to a feature
     */
    hasFeature(orgId: string, feature: keyof Organization['features']): boolean {
        const org = organizations.get(orgId);
        if (!org || org.status === 'suspended') return false;
        return org.features[feature] || false;
    }

    /**
     * Check if organization has access to a module
     */
    hasModule(orgId: string, module: string): boolean {
        const org = organizations.get(orgId);
        if (!org || org.status === 'suspended') return false;
        return org.subscription.modules.includes(module);
    }

    /**
     * Check if trial is expired
     */
    isTrialExpired(orgId: string): boolean {
        const org = organizations.get(orgId);
        if (!org) return true;
        
        if (org.subscription.status === SubscriptionStatus.TRIAL && org.subscription.trialEndDate) {
            return org.subscription.trialEndDate < new Date();
        }
        
        return false;
    }

    /**
     * Get organization stats
     */
    getOrganizationStats(orgId: string) {
        const org = organizations.get(orgId);
        if (!org) return null;

        return {
            totalSeats: org.subscription.seats,
            usedSeats: org.subscription.usedSeats,
            availableSeats: org.subscription.seats - org.subscription.usedSeats,
            subscriptionStatus: org.subscription.status,
            plan: org.subscription.plan,
            daysUntilRenewal: Math.ceil(
                (org.subscription.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            ),
            isTrialExpired: this.isTrialExpired(orgId),
            enabledModules: org.subscription.modules,
            enabledFeatures: Object.entries(org.features)
                .filter(([_, enabled]) => enabled)
                .map(([feature]) => feature),
        };
    }
}

// Export singleton instance
export default new OrganizationService();

// Initialize demo organization
const initializeDemoOrganization = () => {
    const demoOrg: CreateOrganizationRequest = {
        name: 'Sinfosecurity Demo Corp',
        subdomain: 'demo',
        domain: 'sinfosecurity.com',
        industry: 'Technology',
        size: 'medium',
        country: 'United States',
        primaryContactName: 'Demo Admin',
        primaryContactEmail: 'admin@sinfosecurity.com',
        plan: SubscriptionPlan.ENTERPRISE,
    };

    const orgService = new OrganizationService();
    orgService.createOrganization(demoOrg, 'system');
};

// Initialize demo data
initializeDemoOrganization();


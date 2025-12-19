/**
 * Organization (Tenant) Types
 * Each customer company is an organization with isolated data
 */

export enum SubscriptionPlan {
    TRIAL = 'trial',
    STARTER = 'starter',
    PROFESSIONAL = 'professional',
    ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
    ACTIVE = 'active',
    TRIAL = 'trial',
    EXPIRED = 'expired',
    SUSPENDED = 'suspended',
    CANCELLED = 'cancelled',
}

export interface OrganizationSubscription {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    seats: number; // Number of user seats
    usedSeats: number; // Currently used seats
    modules: string[]; // Enabled modules: ['risk', 'compliance', 'vendor', 'ai', 'monitoring']
    billingCycle: 'monthly' | 'annual';
    amount: number; // Annual amount in USD
    startDate: Date;
    endDate: Date;
    trialEndDate?: Date;
    autoRenew: boolean;
}

export interface OrganizationBranding {
    logo?: string; // URL to logo
    primaryColor?: string; // Hex color #667eea
    secondaryColor?: string;
    companyName?: string; // Display name (can differ from legal name)
}

export interface OrganizationSettings {
    // Authentication
    allowSSOOnly: boolean;
    ssoProvider?: 'okta' | 'azure-ad' | 'google' | 'custom-saml';
    ssoConfig?: {
        entityId?: string;
        ssoUrl?: string;
        certificate?: string;
    };
    
    // Security
    passwordPolicy: {
        minLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
        expiryDays?: number; // Password expiration
    };
    
    mfaRequired: boolean; // Force MFA for all users
    sessionTimeout: number; // Minutes of inactivity before logout
    ipWhitelist?: string[]; // Allowed IP addresses
    
    // Data & Compliance
    dataResidency: 'us' | 'eu' | 'apac' | 'multi-region';
    retentionPeriod: number; // Days to retain deleted data
    
    // Notifications
    notificationEmail: string; // Admin notification email
    allowEmailNotifications: boolean;
    allowSlackIntegration: boolean;
}

export interface Organization {
    id: string; // org_xxx
    name: string; // Legal company name
    subdomain: string; // Unique subdomain (e.g., 'acme' for acme.grc-sinfosecurity.com)
    domain?: string; // Company email domain (e.g., 'acme.com')
    
    // Contact
    industry?: string;
    size?: 'small' | 'medium' | 'large' | 'enterprise'; // 1-50, 51-250, 251-1000, 1000+
    country?: string;
    timezone?: string;
    
    // Primary contact
    primaryContactName: string;
    primaryContactEmail: string;
    primaryContactPhone?: string;
    
    // Subscription
    subscription: OrganizationSubscription;
    
    // Customization
    branding: OrganizationBranding;
    settings: OrganizationSettings;
    
    // Metadata
    status: 'active' | 'trial' | 'suspended' | 'deleted';
    createdAt: Date;
    createdBy?: string; // User ID who created (for self-serve signup)
    updatedAt: Date;
    deletedAt?: Date; // Soft delete
    
    // Feature flags
    features: {
        aiInsights: boolean;
        continuousMonitoring: boolean;
        vendorRiskManagement: boolean;
        businessContinuity: boolean;
        customReporting: boolean;
        apiAccess: boolean;
        whiteLabel: boolean;
    };
}

export interface CreateOrganizationRequest {
    name: string;
    subdomain: string;
    domain?: string;
    industry?: string;
    size?: 'small' | 'medium' | 'large' | 'enterprise';
    country?: string;
    primaryContactName: string;
    primaryContactEmail: string;
    primaryContactPhone?: string;
    plan: SubscriptionPlan;
}

export interface UpdateOrganizationRequest {
    name?: string;
    industry?: string;
    size?: 'small' | 'medium' | 'large' | 'enterprise';
    country?: string;
    timezone?: string;
    primaryContactName?: string;
    primaryContactEmail?: string;
    primaryContactPhone?: string;
    branding?: Partial<OrganizationBranding>;
    settings?: Partial<OrganizationSettings>;
}

// Subscription plan pricing (annual)
export const SUBSCRIPTION_PRICING = {
    [SubscriptionPlan.TRIAL]: {
        price: 0,
        seats: 5,
        modules: ['risk', 'compliance'],
        duration: 14, // days
    },
    [SubscriptionPlan.STARTER]: {
        price: 6000, // $6K/year
        seats: 10,
        modules: ['risk', 'compliance', 'policies', 'incidents'],
    },
    [SubscriptionPlan.PROFESSIONAL]: {
        price: 18000, // $18K/year
        seats: 25,
        modules: ['risk', 'compliance', 'policies', 'incidents', 'vendor', 'monitoring'],
    },
    [SubscriptionPlan.ENTERPRISE]: {
        price: 50000, // $50K/year (starting)
        seats: 100,
        modules: ['risk', 'compliance', 'policies', 'incidents', 'vendor', 'monitoring', 'ai', 'business-continuity'],
    },
};

// Feature flags by plan
export const PLAN_FEATURES = {
    [SubscriptionPlan.TRIAL]: {
        aiInsights: false,
        continuousMonitoring: false,
        vendorRiskManagement: false,
        businessContinuity: false,
        customReporting: false,
        apiAccess: false,
        whiteLabel: false,
    },
    [SubscriptionPlan.STARTER]: {
        aiInsights: false,
        continuousMonitoring: false,
        vendorRiskManagement: true,
        businessContinuity: false,
        customReporting: false,
        apiAccess: false,
        whiteLabel: false,
    },
    [SubscriptionPlan.PROFESSIONAL]: {
        aiInsights: true,
        continuousMonitoring: true,
        vendorRiskManagement: true,
        businessContinuity: true,
        customReporting: true,
        apiAccess: false,
        whiteLabel: false,
    },
    [SubscriptionPlan.ENTERPRISE]: {
        aiInsights: true,
        continuousMonitoring: true,
        vendorRiskManagement: true,
        businessContinuity: true,
        customReporting: true,
        apiAccess: true,
        whiteLabel: true,
    },
};






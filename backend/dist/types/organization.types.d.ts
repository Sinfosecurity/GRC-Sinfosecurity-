/**
 * Organization (Tenant) Types
 * Each customer company is an organization with isolated data
 */
export declare enum SubscriptionPlan {
    TRIAL = "trial",
    STARTER = "starter",
    PROFESSIONAL = "professional",
    ENTERPRISE = "enterprise"
}
export declare enum SubscriptionStatus {
    ACTIVE = "active",
    TRIAL = "trial",
    EXPIRED = "expired",
    SUSPENDED = "suspended",
    CANCELLED = "cancelled"
}
export interface OrganizationSubscription {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    seats: number;
    usedSeats: number;
    modules: string[];
    billingCycle: 'monthly' | 'annual';
    amount: number;
    startDate: Date;
    endDate: Date;
    trialEndDate?: Date;
    autoRenew: boolean;
}
export interface OrganizationBranding {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    companyName?: string;
}
export interface OrganizationSettings {
    allowSSOOnly: boolean;
    ssoProvider?: 'okta' | 'azure-ad' | 'google' | 'custom-saml';
    ssoConfig?: {
        entityId?: string;
        ssoUrl?: string;
        certificate?: string;
    };
    passwordPolicy: {
        minLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
        expiryDays?: number;
    };
    mfaRequired: boolean;
    sessionTimeout: number;
    ipWhitelist?: string[];
    dataResidency: 'us' | 'eu' | 'apac' | 'multi-region';
    retentionPeriod: number;
    notificationEmail: string;
    allowEmailNotifications: boolean;
    allowSlackIntegration: boolean;
}
export interface Organization {
    id: string;
    name: string;
    subdomain: string;
    domain?: string;
    industry?: string;
    size?: 'small' | 'medium' | 'large' | 'enterprise';
    country?: string;
    timezone?: string;
    primaryContactName: string;
    primaryContactEmail: string;
    primaryContactPhone?: string;
    subscription: OrganizationSubscription;
    branding: OrganizationBranding;
    settings: OrganizationSettings;
    status: 'active' | 'trial' | 'suspended' | 'deleted';
    createdAt: Date;
    createdBy?: string;
    updatedAt: Date;
    deletedAt?: Date;
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
export declare const SUBSCRIPTION_PRICING: {
    trial: {
        price: number;
        seats: number;
        modules: string[];
        duration: number;
    };
    starter: {
        price: number;
        seats: number;
        modules: string[];
    };
    professional: {
        price: number;
        seats: number;
        modules: string[];
    };
    enterprise: {
        price: number;
        seats: number;
        modules: string[];
    };
};
export declare const PLAN_FEATURES: {
    trial: {
        aiInsights: boolean;
        continuousMonitoring: boolean;
        vendorRiskManagement: boolean;
        businessContinuity: boolean;
        customReporting: boolean;
        apiAccess: boolean;
        whiteLabel: boolean;
    };
    starter: {
        aiInsights: boolean;
        continuousMonitoring: boolean;
        vendorRiskManagement: boolean;
        businessContinuity: boolean;
        customReporting: boolean;
        apiAccess: boolean;
        whiteLabel: boolean;
    };
    professional: {
        aiInsights: boolean;
        continuousMonitoring: boolean;
        vendorRiskManagement: boolean;
        businessContinuity: boolean;
        customReporting: boolean;
        apiAccess: boolean;
        whiteLabel: boolean;
    };
    enterprise: {
        aiInsights: boolean;
        continuousMonitoring: boolean;
        vendorRiskManagement: boolean;
        businessContinuity: boolean;
        customReporting: boolean;
        apiAccess: boolean;
        whiteLabel: boolean;
    };
};
//# sourceMappingURL=organization.types.d.ts.map
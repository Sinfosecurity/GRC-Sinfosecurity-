"use strict";
/**
 * Organization (Tenant) Types
 * Each customer company is an organization with isolated data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_FEATURES = exports.SUBSCRIPTION_PRICING = exports.SubscriptionStatus = exports.SubscriptionPlan = void 0;
var SubscriptionPlan;
(function (SubscriptionPlan) {
    SubscriptionPlan["TRIAL"] = "trial";
    SubscriptionPlan["STARTER"] = "starter";
    SubscriptionPlan["PROFESSIONAL"] = "professional";
    SubscriptionPlan["ENTERPRISE"] = "enterprise";
})(SubscriptionPlan || (exports.SubscriptionPlan = SubscriptionPlan = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["TRIAL"] = "trial";
    SubscriptionStatus["EXPIRED"] = "expired";
    SubscriptionStatus["SUSPENDED"] = "suspended";
    SubscriptionStatus["CANCELLED"] = "cancelled";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
// Subscription plan pricing (annual)
exports.SUBSCRIPTION_PRICING = {
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
exports.PLAN_FEATURES = {
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
//# sourceMappingURL=organization.types.js.map
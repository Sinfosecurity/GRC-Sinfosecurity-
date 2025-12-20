"use strict";
/**
 * Subdomain Detection Middleware
 * Extracts organization from subdomain and adds to request context
 * Supports: acme.grc-sinfosecurity.com → organizationId
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subdomainMiddleware = subdomainMiddleware;
exports.requireOrganization = requireOrganization;
exports.optionalOrganization = optionalOrganization;
exports.requireFeature = requireFeature;
exports.requireModule = requireModule;
const organizationService_1 = __importDefault(require("../services/organizationService"));
/**
 * Extract subdomain from hostname
 * Examples:
 *   acme.grc-sinfosecurity.com → 'acme'
 *   demo.localhost:3000 → 'demo'
 *   localhost:3000 → null (no subdomain)
 */
function extractSubdomain(hostname) {
    // Remove port if present
    const host = hostname.split(':')[0];
    // Split by dots
    const parts = host.split('.');
    // Development: demo.localhost → 'demo'
    if (parts.length === 2 && parts[1] === 'localhost') {
        return parts[0];
    }
    // Production: acme.grc-sinfosecurity.com → 'acme'
    // Ignore 'www' subdomain
    if (parts.length >= 3) {
        const subdomain = parts[0];
        if (subdomain === 'www') {
            return null; // www is not a tenant subdomain
        }
        return subdomain;
    }
    // No subdomain found
    return null;
}
/**
 * Subdomain detection middleware
 * Adds organization context to req.organization
 */
function subdomainMiddleware(req, res, next) {
    try {
        const hostname = req.hostname || req.get('host') || '';
        const subdomain = extractSubdomain(hostname);
        // If no subdomain, continue without organization context
        // (e.g., main landing page, sign-up page)
        if (!subdomain) {
            return next();
        }
        // Look up organization by subdomain
        const organization = organizationService_1.default.getOrganizationBySubdomain(subdomain);
        if (!organization) {
            return res.status(404).json({
                success: false,
                error: 'Organization not found',
                message: `No organization found for subdomain: ${subdomain}`,
            });
        }
        // Check if organization is active
        if (organization.status === 'suspended') {
            return res.status(403).json({
                success: false,
                error: 'Organization suspended',
                message: 'This organization has been suspended. Please contact support.',
            });
        }
        if (organization.status === 'deleted') {
            return res.status(410).json({
                success: false,
                error: 'Organization deleted',
                message: 'This organization no longer exists.',
            });
        }
        // Check if trial is expired
        if (organizationService_1.default.isTrialExpired(organization.id)) {
            return res.status(402).json({
                success: false,
                error: 'Trial expired',
                message: 'Your trial has expired. Please upgrade to continue using the platform.',
                trialEndDate: organization.subscription.trialEndDate,
            });
        }
        // Add organization context to request
        req.organization = {
            id: organization.id,
            subdomain: organization.subdomain,
            name: organization.name,
            status: organization.status,
        };
        next();
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to process request',
            message: error.message,
        });
    }
}
/**
 * Require organization middleware
 * Use this on routes that MUST have an organization context
 */
function requireOrganization(req, res, next) {
    if (!req.organization) {
        return res.status(400).json({
            success: false,
            error: 'Organization required',
            message: 'This endpoint requires organization context. Please access via your organization subdomain.',
        });
    }
    next();
}
/**
 * Optional organization middleware
 * Adds organization context if available, but doesn't require it
 */
function optionalOrganization(req, res, next) {
    // Always proceed, just try to add context if possible
    const hostname = req.hostname || req.get('host') || '';
    const subdomain = extractSubdomain(hostname);
    if (subdomain) {
        const organization = organizationService_1.default.getOrganizationBySubdomain(subdomain);
        if (organization && organization.status === 'active') {
            req.organization = {
                id: organization.id,
                subdomain: organization.subdomain,
                name: organization.name,
                status: organization.status,
            };
        }
    }
    next();
}
/**
 * Feature check middleware factory
 * Use: requireFeature('aiInsights')
 */
function requireFeature(feature) {
    return (req, res, next) => {
        if (!req.organization) {
            return res.status(400).json({
                success: false,
                error: 'Organization required',
            });
        }
        const hasFeature = organizationService_1.default.hasFeature(req.organization.id, feature);
        if (!hasFeature) {
            return res.status(403).json({
                success: false,
                error: 'Feature not available',
                message: `Your subscription plan does not include access to ${feature}. Please upgrade to access this feature.`,
                feature,
            });
        }
        next();
    };
}
/**
 * Module check middleware factory
 * Use: requireModule('vendor')
 */
function requireModule(module) {
    return (req, res, next) => {
        if (!req.organization) {
            return res.status(400).json({
                success: false,
                error: 'Organization required',
            });
        }
        const hasModule = organizationService_1.default.hasModule(req.organization.id, module);
        if (!hasModule) {
            return res.status(403).json({
                success: false,
                error: 'Module not available',
                message: `Your subscription plan does not include the ${module} module. Please upgrade to access this module.`,
                module,
            });
        }
        next();
    };
}
exports.default = {
    subdomainMiddleware,
    requireOrganization,
    optionalOrganization,
    requireFeature,
    requireModule,
};
//# sourceMappingURL=subdomain.middleware.js.map
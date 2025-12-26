/**
 * Subdomain Detection Middleware
 * Extracts organization from subdomain and adds to request context
 * Supports: acme.grc-sinfosecurity.com → organizationId
 */

import { Request, Response, NextFunction } from 'express';
import OrganizationService from '../services/organizationService';

// Extend Express Request to include organization context
declare global {
    namespace Express {
        interface Request {
            organization?: {
                id: string;
                subdomain: string;
                name: string;
                status: string;
            };
        }
    }
}

/**
 * Extract subdomain from hostname
 * Examples:
 *   acme.grc-sinfosecurity.com → 'acme'
 *   demo.localhost:3000 → 'demo'
 *   localhost:3000 → null (no subdomain)
 */
function extractSubdomain(hostname: string): string | null {
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
export function subdomainMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const hostname = req.hostname || req.get('host') || '';
        const subdomain = extractSubdomain(hostname);
        
        // If no subdomain, continue without organization context
        // (e.g., main landing page, sign-up page)
        if (!subdomain) {
            return next();
        }
        
        // Look up organization by subdomain
        const organization = OrganizationService.getOrganizationBySubdomain(subdomain);
        
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
        if (OrganizationService.isTrialExpired(organization.id)) {
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
    } catch (error: any) {
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
export function requireOrganization(req: Request, res: Response, next: NextFunction) {
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
export function optionalOrganization(req: Request, res: Response, next: NextFunction) {
    // Always proceed, just try to add context if possible
    const hostname = req.hostname || req.get('host') || '';
    const subdomain = extractSubdomain(hostname);
    
    if (subdomain) {
        const organization = OrganizationService.getOrganizationBySubdomain(subdomain);
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
export function requireFeature(feature: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.organization) {
            return res.status(400).json({
                success: false,
                error: 'Organization required',
            });
        }
        
        const hasFeature = OrganizationService.hasFeature(
            req.organization.id,
            feature as any
        );
        
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
export function requireModule(module: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.organization) {
            return res.status(400).json({
                success: false,
                error: 'Organization required',
            });
        }
        
        const hasModule = OrganizationService.hasModule(
            req.organization.id,
            module
        );
        
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

export default {
    subdomainMiddleware,
    requireOrganization,
    optionalOrganization,
    requireFeature,
    requireModule,
};









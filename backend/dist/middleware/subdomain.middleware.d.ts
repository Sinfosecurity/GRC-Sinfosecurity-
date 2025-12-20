/**
 * Subdomain Detection Middleware
 * Extracts organization from subdomain and adds to request context
 * Supports: acme.grc-sinfosecurity.com → organizationId
 */
import { Request, Response, NextFunction } from 'express';
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
 * Subdomain detection middleware
 * Adds organization context to req.organization
 */
export declare function subdomainMiddleware(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
/**
 * Require organization middleware
 * Use this on routes that MUST have an organization context
 */
export declare function requireOrganization(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * Optional organization middleware
 * Adds organization context if available, but doesn't require it
 */
export declare function optionalOrganization(req: Request, res: Response, next: NextFunction): void;
/**
 * Feature check middleware factory
 * Use: requireFeature('aiInsights')
 */
export declare function requireFeature(feature: string): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Module check middleware factory
 * Use: requireModule('vendor')
 */
export declare function requireModule(module: string): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
declare const _default: {
    subdomainMiddleware: typeof subdomainMiddleware;
    requireOrganization: typeof requireOrganization;
    optionalOrganization: typeof optionalOrganization;
    requireFeature: typeof requireFeature;
    requireModule: typeof requireModule;
};
export default _default;
//# sourceMappingURL=subdomain.middleware.d.ts.map
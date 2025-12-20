import { Request, Response, NextFunction } from 'express';
import { Permission } from '../services/userService';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
}
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function authorize(...roles: string[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const requireRole: typeof authorize;
/**
 * Check if user has required permission
 */
export declare function requirePermission(...permissions: Permission[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Optional authentication - attaches user if available but doesn't require it
 */
export declare function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map
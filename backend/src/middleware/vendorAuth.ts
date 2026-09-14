import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';
import { AuthRequest } from './auth';
import { prisma } from '../config/database';
import { getEnv } from '../config/env';
import { VENDOR_PLANE } from '../security/sessionPlane';

export interface VendorActor {
    sessionId: string;
    contactId: string;
    vendorId: string;
    organizationId: string;
    email: string;
    name: string;
    plane: typeof VENDOR_PLANE;
}

export interface VendorAuthRequest extends AuthRequest {
    vendor?: VendorActor;
}

export async function authenticateVendor(req: VendorAuthRequest, _res: Response, next: NextFunction) {
    try {
        let token = req.cookies?.vendorToken;
        if (!token) {
            token = req.headers.authorization?.replace('Bearer ', '');
        }
        if (!token) {
            throw new ApiError(401, 'Authentication token required');
        }
        const decoded = jwt.verify(token, getEnv().jwtSecret, { algorithms: ['HS256'] }) as {
            plane?: string;
            kind?: string;
            sessionId?: string;
            contactId?: string;
            vendorId?: string;
            organizationId?: string;
        };
        if (decoded.plane !== VENDOR_PLANE || decoded.kind !== 'vendor_session' || !decoded.sessionId) {
            throw new ApiError(401, 'Invalid or expired token');
        }
        const session = await prisma.vendorPortalSession.findFirst({
            where: { id: decoded.sessionId, organizationId: decoded.organizationId, vendorId: decoded.vendorId },
            include: {
                contact: { select: { id: true, name: true, email: true, vendorId: true } },
                vendor: { select: { id: true, organizationId: true } },
            },
        });
        if (!session || session.revokedAt || session.expiresAt < new Date()) {
            throw new ApiError(401, 'Invalid or expired token');
        }
        if (session.vendorContactId !== decoded.contactId || session.vendor.organizationId !== session.organizationId) {
            throw new ApiError(401, 'Invalid or expired token');
        }
        await prisma.vendorPortalSession.update({
            where: { id: session.id },
            data: { lastSeenAt: new Date() },
        });
        req.vendor = {
            sessionId: session.id,
            contactId: session.vendorContactId,
            vendorId: session.vendorId,
            organizationId: session.organizationId,
            email: session.contact.email,
            name: session.contact.name,
            plane: VENDOR_PLANE,
        };
        next();
    } catch (error) {
        if (error instanceof ApiError) return next(error);
        next(new ApiError(401, 'Invalid or expired token'));
    }
}

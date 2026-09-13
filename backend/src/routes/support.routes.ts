import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireTenant } from '../security/tenant';
import { actorMeta } from '../security/platform';
import { supportTicketService } from '../services/supportTicketService';
import { supportAccessService } from '../services/supportAccessService';
import { SupportTicketCategory } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler';
import { prisma } from '../config/database';

const FEEDBACK_CATEGORY: Record<string, string> = {
    BUG: 'OTHER',
    UX: 'HOW_TO',
    FEATURE: 'FEATURE_REQUEST',
    SECURITY: 'SECURITY',
    PERFORMANCE: 'PERFORMANCE',
    DOCUMENTATION: 'HOW_TO',
};

const router = Router();
router.use(authenticate);

router.post('/tickets', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        if (req.body?.organizationId && req.body.organizationId !== organizationId) {
            throw new ApiError(403, 'Cannot act on another organization');
        }
        const evidenceObjectId = req.body?.evidenceObjectId ? String(req.body.evidenceObjectId) : '';
        if (evidenceObjectId) {
            const object = await prisma.storedObject.findFirst({
                where: { id: evidenceObjectId, organizationId },
                select: { scanStatus: true },
            });
            if (!object) {
                throw new ApiError(404, 'Referenced evidence was not found in this organization');
            }
            if (object.scanStatus !== 'CLEAN') {
                throw new ApiError(403, 'Only CLEAN evidence can be attached to feedback');
            }
        }
        const kind = String(req.body?.kind || '').toUpperCase();
        const data = await supportTicketService.createFromCustomer({
            organizationId,
            userId: req.user!.id,
            requesterName: req.user!.name,
            requesterEmail: req.user!.email,
            subject: String(req.body?.subject || ''),
            description: String(req.body?.description || ''),
            category: (FEEDBACK_CATEGORY[kind] || req.body?.category) as SupportTicketCategory | undefined,
            requestedPriority: req.body?.priority || req.body?.requestedPriority,
            diagnosticContext: {
                route: req.body?.route,
                workflow: req.body?.workflow,
                kind: req.body?.kind,
                perceivedSeverity: req.body?.perceivedSeverity,
                evidenceObjectId: req.body?.evidenceObjectId,
                timestamp: new Date().toISOString(),
                requestId: actorMeta(req).requestId,
                userAgent: actorMeta(req).userAgent,
                environment: process.env.APP_ENVIRONMENT || process.env.NODE_ENV,
            },
            actor: actorMeta(req),
        });
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.get('/tickets', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supportTicketService.listForOrganization(requireTenant(req.user)) });
    } catch (error) {
        next(error);
    }
});

router.get('/tickets/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supportTicketService.getForOrganization(req.params.id, requireTenant(req.user)) });
    } catch (error) {
        next(error);
    }
});

router.post('/tickets/:id/messages', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (req.body?.visibility === 'INTERNAL') {
            throw new ApiError(403, 'Customers cannot create internal notes');
        }
        res.status(201).json({
            success: true,
            data: await supportTicketService.customerReply(
                req.params.id,
                requireTenant(req.user),
                req.user!.id,
                String(req.body?.body || '')
            ),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/access-requests', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supportAccessService.listForOrganization(requireTenant(req.user)) });
    } catch (error) {
        next(error);
    }
});

router.post('/access-requests/:id/approve', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await supportAccessService.customerApprove({
                id: req.params.id,
                actorUserId: req.user!.id,
                role: req.user!.role,
                organizationId: requireTenant(req.user),
                ...actorMeta(req),
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/access-requests/:id/deny', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await supportAccessService.customerDeny({
                id: req.params.id,
                actorUserId: req.user!.id,
                role: req.user!.role,
                organizationId: requireTenant(req.user),
                ...actorMeta(req),
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/access-requests/:id/revoke', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await supportAccessService.customerRevoke({
                id: req.params.id,
                actorUserId: req.user!.id,
                role: req.user!.role,
                organizationId: requireTenant(req.user),
                ...actorMeta(req),
            }),
        });
    } catch (error) {
        next(error);
    }
});

export default router;

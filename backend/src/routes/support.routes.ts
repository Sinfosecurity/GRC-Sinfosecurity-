import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireTenant } from '../security/tenant';
import { actorMeta } from '../security/platform';
import { supportTicketService } from '../services/supportTicketService';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.post('/tickets', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        if (req.body?.organizationId && req.body.organizationId !== organizationId) {
            throw new ApiError(403, 'Cannot act on another organization');
        }
        const data = await supportTicketService.createFromCustomer({
            organizationId,
            userId: req.user!.id,
            requesterName: req.user!.name,
            requesterEmail: req.user!.email,
            subject: String(req.body?.subject || ''),
            description: String(req.body?.description || ''),
            category: req.body?.category,
            requestedPriority: req.body?.priority || req.body?.requestedPriority,
            diagnosticContext: {
                route: req.body?.route,
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

export default router;

import { Router, Response, NextFunction } from 'express';
import { AuthRequest, authenticate, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { publicApiClientService } from '../publicApi/clientService';
import { webhookService } from '../publicApi/webhookService';
import { tenantIntegrationService } from '../publicApi/integrationCatalog';
import { prisma } from '../config/database';

const router = Router();
router.use(authenticate);
router.use(requirePermission(PERMISSIONS['integration.manage']));

function actor(req: AuthRequest) {
    return { organizationId: req.user!.organizationId, userId: req.user!.id };
}

router.get('/overview', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { organizationId } = actor(req);
        const [clients, hooks, integrations] = await Promise.all([
            publicApiClientService.list(organizationId),
            webhookService.list(organizationId),
            tenantIntegrationService.list(organizationId),
        ]);
        res.json({
            success: true,
            data: {
                clients: clients.length,
                webhooks: hooks.length,
                connectedIntegrations: integrations.filter((row) => row.status.key === 'connected').length,
                publicApiBase: '/public/v1',
                sinkUrl: webhookService.sinkUrl(organizationId),
                sinkToken: webhookService.sinkToken(organizationId),
            },
        });
    } catch (error) { next(error); }
});

router.get('/clients', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await publicApiClientService.list(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.post('/clients', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { organizationId, userId } = actor(req);
        res.status(201).json({ success: true, data: await publicApiClientService.create(organizationId, userId, req.body || {}) });
    } catch (error) { next(error); }
});

router.post('/clients/:id/rotate', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { organizationId, userId } = actor(req);
        res.json({ success: true, data: await publicApiClientService.rotate(organizationId, req.params.id, userId) });
    } catch (error) { next(error); }
});

router.post('/clients/:id/revoke', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { organizationId, userId } = actor(req);
        res.json({ success: true, data: await publicApiClientService.revoke(organizationId, req.params.id, userId) });
    } catch (error) { next(error); }
});

router.get('/webhooks', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await webhookService.list(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.get('/webhooks/events', (_req, res, next) => {
    try {
        const events = webhookService.events();
        res.json({ success: true, data: Array.isArray(events) ? events : [] });
    } catch (error) {
        next(error);
    }
});

router.post('/webhooks', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { organizationId, userId } = actor(req);
        res.status(201).json({ success: true, data: await webhookService.create(organizationId, userId, req.body || {}) });
    } catch (error) { next(error); }
});

router.patch('/webhooks/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { organizationId, userId } = actor(req);
        res.json({ success: true, data: await webhookService.update(organizationId, req.params.id, userId, req.body || {}) });
    } catch (error) { next(error); }
});

router.post('/webhooks/:id/rotate', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { organizationId, userId } = actor(req);
        res.json({ success: true, data: await webhookService.rotateSecret(organizationId, req.params.id, userId) });
    } catch (error) { next(error); }
});

router.post('/webhooks/:id/test', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { organizationId, userId } = actor(req);
        res.json({ success: true, data: await webhookService.test(organizationId, req.params.id, userId) });
    } catch (error) { next(error); }
});

router.post('/webhooks/:id/deliveries/:deliveryId/retry', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { organizationId, userId } = actor(req);
        res.json({ success: true, data: await webhookService.retry(organizationId, req.params.deliveryId, userId) });
    } catch (error) { next(error); }
});

router.get('/webhooks/:id/deliveries', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await webhookService.deliveries(actor(req).organizationId, req.params.id) }); }
    catch (error) { next(error); }
});

router.delete('/webhooks/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { organizationId, userId } = actor(req);
        res.json({ success: true, data: await webhookService.remove(organizationId, req.params.id, userId) });
    } catch (error) { next(error); }
});

router.get('/webhooks/sink/receipts', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await webhookService.listSink(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.get('/integrations', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await tenantIntegrationService.list(actor(req).organizationId) }); }
    catch (error) { next(error); }
});

router.post('/integrations/:provider', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { organizationId, userId } = actor(req);
        res.json({ success: true, data: await tenantIntegrationService.configure(organizationId, req.params.provider, userId, req.body || {}) });
    } catch (error) { next(error); }
});

router.post('/integrations/:provider/test', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { organizationId, userId } = actor(req);
        res.json({ success: true, data: await tenantIntegrationService.test(organizationId, req.params.provider, userId) });
    } catch (error) { next(error); }
});

router.post('/integrations/:provider/disable', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { organizationId, userId } = actor(req);
        res.json({ success: true, data: await tenantIntegrationService.disable(organizationId, req.params.provider, userId) });
    } catch (error) { next(error); }
});

router.post('/integrations/slack/notify', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await tenantIntegrationService.notifySlack(actor(req).organizationId, String(req.body?.text || 'Supreme staging notification')) });
    } catch (error) { next(error); }
});

router.get('/activity', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const rows = await prisma.auditEvent.findMany({
            where: {
                organizationId: actor(req).organizationId,
                OR: [
                    { action: { startsWith: 'api.' } },
                    { action: { startsWith: 'webhook.' } },
                    { action: { startsWith: 'integration.' } },
                ],
            },
            orderBy: { timestamp: 'desc' },
            take: 50,
            select: { id: true, action: true, result: true, timestamp: true, resourceType: true },
        });
        res.json({ success: true, data: rows });
    } catch (error) { next(error); }
});

export default router;

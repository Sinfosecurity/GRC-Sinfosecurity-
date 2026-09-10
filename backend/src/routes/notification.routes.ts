import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { listNotifications, markRead, emailStatus } from '../services/notificationDeliveryService';
import { prisma } from '../config/database';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const items = await listNotifications(req.user!.organizationId, req.user!.id);
        res.json({ success: true, data: items, emailProvider: emailStatus() });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await markRead(req.user!.organizationId, req.user!.id, req.params.id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

router.get('/preferences', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const prefs = await prisma.notificationPreference.findMany({
            where: { organizationId: req.user!.organizationId, userId: req.user!.id },
        });
        res.json({ success: true, data: prefs });
    } catch (error) {
        next(error);
    }
});

router.put('/preferences', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { eventType, inApp = true, email = true } = req.body || {};
        const pref = await prisma.notificationPreference.upsert({
            where: { userId_eventType: { userId: req.user!.id, eventType } },
            update: { inApp, email },
            create: {
                organizationId: req.user!.organizationId,
                userId: req.user!.id,
                eventType,
                inApp,
                email,
            },
        });
        res.json({ success: true, data: pref });
    } catch (error) {
        next(error);
    }
});

export default router;

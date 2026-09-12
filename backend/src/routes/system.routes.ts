import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { providerHealth } from '../services/providerHealth';
import { notify } from '../services/notificationDeliveryService';

const router = Router();
router.use(authenticate);

router.get('/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await providerHealth();
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/alert-test', requirePermission(PERMISSIONS['organization.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const title = 'SUPREME RISK — STAGING alert test';
        const body = `Critical-path alert test at ${new Date().toISOString()} for ${req.user!.organizationId}.`;
        const email = await notify({
            organizationId: req.user!.organizationId,
            userId: req.user!.id,
            eventType: 'ops.alert',
            title,
            body,
            resourceType: 'System',
            resourceId: 'alert-test',
            emailTo: req.user!.email,
        });

        let webhook: 'DELIVERED' | 'FAILED' | 'NOT_CONFIGURED' = 'NOT_CONFIGURED';
        if (process.env.ALERT_WEBHOOK_URL) {
            try {
                const response = await fetch(process.env.ALERT_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, body, environment: process.env.APP_ENVIRONMENT || 'staging' }),
                });
                webhook = response.ok ? 'DELIVERED' : 'FAILED';
            } catch {
                webhook = 'FAILED';
            }
        }

        res.json({
            success: true,
            data: {
                email: email.email,
                inApp: email.inApp,
                webhook,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;

import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { providerHealth } from '../services/providerHealth';
import { emailStatus, isEmailConfigured, notify, recordEmailDelivery } from '../services/notificationDeliveryService';
import { verifySmtpConnection } from '../services/smtpClient';
import { EMAIL_TEMPLATE_INVENTORY, emailPreviewFixtures } from '../services/transactionalEmail';

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
        const title = 'Supreme staging alert test';
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

router.post('/smtp-verify', requirePermission(PERMISSIONS['organization.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!isEmailConfigured()) {
            res.json({
                success: true,
                data: {
                    authenticated: false,
                    email: 'NOT_CONFIGURED',
                    emailProvider: emailStatus(),
                },
            });
            return;
        }
        const verified = await verifySmtpConnection();
        const delivery = await notify({
            organizationId: req.user!.organizationId,
            userId: req.user!.id,
            eventType: 'ops.alert',
            title: 'Supreme SMTP verification',
            body: 'Controlled SMTP verification for the signed-in administrator. No tenant workflow was created.',
            resourceType: 'System',
            resourceId: 'smtp-verify',
            emailTo: req.user!.email,
        });
        res.json({
            success: true,
            data: {
                authenticated: verified.authenticated,
                email: delivery.email,
                emailProvider: emailStatus(),
            },
        });
    } catch {
        recordEmailDelivery(false);
        res.json({
            success: true,
            data: {
                authenticated: false,
                email: 'FAILED',
                emailProvider: emailStatus(),
            },
        });
    }
});

router.get('/email-previews', requirePermission(PERMISSIONS['organization.manage']), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const fixtures = emailPreviewFixtures();
        res.json({
            success: true,
            data: {
                sent: false,
                inventory: EMAIL_TEMPLATE_INVENTORY,
                previews: fixtures.map((item) => ({
                    templateKey: item.templateKey,
                    subject: item.subject,
                    fromName: item.fromName,
                    text: item.text,
                    html: item.html,
                })),
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;

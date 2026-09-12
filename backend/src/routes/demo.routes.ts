import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { ApiError } from '../middleware/errorHandler';
import { authRateLimiter } from '../middleware/rateLimiter';
import { emailStatus } from '../services/notificationDeliveryService';
import { sendSmtpMail } from '../services/smtpClient';
import { isProviderConfigured } from '../config/env';
import logger from '../config/logger';

const router = Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function storePath() {
    return path.join(__dirname, '../../data/demo-requests.jsonl');
}

function persist(record: Record<string, unknown>) {
    const file = storePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
}

router.post('/', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const name = String(req.body?.name || '').trim();
        const email = String(req.body?.email || '').trim().toLowerCase();
        const company = String(req.body?.company || '').trim();
        const role = String(req.body?.role || '').trim();
        const companySize = String(req.body?.companySize || '').trim();
        const primaryNeed = String(req.body?.primaryNeed || '').trim();
        const intent = String(req.body?.intent || 'demo').trim();
        const plan = String(req.body?.selectedPlan || req.body?.plan || '').trim();
        const source = String(req.body?.source || '').trim();

        if (name.length < 2 || company.length < 2 || !role || !companySize || primaryNeed.length < 8) {
            throw new ApiError(400, 'Name, business email, company, role, company size, and primary need are required');
        }
        if (!EMAIL.test(email)) {
            throw new ApiError(400, 'A valid business email is required');
        }

        const record = {
            receivedAt: new Date().toISOString(),
            name,
            email,
            company,
            role,
            companySize,
            primaryNeed,
            intent,
            plan: plan || undefined,
            selectedPlan: plan || undefined,
            source: source || undefined,
        };
        persist(record);

        const inbox = process.env.DEMO_INQUIRY_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL;
        if (emailStatus() === 'NOT_CONFIGURED' || !inbox) {
            logger.info('Demo request stored; email delivery NOT_CONFIGURED');
            res.status(202).json({
                success: true,
                accepted: true,
                delivery: 'NOT_CONFIGURED',
            });
            return;
        }

        const body = [
            `Name: ${name}`,
            `Email: ${email}`,
            `Company: ${company}`,
            `Role: ${role}`,
            `Company size: ${companySize}`,
            `Primary need: ${primaryNeed}`,
            `Intent: ${intent}`,
            plan ? `Plan: ${plan}` : '',
            source ? `Source: ${source}` : '',
        ].filter(Boolean).join('\n');

        if (isProviderConfigured('SENDGRID_API_KEY')) {
            await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: inbox }] }],
                    from: { email: process.env.SENDGRID_FROM_EMAIL || inbox },
                    subject: `Supreme demo request — ${company}`,
                    content: [{ type: 'text/plain', value: body }],
                }),
            });
        } else {
            await sendSmtpMail({
                to: inbox,
                subject: `Supreme demo request — ${company}`,
                body,
            });
        }

        res.status(202).json({
            success: true,
            accepted: true,
            delivery: 'SENT',
        });
    } catch (error) {
        next(error);
    }
});

export default router;

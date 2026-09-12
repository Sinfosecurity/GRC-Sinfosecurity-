import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { ApiError } from '../middleware/errorHandler';
import { demoRequestIpLimiter, demoRequestLimiter } from '../middleware/rateLimiter';
import { deliverEmail, isEmailConfigured, salesNotificationRecipient } from '../services/notificationDeliveryService';
import { maskEmail } from '../services/publicFrontendUrl';
import { normalizeEmail } from '../middleware/rateLimitPolicy';
import logger from '../config/logger';

const router = Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

export const DEMO_REQUEST_RECEIVED_MESSAGE =
    'Thank you. Your request has been received. A member of the Supreme team will review your request and contact you using the business email address you provided.';

type DemoRecord = {
    id: string;
    receivedAt: string;
    name: string;
    email: string;
    company: string;
    role: string;
    companySize: string;
    primaryNeed: string;
    intent: string;
    plan?: string;
    selectedPlan?: string;
    source?: string;
    salesNotification: 'NOT_CONFIGURED' | 'DELIVERED' | 'FAILED';
    prospectAcknowledgement: 'NOT_CONFIGURED' | 'DELIVERED' | 'FAILED' | 'SKIPPED';
    duplicateOf?: string;
};

function storePath() {
    return process.env.DEMO_REQUEST_STORE_PATH || path.join(__dirname, '../../data/demo-requests.jsonl');
}

function persist(record: DemoRecord) {
    const file = storePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
}

function recentDuplicate(email: string, company: string): DemoRecord | null {
    const file = storePath();
    if (!fs.existsSync(file)) return null;
    const cutoff = Date.now() - DUPLICATE_WINDOW_MS;
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
        try {
            const row = JSON.parse(lines[i]) as DemoRecord;
            if (normalizeEmail(row.email) !== email) continue;
            if (String(row.company || '').trim().toLowerCase() !== company) continue;
            if (new Date(row.receivedAt).getTime() >= cutoff && !row.duplicateOf) {
                return row;
            }
            if (new Date(row.receivedAt).getTime() < cutoff) {
                break;
            }
        } catch {
            // skip malformed lines
        }
    }
    return null;
}

function fieldErrors(body: Record<string, unknown>) {
    const name = String(body?.name || '').trim();
    const email = normalizeEmail(body?.email);
    const company = String(body?.company || '').trim();
    const role = String(body?.role || '').trim();
    const companySize = String(body?.companySize || '').trim();
    const primaryNeed = String(body?.primaryNeed || '').trim();
    const details: Array<{ field: string; message: string }> = [];
    if (name.length < 2) details.push({ field: 'name', message: 'Enter your name.' });
    if (!EMAIL.test(email)) details.push({ field: 'email', message: 'Enter a valid business email.' });
    if (company.length < 2) details.push({ field: 'company', message: 'Enter your company name.' });
    if (!role) details.push({ field: 'role', message: 'Select a role.' });
    if (!companySize) details.push({ field: 'companySize', message: 'Select a company size.' });
    if (primaryNeed.length < 8) details.push({ field: 'primaryNeed', message: 'Describe the primary need.' });
    return { name, email, company, role, companySize, primaryNeed, details };
}

function customerSuccess(requestId: string) {
    return {
        success: true,
        accepted: true,
        requestId,
        message: DEMO_REQUEST_RECEIVED_MESSAGE,
    };
}

function salesBody(record: DemoRecord) {
    return [
        `Name: ${record.name}`,
        `Business email: ${record.email}`,
        `Company: ${record.company}`,
        `Role: ${record.role}`,
        `Company size: ${record.companySize}`,
        `Primary need: ${record.primaryNeed}`,
        `Selected plan: ${record.selectedPlan || record.plan || 'none'}`,
        `Intent: ${record.intent}`,
        `Source: ${record.source || 'direct'}`,
        `Timestamp: ${record.receivedAt}`,
        `Request ID: ${record.id}`,
    ].join('\n');
}

function acknowledgementBody(record: DemoRecord) {
    return [
        `Hello ${record.name},`,
        '',
        'Thank you. We received your Supreme demo request.',
        'A member of the Supreme team will review it and follow up using this email address.',
        '',
        'Please keep an eye on your inbox for our response.',
    ].join('\n');
}

router.post('/', demoRequestIpLimiter, demoRequestLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = fieldErrors(req.body || {});
        if (parsed.details.length) {
            throw new ApiError(400, 'Please correct the highlighted fields.', true, parsed.details);
        }

        const intent = String(req.body?.intent || 'demo').trim();
        const plan = String(req.body?.selectedPlan || req.body?.plan || '').trim();
        const source = String(req.body?.source || '').trim();
        const companyKey = parsed.company.toLowerCase();
        const duplicate = recentDuplicate(parsed.email, companyKey);
        if (duplicate) {
            persist({
                id: randomUUID(),
                receivedAt: new Date().toISOString(),
                name: parsed.name,
                email: parsed.email,
                company: parsed.company,
                role: parsed.role,
                companySize: parsed.companySize,
                primaryNeed: parsed.primaryNeed,
                intent,
                plan: plan || undefined,
                selectedPlan: plan || undefined,
                source: source || undefined,
                salesNotification: duplicate.salesNotification,
                prospectAcknowledgement: 'SKIPPED',
                duplicateOf: duplicate.id,
            });
            logger.info('demo_request_duplicate_suppressed', {
                eventType: 'demo_request_duplicate_suppressed',
                requestId: duplicate.id,
                lead: maskEmail(parsed.email),
                result: 'ACCEPTED',
            });
            res.status(202).json(customerSuccess(duplicate.id));
            return;
        }

        const record: DemoRecord = {
            id: randomUUID(),
            receivedAt: new Date().toISOString(),
            name: parsed.name,
            email: parsed.email,
            company: parsed.company,
            role: parsed.role,
            companySize: parsed.companySize,
            primaryNeed: parsed.primaryNeed,
            intent,
            plan: plan || undefined,
            selectedPlan: plan || undefined,
            source: source || undefined,
            salesNotification: 'NOT_CONFIGURED',
            prospectAcknowledgement: 'SKIPPED',
        };

        persist(record);

        const inbox = salesNotificationRecipient();
        if (!isEmailConfigured() || !inbox) {
            record.salesNotification = 'NOT_CONFIGURED';
            record.prospectAcknowledgement = isEmailConfigured() ? 'SKIPPED' : 'NOT_CONFIGURED';
        } else {
            const sales = await deliverEmail({
                to: inbox,
                subject: `Supreme demo request — ${record.company}`,
                body: salesBody(record),
                eventType: 'sales.demo_request',
            });
            record.salesNotification = sales.status;
            const ack = await deliverEmail({
                to: record.email,
                subject: 'We received your Supreme demo request',
                body: acknowledgementBody(record),
                eventType: 'sales.demo_acknowledgement',
            });
            record.prospectAcknowledgement = ack.status;
        }

        persist({ ...record, receivedAt: new Date().toISOString() });

        logger.info('demo_request_accepted', {
            eventType: 'demo_request_accepted',
            requestId: record.id,
            lead: maskEmail(record.email),
            source: record.source,
            selectedPlan: record.selectedPlan,
            intent: record.intent,
            salesNotification: record.salesNotification,
            prospectAcknowledgement: record.prospectAcknowledgement,
            emailConfigured: isEmailConfigured(),
            result: 'ACCEPTED',
            timestamp: record.receivedAt,
        });

        res.status(202).json(customerSuccess(record.id));
    } catch (error) {
        if (!(error instanceof ApiError)) {
            logger.error('demo_request_persist_failed', {
                eventType: 'demo_request_persist_failed',
                result: 'ERROR',
                error: error instanceof Error ? error.message : String(error),
            });
            next(new ApiError(500, "We couldn't submit your request right now. Please try again."));
            return;
        }
        next(error);
    }
});

export default router;

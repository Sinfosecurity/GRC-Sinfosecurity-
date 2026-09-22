import { Router, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { createCategoryLimiter } from '../middleware/rateLimiter';
import { publicApiClientService } from './clientService';
import { publicResources } from './publicResources';
import { shouldForceSinkFailure, webhookService } from './webhookService';
import { publicOpenApi } from './openapi';
import type { PublicApiScope } from './scopes';
import { prisma } from '../config/database';

const router = Router();
const limiter = createCategoryLimiter('public_api');
const sinkLimiter = createCategoryLimiter('demo_ip');

export type PublicRequest = {
    publicClient?: { id: string; organizationId: string; scopes: string[] };
    headers: { authorization?: string; [key: string]: unknown };
    body: Record<string, unknown>;
    query: Record<string, unknown>;
    params: Record<string, string>;
    get(name: string): string | undefined;
};

async function requirePublic(req: PublicRequest, res: Response, next: NextFunction) {
    try {
        const client = await publicApiClientService.authenticate(req.headers.authorization);
        if (!client) throw new ApiError(401, 'Invalid or revoked API credential');
        req.publicClient = { id: client.id, organizationId: client.organizationId, scopes: client.scopes };
        (req as { user?: { id: string; organizationId: string } }).user = {
            id: client.id,
            organizationId: client.organizationId,
        };
        next();
    } catch (error) {
        next(error);
    }
}

function scope(needed: PublicApiScope) {
    return (req: PublicRequest, _res: Response, next: NextFunction) => {
        try {
            publicApiClientService.requireScope(req.publicClient?.scopes || [], needed);
            next();
        } catch (error) {
            next(error);
        }
    };
}

async function withIdempotency(req: PublicRequest, res: Response, next: NextFunction) {
    const key = String(req.get('Idempotency-Key') || req.headers['idempotency-key'] || '');
    if (!key || !req.publicClient) return next();
    const existing = await prisma.idempotencyRecord.findUnique({
        where: { organizationId_key: { organizationId: req.publicClient.organizationId, key } },
    });
    if (existing) {
        res.status(existing.statusCode).json(existing.response);
        return;
    }
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
        prisma.idempotencyRecord.create({
            data: {
                organizationId: req.publicClient!.organizationId,
                key,
                method: 'POST',
                path: String(req.headers['x-original-path'] || ''),
                statusCode: res.statusCode || 200,
                response: body as object,
            },
        }).catch(() => undefined);
        return originalJson(body);
    }) as typeof res.json;
    next();
}

router.get('/openapi.json', (_req, res) => {
    res.json(publicOpenApi());
});

router.get('/docs', (_req, res) => {
    res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Supreme Public API</title></head><body>
<h1>Supreme Public API</h1>
<p>Customer API at <code>/public/v1</code>. Authenticate with <code>Authorization: Bearer srk_…</code>.</p>
<p>Machine-readable spec: <a href="/public/v1/openapi.json">/public/v1/openapi.json</a></p>
<p>This page is not the internal browser API. Platform and support routes are not documented here.</p>
</body></html>`);
});

router.post('/webhook-sink/:sinkId', sinkLimiter, async (req, res, next) => {
    try {
        if (shouldForceSinkFailure(String(req.params.sinkId), String(req.query.failOnce || '') === '1')) {
            res.status(500).json({ error: { message: 'Forced staging webhook failure', code: 'WEBHOOK_TEST_FAIL' } });
            return;
        }
        const headers = Object.fromEntries(
            Object.entries(req.headers).map(([key, value]) => [key, String(value || '')])
        );
        res.json({ success: true, data: await webhookService.receiveSink(req.params.sinkId, headers, req.body) });
    } catch (error) { next(error); }
});

router.use(requirePublic as never);
router.use(limiter);

router.get('/vendors', scope('vendors:read'), async (req: PublicRequest, res, next) => {
    try {
        res.json({ success: true, data: await publicResources.listVendors(req.publicClient!.organizationId, req.query) });
    } catch (error) { next(error); }
});

router.get('/vendors/:id', scope('vendors:read'), async (req: PublicRequest, res, next) => {
    try {
        res.json({ success: true, data: await publicResources.getVendor(req.publicClient!.organizationId, req.params.id) });
    } catch (error) { next(error); }
});

router.post('/vendors', scope('vendors:write'), withIdempotency as never, async (req: PublicRequest, res, next) => {
    try {
        const created = await publicResources.createVendor(req.publicClient!.organizationId, req.body || {});
        res.status(201).json({ success: true, data: created });
    } catch (error) { next(error); }
});

router.patch('/vendors/:id', scope('vendors:write'), async (req: PublicRequest, res, next) => {
    try {
        res.json({ success: true, data: await publicResources.updateVendor(req.publicClient!.organizationId, req.params.id, req.body || {}) });
    } catch (error) { next(error); }
});

router.get('/findings', scope('findings:read'), async (req: PublicRequest, res, next) => {
    try {
        res.json({ success: true, data: await publicResources.listFindings(req.publicClient!.organizationId, req.query) });
    } catch (error) { next(error); }
});

router.get('/findings/:id', scope('findings:read'), async (req: PublicRequest, res, next) => {
    try {
        res.json({ success: true, data: await publicResources.getFinding(req.publicClient!.organizationId, req.params.id) });
    } catch (error) { next(error); }
});

router.get('/assessments', scope('assessments:read'), async (req: PublicRequest, res, next) => {
    try {
        res.json({ success: true, data: await publicResources.listAssessments(req.publicClient!.organizationId, req.query) });
    } catch (error) { next(error); }
});

router.get('/risks', scope('risks:read'), async (req: PublicRequest, res, next) => {
    try {
        res.json({ success: true, data: await publicResources.listRisks(req.publicClient!.organizationId, req.query) });
    } catch (error) { next(error); }
});

router.get('/evidence', scope('evidence:read'), async (req: PublicRequest, res, next) => {
    try {
        res.json({ success: true, data: await publicResources.listEvidence(req.publicClient!.organizationId, req.query) });
    } catch (error) { next(error); }
});

router.get('/insurance/configuration', scope('insurance:read'), async (req: PublicRequest, res, next) => {
    try { res.json({ success: true, data: await publicResources.insuranceConfiguration(req.publicClient!.organizationId) }); }
    catch (error) { next(error); }
});

router.get('/insurance/entities', scope('insurance:read'), async (req: PublicRequest, res, next) => {
    try { res.json({ success: true, data: await publicResources.insuranceEntities(req.publicClient!.organizationId, req.query) }); }
    catch (error) { next(error); }
});

router.get('/insurance/licenses', scope('insurance:read'), async (req: PublicRequest, res, next) => {
    try { res.json({ success: true, data: await publicResources.insuranceLicenses(req.publicClient!.organizationId, req.query) }); }
    catch (error) { next(error); }
});

router.get('/insurance/risks', scope('insurance:read'), async (req: PublicRequest, res, next) => {
    try { res.json({ success: true, data: await publicResources.insuranceRiskSummary(req.publicClient!.organizationId) }); }
    catch (error) { next(error); }
});

router.get('/insurance/regulatory-packs', scope('insurance:read'), async (req: PublicRequest, res, next) => {
    try { res.json({ success: true, data: await publicResources.insuranceRegulatoryPacks(req.publicClient!.organizationId) }); }
    catch (error) { next(error); }
});

router.get('/insurance/models', scope('insurance:read'), async (req: PublicRequest, res, next) => {
    try { res.json({ success: true, data: await publicResources.insuranceModels(req.publicClient!.organizationId) }); }
    catch (error) { next(error); }
});

export default router;

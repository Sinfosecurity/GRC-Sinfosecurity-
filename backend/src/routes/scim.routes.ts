import { Request, Response, NextFunction, Router } from 'express';
import { scimError, scimService } from '../identity/scim';

const router = Router();

async function requireScim(req: Request, res: Response, next: NextFunction) {
    const authorization = req.headers.authorization || '';
    if (/^Basic\s+/i.test(authorization)) {
        return res.status(401).json(scimError(401, 'Use a Bearer SCIM token.', 'unauthorized'));
    }
    const token = await scimService.authenticate(authorization);
    if (!token) {
        return res.status(401).json(scimError(401, 'Not authorized.', 'unauthorized'));
    }
    (req as Request & { scim?: { organizationId: string; providerId?: string | null } }).scim = {
        organizationId: token.organizationId,
        providerId: token.providerId,
    };
    next();
}

function org(req: Request) {
    return (req as Request & { scim: { organizationId: string; providerId?: string | null } }).scim;
}

router.get('/ServiceProviderConfig', requireScim, (_req, res) => {
    res.json(scimService.serviceProviderConfig());
});
router.get('/ResourceTypes', requireScim, (_req, res) => {
    res.json(scimService.resourceTypes());
});
router.get('/Schemas', requireScim, (_req, res) => {
    res.json(scimService.schemas());
});

router.get('/Users', requireScim, async (req, res) => {
    try {
        const ctx = org(req);
        res.json(await scimService.listUsers(ctx.organizationId, {
            filter: typeof req.query.filter === 'string' ? req.query.filter : undefined,
            startIndex: typeof req.query.startIndex === 'string' ? req.query.startIndex : undefined,
            count: typeof req.query.count === 'string' ? req.query.count : undefined,
        }));
    } catch (error) {
        const status = (error as { status?: number }).status || 400;
        res.status(status).json(scimError(status, 'The filter is not supported.', 'invalidFilter'));
    }
});

router.get('/Users/:id', requireScim, async (req, res) => {
    const ctx = org(req);
    const user = await scimService.getUser(ctx.organizationId, req.params.id);
    if (!user) return res.status(404).json(scimError(404, 'User not found.', 'invalidValue'));
    return res.json(user);
});

router.post('/Users', requireScim, async (req, res) => {
    try {
        const ctx = org(req);
        const result = await scimService.upsertUser(ctx.organizationId, req.body || {}, ctx.providerId || undefined);
        res.status(result.created ? 201 : 200).json(result.resource);
    } catch (error) {
        const status = (error as { status?: number }).status || 400;
        res.status(status).json(scimError(status, status === 400 ? 'The request does not match the expected schema.' : 'Unable to provision user.', status === 400 ? 'invalidSyntax' : undefined));
    }
});

router.put('/Users/:id', requireScim, async (req, res) => {
    try {
        const ctx = org(req);
        const existing = await scimService.getUser(ctx.organizationId, req.params.id);
        if (!existing) return res.status(404).json(scimError(404, 'User not found.', 'invalidValue'));
        const result = await scimService.upsertUser(ctx.organizationId, { ...req.body, userName: req.body?.userName || existing.userName }, ctx.providerId || undefined);
        return res.json(result.resource);
    } catch {
        return res.status(400).json(scimError(400, 'The request does not match the expected schema.', 'invalidSyntax'));
    }
});

router.patch('/Users/:id', requireScim, async (req, res) => {
    const ctx = org(req);
    const user = await scimService.patchUser(ctx.organizationId, req.params.id, req.body || {});
    if (!user) return res.status(404).json(scimError(404, 'User not found.', 'invalidValue'));
    return res.json(user);
});

router.get('/Groups', requireScim, async (req, res) => {
    try {
        const ctx = org(req);
        res.json(await scimService.listGroups(ctx.organizationId, {
            filter: typeof req.query.filter === 'string' ? req.query.filter : undefined,
            startIndex: typeof req.query.startIndex === 'string' ? req.query.startIndex : undefined,
            count: typeof req.query.count === 'string' ? req.query.count : undefined,
        }));
    } catch (error) {
        const status = (error as { status?: number }).status || 400;
        res.status(status).json(scimError(status, 'The filter is not supported.', 'invalidFilter'));
    }
});

router.post('/Groups', requireScim, async (req, res) => {
    try {
        const ctx = org(req);
        const result = await scimService.upsertGroup(ctx.organizationId, req.body || {}, ctx.providerId || undefined);
        res.status(result.created ? 201 : 200).json(result.resource);
    } catch {
        res.status(400).json(scimError(400, 'The request does not match the expected schema.', 'invalidSyntax'));
    }
});

export default router;

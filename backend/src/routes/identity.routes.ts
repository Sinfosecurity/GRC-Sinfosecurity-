import { Router } from 'express';
import { IdentityProtocol, Role, SsoEnforcement } from '@prisma/client';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { rejectPlatformTenantContent } from '../security/tenant';
import { PERMISSIONS } from '../security/rbac';
import { identityService } from '../identity/service';
import { scimService } from '../identity/scim';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
const admin = [authenticate, rejectPlatformTenantContent, requirePermission(PERMISSIONS['identity.manage'])];

router.get('/overview', ...admin, async (req: AuthRequest, res, next) => {
    try {
        res.json({ success: true, data: await identityService.overview(req.user!.organizationId) });
    } catch (error) { next(error); }
});

router.get('/providers', ...admin, async (req: AuthRequest, res, next) => {
    try {
        res.json({ success: true, data: await identityService.listProviders(req.user!.organizationId) });
    } catch (error) { next(error); }
});

router.post('/providers', ...admin, async (req: AuthRequest, res, next) => {
    try {
        const protocol = String(req.body?.protocol || '').toUpperCase() === 'OIDC' ? IdentityProtocol.OIDC : IdentityProtocol.SAML;
        res.status(201).json({
            success: true,
            data: await identityService.createProvider(req.user!.organizationId, req.user!.id, {
                displayName: req.body?.displayName || '',
                protocol,
            }),
        });
    } catch (error) { next(error); }
});

router.patch('/providers/:id', ...admin, async (req: AuthRequest, res, next) => {
    try {
        res.json({ success: true, data: await identityService.updateProvider(req.user!.organizationId, req.params.id, req.user!.id, req.body || {}) });
    } catch (error) { next(error); }
});

router.post('/providers/:id/discover-oidc', ...admin, async (req: AuthRequest, res, next) => {
    try {
        res.json({ success: true, data: await identityService.discoverOidcIssuer(req.user!.organizationId, req.params.id, req.user!.id, String(req.body?.issuer || '')) });
    } catch (error) { next(error); }
});

router.post('/providers/:id/enable', ...admin, async (req: AuthRequest, res, next) => {
    try {
        res.json({ success: true, data: await identityService.enableProvider(req.user!.organizationId, req.params.id, req.user!.id, req.body?.enabled !== false) });
    } catch (error) { next(error); }
});

router.post('/providers/:id/policy', ...admin, async (req: AuthRequest, res, next) => {
    try {
        res.json({
            success: true,
            data: await identityService.setPolicy(req.user!.organizationId, req.params.id, req.user!.id, {
                ssoEnforcement: req.body?.ssoEnforcement === 'REQUIRED' ? SsoEnforcement.REQUIRED : req.body?.ssoEnforcement === 'OPTIONAL' ? SsoEnforcement.OPTIONAL : undefined,
                jitEnabled: typeof req.body?.jitEnabled === 'boolean' ? req.body.jitEnabled : undefined,
                passwordLoginAllowed: typeof req.body?.passwordLoginAllowed === 'boolean' ? req.body.passwordLoginAllowed : undefined,
            }),
        });
    } catch (error) { next(error); }
});

router.put('/providers/:id/mappings', ...admin, async (req: AuthRequest, res, next) => {
    try {
        const mappings = Array.isArray(req.body?.mappings) ? req.body.mappings : [];
        res.json({
            success: true,
            data: await identityService.replaceMappings(
                req.user!.organizationId,
                req.params.id,
                req.user!.id,
                mappings.map((row: { idpGroup: string; supremeRole: Role }) => ({
                    idpGroup: row.idpGroup,
                    supremeRole: row.supremeRole,
                })),
            ),
        });
    } catch (error) { next(error); }
});

router.post('/providers/:id/test', ...admin, async (req: AuthRequest, res, next) => {
    try {
        const provider = (await identityService.listProviders(req.user!.organizationId)).find((row) => row.id === req.params.id);
        if (!provider) throw new ApiError(404, 'Identity provider not found');
        res.json({ success: true, data: await identityService.startSso(provider.publicId, 'test', req.user!.id) });
    } catch (error) { next(error); }
});

router.post('/domains', ...admin, async (req: AuthRequest, res, next) => {
    try {
        res.status(201).json({
            success: true,
            data: await identityService.startDomain(req.user!.organizationId, req.user!.id, String(req.body?.domain || ''), req.body?.providerId),
        });
    } catch (error) { next(error); }
});

router.post('/domains/:id/verify', ...admin, async (req: AuthRequest, res, next) => {
    try {
        res.json({
            success: true,
            data: await identityService.verifyDomain(req.user!.organizationId, req.params.id, req.user!.id, req.body?.token),
        });
    } catch (error) { next(error); }
});

router.get('/scim/tokens', ...admin, async (req: AuthRequest, res, next) => {
    try {
        res.json({ success: true, data: await scimService.listTokens(req.user!.organizationId) });
    } catch (error) { next(error); }
});

router.post('/scim/tokens', ...admin, async (req: AuthRequest, res, next) => {
    try {
        res.status(201).json({
            success: true,
            data: await scimService.createToken(req.user!.organizationId, req.user!.id, String(req.body?.label || ''), req.body?.providerId),
        });
    } catch (error) { next(error); }
});

router.post('/scim/tokens/:id/rotate', ...admin, async (req: AuthRequest, res, next) => {
    try {
        res.json({ success: true, data: await scimService.rotateToken(req.user!.organizationId, req.params.id, req.user!.id) });
    } catch (error) { next(error); }
});

router.post('/scim/tokens/:id/revoke', ...admin, async (req: AuthRequest, res, next) => {
    try {
        res.json({ success: true, data: await scimService.revokeToken(req.user!.organizationId, req.params.id, req.user!.id) });
    } catch (error) { next(error); }
});

router.post('/break-glass', ...admin, async (req: AuthRequest, res, next) => {
    try {
        res.status(201).json({
            success: true,
            data: await identityService.createBreakGlass(req.user!.organizationId, req.user!.id, String(req.body?.userId || req.user!.id), String(req.body?.reason || ''), Number(req.body?.minutes || 60)),
        });
    } catch (error) { next(error); }
});

router.get('/activity', ...admin, async (req: AuthRequest, res, next) => {
    try {
        res.json({ success: true, data: await identityService.activity(req.user!.organizationId) });
    } catch (error) { next(error); }
});

export default router;

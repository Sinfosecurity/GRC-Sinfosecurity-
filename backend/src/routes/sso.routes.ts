import { Router } from 'express';
import { ssoLimiter } from '../middleware/rateLimiter';
import { identityService } from '../identity/service';
import { sessionRefreshTtlMs, setRefreshCookie, shouldExposeRefreshTokenInBody } from '../security/refreshCookie';

const router = Router();

router.post('/discover', ssoLimiter, async (req, res, next) => {
    try {
        res.json({ success: true, data: await identityService.discover(String(req.body?.email || '')) });
    } catch (error) { next(error); }
});

router.get('/start/:publicId', ssoLimiter, async (req, res, next) => {
    try {
        const started = await identityService.startSso(req.params.publicId, 'login');
        res.redirect(started.redirectTo);
    } catch (error) { next(error); }
});

router.get('/saml/metadata/:publicId', async (req, res, next) => {
    try {
        res.type('application/xml').send(identityService.samlMetadata(req.params.publicId));
    } catch (error) { next(error); }
});

router.post('/saml/acs/:publicId', ssoLimiter, async (req, res, next) => {
    try {
        const result = await identityService.completeSaml(req.params.publicId, String(req.body?.SAMLResponse || ''), String(req.body?.RelayState || ''));
        res.redirect(result.redirectTo);
    } catch (error) { next(error); }
});

router.get('/oidc/callback', ssoLimiter, async (req, res, next) => {
    try {
        const result = await identityService.completeOidc({
            code: typeof req.query.code === 'string' ? req.query.code : undefined,
            state: typeof req.query.state === 'string' ? req.query.state : undefined,
        });
        res.redirect(result.redirectTo);
    } catch (error) { next(error); }
});

router.post('/exchange', ssoLimiter, async (req, res, next) => {
    try {
        const data = await identityService.exchange(String(req.body?.code || '')) as { refreshToken?: string; token?: string; user?: unknown };
        if (data.refreshToken) {
            setRefreshCookie(res, data.refreshToken, sessionRefreshTtlMs());
        }
        const { refreshToken, ...rest } = data;
        res.json({
            success: true,
            data: {
                ...rest,
                refreshTokenStorage: 'cookie',
                ...(shouldExposeRefreshTokenInBody() ? { refreshToken } : {}),
            },
        });
    } catch (error) { next(error); }
});

export default router;

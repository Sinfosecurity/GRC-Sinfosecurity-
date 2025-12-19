/**
 * Enhanced Authentication Routes
 * Supports JWT, SSO (SAML/OAuth/OIDC), and MFA
 */

import { Router, Request, Response, NextFunction } from 'express';
import ssoService from '../services/ssoService';
import mfaService from '../services/mfaService';
import { AuthRequest, authenticate } from '../middleware/auth';

const router = Router();

// ============= SSO Routes =============

/**
 * GET /auth/sso/providers
 * Get available SSO providers for organization
 */
router.get('/sso/providers', (req: Request, res: Response) => {
    const { organizationId } = req.query;
    
    if (!organizationId) {
        return res.status(400).json({ error: 'organizationId required' });
    }
    
    const providers = ssoService.getProviders(organizationId as string);
    const statistics = ssoService.getStatistics(organizationId as string);
    
    res.json({
        providers: providers.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            enabled: p.enabled
        })),
        statistics
    });
});

/**
 * POST /auth/sso/configure
 * Configure SSO provider
 */
router.post('/sso/configure', authenticate, (req: AuthRequest, res: Response) => {
    try {
        const { providerId, config } = req.body;
        
        const updated = ssoService.configureProvider(providerId, config);
        
        res.json({
            message: 'SSO provider configured successfully',
            provider: updated
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /auth/sso/toggle
 * Enable/disable SSO provider
 */
router.post('/sso/toggle', authenticate, (req: AuthRequest, res: Response) => {
    const { providerId, enabled } = req.body;
    
    const success = ssoService.toggleProvider(providerId, enabled);
    
    if (success) {
        res.json({ message: `SSO provider ${enabled ? 'enabled' : 'disabled'}` });
    } else {
        res.status(404).json({ error: 'Provider not found' });
    }
});

/**
 * GET /auth/sso/saml/login
 * Initiate SAML SSO login
 */
router.get('/sso/saml/login', (req: Request, res: Response) => {
    try {
        const { providerId } = req.query;
        
        if (!providerId) {
            return res.status(400).json({ error: 'providerId required' });
        }
        
        const { url, relayState } = ssoService.generateSAMLRequest(providerId as string);
        
        // Store relay state in session/cookie for validation
        res.cookie('saml_relay_state', relayState, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 5 * 60 * 1000 // 5 minutes
        });
        
        res.json({ redirectUrl: url });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /auth/sso/saml/callback
 * Handle SAML SSO callback
 */
router.post('/sso/saml/callback', async (req: Request, res: Response) => {
    try {
        const { SAMLResponse, RelayState } = req.body;
        const storedRelayState = req.cookies.saml_relay_state;
        
        // Validate relay state (CSRF protection)
        if (RelayState !== storedRelayState) {
            return res.status(400).json({ error: 'Invalid relay state' });
        }
        
        // Process SAML response
        const ssoUser = await ssoService.processSAMLResponse(SAMLResponse, RelayState);
        
        // Check if MFA is required
        // In production, lookup user in database
        const userId = `sso_${ssoUser.email}`;
        const mfaRequired = mfaService.isMFAEnabled(userId);
        
        if (mfaRequired) {
            // Send MFA challenge
            const { challengeId, method } = mfaService.sendChallenge(userId);
            
            return res.json({
                mfaRequired: true,
                challengeId,
                method,
                tempToken: Buffer.from(JSON.stringify({ userId, email: ssoUser.email })).toString('base64')
            });
        }
        
        // Generate JWT token
        const token = ssoService.generateJWTForSSOUser(ssoUser, 'org_demo');
        
        res.clearCookie('saml_relay_state');
        res.json({
            token,
            user: {
                email: ssoUser.email,
                name: `${ssoUser.firstName} ${ssoUser.lastName}`,
                authMethod: 'SAML'
            }
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /auth/sso/oauth/login
 * Initiate OAuth2 SSO login
 */
router.get('/sso/oauth/login', (req: Request, res: Response) => {
    try {
        const { providerId } = req.query;
        
        if (!providerId) {
            return res.status(400).json({ error: 'providerId required' });
        }
        
        const { url, state } = ssoService.generateOAuth2URL(providerId as string);
        
        // Store state in session/cookie for validation
        res.cookie('oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 5 * 60 * 1000
        });
        
        res.json({ redirectUrl: url });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /auth/sso/oauth/callback
 * Handle OAuth2 SSO callback
 */
router.get('/sso/oauth/callback', async (req: Request, res: Response) => {
    try {
        const { code, state, provider } = req.query;
        const storedState = req.cookies.oauth_state;
        
        // Validate state (CSRF protection)
        if (state !== storedState) {
            return res.status(400).json({ error: 'Invalid state parameter' });
        }
        
        // Exchange code for tokens
        const ssoUser = await ssoService.exchangeOAuth2Code(provider as string, code as string);
        
        // Generate JWT token
        const token = ssoService.generateJWTForSSOUser(ssoUser, 'org_demo');
        
        res.clearCookie('oauth_state');
        res.json({
            token,
            user: {
                email: ssoUser.email,
                name: `${ssoUser.firstName} ${ssoUser.lastName}`,
                authMethod: 'OAuth2'
            }
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /auth/sso/oidc/login
 * Initiate OIDC SSO login
 */
router.get('/sso/oidc/login', async (req: Request, res: Response) => {
    try {
        const { providerId } = req.query;
        
        if (!providerId) {
            return res.status(400).json({ error: 'providerId required' });
        }
        
        const { url, state, nonce } = await ssoService.generateOIDCURL(providerId as string);
        
        // Store state and nonce in session/cookie
        res.cookie('oidc_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 5 * 60 * 1000
        });
        res.cookie('oidc_nonce', nonce, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 5 * 60 * 1000
        });
        
        res.json({ redirectUrl: url });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /auth/sso/oidc/callback
 * Handle OIDC SSO callback
 */
router.get('/sso/oidc/callback', async (req: Request, res: Response) => {
    try {
        const { code, state, provider } = req.query;
        const storedState = req.cookies.oidc_state;
        const storedNonce = req.cookies.oidc_nonce;
        
        // Validate state
        if (state !== storedState) {
            return res.status(400).json({ error: 'Invalid state parameter' });
        }
        
        // Process OIDC token
        const ssoUser = await ssoService.processOIDCToken(
            provider as string, 
            code as string, 
            storedNonce
        );
        
        // Generate JWT token
        const token = ssoService.generateJWTForSSOUser(ssoUser, 'org_demo');
        
        res.clearCookie('oidc_state');
        res.clearCookie('oidc_nonce');
        res.json({
            token,
            user: {
                email: ssoUser.email,
                name: `${ssoUser.firstName} ${ssoUser.lastName}`,
                authMethod: 'OIDC'
            }
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// ============= MFA Routes =============

/**
 * GET /auth/mfa/status
 * Get MFA status for current user
 */
router.get('/mfa/status', authenticate, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    
    const configs = mfaService.getUserMFAConfigs(userId);
    const enabled = mfaService.isMFAEnabled(userId);
    const methods = mfaService.getEnabledMethods(userId);
    
    res.json({
        enabled,
        methods,
        configs: configs.map(c => ({
            method: c.method,
            enabled: c.enabled,
            verified: c.verified,
            lastUsedAt: c.lastUsedAt
        }))
    });
});

/**
 * POST /auth/mfa/setup/totp
 * Setup TOTP authenticator
 */
router.post('/mfa/setup/totp', authenticate, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const userName = req.user!.email;
    
    const { secret, qrCode, backupCodes } = mfaService.setupTOTP(userId, userName);
    
    res.json({
        message: 'TOTP setup initiated. Scan QR code with authenticator app.',
        secret,
        qrCode,
        backupCodes,
        instructions: [
            '1. Open your authenticator app (Google Authenticator, Authy, etc.)',
            '2. Scan the QR code or manually enter the secret',
            '3. Enter the 6-digit code from your app to verify'
        ]
    });
});

/**
 * POST /auth/mfa/verify/totp
 * Verify and enable TOTP
 */
router.post('/mfa/verify/totp', authenticate, (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { code } = req.body;
        
        const verified = mfaService.verifyTOTP(userId, code);
        
        if (verified) {
            res.json({ message: 'TOTP verified and enabled successfully' });
        } else {
            res.status(400).json({ error: 'Invalid verification code' });
        }
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /auth/mfa/setup/sms
 * Setup SMS-based MFA
 */
router.post('/mfa/setup/sms', authenticate, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
        return res.status(400).json({ error: 'phoneNumber required' });
    }
    
    const { verificationToken } = mfaService.setupSMS(userId, phoneNumber);
    
    res.json({
        message: 'Verification code sent to your phone',
        verificationToken
    });
});

/**
 * POST /auth/mfa/setup/email
 * Setup Email-based MFA
 */
router.post('/mfa/setup/email', authenticate, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'email required' });
    }
    
    const { verificationToken } = mfaService.setupEmail(userId, email);
    
    res.json({
        message: 'Verification code sent to your email',
        verificationToken
    });
});

/**
 * POST /auth/mfa/verify
 * Verify SMS or Email code
 */
router.post('/mfa/verify', authenticate, (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { method, code } = req.body;
        
        if (!['SMS', 'EMAIL'].includes(method)) {
            return res.status(400).json({ error: 'Invalid method' });
        }
        
        const verified = mfaService.verifyCode(userId, method, code);
        
        if (verified) {
            res.json({ message: `${method} MFA enabled successfully` });
        } else {
            res.status(400).json({ error: 'Invalid verification code' });
        }
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /auth/mfa/challenge
 * Request MFA challenge during login
 */
router.post('/mfa/challenge', (req: Request, res: Response) => {
    try {
        const { tempToken, method } = req.body;
        
        // Decode temp token to get userId
        const { userId } = JSON.parse(Buffer.from(tempToken, 'base64').toString());
        
        const { challengeId, method: selectedMethod } = mfaService.sendChallenge(userId, method);
        
        res.json({
            challengeId,
            method: selectedMethod,
            message: selectedMethod === 'TOTP' 
                ? 'Enter code from your authenticator app'
                : `Verification code sent via ${selectedMethod}`
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /auth/mfa/verify-challenge
 * Verify MFA challenge and complete login
 */
router.post('/mfa/verify-challenge', (req: Request, res: Response) => {
    try {
        const { challengeId, code, tempToken } = req.body;
        
        const verified = mfaService.verifyChallenge(challengeId, code);
        
        if (verified) {
            // Decode temp token and generate real JWT
            const { userId, email } = JSON.parse(Buffer.from(tempToken, 'base64').toString());
            
            const token = ssoService.generateJWTForSSOUser(
                { email, firstName: 'User', lastName: '' },
                'org_demo'
            );
            
            res.json({
                token,
                user: { email },
                message: 'MFA verification successful'
            });
        } else {
            res.status(400).json({ error: 'Invalid verification code' });
        }
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /auth/mfa/disable
 * Disable MFA method
 */
router.post('/mfa/disable', authenticate, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { method } = req.body;
    
    const success = mfaService.disableMFA(userId, method);
    
    if (success) {
        res.json({ message: `${method} MFA disabled` });
    } else {
        res.status(404).json({ error: 'MFA method not found' });
    }
});

/**
 * POST /auth/mfa/backup-codes/regenerate
 * Regenerate backup codes
 */
router.post('/mfa/backup-codes/regenerate', authenticate, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    
    const backupCodes = mfaService.regenerateBackupCodes(userId);
    
    res.json({
        backupCodes,
        message: 'Save these backup codes in a secure location. They can only be used once each.'
    });
});

/**
 * GET /auth/mfa/statistics
 * Get MFA adoption statistics
 */
router.get('/mfa/statistics', authenticate, (req: AuthRequest, res: Response) => {
    const statistics = mfaService.getStatistics();
    res.json(statistics);
});

export default router;

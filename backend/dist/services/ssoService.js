"use strict";
/**
 * SSO (Single Sign-On) Service
 * Supports SAML 2.0, OAuth 2.0, and OpenID Connect
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../config/logger"));
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
// In-memory storage for demo
const ssoProviders = new Map();
// Initialize with common providers
const defaultProviders = [
    {
        id: 'sso_azure_ad',
        name: 'Azure Active Directory',
        type: 'SAML',
        enabled: false,
        organizationId: 'org_demo',
        config: {
            entryPoint: 'https://login.microsoftonline.com/{tenant-id}/saml2',
            issuer: 'https://grc-platform.com',
            cert: '', // To be configured
            callbackUrl: 'https://grc-platform.com/auth/saml/callback',
            identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
            signatureAlgorithm: 'sha256',
            wantAssertionsSigned: true,
            wantAuthnResponseSigned: true
        }
    },
    {
        id: 'sso_okta',
        name: 'Okta',
        type: 'SAML',
        enabled: false,
        organizationId: 'org_demo',
        config: {
            entryPoint: 'https://{your-domain}.okta.com/app/{app-id}/sso/saml',
            issuer: 'https://grc-platform.com',
            cert: '', // To be configured
            callbackUrl: 'https://grc-platform.com/auth/saml/callback',
            identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
            signatureAlgorithm: 'sha256'
        }
    },
    {
        id: 'sso_google',
        name: 'Google Workspace',
        type: 'OAuth2',
        enabled: false,
        organizationId: 'org_demo',
        config: {
            clientId: '', // To be configured
            clientSecret: '', // To be configured
            authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
            callbackUrl: 'https://grc-platform.com/auth/oauth/callback',
            scope: ['openid', 'email', 'profile']
        }
    },
    {
        id: 'sso_onelogin',
        name: 'OneLogin',
        type: 'OIDC',
        enabled: false,
        organizationId: 'org_demo',
        config: {
            clientId: '', // To be configured
            clientSecret: '', // To be configured
            discoveryUrl: 'https://{subdomain}.onelogin.com/oidc/2/.well-known/openid-configuration',
            callbackUrl: 'https://grc-platform.com/auth/oidc/callback',
            scope: ['openid', 'email', 'profile']
        }
    }
];
defaultProviders.forEach(provider => ssoProviders.set(provider.id, provider));
class SSOService {
    /**
     * Get all SSO providers for organization
     */
    getProviders(organizationId) {
        return Array.from(ssoProviders.values())
            .filter(p => p.organizationId === organizationId);
    }
    /**
     * Get SSO provider by ID
     */
    getProvider(providerId) {
        return ssoProviders.get(providerId);
    }
    /**
     * Configure SSO provider
     */
    configureProvider(providerId, config) {
        const existing = ssoProviders.get(providerId);
        if (!existing) {
            throw new Error('SSO provider not found');
        }
        const updated = {
            ...existing,
            ...config,
            config: {
                ...existing.config,
                ...config.config
            }
        };
        ssoProviders.set(providerId, updated);
        logger_1.default.info(`✅ SSO Provider configured: ${updated.name}`);
        return updated;
    }
    /**
     * Enable/disable SSO provider
     */
    toggleProvider(providerId, enabled) {
        const provider = ssoProviders.get(providerId);
        if (!provider)
            return false;
        provider.enabled = enabled;
        ssoProviders.set(providerId, provider);
        logger_1.default.info(`${enabled ? '✅ Enabled' : '❌ Disabled'} SSO: ${provider.name}`);
        return true;
    }
    /**
     * Generate SAML AuthnRequest
     */
    generateSAMLRequest(providerId) {
        const provider = ssoProviders.get(providerId);
        if (!provider || provider.type !== 'SAML') {
            throw new Error('Invalid SAML provider');
        }
        const config = provider.config;
        const relayState = this.generateState();
        // In production, use passport-saml or similar library
        const samlRequest = this.buildSAMLRequest(config);
        const encodedRequest = Buffer.from(samlRequest).toString('base64');
        const url = `${config.entryPoint}?SAMLRequest=${encodeURIComponent(encodedRequest)}&RelayState=${relayState}`;
        logger_1.default.info('📤 SAML AuthnRequest generated');
        return { url, relayState };
    }
    /**
     * Process SAML Response
     */
    async processSAMLResponse(samlResponse, relayState) {
        // In production, validate SAML response signature, assertions, etc.
        // Use passport-saml or node-saml library
        logger_1.default.info('📥 Processing SAML response');
        // Mock parsing for demo
        const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');
        // Extract user attributes from SAML assertion
        const user = {
            email: this.extractSAMLAttribute(decoded, 'email'),
            firstName: this.extractSAMLAttribute(decoded, 'firstName') || 'SSO',
            lastName: this.extractSAMLAttribute(decoded, 'lastName') || 'User',
            nameId: this.extractSAMLAttribute(decoded, 'nameId'),
            attributes: {}
        };
        logger_1.default.info(`✅ SAML authentication successful: ${user.email}`);
        return user;
    }
    /**
     * Generate OAuth2 authorization URL
     */
    generateOAuth2URL(providerId) {
        const provider = ssoProviders.get(providerId);
        if (!provider || provider.type !== 'OAuth2') {
            throw new Error('Invalid OAuth2 provider');
        }
        const config = provider.config;
        const state = this.generateState();
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.callbackUrl,
            response_type: 'code',
            scope: config.scope.join(' '),
            state,
            access_type: 'offline',
            prompt: 'consent'
        });
        const url = `${config.authorizationUrl}?${params.toString()}`;
        logger_1.default.info('📤 OAuth2 authorization URL generated');
        return { url, state };
    }
    /**
     * Exchange OAuth2 code for tokens
     */
    async exchangeOAuth2Code(providerId, code) {
        const provider = ssoProviders.get(providerId);
        if (!provider || provider.type !== 'OAuth2') {
            throw new Error('Invalid OAuth2 provider');
        }
        const config = provider.config;
        // In production, make actual API calls
        logger_1.default.info('📥 Exchanging OAuth2 code for tokens');
        // Mock token exchange
        const accessToken = 'mock_access_token';
        // Fetch user info
        logger_1.default.info('📥 Fetching user info from OAuth2 provider');
        // Mock user info for demo
        const user = {
            email: 'sso.user@example.com',
            firstName: 'OAuth',
            lastName: 'User',
            attributes: {
                provider: provider.name,
                sub: 'oauth2_user_id'
            }
        };
        logger_1.default.info(`✅ OAuth2 authentication successful: ${user.email}`);
        return user;
    }
    /**
     * Generate OIDC authorization URL
     */
    async generateOIDCURL(providerId) {
        const provider = ssoProviders.get(providerId);
        if (!provider || provider.type !== 'OIDC') {
            throw new Error('Invalid OIDC provider');
        }
        const config = provider.config;
        const state = this.generateState();
        const nonce = this.generateState();
        // In production, fetch discovery document
        logger_1.default.info('📥 Fetching OIDC discovery document');
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.callbackUrl,
            response_type: 'code',
            scope: config.scope.join(' '),
            state,
            nonce
        });
        // Mock authorization endpoint from discovery
        const authorizationEndpoint = config.discoveryUrl.replace('/.well-known/openid-configuration', '/authorize');
        const url = `${authorizationEndpoint}?${params.toString()}`;
        logger_1.default.info('📤 OIDC authorization URL generated');
        return { url, state, nonce };
    }
    /**
     * Process OIDC ID Token
     */
    async processOIDCToken(providerId, code, nonce) {
        const provider = ssoProviders.get(providerId);
        if (!provider || provider.type !== 'OIDC') {
            throw new Error('Invalid OIDC provider');
        }
        logger_1.default.info('📥 Processing OIDC ID token');
        // In production:
        // 1. Exchange code for tokens
        // 2. Validate ID token signature
        // 3. Verify nonce
        // 4. Extract user claims
        // Mock user for demo
        const user = {
            email: 'oidc.user@example.com',
            firstName: 'OpenID',
            lastName: 'User',
            attributes: {
                provider: provider.name,
                sub: 'oidc_user_id',
                nonce
            }
        };
        logger_1.default.info(`✅ OIDC authentication successful: ${user.email}`);
        return user;
    }
    /**
     * Generate JWT token for SSO user
     */
    generateJWTForSSOUser(user, organizationId) {
        const payload = {
            id: `sso_${user.email}`,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: 'USER', // Map from IdP attributes in production
            organizationId,
            authMethod: 'SSO',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        };
        const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET);
        logger_1.default.info(`🔑 JWT token generated for SSO user: ${user.email}`);
        return token;
    }
    /**
     * Validate SSO session
     */
    validateSSOSession(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            return decoded.authMethod === 'SSO';
        }
        catch {
            return false;
        }
    }
    /**
     * Generate random state for CSRF protection
     */
    generateState() {
        return Buffer.from(Array.from({ length: 32 }, () => Math.random().toString(36)[2])
            .join('')).toString('base64');
    }
    /**
     * Build SAML AuthnRequest XML
     */
    buildSAMLRequest(config) {
        const id = `_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const issueInstant = new Date().toISOString();
        return `<?xml version="1.0"?>
<samlp:AuthnRequest 
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${id}"
    Version="2.0"
    IssueInstant="${issueInstant}"
    Destination="${config.entryPoint}"
    AssertionConsumerServiceURL="${config.callbackUrl}"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
    <saml:Issuer>${config.issuer}</saml:Issuer>
    <samlp:NameIDPolicy 
        Format="${config.identifierFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'}"
        AllowCreate="true"/>
</samlp:AuthnRequest>`;
    }
    /**
     * Extract attribute from SAML response
     */
    extractSAMLAttribute(samlXML, attribute) {
        // In production, use XML parser
        // This is a simplified mock
        const regex = new RegExp(`<saml:Attribute Name="${attribute}"[^>]*>.*?<saml:AttributeValue>([^<]+)</saml:AttributeValue>`, 'i');
        const match = samlXML.match(regex);
        return match ? match[1] : '';
    }
    /**
     * Get SSO statistics
     */
    getStatistics(organizationId) {
        const orgProviders = this.getProviders(organizationId);
        return {
            totalProviders: orgProviders.length,
            enabledProviders: orgProviders.filter(p => p.enabled).length,
            providerTypes: {
                SAML: orgProviders.filter(p => p.type === 'SAML').length,
                OAuth2: orgProviders.filter(p => p.type === 'OAuth2').length,
                OIDC: orgProviders.filter(p => p.type === 'OIDC').length
            },
            configured: orgProviders.filter(p => this.isConfigured(p)).length
        };
    }
    /**
     * Check if provider is fully configured
     */
    isConfigured(provider) {
        if (provider.type === 'SAML') {
            const config = provider.config;
            return !!config.entryPoint && !!config.cert && !!config.issuer;
        }
        else if (provider.type === 'OAuth2') {
            const config = provider.config;
            return !!config.clientId && !!config.clientSecret;
        }
        else if (provider.type === 'OIDC') {
            const config = provider.config;
            return !!config.clientId && !!config.clientSecret && !!config.discoveryUrl;
        }
        return false;
    }
}
exports.default = new SSOService();
//# sourceMappingURL=ssoService.js.map
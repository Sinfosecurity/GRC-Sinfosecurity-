/**
 * SSO (Single Sign-On) Service
 * Supports SAML 2.0, OAuth 2.0, and OpenID Connect
 */

import jwt from 'jsonwebtoken';

export interface SSOProvider {
    id: string;
    name: string;
    type: 'SAML' | 'OAuth2' | 'OIDC';
    enabled: boolean;
    organizationId: string;
    config: SAMLConfig | OAuth2Config | OIDCConfig;
}

export interface SAMLConfig {
    entryPoint: string; // IdP URL
    issuer: string; // SP Entity ID
    cert: string; // X.509 certificate
    callbackUrl: string;
    identifierFormat?: string;
    signatureAlgorithm?: 'sha1' | 'sha256' | 'sha512';
    wantAssertionsSigned?: boolean;
    wantAuthnResponseSigned?: boolean;
}

export interface OAuth2Config {
    clientId: string;
    clientSecret: string;
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    callbackUrl: string;
    scope: string[];
}

export interface OIDCConfig {
    clientId: string;
    clientSecret: string;
    discoveryUrl: string; // .well-known/openid-configuration
    callbackUrl: string;
    scope: string[];
}

export interface SSOUser {
    email: string;
    firstName: string;
    lastName: string;
    nameId?: string;
    attributes?: Record<string, any>;
}

// In-memory storage for demo
const ssoProviders = new Map<string, SSOProvider>();

// Initialize with common providers
const defaultProviders: SSOProvider[] = [
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
    getProviders(organizationId: string): SSOProvider[] {
        return Array.from(ssoProviders.values())
            .filter(p => p.organizationId === organizationId);
    }

    /**
     * Get SSO provider by ID
     */
    getProvider(providerId: string): SSOProvider | undefined {
        return ssoProviders.get(providerId);
    }

    /**
     * Configure SSO provider
     */
    configureProvider(providerId: string, config: Partial<SSOProvider>): SSOProvider {
        const existing = ssoProviders.get(providerId);
        if (!existing) {
            throw new Error('SSO provider not found');
        }

        const updated: SSOProvider = {
            ...existing,
            ...config,
            config: {
                ...existing.config,
                ...config.config
            }
        };

        ssoProviders.set(providerId, updated);
        console.log(`✅ SSO Provider configured: ${updated.name}`);
        return updated;
    }

    /**
     * Enable/disable SSO provider
     */
    toggleProvider(providerId: string, enabled: boolean): boolean {
        const provider = ssoProviders.get(providerId);
        if (!provider) return false;

        provider.enabled = enabled;
        ssoProviders.set(providerId, provider);
        console.log(`${enabled ? '✅ Enabled' : '❌ Disabled'} SSO: ${provider.name}`);
        return true;
    }

    /**
     * Generate SAML AuthnRequest
     */
    generateSAMLRequest(providerId: string): { url: string; relayState: string } {
        const provider = ssoProviders.get(providerId);
        if (!provider || provider.type !== 'SAML') {
            throw new Error('Invalid SAML provider');
        }

        const config = provider.config as SAMLConfig;
        const relayState = this.generateState();

        // In production, use passport-saml or similar library
        const samlRequest = this.buildSAMLRequest(config);
        const encodedRequest = Buffer.from(samlRequest).toString('base64');

        const url = `${config.entryPoint}?SAMLRequest=${encodeURIComponent(encodedRequest)}&RelayState=${relayState}`;

        console.log('📤 SAML AuthnRequest generated');
        return { url, relayState };
    }

    /**
     * Process SAML Response
     */
    async processSAMLResponse(samlResponse: string, relayState: string): Promise<SSOUser> {
        // In production, validate SAML response signature, assertions, etc.
        // Use passport-saml or node-saml library

        console.log('📥 Processing SAML response');

        // Mock parsing for demo
        const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');
        
        // Extract user attributes from SAML assertion
        const user: SSOUser = {
            email: this.extractSAMLAttribute(decoded, 'email'),
            firstName: this.extractSAMLAttribute(decoded, 'firstName') || 'SSO',
            lastName: this.extractSAMLAttribute(decoded, 'lastName') || 'User',
            nameId: this.extractSAMLAttribute(decoded, 'nameId'),
            attributes: {}
        };

        console.log(`✅ SAML authentication successful: ${user.email}`);
        return user;
    }

    /**
     * Generate OAuth2 authorization URL
     */
    generateOAuth2URL(providerId: string): { url: string; state: string } {
        const provider = ssoProviders.get(providerId);
        if (!provider || provider.type !== 'OAuth2') {
            throw new Error('Invalid OAuth2 provider');
        }

        const config = provider.config as OAuth2Config;
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
        console.log('📤 OAuth2 authorization URL generated');
        return { url, state };
    }

    /**
     * Exchange OAuth2 code for tokens
     */
    async exchangeOAuth2Code(providerId: string, code: string): Promise<SSOUser> {
        const provider = ssoProviders.get(providerId);
        if (!provider || provider.type !== 'OAuth2') {
            throw new Error('Invalid OAuth2 provider');
        }

        const config = provider.config as OAuth2Config;

        // In production, make actual API calls
        console.log('📥 Exchanging OAuth2 code for tokens');

        // Mock token exchange
        const accessToken = 'mock_access_token';

        // Fetch user info
        console.log('📥 Fetching user info from OAuth2 provider');
        
        // Mock user info for demo
        const user: SSOUser = {
            email: 'sso.user@example.com',
            firstName: 'OAuth',
            lastName: 'User',
            attributes: {
                provider: provider.name,
                sub: 'oauth2_user_id'
            }
        };

        console.log(`✅ OAuth2 authentication successful: ${user.email}`);
        return user;
    }

    /**
     * Generate OIDC authorization URL
     */
    async generateOIDCURL(providerId: string): Promise<{ url: string; state: string; nonce: string }> {
        const provider = ssoProviders.get(providerId);
        if (!provider || provider.type !== 'OIDC') {
            throw new Error('Invalid OIDC provider');
        }

        const config = provider.config as OIDCConfig;
        const state = this.generateState();
        const nonce = this.generateState();

        // In production, fetch discovery document
        console.log('📥 Fetching OIDC discovery document');

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

        console.log('📤 OIDC authorization URL generated');
        return { url, state, nonce };
    }

    /**
     * Process OIDC ID Token
     */
    async processOIDCToken(providerId: string, code: string, nonce: string): Promise<SSOUser> {
        const provider = ssoProviders.get(providerId);
        if (!provider || provider.type !== 'OIDC') {
            throw new Error('Invalid OIDC provider');
        }

        console.log('📥 Processing OIDC ID token');

        // In production:
        // 1. Exchange code for tokens
        // 2. Validate ID token signature
        // 3. Verify nonce
        // 4. Extract user claims

        // Mock user for demo
        const user: SSOUser = {
            email: 'oidc.user@example.com',
            firstName: 'OpenID',
            lastName: 'User',
            attributes: {
                provider: provider.name,
                sub: 'oidc_user_id',
                nonce
            }
        };

        console.log(`✅ OIDC authentication successful: ${user.email}`);
        return user;
    }

    /**
     * Generate JWT token for SSO user
     */
    generateJWTForSSOUser(user: SSOUser, organizationId: string): string {
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

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret');
        console.log(`🔑 JWT token generated for SSO user: ${user.email}`);
        return token;
    }

    /**
     * Validate SSO session
     */
    validateSSOSession(token: string): boolean {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
            return decoded.authMethod === 'SSO';
        } catch {
            return false;
        }
    }

    /**
     * Generate random state for CSRF protection
     */
    private generateState(): string {
        return Buffer.from(
            Array.from({ length: 32 }, () => Math.random().toString(36)[2])
                .join('')
        ).toString('base64');
    }

    /**
     * Build SAML AuthnRequest XML
     */
    private buildSAMLRequest(config: SAMLConfig): string {
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
    private extractSAMLAttribute(samlXML: string, attribute: string): string {
        // In production, use XML parser
        // This is a simplified mock
        const regex = new RegExp(`<saml:Attribute Name="${attribute}"[^>]*>.*?<saml:AttributeValue>([^<]+)</saml:AttributeValue>`, 'i');
        const match = samlXML.match(regex);
        return match ? match[1] : '';
    }

    /**
     * Get SSO statistics
     */
    getStatistics(organizationId: string) {
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
    private isConfigured(provider: SSOProvider): boolean {
        if (provider.type === 'SAML') {
            const config = provider.config as SAMLConfig;
            return !!config.entryPoint && !!config.cert && !!config.issuer;
        } else if (provider.type === 'OAuth2') {
            const config = provider.config as OAuth2Config;
            return !!config.clientId && !!config.clientSecret;
        } else if (provider.type === 'OIDC') {
            const config = provider.config as OIDCConfig;
            return !!config.clientId && !!config.clientSecret && !!config.discoveryUrl;
        }
        return false;
    }
}

export default new SSOService();

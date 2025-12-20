/**
 * SSO (Single Sign-On) Service
 * Supports SAML 2.0, OAuth 2.0, and OpenID Connect
 */
export interface SSOProvider {
    id: string;
    name: string;
    type: 'SAML' | 'OAuth2' | 'OIDC';
    enabled: boolean;
    organizationId: string;
    config: SAMLConfig | OAuth2Config | OIDCConfig;
}
export interface SAMLConfig {
    entryPoint: string;
    issuer: string;
    cert: string;
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
    discoveryUrl: string;
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
declare class SSOService {
    /**
     * Get all SSO providers for organization
     */
    getProviders(organizationId: string): SSOProvider[];
    /**
     * Get SSO provider by ID
     */
    getProvider(providerId: string): SSOProvider | undefined;
    /**
     * Configure SSO provider
     */
    configureProvider(providerId: string, config: Partial<SSOProvider>): SSOProvider;
    /**
     * Enable/disable SSO provider
     */
    toggleProvider(providerId: string, enabled: boolean): boolean;
    /**
     * Generate SAML AuthnRequest
     */
    generateSAMLRequest(providerId: string): {
        url: string;
        relayState: string;
    };
    /**
     * Process SAML Response
     */
    processSAMLResponse(samlResponse: string, relayState: string): Promise<SSOUser>;
    /**
     * Generate OAuth2 authorization URL
     */
    generateOAuth2URL(providerId: string): {
        url: string;
        state: string;
    };
    /**
     * Exchange OAuth2 code for tokens
     */
    exchangeOAuth2Code(providerId: string, code: string): Promise<SSOUser>;
    /**
     * Generate OIDC authorization URL
     */
    generateOIDCURL(providerId: string): Promise<{
        url: string;
        state: string;
        nonce: string;
    }>;
    /**
     * Process OIDC ID Token
     */
    processOIDCToken(providerId: string, code: string, nonce: string): Promise<SSOUser>;
    /**
     * Generate JWT token for SSO user
     */
    generateJWTForSSOUser(user: SSOUser, organizationId: string): string;
    /**
     * Validate SSO session
     */
    validateSSOSession(token: string): boolean;
    /**
     * Generate random state for CSRF protection
     */
    private generateState;
    /**
     * Build SAML AuthnRequest XML
     */
    private buildSAMLRequest;
    /**
     * Extract attribute from SAML response
     */
    private extractSAMLAttribute;
    /**
     * Get SSO statistics
     */
    getStatistics(organizationId: string): {
        totalProviders: number;
        enabledProviders: number;
        providerTypes: {
            SAML: number;
            OAuth2: number;
            OIDC: number;
        };
        configured: number;
    };
    /**
     * Check if provider is fully configured
     */
    private isConfigured;
}
declare const _default: SSOService;
export default _default;
//# sourceMappingURL=ssoService.d.ts.map
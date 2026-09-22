import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { assertSafeOutboundDestination, ssrfSafeJson } from '../security/ssrfSafeFetch';
import { IdentityError } from './core';

export type OidcClaims = {
    issuer: string;
    subject: string;
    audience: string | string[];
    email?: string;
    firstName?: string;
    lastName?: string;
    groups: string[];
    nonce?: string;
    exp?: number;
};

type Jwk = { kid?: string; kty?: string; n?: string; e?: string; crv?: string; x?: string; y?: string };

export async function discoverOidc(issuer: string) {
    const wellKnown = issuer.replace(/\/$/, '') + '/.well-known/openid-configuration';
    const json = await ssrfSafeJson<{
        issuer?: string;
        authorization_endpoint?: string;
        token_endpoint?: string;
        jwks_uri?: string;
        userinfo_endpoint?: string;
    }>(wellKnown);
    if (!json.authorization_endpoint || !json.token_endpoint || !json.jwks_uri) {
        throw new IdentityError('configuration_error', 400);
    }
    await assertSafeOutboundDestination(json.authorization_endpoint);
    await assertSafeOutboundDestination(json.token_endpoint);
    await assertSafeOutboundDestination(json.jwks_uri);
    if (json.userinfo_endpoint) {
        await assertSafeOutboundDestination(json.userinfo_endpoint);
    }
    return {
        issuer: json.issuer || issuer,
        authorizationEndpoint: json.authorization_endpoint,
        tokenEndpoint: json.token_endpoint,
        jwksUri: json.jwks_uri,
    };
}

export function createPkce() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
}

export function oidcAuthorizeUrl(input: {
    authorizationEndpoint: string;
    clientId: string;
    redirectUri: string;
    state: string;
    nonce: string;
    codeChallenge: string;
    scopes: string;
}) {
    const url = new URL(input.authorizationEndpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', input.clientId);
    url.searchParams.set('redirect_uri', input.redirectUri);
    url.searchParams.set('scope', input.scopes);
    url.searchParams.set('state', input.state);
    url.searchParams.set('nonce', input.nonce);
    url.searchParams.set('code_challenge', input.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
}

export async function exchangeOidcCode(input: {
    tokenEndpoint: string;
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret?: string;
    codeVerifier: string;
}) {
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: input.code,
        redirect_uri: input.redirectUri,
        client_id: input.clientId,
        code_verifier: input.codeVerifier,
    });
    if (input.clientSecret) body.set('client_secret', input.clientSecret);
    const response = await ssrfSafeJson<{ id_token?: string; access_token?: string }>(input.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        maxRedirects: 0,
    });
    return response;
}

function publicKeyFromJwk(jwk: Jwk) {
    return crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: 'jwk' });
}

async function keyFromJwks(jwksUri: string, kid?: string) {
    const jwks = await ssrfSafeJson<{ keys?: Jwk[] }>(jwksUri, { maxRedirects: 0 });
    const keys = jwks.keys || [];
    const jwk = (kid && keys.find((item) => item.kid === kid)) || keys[0];
    if (!jwk) throw new IdentityError('invalid_signature');
    return publicKeyFromJwk(jwk);
}

export async function verifyOidcIdToken(input: {
    idToken: string;
    jwksUri: string;
    issuer: string;
    audience: string;
    nonce: string;
    key?: crypto.KeyObject | string;
}): Promise<OidcClaims> {
    const decoded = jwt.decode(input.idToken, { complete: true });
    if (!decoded || typeof decoded === 'string') throw new IdentityError('invalid_signature');
    let key = input.key;
    if (!key) {
        key = await keyFromJwks(input.jwksUri, typeof decoded.header.kid === 'string' ? decoded.header.kid : undefined);
    }
    let payload: jwt.JwtPayload;
    try {
        const verified = jwt.verify(input.idToken, key, {
            issuer: input.issuer,
            audience: input.audience,
            algorithms: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'],
        });
        if (!verified || typeof verified === 'string') throw new IdentityError('invalid_signature');
        payload = verified;
    } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (/issuer/i.test(message)) throw new IdentityError('issuer_mismatch');
        if (/audience/i.test(message)) throw new IdentityError('audience_mismatch');
        if (/exp|expired|jwt expired/i.test(message)) throw new IdentityError('expired_assertion');
        throw new IdentityError('invalid_signature');
    }
    if (payload.nonce !== input.nonce) throw new IdentityError('nonce_mismatch');
    const groups = Array.isArray(payload.groups)
        ? payload.groups.map(String)
        : typeof payload.groups === 'string'
            ? [payload.groups]
            : [];
    return {
        issuer: String(payload.iss || ''),
        subject: String(payload.sub || ''),
        audience: (payload.aud as string | string[]) || input.audience,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        firstName: typeof payload.given_name === 'string' ? payload.given_name : undefined,
        lastName: typeof payload.family_name === 'string' ? payload.family_name : undefined,
        groups,
        nonce: typeof payload.nonce === 'string' ? payload.nonce : undefined,
        exp: typeof payload.exp === 'number' ? payload.exp : undefined,
    };
}

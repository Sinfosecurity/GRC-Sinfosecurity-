import dns from 'dns/promises';
import https from 'https';
import { URL } from 'url';
import { ApiError } from '../middleware/errorHandler';
import {
    SSRF_SAFE_ERROR,
    assertSafeOutboundUrl,
    assertSafeResolvedAddresses,
} from './ssrfPolicy';

export type SafeFetchInit = {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
    maxBytes?: number;
    maxRedirects?: number;
};

export type SafeFetchResult = {
    ok: boolean;
    status: number;
    text: string;
};

const DEFAULT_TIMEOUT_MS = 4000;
const DEFAULT_MAX_BYTES = 256 * 1024;
const DEFAULT_MAX_REDIRECTS = 2;

function stripHopHeaders(headers: Record<string, string> = {}): Record<string, string> {
    const blocked = new Set(['authorization', 'cookie', 'proxy-authorization', 'x-api-key', 'x-amz-security-token']);
    return Object.fromEntries(
        Object.entries(headers).filter(([key]) => !blocked.has(key.toLowerCase()))
    );
}

async function resolveAndPin(hostname: string) {
    const lookedUp = await dns.lookup(hostname, { all: true }).catch(() => []);
    assertSafeResolvedAddresses(lookedUp);
    return lookedUp[0];
}

export async function assertSafeOutboundDestination(raw: string) {
    const parsed = assertSafeOutboundUrl(raw);
    await resolveAndPin(parsed.hostname);
    return parsed;
}

function requestOnce(url: URL, pinned: { address: string; family: number }, init: SafeFetchInit): Promise<{
    status: number;
    headers: Record<string, string | string[] | undefined>;
    text: string;
}> {
    const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxBytes = init.maxBytes ?? DEFAULT_MAX_BYTES;
    const method = (init.method || 'GET').toUpperCase();
    const headers = {
        Host: url.hostname,
        Accept: 'application/json, text/plain, */*',
        ...stripHopHeaders(init.headers),
    };

    return new Promise((resolve, reject) => {
        const req = https.request({
            protocol: 'https:',
            hostname: pinned.address,
            port: url.port || 443,
            path: `${url.pathname}${url.search}`,
            method,
            servername: url.hostname,
            headers,
            timeout: timeoutMs,
            lookup: (_host, _options, callback) => {
                callback(null, pinned.address, pinned.family);
            },
        }, (res) => {
            const chunks: Buffer[] = [];
            let size = 0;
            res.on('data', (chunk: Buffer) => {
                size += chunk.length;
                if (size > maxBytes) {
                    req.destroy();
                    reject(new ApiError(400, SSRF_SAFE_ERROR));
                    return;
                }
                chunks.push(chunk);
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode || 0,
                    headers: res.headers as Record<string, string | string[] | undefined>,
                    text: Buffer.concat(chunks).toString('utf8'),
                });
            });
        });
        req.on('timeout', () => {
            req.destroy();
            reject(new ApiError(502, 'The destination could not be reached.'));
        });
        req.on('error', () => {
            reject(new ApiError(502, 'The destination could not be reached.'));
        });
        if (init.body && method !== 'GET' && method !== 'HEAD') {
            req.write(init.body);
        }
        req.end();
    });
}

export async function ssrfSafeFetch(raw: string, init: SafeFetchInit = {}): Promise<SafeFetchResult> {
    let current = raw;
    const maxRedirects = init.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

    for (let hop = 0; hop <= maxRedirects; hop += 1) {
        const parsed = assertSafeOutboundUrl(current);
        const url = new URL(parsed.href);
        const pinned = await resolveAndPin(url.hostname);
        const response = await requestOnce(url, pinned, hop === 0 ? init : { ...init, method: 'GET', body: undefined });
        if (response.status >= 300 && response.status < 400) {
            const location = Array.isArray(response.headers.location)
                ? response.headers.location[0]
                : response.headers.location;
            if (!location || hop === maxRedirects) {
                throw new ApiError(400, SSRF_SAFE_ERROR);
            }
            current = new URL(location, url).toString();
            continue;
        }
        return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            text: response.text,
        };
    }
    throw new ApiError(400, SSRF_SAFE_ERROR);
}

export async function ssrfSafeJson<T>(raw: string, init: SafeFetchInit = {}): Promise<T> {
    const response = await ssrfSafeFetch(raw, init);
    if (!response.ok) {
        throw new ApiError(502, 'The identity provider could not be reached.');
    }
    try {
        return JSON.parse(response.text) as T;
    } catch {
        throw new ApiError(400, 'The identity provider returned an invalid response.');
    }
}

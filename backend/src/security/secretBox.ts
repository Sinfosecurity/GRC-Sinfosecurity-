import crypto from 'crypto';
import { getEnv } from '../config/env';

const PREFIX = 'v1';

function keyBytes(): Buffer {
    const env = getEnv();
    const raw = env.encryptionKey || (!env.isProduction ? env.jwtSecret : '');
    if (!raw) {
        throw new Error('ENCRYPTION_KEY is required to protect MFA secrets in production');
    }
    return crypto.createHash('sha256').update(raw).digest();
}

export function encryptSecret(plain: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes(), iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [PREFIX, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptSecret(payload: string): string {
    const [version, ivB64, tagB64, dataB64] = String(payload || '').split('.');
    if (version !== PREFIX || !ivB64 || !tagB64 || !dataB64) {
        throw new Error('Invalid secret payload');
    }
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()]).toString('utf8');
}

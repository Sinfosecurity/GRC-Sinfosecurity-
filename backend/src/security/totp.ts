import crypto from 'crypto';
import { timingSafeEqualString } from '../services/passwordService';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP = 30;
const DIGITS = 6;

export function generateTotpSecret(bytes = 20): string {
    return toBase32(crypto.randomBytes(bytes));
}

export function totpAt(secret: string, timeMs = Date.now(), step = STEP, digits = DIGITS): string {
    const counter = Math.floor(timeMs / 1000 / step);
    return hotp(secret, counter, digits);
}

export function totpCounter(timeMs = Date.now(), step = STEP): number {
    return Math.floor(timeMs / 1000 / step);
}

export function verifyTotp(secret: string, code: string, options?: { timeMs?: number; window?: number; lastCounter?: number | null }): {
    valid: boolean;
    counter?: number;
    replayed?: boolean;
} {
    const normalized = String(code || '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(normalized)) {
        return { valid: false };
    }
    const window = options?.window ?? 1;
    const now = options?.timeMs ?? Date.now();
    const current = totpCounter(now);
    for (let offset = -window; offset <= window; offset += 1) {
        const counter = current + offset;
        if (options?.lastCounter != null && counter <= options.lastCounter) {
            if (timingSafeEqualString(hotp(secret, counter), normalized)) {
                return { valid: false, replayed: true, counter };
            }
            continue;
        }
        if (timingSafeEqualString(hotp(secret, counter), normalized)) {
            return { valid: true, counter };
        }
    }
    return { valid: false };
}

export function otpauthUrl(input: { secret: string; accountName: string; issuer?: string }): string {
    const issuer = encodeURIComponent(input.issuer || 'Supreme Risk');
    const account = encodeURIComponent(input.accountName);
    return `otpauth://totp/${issuer}:${account}?secret=${input.secret}&issuer=${issuer}&algorithm=SHA1&digits=${DIGITS}&period=${STEP}`;
}

function hotp(secret: string, counter: number, digits = DIGITS): string {
    const key = fromBase32(secret);
    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    buf.writeUInt32BE(counter >>> 0, 4);
    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
    return String(binary % 10 ** digits).padStart(digits, '0');
}

function toBase32(bytes: Buffer): string {
    let bits = '';
    for (const byte of bytes) {
        bits += byte.toString(2).padStart(8, '0');
    }
    let out = '';
    for (let i = 0; i < bits.length; i += 5) {
        const chunk = bits.slice(i, i + 5).padEnd(5, '0');
        out += ALPHABET[parseInt(chunk, 2)];
    }
    return out;
}

function fromBase32(secret: string): Buffer {
    const cleaned = secret.replace(/=+$/g, '').toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = '';
    for (const char of cleaned) {
        const idx = ALPHABET.indexOf(char);
        if (idx < 0) continue;
        bits += idx.toString(2).padStart(5, '0');
    }
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }
    return Buffer.from(bytes);
}

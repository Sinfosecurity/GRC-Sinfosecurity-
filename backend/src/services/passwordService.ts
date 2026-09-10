import bcrypt from 'bcrypt';
import crypto from 'crypto';

const ROUNDS = 12;

export async function hashPassword(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, ROUNDS);
}

export async function verifyPassword(plaintext: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hashedPassword);
}

export function validatePasswordPolicy(password: string): string | null {
    if (!password || password.length < 10) {
        return 'Password must be at least 10 characters';
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return 'Password must include upper, lower, and numeric characters';
    }
    return null;
}

export function randomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export function timingSafeEqualString(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) {
        return false;
    }
    return crypto.timingSafeEqual(left, right);
}

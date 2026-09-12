import { describe, expect, it } from 'vitest';
import { classifyApiError } from '../QueryState';

describe('classifyApiError', () => {
    it('maps standardized user-facing error kinds', () => {
        expect(classifyApiError({ status: 403 })).toBe('PERMISSION_DENIED');
        expect(classifyApiError({ status: 400 })).toBe('VALIDATION');
        expect(classifyApiError({ status: 429 })).toBe('RATE_LIMITED');
        expect(classifyApiError({ message: 'Too many requests. Please try again later.' })).toBe('RATE_LIMITED');
        expect(classifyApiError({ status: 503 })).toBe('PROVIDER_ERROR');
        expect(classifyApiError({ message: 'Email is NOT_CONFIGURED' })).toBe('NOT_CONFIGURED');
        expect(classifyApiError({ status: 500 })).toBe('API_FAILURE');
    });
});

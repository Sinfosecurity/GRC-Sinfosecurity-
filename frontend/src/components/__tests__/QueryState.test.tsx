import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import QueryState, { classifyApiError } from '../QueryState';

describe('classifyApiError', () => {
    it('maps standardized user-facing error kinds', () => {
        expect(classifyApiError({ status: 403 })).toBe('PERMISSION_DENIED');
        expect(classifyApiError({ status: 400 })).toBe('VALIDATION');
        expect(classifyApiError({ status: 429 })).toBe('RATE_LIMITED');
        expect(classifyApiError({ message: 'Too many requests. Please try again later.' })).toBe('RATE_LIMITED');
        expect(classifyApiError({ message: 'Too many requests were made in a short period. Please wait a moment and try again.' })).toBe('RATE_LIMITED');
        expect(classifyApiError({ status: 503 })).toBe('PROVIDER_ERROR');
        expect(classifyApiError({ message: 'Email is NOT_CONFIGURED' })).toBe('NOT_CONFIGURED');
        expect(classifyApiError({ status: 500 })).toBe('API_FAILURE');
    });

    it('renders one professional rate-limit sentence', () => {
        render(
            <QueryState error="Too many requests were made in a short period. Please wait a moment and try again.">
                <span>child</span>
            </QueryState>
        );
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent('Too many requests were made in a short period. Please wait a moment and try again.');
        expect(alert).not.toHaveTextContent(/too many attempts/i);
        expect(alert.textContent?.match(/Too many requests/g)?.length).toBe(1);
        expect(screen.queryByText('child')).not.toBeInTheDocument();
    });
});

import { describe, it, expect, vi } from 'vitest';
import { downloadErrorMessage, filenameFromDisposition } from '../download';
import { ApiClientError } from '../api';

describe('report download helpers', () => {
    it('reads filename from content-disposition', () => {
        expect(filenameFromDisposition('attachment; filename="Supreme-Risk-Decision-Brief-Acme-2026-09-10.pdf"', 'fallback.pdf'))
            .toBe('Supreme-Risk-Decision-Brief-Acme-2026-09-10.pdf');
    });

    it('shows error state for failed generation', () => {
        expect(downloadErrorMessage(new ApiClientError('nope', 500))).toBe('Report generation failed.');
        expect(downloadErrorMessage(new ApiClientError('denied', 403))).toContain('permission');
        expect(downloadErrorMessage(new ApiClientError('missing', 404))).toContain('not found');
        expect(downloadErrorMessage(new ApiClientError('auth', 401))).toContain('Sign in');
    });
});

import { describe, it, expect } from 'vitest';
import { environmentLabelFrom } from '../DevPreviewBanner';

describe('environment banners', () => {
    it('labels staging, development preview, and production correctly', () => {
        expect(environmentLabelFrom({ VITE_ENVIRONMENT: 'staging' })).toBe('STAGING');
        expect(environmentLabelFrom({ VITE_ENVIRONMENT: 'private-beta' })).toBe('PRIVATE_BETA');
        expect(environmentLabelFrom({ DEV: true })).toBe('DEVELOPMENT');
        expect(environmentLabelFrom({ DEV: false, VITE_PREVIEW_LABEL: 'true' })).toBe('DEVELOPMENT');
        expect(environmentLabelFrom({ DEV: false, VITE_ENVIRONMENT: 'production' })).toBeNull();
        expect(environmentLabelFrom({ DEV: false, PROD: true, VITE_PREVIEW_LABEL: 'true' })).toBeNull();
        expect(environmentLabelFrom({ DEV: false })).toBeNull();
    });
});

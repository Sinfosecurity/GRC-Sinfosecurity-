import { ALLOWED_CONTENT_TYPES, sanitizeFilename } from '../storage/types';

describe('file validation', () => {
    it('sanitizes filenames', () => {
        expect(sanitizeFilename('../../etc/passwd')).toBe('.._.._etc_passwd');
        expect(sanitizeFilename('SOC2 Report.pdf')).toBe('SOC2_Report.pdf');
    });

    it('allows only safe content types', () => {
        expect(ALLOWED_CONTENT_TYPES.has('application/pdf')).toBe(true);
        expect(ALLOWED_CONTENT_TYPES.has('application/x-msdownload')).toBe(false);
    });
});

import { detectPortal, portalLoginPath, postLoginPath } from '../portal';

describe('portal detection', () => {
    it('treats admin host and /admin path as the internal plane', () => {
        expect(detectPortal('admin.supremerisk.com', '/login')).toBe('admin');
        expect(detectPortal('supreme-risk-staging.onrender.com', '/admin/login')).toBe('admin');
        expect(detectPortal('app.supremerisk.com', '/login')).toBe('customer');
        expect(portalLoginPath('admin')).toBe('/admin/login');
    });

    it('routes platform sessions to the console and enrollment to MFA', () => {
        expect(postLoginPath({ plane: 'PLATFORM', nextPath: '/platform' })).toBe('/platform');
        expect(postLoginPath({ enrollOnly: true })).toBe('/admin/mfa/enroll');
        expect(postLoginPath({ plane: 'CUSTOMER' })).toBe('/dashboard');
    });
});

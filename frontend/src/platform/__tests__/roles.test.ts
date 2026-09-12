import { describe, expect, it } from 'vitest';
import { isPlatformStaff } from '../roles';

describe('platform staff roles', () => {
    it('treats only Supreme internal roles as platform staff', () => {
        expect(isPlatformStaff('PLATFORM_OWNER')).toBe(true);
        expect(isPlatformStaff('SUPPORT_ANALYST')).toBe(true);
        expect(isPlatformStaff('ORGANIZATION_ADMIN')).toBe(false);
        expect(isPlatformStaff('ADMIN')).toBe(false);
        expect(isPlatformStaff('VIEWER')).toBe(false);
    });
});

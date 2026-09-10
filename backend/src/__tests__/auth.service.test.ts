import { validatePasswordPolicy, hashPassword, verifyPassword, hashToken } from '../services/passwordService';

describe('password service', () => {
    it('rejects weak passwords', () => {
        expect(validatePasswordPolicy('short')).toBeTruthy();
        expect(validatePasswordPolicy('nouppercase1')).toBeTruthy();
        expect(validatePasswordPolicy('ValidPass1')).toBeNull();
    });

    it('hashes and verifies with bcrypt', async () => {
        const hashed = await hashPassword('ValidPass1x');
        expect(hashed).not.toContain('ValidPass1x');
        expect(await verifyPassword('ValidPass1x', hashed)).toBe(true);
        expect(await verifyPassword('wrong', hashed)).toBe(false);
    });

    it('hashes reset tokens', () => {
        expect(hashToken('abc')).not.toBe('abc');
        expect(hashToken('abc')).toBe(hashToken('abc'));
    });
});

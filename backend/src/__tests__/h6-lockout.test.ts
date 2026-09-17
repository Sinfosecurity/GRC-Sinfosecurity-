import { loginLockoutService } from '../services/loginLockoutService';

describe('H-6 progressive login lockout', () => {
    beforeEach(() => loginLockoutService.reset());

    it('locks the account after the threshold and unlocks after cooldown', async () => {
        const email = 'lockout@example.com';
        for (let i = 0; i < loginLockoutService.threshold - 1; i += 1) {
            await loginLockoutService.recordFailure(email);
            await expect(loginLockoutService.assertNotLocked(email)).resolves.toBeUndefined();
        }
        await loginLockoutService.recordFailure(email);
        await expect(loginLockoutService.assertNotLocked(email)).rejects.toMatchObject({ statusCode: 429 });
        await loginLockoutService.recordSuccess(email);
        await expect(loginLockoutService.assertNotLocked(email)).resolves.toBeUndefined();
    });
});

import { environmentClass, isPrivateBetaEnvironment, publicEnvironmentBanner } from '../services/privateBetaEnvironment';

describe('private beta environment', () => {
    it('never labels private-beta as production', () => {
        expect(environmentClass({ APP_ENVIRONMENT: 'private-beta' } as NodeJS.ProcessEnv)).toBe('private-beta');
        expect(isPrivateBetaEnvironment({ APP_ENVIRONMENT: 'private-beta' } as NodeJS.ProcessEnv)).toBe(true);
        const banner = publicEnvironmentBanner('private-beta');
        expect(banner.label).toBe('PRIVATE BETA / TEST');
        expect(banner.productionClaim).toBe(false);
        expect(banner.detail).toMatch(/Not an external pentest, SOC 2, or ISO assessment/i);
        expect(environmentClass({ APP_ENVIRONMENT: 'production' } as NodeJS.ProcessEnv)).toBe('production');
        expect(environmentClass({ APP_ENVIRONMENT: 'staging' } as NodeJS.ProcessEnv)).toBe('staging');
    });
});

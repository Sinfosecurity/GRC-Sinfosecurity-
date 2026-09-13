import { billingStatus } from '../billing/stripeBillingService';
import { stripePriceEnvName } from '../billing/plans';

describe('Stripe test-mode policy', () => {
    const originalSecret = process.env.STRIPE_SECRET_KEY;
    const originalWebhook = process.env.STRIPE_WEBHOOK_SECRET;

    afterEach(() => {
        if (originalSecret === undefined) delete process.env.STRIPE_SECRET_KEY;
        else process.env.STRIPE_SECRET_KEY = originalSecret;
        if (originalWebhook === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
        else process.env.STRIPE_WEBHOOK_SECRET = originalWebhook;
    });

    it('is NOT_CONFIGURED without test credentials', () => {
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_WEBHOOK_SECRET;
        expect(billingStatus()).toBe('NOT_CONFIGURED');
    });

    it('rejects live secret keys', () => {
        process.env.STRIPE_SECRET_KEY = 'sk_live_forbidden';
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
        expect(billingStatus()).toBe('ERROR');
    });

    it('accepts test keys only when the webhook secret is also present', () => {
        process.env.STRIPE_SECRET_KEY = 'sk_test_allowed';
        delete process.env.STRIPE_WEBHOOK_SECRET;
        expect(billingStatus()).toBe('NOT_CONFIGURED');
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
        expect(billingStatus()).toBe('CONNECTED');
    });

    it('maps monthly and annual test price env names', () => {
        expect(stripePriceEnvName('starter')).toBe('STRIPE_PRICE_STARTER');
        expect(stripePriceEnvName('PROFESSIONAL', 'annual')).toBe('STRIPE_PRICE_PROFESSIONAL_ANNUAL');
        expect(stripePriceEnvName('enterprise', 'yearly')).toBe('STRIPE_PRICE_ENTERPRISE_ANNUAL');
        expect(stripePriceEnvName('BUSINESS')).toBe('STRIPE_PRICE_BUSINESS');
        expect(stripePriceEnvName('business', 'annual')).toBe('STRIPE_PRICE_BUSINESS_ANNUAL');
    });
});

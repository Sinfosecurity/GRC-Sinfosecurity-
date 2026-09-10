import { providerState } from '../integrations/integrationProvider';
import { aiStatus } from '../ai/aiProvider';
import { billingStatus } from '../billing/stripeBillingService';

describe('provider truthfulness', () => {
    it('reports integrations as not configured without credentials', () => {
        delete process.env.SLACK_WEBHOOK_URL;
        delete process.env.JIRA_BASE_URL;
        expect(providerState('slack')).toBe('NOT_CONFIGURED');
        expect(providerState('jira')).toBe('NOT_CONFIGURED');
    });

    it('does not claim AI is connected without a key', () => {
        delete process.env.OPENAI_API_KEY;
        delete process.env.AI_API_KEY;
        expect(aiStatus().status).toBe('NOT_CONFIGURED');
    });

    it('does not claim billing is connected without Stripe', () => {
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_WEBHOOK_SECRET;
        expect(billingStatus()).toBe('NOT_CONFIGURED');
    });
});

import Stripe from 'stripe';
import { stripeBillingService } from '../billing/stripeBillingService';
import { intervalFromStripePriceId, planFromStripePriceId } from '../billing/plans';
import { rejectClientTenantOverride } from '../security/tenant';

jest.mock('../config/database', () => ({
    prisma: {
        organization: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        subscriptionEvent: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops)),
    },
}));

jest.mock('../services/auditEventService', () => ({
    recordAudit: jest.fn(),
}));

const { prisma } = require('../config/database');
const { recordAudit } = require('../services/auditEventService');

const TEST_SECRET = 'sk_test_lifecycle_local';
const TEST_WEBHOOK = 'whsec_lifecycle_local';
const PRICES = {
    STRIPE_PRICE_STARTER: 'price_starter_month',
    STRIPE_PRICE_STARTER_ANNUAL: 'price_starter_year',
    STRIPE_PRICE_PROFESSIONAL: 'price_pro_month',
    STRIPE_PRICE_PROFESSIONAL_ANNUAL: 'price_pro_year',
    STRIPE_PRICE_BUSINESS: 'price_biz_month',
    STRIPE_PRICE_BUSINESS_ANNUAL: 'price_biz_year',
    STRIPE_PRICE_ENTERPRISE: 'price_ent_month',
    STRIPE_PRICE_ENTERPRISE_ANNUAL: 'price_ent_year',
};

function signed(event: object) {
    const payload = JSON.stringify(event);
    const header = Stripe.webhooks.generateTestHeaderString({
        payload,
        secret: TEST_WEBHOOK,
    });
    return { payload: Buffer.from(payload), header };
}

describe('Stripe billing lifecycle', () => {
    const original = { ...process.env };

    beforeEach(() => {
        process.env.STRIPE_SECRET_KEY = TEST_SECRET;
        process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK;
        Object.assign(process.env, PRICES);
        jest.clearAllMocks();
        prisma.organization.findUnique.mockResolvedValue({
            id: 'org-a',
            plan: 'STARTER',
            status: 'TRIAL',
            billingCustomerId: 'cus_a',
            billingInterval: null,
            subscriptionStatus: null,
        });
        prisma.organization.findFirst.mockResolvedValue(null);
        prisma.subscriptionEvent.findUnique.mockResolvedValue(null);
        prisma.subscriptionEvent.create.mockResolvedValue({ id: 'evt-row' });
        prisma.organization.update.mockResolvedValue({ id: 'org-a' });
    });

    afterEach(() => {
        process.env = { ...original };
    });

    it('maps monthly and annual prices for every published plan including BUSINESS', () => {
        expect(planFromStripePriceId(PRICES.STRIPE_PRICE_STARTER)).toBe('STARTER');
        expect(intervalFromStripePriceId(PRICES.STRIPE_PRICE_STARTER)).toBe('month');
        expect(planFromStripePriceId(PRICES.STRIPE_PRICE_STARTER_ANNUAL)).toBe('STARTER');
        expect(intervalFromStripePriceId(PRICES.STRIPE_PRICE_STARTER_ANNUAL)).toBe('year');
        expect(planFromStripePriceId(PRICES.STRIPE_PRICE_PROFESSIONAL)).toBe('PROFESSIONAL');
        expect(intervalFromStripePriceId(PRICES.STRIPE_PRICE_PROFESSIONAL_ANNUAL)).toBe('year');
        expect(planFromStripePriceId(PRICES.STRIPE_PRICE_BUSINESS)).toBe('BUSINESS');
        expect(intervalFromStripePriceId(PRICES.STRIPE_PRICE_BUSINESS)).toBe('month');
        expect(planFromStripePriceId(PRICES.STRIPE_PRICE_BUSINESS_ANNUAL)).toBe('BUSINESS');
        expect(intervalFromStripePriceId(PRICES.STRIPE_PRICE_BUSINESS_ANNUAL)).toBe('year');
        expect(planFromStripePriceId(PRICES.STRIPE_PRICE_ENTERPRISE)).toBe('ENTERPRISE');
        expect(intervalFromStripePriceId(PRICES.STRIPE_PRICE_ENTERPRISE_ANNUAL)).toBe('year');
    });

    it('rejects an invalid webhook signature and audits the failure', async () => {
        const { payload } = signed({ id: 'evt_bad', type: 'checkout.session.completed', data: { object: {} } });
        await expect(stripeBillingService.handleWebhook(payload, 't=1,v1=deadbeef')).rejects.toMatchObject({
            statusCode: 400,
        });
        expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'billing.webhook',
            result: 'failure',
        }));
        expect(prisma.subscriptionEvent.create).not.toHaveBeenCalled();
    });

    it('stores customer, subscription, plan, and interval from checkout.session.completed', async () => {
        const { payload, header } = signed({
            id: 'evt_checkout',
            type: 'checkout.session.completed',
            data: {
                object: {
                    object: 'checkout.session',
                    customer: 'cus_a',
                    subscription: 'sub_starter',
                    status: 'complete',
                    metadata: { organizationId: 'org-a', plan: 'STARTER', interval: 'month' },
                },
            },
        });
        await expect(stripeBillingService.handleWebhook(payload, header)).resolves.toEqual({ processed: true });
        expect(prisma.organization.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                status: 'ACTIVE',
                plan: 'STARTER',
                billingCustomerId: 'cus_a',
                billingSubscriptionId: 'sub_starter',
                billingInterval: 'month',
            }),
        }));
    });

    it('maps a Professional annual subscription update from the Stripe price', async () => {
        prisma.organization.findUnique.mockResolvedValue(null);
        prisma.organization.findFirst.mockResolvedValue({
            id: 'org-a',
            plan: 'STARTER',
            status: 'ACTIVE',
            billingCustomerId: 'cus_a',
            billingInterval: 'month',
            subscriptionStatus: 'active',
        });
        const { payload, header } = signed({
            id: 'evt_upgrade',
            type: 'customer.subscription.updated',
            data: {
                object: {
                    id: 'sub_pro',
                    object: 'subscription',
                    customer: 'cus_a',
                    status: 'active',
                    cancel_at_period_end: false,
                    items: {
                        data: [{ price: { id: PRICES.STRIPE_PRICE_PROFESSIONAL_ANNUAL, recurring: { interval: 'year' } } }],
                    },
                },
            },
        });
        await stripeBillingService.handleWebhook(payload, header);
        expect(prisma.organization.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                plan: 'PROFESSIONAL',
                billingInterval: 'year',
                billingSubscriptionId: 'sub_pro',
                status: 'ACTIVE',
            }),
        }));
    });

    it('marks the organization PAST_DUE on invoice.payment_failed', async () => {
        const { payload, header } = signed({
            id: 'evt_fail',
            type: 'invoice.payment_failed',
            data: {
                object: {
                    object: 'invoice',
                    customer: 'cus_a',
                    subscription: 'sub_starter',
                    status: 'open',
                    metadata: { organizationId: 'org-a' },
                },
            },
        });
        await stripeBillingService.handleWebhook(payload, header);
        expect(prisma.organization.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                status: 'PAST_DUE',
                subscriptionStatus: 'past_due',
            }),
        }));
    });

    it('keeps access active when cancellation is scheduled at period end', async () => {
        const { payload, header } = signed({
            id: 'evt_cancel_later',
            type: 'customer.subscription.updated',
            data: {
                object: {
                    id: 'sub_starter',
                    object: 'subscription',
                    customer: 'cus_a',
                    status: 'active',
                    cancel_at_period_end: true,
                    metadata: { organizationId: 'org-a', plan: 'STARTER' },
                    items: {
                        data: [{ price: { id: PRICES.STRIPE_PRICE_STARTER, recurring: { interval: 'month' } } }],
                    },
                },
            },
        });
        await stripeBillingService.handleWebhook(payload, header);
        expect(prisma.organization.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                status: 'ACTIVE',
                cancelAtPeriodEnd: true,
                subscriptionStatus: 'active',
            }),
        }));
    });

    it('cancels immediately on customer.subscription.deleted', async () => {
        const { payload, header } = signed({
            id: 'evt_deleted',
            type: 'customer.subscription.deleted',
            data: {
                object: {
                    id: 'sub_starter',
                    object: 'subscription',
                    customer: 'cus_a',
                    status: 'canceled',
                    metadata: { organizationId: 'org-a' },
                },
            },
        });
        await stripeBillingService.handleWebhook(payload, header);
        expect(prisma.organization.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                status: 'CANCELLED',
                subscriptionStatus: 'canceled',
            }),
        }));
    });

    it('does not create a second subscription event on replay', async () => {
        prisma.subscriptionEvent.findUnique.mockResolvedValue({ id: 'already', stripeEventId: 'evt_checkout' });
        const { payload, header } = signed({
            id: 'evt_checkout',
            type: 'checkout.session.completed',
            data: { object: { metadata: { organizationId: 'org-a' } } },
        });
        await expect(stripeBillingService.handleWebhook(payload, header)).resolves.toEqual({ idempotent: true });
        expect(prisma.subscriptionEvent.create).not.toHaveBeenCalled();
        expect(prisma.organization.update).not.toHaveBeenCalled();
    });

    it('refuses a client organization override for another tenant', () => {
        expect(() => rejectClientTenantOverride('org-a', 'org-b')).toThrow('Cannot act on another organization');
        expect(rejectClientTenantOverride('org-a', 'org-a')).toBe('org-a');
        expect(rejectClientTenantOverride('org-a')).toBe('org-a');
    });
});

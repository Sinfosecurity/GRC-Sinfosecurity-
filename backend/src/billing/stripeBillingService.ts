import { OrganizationStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { isProviderConfigured } from '../config/env';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from '../services/auditEventService';
import {
    normalizeBillingInterval,
    normalizePlan,
    planFromStripePriceId,
    stripePriceEnvName,
} from './plans';

type StripeObject = {
    id?: string;
    object?: string;
    customer?: string | { id?: string } | null;
    subscription?: string | { id?: string } | null;
    status?: string;
    cancel_at_period_end?: boolean;
    metadata?: { organizationId?: string; plan?: string; interval?: string };
    items?: { data?: Array<{ price?: { id?: string; recurring?: { interval?: string } } }> };
    lines?: { data?: Array<{ price?: { id?: string; recurring?: { interval?: string } } }> };
};

export function billingStatus() {
    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (secret.startsWith('sk_live_') || secret.startsWith('rk_live_')) {
        return 'ERROR';
    }
    return isProviderConfigured('STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET')
        ? 'CONNECTED'
        : 'NOT_CONFIGURED';
}

async function stripeClient() {
    const status = billingStatus();
    if (status === 'ERROR') {
        throw new ApiError(503, 'Live Stripe credentials are not permitted');
    }
    if (status === 'NOT_CONFIGURED' || !isProviderConfigured('STRIPE_SECRET_KEY')) {
        throw new ApiError(503, 'Billing is not configured');
    }
    const Stripe = (await import('stripe')).default;
    return new Stripe(process.env.STRIPE_SECRET_KEY as string);
}

function asId(value: string | { id?: string } | null | undefined): string | undefined {
    if (!value) {
        return undefined;
    }
    return typeof value === 'string' ? value : value.id;
}

function firstPrice(object: StripeObject): { id?: string; interval?: string } {
    const price = object.items?.data?.[0]?.price || object.lines?.data?.[0]?.price;
    return { id: price?.id, interval: price?.recurring?.interval };
}

function mapOrganizationStatus(
    stripeStatus: string | undefined,
    eventType: string
): OrganizationStatus | undefined {
    if (eventType === 'invoice.payment_failed' || stripeStatus === 'past_due' || stripeStatus === 'unpaid') {
        return 'PAST_DUE';
    }
    if (eventType === 'customer.subscription.deleted' || stripeStatus === 'canceled') {
        return 'CANCELLED';
    }
    if (eventType === 'checkout.session.completed' || stripeStatus === 'active' || eventType === 'invoice.paid') {
        return 'ACTIVE';
    }
    if (stripeStatus === 'trialing') {
        return 'TRIAL';
    }
    return undefined;
}

export const stripeBillingService = {
    status: billingStatus,

    async createCheckout(
        organizationId: string,
        actorUserId: string,
        plan: string,
        successUrl: string,
        cancelUrl: string,
        interval?: string
    ) {
        if (billingStatus() === 'ERROR') {
            throw new ApiError(503, 'Live Stripe credentials are not permitted');
        }
        if (billingStatus() === 'NOT_CONFIGURED') {
            return { status: 'NOT_CONFIGURED' as const };
        }
        const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
        if (!organization) {
            throw new ApiError(404, 'Organization not found');
        }
        const stripe = await stripeClient();
        const normalized = normalizePlan(plan);
        const billingInterval = normalizeBillingInterval(interval);
        const priceId = process.env[stripePriceEnvName(normalized, billingInterval)];
        if (!priceId) {
            return { status: 'NOT_CONFIGURED' as const, reason: `Price for ${normalized} is not configured` };
        }

        let customerId = organization.billingCustomerId || undefined;
        if (!customerId) {
            const customer = await stripe.customers.create({
                name: organization.name,
                metadata: { organizationId },
            });
            customerId = customer.id;
            await prisma.organization.update({
                where: { id: organizationId },
                data: { billingCustomerId: customerId },
            });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { organizationId, plan: normalized, interval: billingInterval },
            subscription_data: {
                metadata: { organizationId, plan: normalized, interval: billingInterval },
            },
        });

        await recordAudit({
            organizationId,
            actorUserId,
            action: 'billing.checkout',
            resourceType: 'Organization',
            resourceId: organizationId,
            result: 'success',
            metadata: { plan: normalized, interval: billingInterval },
        });

        return { status: 'CONNECTED' as const, url: session.url };
    },

    async createPortal(organizationId: string, returnUrl: string) {
        if (billingStatus() === 'ERROR') {
            throw new ApiError(503, 'Live Stripe credentials are not permitted');
        }
        if (billingStatus() === 'NOT_CONFIGURED') {
            return { status: 'NOT_CONFIGURED' as const };
        }
        const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
        if (!organization?.billingCustomerId) {
            throw new ApiError(409, 'No billing customer exists for this organization');
        }
        const stripe = await stripeClient();
        const session = await stripe.billingPortal.sessions.create({
            customer: organization.billingCustomerId,
            return_url: returnUrl,
        });
        await recordAudit({
            organizationId,
            action: 'billing.portal',
            resourceType: 'Organization',
            resourceId: organizationId,
            result: 'success',
        });
        return { status: 'CONNECTED' as const, url: session.url };
    },

    async handleWebhook(rawBody: Buffer, signature: string) {
        if (billingStatus() === 'ERROR') {
            throw new ApiError(503, 'Live Stripe credentials are not permitted');
        }
        if (billingStatus() === 'NOT_CONFIGURED') {
            throw new ApiError(503, 'Billing is not configured');
        }
        const stripe = await stripeClient();
        let event: { id: string; type: string; data: { object: StripeObject } };
        try {
            event = stripe.webhooks.constructEvent(
                rawBody,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET as string
            ) as { id: string; type: string; data: { object: StripeObject } };
        } catch {
            await recordAudit({
                action: 'billing.webhook',
                resourceType: 'Organization',
                result: 'failure',
                metadata: { reason: 'invalid_signature' },
            });
            throw new ApiError(400, 'Invalid Stripe signature');
        }

        const existing = await prisma.subscriptionEvent.findUnique({
            where: { stripeEventId: event.id },
        });
        if (existing) {
            return { idempotent: true };
        }

        const object = event.data.object;
        const customerId = asId(object.customer);
        const subscriptionId =
            object.object === 'subscription' ? object.id : asId(object.subscription);
        const price = firstPrice(object);
        const pricePlan = planFromStripePriceId(price.id);

        let organization = object.metadata?.organizationId
            ? await prisma.organization.findUnique({ where: { id: object.metadata.organizationId } })
            : null;
        if (!organization && customerId) {
            organization = await prisma.organization.findFirst({
                where: { billingCustomerId: customerId },
            });
        }
        if (!organization && subscriptionId) {
            organization = await prisma.organization.findFirst({
                where: { billingSubscriptionId: subscriptionId },
            });
        }
        if (!organization) {
            return { ignored: true };
        }

        const cancelAtPeriodEnd = Boolean(object.cancel_at_period_end);
        const plan = pricePlan || (object.metadata?.plan ? normalizePlan(object.metadata.plan) : normalizePlan(organization.plan));
        const interval =
            price.interval === 'month' || price.interval === 'year'
                ? price.interval
                : object.metadata?.interval === 'month' || object.metadata?.interval === 'year'
                  ? object.metadata.interval
                  : organization.billingInterval;
        const stripeStatus = object.status;
        const orgStatus = mapOrganizationStatus(stripeStatus, event.type) || organization.status;
        const subscriptionStatus =
            event.type === 'invoice.payment_failed'
                ? 'past_due'
                : event.type === 'invoice.paid' && (!stripeStatus || stripeStatus === 'paid')
                  ? 'active'
                  : stripeStatus || organization.subscriptionStatus || event.type;

        await prisma.$transaction([
            prisma.subscriptionEvent.create({
                data: {
                    organizationId: organization.id,
                    stripeEventId: event.id,
                    type: event.type,
                    payloadSummary: {
                        status: subscriptionStatus,
                        plan,
                        interval,
                        subscriptionId,
                        cancelAtPeriodEnd,
                    },
                },
            }),
            prisma.organization.update({
                where: { id: organization.id },
                data: {
                    status: orgStatus,
                    plan,
                    subscriptionStatus,
                    cancelAtPeriodEnd,
                    ...(customerId ? { billingCustomerId: customerId } : {}),
                    ...(subscriptionId ? { billingSubscriptionId: subscriptionId } : {}),
                    ...(interval ? { billingInterval: interval } : {}),
                },
            }),
        ]);

        await recordAudit({
            organizationId: organization.id,
            action: 'billing.webhook',
            resourceType: 'Organization',
            resourceId: organization.id,
            result: 'success',
            metadata: { type: event.type, subscriptionStatus, plan, interval },
        });

        return { processed: true };
    },
};

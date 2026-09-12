import { prisma } from '../config/database';
import { isProviderConfigured } from '../config/env';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from '../services/auditEventService';
import { normalizePlan } from './plans';

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

export const stripeBillingService = {
    status: billingStatus,

    async createCheckout(organizationId: string, actorUserId: string, plan: string, successUrl: string, cancelUrl: string) {
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
        const priceId = process.env[`STRIPE_PRICE_${normalizePlan(plan)}`];
        if (!priceId) {
            return { status: 'NOT_CONFIGURED' as const, reason: `Price for ${plan} is not configured` };
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
            metadata: { organizationId, plan: normalizePlan(plan) },
        });

        await recordAudit({
            organizationId,
            actorUserId,
            action: 'billing.checkout',
            resourceType: 'Organization',
            resourceId: organizationId,
            result: 'success',
            metadata: { plan: normalizePlan(plan) },
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
        const event = stripe.webhooks.constructEvent(
            rawBody,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET as string
        );

        const existing = await prisma.subscriptionEvent.findUnique({
            where: { stripeEventId: event.id },
        });
        if (existing) {
            return { idempotent: true };
        }

        const object = event.data.object as {
            customer?: string;
            metadata?: { organizationId?: string; plan?: string };
            status?: string;
        };
        let organization = object.metadata?.organizationId
            ? await prisma.organization.findUnique({ where: { id: object.metadata.organizationId } })
            : null;
        if (!organization && object.customer) {
            organization = await prisma.organization.findFirst({
                where: { billingCustomerId: String(object.customer) },
            });
        }
        if (!organization) {
            return { ignored: true };
        }

        const subscriptionStatus = object.status || event.type;
        const plan = object.metadata?.plan ? normalizePlan(object.metadata.plan) : normalizePlan(organization.plan);
        let orgStatus = organization.status;
        if (subscriptionStatus === 'active' || event.type === 'checkout.session.completed') {
            orgStatus = 'ACTIVE';
        } else if (subscriptionStatus === 'past_due') {
            orgStatus = 'PAST_DUE';
        } else if (subscriptionStatus === 'canceled' || event.type === 'customer.subscription.deleted') {
            orgStatus = 'CANCELLED';
        }

        await prisma.$transaction([
            prisma.subscriptionEvent.create({
                data: {
                    organizationId: organization.id,
                    stripeEventId: event.id,
                    type: event.type,
                    payloadSummary: { status: subscriptionStatus, plan },
                },
            }),
            prisma.organization.update({
                where: { id: organization.id },
                data: {
                    status: orgStatus,
                    plan,
                    subscriptionStatus,
                },
            }),
        ]);

        await recordAudit({
            organizationId: organization.id,
            action: 'billing.webhook',
            resourceType: 'Organization',
            resourceId: organization.id,
            result: 'success',
            metadata: { type: event.type, subscriptionStatus },
        });

        return { processed: true };
    },
};

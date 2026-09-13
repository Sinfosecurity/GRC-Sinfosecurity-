import { prisma } from '../config/database';
import { redisClient } from '../config/database';
import { emailStatus } from './notificationDeliveryService';
import { objectStorageService } from './objectStorageService';
import { billingStatus } from '../billing/stripeBillingService';
import { isProviderConfigured } from '../config/env';
import { malwareScanService } from '../malware/malwareScanService';
import { environmentClass, publicEnvironmentBanner } from './privateBetaEnvironment';

export type ProviderState = 'CONNECTED' | 'DEGRADED' | 'NOT_CONFIGURED' | 'ERROR' | 'POLICY';

export async function providerHealth() {
    await malwareScanService.probe();
    const storage = objectStorageService.status();
    let database: ProviderState = 'ERROR';
    try {
        await prisma.$queryRaw`SELECT 1`;
        database = 'CONNECTED';
    } catch {
        database = 'ERROR';
    }

    let redis: ProviderState = 'NOT_CONFIGURED';
    if (process.env.REDIS_URL) {
        try {
            if (redisClient && (redisClient.isReady || redisClient.isOpen)) {
                await redisClient.ping();
                redis = 'CONNECTED';
            } else {
                redis = 'ERROR';
            }
        } catch {
            redis = 'ERROR';
        }
    }

    let lastStripeWebhook: { type: string; at: Date; idempotentKey: string } | null = null;
    try {
        const last = await prisma.subscriptionEvent.findFirst({
            orderBy: { processedAt: 'desc' },
            select: { type: true, processedAt: true, stripeEventId: true },
        });
        if (last) {
            lastStripeWebhook = { type: last.type, at: last.processedAt, idempotentKey: last.stripeEventId };
        }
    } catch {
        lastStripeWebhook = null;
    }

    return {
        environment: process.env.APP_ENVIRONMENT || process.env.VITE_ENVIRONMENT || process.env.NODE_ENV,
        environmentClass: environmentClass(),
        environmentBanner: publicEnvironmentBanner(),
        commercialLaunch: false,
        database,
        storage: storage.provider === 'NOT_CONFIGURED' ? 'NOT_CONFIGURED' : storage.provider === 's3' ? 'CONNECTED' : 'CONNECTED',
        storageProvider: storage.provider,
        malware: storage.malwareProvider,
        malwareScanning: storage.malwareScanning,
        malwarePolicy: storage.downloadPolicy,
        redis,
        email: emailStatus(),
        stripe: billingStatus(),
        lastStripeWebhook,
        ai: isProviderConfigured('OPENAI_API_KEY') || isProviderConfigured('AI_API_KEY') ? 'CONNECTED' : 'NOT_CONFIGURED',
        alerting: process.env.ALERT_WEBHOOK_URL || emailStatus() === 'CONNECTED' ? 'PATH_PRESENT' : 'NOT_CONFIGURED',
    };
}

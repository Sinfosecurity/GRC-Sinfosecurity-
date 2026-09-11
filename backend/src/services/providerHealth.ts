import { prisma } from '../config/database';
import { redisClient } from '../config/database';
import { emailStatus } from './notificationDeliveryService';
import { objectStorageService } from './objectStorageService';
import { billingStatus } from '../billing/stripeBillingService';
import { isProviderConfigured } from '../config/env';

export type ProviderState = 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR' | 'POLICY';

export async function providerHealth() {
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

    return {
        environment: process.env.APP_ENVIRONMENT || process.env.VITE_ENVIRONMENT || process.env.NODE_ENV,
        database,
        storage: storage.provider === 'NOT_CONFIGURED' ? 'NOT_CONFIGURED' : storage.provider === 's3' ? 'CONNECTED' : 'CONNECTED',
        storageProvider: storage.provider,
        malware: storage.malwareScanning,
        malwarePolicy: storage.downloadPolicy,
        redis,
        email: emailStatus(),
        stripe: billingStatus(),
        ai: isProviderConfigured('OPENAI_API_KEY') || isProviderConfigured('AI_API_KEY') ? 'CONNECTED' : 'NOT_CONFIGURED',
    };
}

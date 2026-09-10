import { IntegrationStatus } from '@prisma/client';
import { isProviderConfigured } from '../config/env';

export type MonitoringProviderStatus = 'CONNECTED' | 'NOT_CONFIGURED' | 'DEGRADED' | 'ERROR' | 'DISABLED';

export type MonitoringProviderInput = {
    credentialsConfigured: boolean;
    dbStatus?: IntegrationStatus | null;
    lastError?: string | null;
};

export function resolveMonitoringProviderStatus(input: MonitoringProviderInput): MonitoringProviderStatus {
    if (input.dbStatus === IntegrationStatus.DISABLED) {
        return 'DISABLED';
    }
    if (input.dbStatus === IntegrationStatus.ERROR) {
        return 'ERROR';
    }
    if (input.credentialsConfigured && input.lastError) {
        return 'ERROR';
    }
    if (input.credentialsConfigured && input.dbStatus === IntegrationStatus.DISCONNECTED) {
        return 'DEGRADED';
    }
    if (input.credentialsConfigured || input.dbStatus === IntegrationStatus.CONNECTED) {
        return 'CONNECTED';
    }
    return 'NOT_CONFIGURED';
}

export function monitoringCredentialsConfigured(): boolean {
    return isProviderConfigured('SIEM_WEBHOOK_URL');
}

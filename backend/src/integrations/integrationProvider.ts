import { IntegrationStatus } from '@prisma/client';
import { isProviderConfigured } from '../config/env';

export type ProviderState = 'NOT_CONFIGURED' | 'CONNECTED' | 'ERROR' | 'DISABLED';

export type IntegrationResult<T = unknown> = {
    status: ProviderState;
    data?: T;
    error?: string;
};

export function mapDbStatus(status: IntegrationStatus): ProviderState {
    switch (status) {
        case IntegrationStatus.CONNECTED:
            return 'CONNECTED';
        case IntegrationStatus.ERROR:
            return 'ERROR';
        case IntegrationStatus.DISABLED:
            return 'DISABLED';
        default:
            return 'NOT_CONFIGURED';
    }
}

export const INTEGRATION_REQUIREMENTS: Record<string, string[]> = {
    slack: ['SLACK_WEBHOOK_URL'],
    jira: ['JIRA_BASE_URL', 'JIRA_API_TOKEN', 'JIRA_EMAIL'],
    servicenow: ['SERVICENOW_INSTANCE', 'SERVICENOW_USER', 'SERVICENOW_PASSWORD'],
    siem: ['SIEM_WEBHOOK_URL'],
};

export function providerState(name: string): ProviderState {
    const keys = INTEGRATION_REQUIREMENTS[name];
    if (!keys) return 'NOT_CONFIGURED';
    return isProviderConfigured(...keys) ? 'CONNECTED' : 'NOT_CONFIGURED';
}

export async function testHttp(url: string, init: RequestInit): Promise<IntegrationResult> {
    try {
        const response = await fetch(url, init);
        if (!response.ok) {
            return { status: 'ERROR', error: `Provider returned ${response.status}` };
        }
        return { status: 'CONNECTED' };
    } catch (error) {
        return { status: 'ERROR', error: error instanceof Error ? error.message : 'Connection failed' };
    }
}

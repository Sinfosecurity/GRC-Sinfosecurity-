/**
 * ServiceNow Integration — real Table API when configured. Never invents INC/CHG numbers.
 */

import { providerState, IntegrationResult } from './integrationProvider';

interface ServiceNowConfig {
    instance: string;
    username: string;
    password: string;
}

function envConfig(): ServiceNowConfig | null {
    if (!process.env.SERVICENOW_INSTANCE || !process.env.SERVICENOW_USER || !process.env.SERVICENOW_PASSWORD) {
        return null;
    }
    return {
        instance: process.env.SERVICENOW_INSTANCE,
        username: process.env.SERVICENOW_USER,
        password: process.env.SERVICENOW_PASSWORD,
    };
}

class ServiceNowIntegration {
    private config: ServiceNowConfig | null;

    constructor(config?: ServiceNowConfig) {
        this.config = config || envConfig();
    }

    status() {
        return providerState('servicenow');
    }

    private headers() {
        return {
            Authorization: `Basic ${Buffer.from(`${this.config!.username}:${this.config!.password}`).toString('base64')}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
    }

    private async createRecord(table: string, body: Record<string, unknown>): Promise<IntegrationResult<{ number: string }>> {
        if (!this.config || this.status() === 'NOT_CONFIGURED') {
            return { status: 'NOT_CONFIGURED' };
        }
        const host = this.config.instance.replace(/\/$/, '');
        const response = await fetch(`${host}/api/now/table/${table}`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            return { status: 'ERROR', error: `ServiceNow returned ${response.status}` };
        }
        const data = (await response.json()) as { result?: { number?: string } };
        if (!data.result?.number) {
            return { status: 'ERROR', error: 'ServiceNow did not return a record number' };
        }
        return { status: 'CONNECTED', data: { number: data.result.number } };
    }

    async createIncident(incident: { title: string; description?: string; severity?: string }) {
        return this.createRecord('incident', {
            short_description: incident.title,
            description: incident.description || '',
            urgency: incident.severity === 'CRITICAL' ? '1' : '2',
        });
    }

    async createChange(change: { title: string; description?: string }) {
        return this.createRecord('change_request', {
            short_description: change.title,
            description: change.description || '',
        });
    }

    async testConnection() {
        if (!this.config || this.status() === 'NOT_CONFIGURED') {
            return { status: 'NOT_CONFIGURED' as const };
        }
        const host = this.config.instance.replace(/\/$/, '');
        const response = await fetch(`${host}/api/now/table/sys_user?sysparm_limit=1`, {
            headers: this.headers(),
        });
        return response.ok
            ? { status: 'CONNECTED' as const }
            : { status: 'ERROR' as const, error: `ServiceNow returned ${response.status}` };
    }
}

export default ServiceNowIntegration;
export { ServiceNowConfig };

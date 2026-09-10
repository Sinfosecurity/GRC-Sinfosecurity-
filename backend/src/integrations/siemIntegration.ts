/**
 * SIEM Integration — real webhook delivery when configured.
 */

import { providerState, testHttp, IntegrationResult } from './integrationProvider';

class SiemIntegration {
    status() {
        return providerState('siem');
    }

    async sendEvent(event: { type: string; severity: string; message: string; metadata?: Record<string, unknown> }): Promise<IntegrationResult> {
        if (this.status() === 'NOT_CONFIGURED') {
            return { status: 'NOT_CONFIGURED' };
        }
        return testHttp(process.env.SIEM_WEBHOOK_URL as string, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.SIEM_TOKEN ? { Authorization: `Bearer ${process.env.SIEM_TOKEN}` } : {}),
            },
            body: JSON.stringify({
                source: 'supreme-risk',
                ...event,
                timestamp: new Date().toISOString(),
            }),
        });
    }

    async testConnection() {
        return this.sendEvent({
            type: 'connection_test',
            severity: 'info',
            message: 'Supreme Risk SIEM connection test',
        });
    }
}

export default SiemIntegration;

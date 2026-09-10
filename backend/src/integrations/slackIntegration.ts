/**
 * Slack Integration — real outbound webhook when configured.
 */

import { providerState, testHttp, IntegrationResult } from './integrationProvider';

interface SlackConfig {
    webhookUrl: string;
    channel?: string;
    username?: string;
    iconEmoji?: string;
}

interface SlackMessage {
    text: string;
    attachments?: SlackAttachment[];
}

interface SlackAttachment {
    color?: string;
    title?: string;
    text?: string;
    fields?: { title: string; value: string; short?: boolean }[];
}

function envConfig(): SlackConfig | null {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return null;
    return {
        webhookUrl,
        channel: process.env.SLACK_CHANNEL,
        username: process.env.SLACK_USERNAME || 'Supreme Risk',
        iconEmoji: process.env.SLACK_ICON || ':shield:',
    };
}

class SlackIntegration {
    private config: SlackConfig | null;

    constructor(config?: SlackConfig) {
        this.config = config || envConfig();
    }

    status() {
        return providerState('slack');
    }

    async sendMessage(message: SlackMessage): Promise<IntegrationResult<{ delivered: boolean }>> {
        if (!this.config || this.status() === 'NOT_CONFIGURED') {
            return { status: 'NOT_CONFIGURED' };
        }
        const payload = {
            username: this.config.username,
            icon_emoji: this.config.iconEmoji,
            channel: this.config.channel,
            ...message,
        };
        const result = await testHttp(this.config.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return result.status === 'CONNECTED'
            ? { status: 'CONNECTED', data: { delivered: true } }
            : { status: result.status, error: result.error };
    }

    async notifyHighRiskIncident(incident: { title: string; severity: string; status: string; category: string }) {
        return this.sendMessage({
            text: 'High Risk Incident Detected',
            attachments: [
                {
                    color: 'danger',
                    title: incident.title,
                    fields: [
                        { title: 'Severity', value: incident.severity, short: true },
                        { title: 'Status', value: incident.status, short: true },
                        { title: 'Category', value: incident.category, short: true },
                    ],
                },
            ],
        });
    }

    async notifyComplianceDeadline(framework: string, dueDate: string) {
        return this.sendMessage({
            text: 'Compliance Deadline Approaching',
            attachments: [{ color: 'warning', title: `${framework} Compliance Review`, fields: [{ title: 'Due Date', value: dueDate, short: true }] }],
        });
    }

    async notifyTaskAssignment(task: { title: string; priority: string; dueDate: string }, assignee: string) {
        return this.sendMessage({
            text: `Task assigned to ${assignee}`,
            attachments: [{ color: 'good', title: task.title, fields: [{ title: 'Priority', value: task.priority, short: true }, { title: 'Due Date', value: task.dueDate, short: true }] }],
        });
    }

    async testConnection() {
        return this.sendMessage({ text: 'Supreme Risk connection test' });
    }
}

export default SlackIntegration;
export { SlackConfig, SlackMessage };

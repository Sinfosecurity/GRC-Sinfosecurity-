/**
 * Slack Integration
 * Send notifications to Slack channels
 */

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

class SlackIntegration {
    private config: SlackConfig;

    constructor(config: SlackConfig) {
        this.config = config;
    }

    /**
     * Send message to Slack
     */
    async sendMessage(message: SlackMessage): Promise<boolean> {
        try {
            const payload = {
                username: this.config.username || 'GRC Platform',
                icon_emoji: this.config.iconEmoji || ':shield:',
                channel: this.config.channel,
                ...message,
            };

            console.log(`📤 Sending Slack notification to ${this.config.channel || 'default channel'}`);
            console.log('Message:', message.text);

            // In production, send actual HTTP request
            // const response = await fetch(this.config.webhookUrl, {
            //   method: 'POST',
            //   body: JSON.stringify(payload),
            // });

            return true;
        } catch (error) {
            console.error('Failed to send Slack message:', error);
            return false;
        }
    }

    /**
     * Send high-risk incident alert
     */
    async notifyHighRiskIncident(incident: any): Promise<boolean> {
        return this.sendMessage({
            text: '🚨 High Risk Incident Detected',
            attachments: [
                {
                    color: 'danger',
                    title: incident.title,
                    fields: [
                        { title: 'Severity', value: incident.severity, short: true },
                        { title: 'Status', value: incident.status, short: true },
                        { title: 'Category', value: incident.category, short: true },
                        { title: 'Detected', value: new Date().toISOString(), short: true },
                    ],
                },
            ],
        });
    }

    /**
     * Send compliance deadline reminder
     */
    async notifyComplianceDeadline(framework: string, dueDate: string): Promise<boolean> {
        return this.sendMessage({
            text: '⏰ Compliance Deadline Approaching',
            attachments: [
                {
                    color: 'warning',
                    title: `${framework} Compliance Review`,
                    fields: [
                        { title: 'Framework', value: framework, short: true },
                        { title: 'Due Date', value: dueDate, short: true },
                    ],
                },
            ],
        });
    }

    /**
     * Send task assignment notification
     */
    async notifyTaskAssignment(task: any, assignee: string): Promise<boolean> {
        return this.sendMessage({
            text: `📋 New task assigned to ${assignee}`,
            attachments: [
                {
                    color: 'good',
                    title: task.title,
                    fields: [
                        { title: 'Priority', value: task.priority, short: true },
                        { title: 'Due Date', value: task.dueDate, short: true },
                    ],
                },
            ],
        });
    }
}

export default SlackIntegration;
export { SlackConfig, SlackMessage };

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
    fields?: {
        title: string;
        value: string;
        short?: boolean;
    }[];
}
declare class SlackIntegration {
    private config;
    constructor(config: SlackConfig);
    /**
     * Send message to Slack
     */
    sendMessage(message: SlackMessage): Promise<boolean>;
    /**
     * Send high-risk incident alert
     */
    notifyHighRiskIncident(incident: any): Promise<boolean>;
    /**
     * Send compliance deadline reminder
     */
    notifyComplianceDeadline(framework: string, dueDate: string): Promise<boolean>;
    /**
     * Send task assignment notification
     */
    notifyTaskAssignment(task: any, assignee: string): Promise<boolean>;
}
export default SlackIntegration;
export { SlackConfig, SlackMessage };
//# sourceMappingURL=slackIntegration.d.ts.map
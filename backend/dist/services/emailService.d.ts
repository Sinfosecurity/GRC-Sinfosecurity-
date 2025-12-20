/**
 * Email Service
 * Handles sending emails via SendGrid
 * For production use, set SENDGRID_API_KEY environment variable
 */
interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
}
declare class EmailService {
    private apiKey;
    private fromEmail;
    private isDevelopment;
    constructor();
    /**
     * Send an email
     */
    send(options: EmailOptions): Promise<boolean>;
    /**
     * Send email using a predefined template
     */
    sendTemplate(templateName: string, to: string | string[], data: any): Promise<boolean>;
    /**
     * Send high-risk incident notification
     */
    sendHighRiskIncident(to: string | string[], data: any): Promise<boolean>;
    /**
     * Send compliance deadline notification
     */
    sendComplianceDeadline(to: string | string[], data: any): Promise<boolean>;
    /**
     * Send assessment overdue notification
     */
    sendAssessmentOverdue(to: string | string[], data: any): Promise<boolean>;
    /**
     * Send control failure notification
     */
    sendControlFailure(to: string | string[], data: any): Promise<boolean>;
    /**
     * Simple HTML to text conversion
     */
    private htmlToText;
}
declare const _default: EmailService;
export default _default;
//# sourceMappingURL=emailService.d.ts.map
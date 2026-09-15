import logger from '../config/logger';
import {
    legacyAssessmentOverdueEmail,
    legacyComplianceDeadlineEmail,
    legacyControlFailureEmail,
    legacyHighRiskIncidentEmail,
} from './transactionalEmail';

interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
}

interface EmailTemplate {
    subject: string;
    getHtml: (data: Record<string, unknown>) => string;
    getText: (data: Record<string, unknown>) => string;
}

function asString(value: unknown) {
    return value == null ? '' : String(value);
}

const templates: Record<string, EmailTemplate> = {
    HIGH_RISK_INCIDENT: {
        subject: 'Action required: Review high-severity incident',
        getHtml: (data) => legacyHighRiskIncidentEmail({
            title: asString(data.title),
            severity: asString(data.severity),
            reportedBy: asString(data.reportedBy),
            description: asString(data.description),
            incidentRef: asString(data.incidentId),
            ctaUrl: asString(data.link) || 'https://supreme-risk-staging.onrender.com/risk',
        }).html,
        getText: (data) => legacyHighRiskIncidentEmail({
            title: asString(data.title),
            severity: asString(data.severity),
            reportedBy: asString(data.reportedBy),
            description: asString(data.description),
            incidentRef: asString(data.incidentId),
            ctaUrl: asString(data.link) || 'https://supreme-risk-staging.onrender.com/risk',
        }).text,
    },
    COMPLIANCE_DEADLINE: {
        subject: 'Reminder: Compliance deadline approaching',
        getHtml: (data) => legacyComplianceDeadlineEmail({
            framework: asString(data.framework),
            requirement: asString(data.requirement),
            deadline: data.deadline as string | Date | undefined,
            daysRemaining: data.daysRemaining as number | string | undefined,
            status: asString(data.status),
            ctaUrl: asString(data.link) || 'https://supreme-risk-staging.onrender.com/compliance',
        }).html,
        getText: (data) => legacyComplianceDeadlineEmail({
            framework: asString(data.framework),
            requirement: asString(data.requirement),
            deadline: data.deadline as string | Date | undefined,
            daysRemaining: data.daysRemaining as number | string | undefined,
            status: asString(data.status),
            ctaUrl: asString(data.link) || 'https://supreme-risk-staging.onrender.com/compliance',
        }).text,
    },
    ASSESSMENT_OVERDUE: {
        subject: 'Action required: Assessment is overdue',
        getHtml: (data) => legacyAssessmentOverdueEmail({
            assessmentType: asString(data.assessmentType),
            assessmentName: asString(data.assessmentName),
            dueDate: data.dueDate as string | Date | undefined,
            daysOverdue: data.daysOverdue as number | string | undefined,
            assignedTo: asString(data.assignedTo),
            ctaUrl: asString(data.link) || 'https://supreme-risk-staging.onrender.com/assessments',
        }).html,
        getText: (data) => legacyAssessmentOverdueEmail({
            assessmentType: asString(data.assessmentType),
            assessmentName: asString(data.assessmentName),
            dueDate: data.dueDate as string | Date | undefined,
            daysOverdue: data.daysOverdue as number | string | undefined,
            assignedTo: asString(data.assignedTo),
            ctaUrl: asString(data.link) || 'https://supreme-risk-staging.onrender.com/assessments',
        }).text,
    },
    CONTROL_FAILURE: {
        subject: 'Action required: Review control failure',
        getHtml: (data) => legacyControlFailureEmail({
            controlId: asString(data.controlId),
            controlName: asString(data.controlName),
            category: asString(data.category),
            impact: asString(data.impact),
            ctaUrl: asString(data.link) || 'https://supreme-risk-staging.onrender.com/controls',
        }).html,
        getText: (data) => legacyControlFailureEmail({
            controlId: asString(data.controlId),
            controlName: asString(data.controlName),
            category: asString(data.category),
            impact: asString(data.impact),
            ctaUrl: asString(data.link) || 'https://supreme-risk-staging.onrender.com/controls',
        }).text,
    },
};

class EmailService {
    private apiKey: string | undefined;
    private fromEmail: string;
    private isDevelopment: boolean;

    constructor() {
        this.apiKey = process.env.SENDGRID_API_KEY;
        this.fromEmail = process.env.EMAIL_FROM || 'noreply@sinfosecurity.com';
        this.isDevelopment = process.env.NODE_ENV !== 'production';
    }

    async send(options: EmailOptions): Promise<boolean> {
        const from = options.from || this.fromEmail;
        const recipients = Array.isArray(options.to) ? options.to : [options.to];

        if (this.isDevelopment || !this.apiKey) {
            logger.info('\nEMAIL NOTIFICATION (Development Mode)');
            logger.info(`From: ${from}`);
            logger.info(`To: ${recipients.join(', ')}`);
            logger.info(`Subject: ${options.subject}`);
            logger.info(options.text || this.htmlToText(options.html));
            return true;
        }

        try {
            const sgMail = require('@sendgrid/mail');
            sgMail.setApiKey(this.apiKey);
            await sgMail.send({
                to: recipients,
                from,
                subject: options.subject,
                text: options.text || this.htmlToText(options.html),
                html: options.html,
            });
            return true;
        } catch (error) {
            logger.error('Error sending email:', error);
            return false;
        }
    }

    async sendTemplate(templateName: string, to: string | string[], data: Record<string, unknown>): Promise<boolean> {
        const template = templates[templateName];
        if (!template) {
            logger.error(`Template "${templateName}" not found`);
            return false;
        }
        return this.send({
            to,
            subject: template.subject,
            html: template.getHtml(data),
            text: template.getText(data),
        });
    }

    async sendHighRiskIncident(to: string | string[], data: Record<string, unknown>): Promise<boolean> {
        return this.sendTemplate('HIGH_RISK_INCIDENT', to, data);
    }

    async sendComplianceDeadline(to: string | string[], data: Record<string, unknown>): Promise<boolean> {
        return this.sendTemplate('COMPLIANCE_DEADLINE', to, data);
    }

    async sendAssessmentOverdue(to: string | string[], data: Record<string, unknown>): Promise<boolean> {
        return this.sendTemplate('ASSESSMENT_OVERDUE', to, data);
    }

    async sendControlFailure(to: string | string[], data: Record<string, unknown>): Promise<boolean> {
        return this.sendTemplate('CONTROL_FAILURE', to, data);
    }

    private htmlToText(html: string): string {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
    }
}

export default new EmailService();

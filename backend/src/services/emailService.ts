import logger from '../config/logger';
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

interface EmailTemplate {
    subject: string;
    getHtml: (data: any) => string;
    getText: (data: any) => string;
}

// Email templates for different notification types
const templates: Record<string, EmailTemplate> = {
    HIGH_RISK_INCIDENT: {
        subject: '🚨 High Risk Incident Detected',
        getHtml: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #d32f2f; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .severity { display: inline-block; padding: 8px 16px; background: #ff5252; color: white; border-radius: 4px; font-weight: bold; }
            .details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #d32f2f; }
            .button { display: inline-block; padding: 12px 24px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ High Risk Incident Alert</h1>
            </div>
            <div class="content">
              <p><strong>A high-severity incident has been reported and requires immediate attention.</strong></p>
              
              <div class="details">
                <p><strong>Incident ID:</strong> ${data.incidentId}</p>
                <p><strong>Title:</strong> ${data.title}</p>
                <p><strong>Severity:</strong> <span class="severity">${data.severity}</span></p>
                <p><strong>Reported By:</strong> ${data.reportedBy}</p>
                <p><strong>Time:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
                <p><strong>Description:</strong> ${data.description}</p>
              </div>
              
              <p><strong>Recommended Actions:</strong></p>
              <ul>
                <li>Review incident details immediately</li>
                <li>Assess potential impact</li>
                <li>Initiate response protocol</li>
                <li>Document all actions taken</li>
              </ul>
              
              <a href="${data.link}" class="button">View Incident Details</a>
              
              <p style="margin-top: 20px; font-size: 12px; color: #666;">
                This is an automated notification from Sinfosecurity GRC Platform.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
        getText: (data) => `
HIGH RISK INCIDENT ALERT

Incident ID: ${data.incidentId}
Title: ${data.title}
Severity: ${data.severity}
Reported By: ${data.reportedBy}
Time: ${new Date(data.timestamp).toLocaleString()}

Description:
${data.description}

Recommended Actions:
- Review incident details immediately
- Assess potential impact
- Initiate response protocol
- Document all actions taken

View details: ${data.link}
    `
    },

    COMPLIANCE_DEADLINE: {
        subject: '📅 Compliance Deadline Approaching',
        getHtml: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff9800; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .deadline { display: inline-block; padding: 8px 16px; background: #ff9800; color: white; border-radius: 4px; font-weight: bold; }
            .details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #ff9800; }
            .button { display: inline-block; padding: 12px 24px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Compliance Deadline Reminder</h1>
            </div>
            <div class="content">
              <p><strong>A compliance requirement deadline is approaching.</strong></p>
              
              <div class="details">
                <p><strong>Framework:</strong> ${data.framework}</p>
                <p><strong>Requirement:</strong> ${data.requirement}</p>
                <p><strong>Deadline:</strong> <span class="deadline">${new Date(data.deadline).toLocaleDateString()}</span></p>
                <p><strong>Days Remaining:</strong> ${data.daysRemaining} days</p>
                <p><strong>Status:</strong> ${data.status}</p>
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Review compliance requirements</li>
                <li>Complete outstanding assessments</li>
                <li>Prepare documentation</li>
                <li>Schedule review meeting</li>
              </ul>
              
              <a href="${data.link}" class="button">View Compliance Details</a>
              
              <p style="margin-top: 20px; font-size: 12px; color: #666;">
                This is an automated notification from Sinfosecurity GRC Platform.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
        getText: (data) => `
COMPLIANCE DEADLINE REMINDER

Framework: ${data.framework}
Requirement: ${data.requirement}
Deadline: ${new Date(data.deadline).toLocaleDateString()}
Days Remaining: ${data.daysRemaining} days
Status: ${data.status}

Next Steps:
- Review compliance requirements
- Complete outstanding assessments
- Prepare documentation
- Schedule review meeting

View details: ${data.link}
    `
    },

    ASSESSMENT_OVERDUE: {
        subject: '⏰ Assessment Overdue',
        getHtml: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #e65100; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .overdue { display: inline-block; padding: 8px 16px; background: #e65100; color: white; border-radius: 4px; font-weight: bold; }
            .details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #e65100; }
            .button { display: inline-block; padding: 12px 24px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Overdue Assessment Alert</h1>
            </div>
            <div class="content">
              <p><strong>An assessment is now overdue and requires immediate action.</strong></p>
              
              <div class="details">
                <p><strong>Assessment Type:</strong> ${data.assessmentType}</p>
                <p><strong>Name:</strong> ${data.assessmentName}</p>
                <p><strong>Due Date:</strong> <span class="overdue">${new Date(data.dueDate).toLocaleDateString()}</span></p>
                <p><strong>Days Overdue:</strong> ${data.daysOverdue} days</p>
                <p><strong>Assigned To:</strong> ${data.assignedTo}</p>
              </div>
              
              <p><strong>Required Actions:</strong></p>
              <ul>
                <li>Complete the assessment immediately</li>
                <li>Update assessment status</li>
                <li>Notify relevant stakeholders</li>
                <li>Document reasons for delay</li>
              </ul>
              
              <a href="${data.link}" class="button">Complete Assessment Now</a>
              
              <p style="margin-top: 20px; font-size: 12px; color: #666;">
                This is an automated notification from Sinfosecurity GRC Platform.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
        getText: (data) => `
OVERDUE ASSESSMENT ALERT

Assessment Type: ${data.assessmentType}
Name: ${data.assessmentName}
Due Date: ${new Date(data.dueDate).toLocaleDateString()}
Days Overdue: ${data.daysOverdue} days
Assigned To: ${data.assignedTo}

Required Actions:
- Complete the assessment immediately
- Update assessment status
- Notify relevant stakeholders
- Document reasons for delay

View details: ${data.link}
    `
    },

    CONTROL_FAILURE: {
        subject: '❌ Control Failure Detected',
        getHtml: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #c62828; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .failure { display: inline-block; padding: 8px 16px; background: #c62828; color: white; border-radius: 4px; font-weight: bold; }
            .details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #c62828; }
            .button { display: inline-block; padding: 12px 24px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Control Failure Alert</h1>
            </div>
            <div class="content">
              <p><strong>A control has failed and requires immediate remediation.</strong></p>
              
              <div class="details">
                <p><strong>Control ID:</strong> ${data.controlId}</p>
                <p><strong>Name:</strong> ${data.controlName}</p>
                <p><strong>Category:</strong> ${data.category}</p>
                <p><strong>Status:</strong> <span class="failure">FAILED</span></p>
                <p><strong>Detected:</strong> ${new Date(data.detectedAt).toLocaleString()}</p>
                <p><strong>Impact:</strong> ${data.impact}</p>
              </div>
              
              <p><strong>Remediation Steps:</strong></p>
              <ul>
                <li>Investigate root cause of failure</li>
                <li>Assess risk impact</li>
                <li>Implement corrective actions</li>
                <li>Re-test control effectiveness</li>
                <li>Document findings and remediation</li>
              </ul>
              
              <a href="${data.link}" class="button">View Control Details</a>
              
              <p style="margin-top: 20px; font-size: 12px; color: #666;">
                This is an automated notification from Sinfosecurity GRC Platform.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
        getText: (data) => `
CONTROL FAILURE ALERT

Control ID: ${data.controlId}
Name: ${data.controlName}
Category: ${data.category}
Status: FAILED
Detected: ${new Date(data.detectedAt).toLocaleString()}
Impact: ${data.impact}

Remediation Steps:
- Investigate root cause of failure
- Assess risk impact
- Implement corrective actions
- Re-test control effectiveness
- Document findings and remediation

View details: ${data.link}
    `
    }
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

    /**
     * Send an email
     */
    async send(options: EmailOptions): Promise<boolean> {
        const from = options.from || this.fromEmail;
        const recipients = Array.isArray(options.to) ? options.to : [options.to];

        // In development mode, just log the email
        if (this.isDevelopment || !this.apiKey) {
            logger.info('\n📧 EMAIL NOTIFICATION (Development Mode)');
            logger.info('═══════════════════════════════════════');
            logger.info(`From: ${from}`);
            logger.info(`To: ${recipients.join(', ')}`);
            logger.info(`Subject: ${options.subject}`);
            logger.info('───────────────────────────────────────');
            logger.info(options.text || this.htmlToText(options.html));
            logger.info('═══════════════════════════════════════\n');
            return true;
        }

        try {
            // In production, use SendGrid
            const sgMail = require('@sendgrid/mail');
            sgMail.setApiKey(this.apiKey);

            const msg = {
                to: recipients,
                from,
                subject: options.subject,
                text: options.text || this.htmlToText(options.html),
                html: options.html,
            };

            await sgMail.send(msg);
            logger.info(`✅ Email sent successfully to ${recipients.join(', ')}`);
            return true;
        } catch (error) {
            logger.error('❌ Error sending email:', error);
            return false;
        }
    }

    /**
     * Send email using a predefined template
     */
    async sendTemplate(
        templateName: string,
        to: string | string[],
        data: any
    ): Promise<boolean> {
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

    /**
     * Send high-risk incident notification
     */
    async sendHighRiskIncident(to: string | string[], data: any): Promise<boolean> {
        return this.sendTemplate('HIGH_RISK_INCIDENT', to, data);
    }

    /**
     * Send compliance deadline notification
     */
    async sendComplianceDeadline(to: string | string[], data: any): Promise<boolean> {
        return this.sendTemplate('COMPLIANCE_DEADLINE', to, data);
    }

    /**
     * Send assessment overdue notification
     */
    async sendAssessmentOverdue(to: string | string[], data: any): Promise<boolean> {
        return this.sendTemplate('ASSESSMENT_OVERDUE', to, data);
    }

    /**
     * Send control failure notification
     */
    async sendControlFailure(to: string | string[], data: any): Promise<boolean> {
        return this.sendTemplate('CONTROL_FAILURE', to, data);
    }

    /**
     * Simple HTML to text conversion
     */
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

// Export singleton instance
export default new EmailService();

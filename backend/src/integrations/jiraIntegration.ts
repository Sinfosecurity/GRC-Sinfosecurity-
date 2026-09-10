/**
 * Jira Integration — real REST calls when configured. Never invents issue keys.
 */

import { providerState, IntegrationResult } from './integrationProvider';

interface JiraConfig {
    host: string;
    email: string;
    apiToken: string;
    projectKey: string;
}

interface JiraIssue {
    key?: string;
    summary: string;
    description: string;
    issueType: 'Bug' | 'Task' | 'Story' | 'Incident';
    priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
    assignee?: string;
    labels?: string[];
}

function envConfig(): JiraConfig | null {
    if (!process.env.JIRA_BASE_URL || !process.env.JIRA_API_TOKEN || !process.env.JIRA_EMAIL) {
        return null;
    }
    return {
        host: process.env.JIRA_BASE_URL,
        email: process.env.JIRA_EMAIL,
        apiToken: process.env.JIRA_API_TOKEN,
        projectKey: process.env.JIRA_PROJECT_KEY || 'SR',
    };
}

class JiraIntegration {
    private config: JiraConfig | null;

    constructor(config?: JiraConfig) {
        this.config = config || envConfig();
    }

    status() {
        return providerState('jira');
    }

    private headers() {
        return {
            Authorization: `Basic ${Buffer.from(`${this.config!.email}:${this.config!.apiToken}`).toString('base64')}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
    }

    async createIssue(issue: JiraIssue): Promise<IntegrationResult<{ key: string }>> {
        if (!this.config || this.status() === 'NOT_CONFIGURED') {
            return { status: 'NOT_CONFIGURED' };
        }
        const response = await fetch(`${this.config.host.replace(/\/$/, '')}/rest/api/3/issue`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
                fields: {
                    project: { key: this.config.projectKey },
                    summary: issue.summary,
                    description: issue.description,
                    issuetype: { name: issue.issueType },
                    priority: { name: issue.priority },
                    labels: issue.labels || [],
                },
            }),
        });
        if (!response.ok) {
            return { status: 'ERROR', error: `Jira returned ${response.status}` };
        }
        const data = (await response.json()) as { key?: string };
        if (!data.key) {
            return { status: 'ERROR', error: 'Jira did not return an issue key' };
        }
        return { status: 'CONNECTED', data: { key: data.key } };
    }

    async createIncidentTicket(incident: { title: string; severity: string; category: string; status: string }) {
        return this.createIssue({
            summary: `[INCIDENT] ${incident.title}`,
            description: `Severity: ${incident.severity}\nCategory: ${incident.category}\nStatus: ${incident.status}`,
            issueType: 'Incident',
            priority: incident.severity === 'CRITICAL' ? 'Highest' : 'High',
        });
    }

    async testConnection() {
        if (!this.config || this.status() === 'NOT_CONFIGURED') {
            return { status: 'NOT_CONFIGURED' as const };
        }
        const response = await fetch(`${this.config.host.replace(/\/$/, '')}/rest/api/3/myself`, {
            headers: this.headers(),
        });
        return response.ok
            ? { status: 'CONNECTED' as const }
            : { status: 'ERROR' as const, error: `Jira returned ${response.status}` };
    }
}

export default JiraIntegration;
export { JiraConfig, JiraIssue };

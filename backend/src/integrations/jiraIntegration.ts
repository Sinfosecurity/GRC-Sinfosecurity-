/**
 * Jira Integration
 * Create and manage Jira tickets for incidents and tasks
 */

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

class JiraIntegration {
    private config: JiraConfig;

    constructor(config: JiraConfig) {
        this.config = config;
    }

    /**
     * Create Jira issue
     */
    async createIssue(issue: JiraIssue): Promise<string | null> {
        try {
            const payload = {
                fields: {
                    project: { key: this.config.projectKey },
                    summary: issue.summary,
                    description: issue.description,
                    issuetype: { name: issue.issueType },
                    priority: { name: issue.priority },
                    labels: issue.labels || [],
                },
            };

            console.log(`📝 Creating Jira ${issue.issueType} in project ${this.config.projectKey}`);
            console.log('Summary:', issue.summary);

            // In production, make actual API call
            // const response = await fetch(`${this.config.host}/rest/api/3/issue`, {
            //   method: 'POST',
            //   headers: {
            //     'Authorization': `Basic ${Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64')}`,
            //     'Content-Type': 'application/json',
            //   },
            //   body: JSON.stringify(payload),
            // });
            // const data = await response.json();
            // return data.key;

            const mockKey = `${this.config.projectKey}-${Math.floor(Math.random() * 1000)}`;
            console.log(`✅ Created Jira issue: ${mockKey}`);
            return mockKey;
        } catch (error) {
            console.error('Failed to create Jira issue:', error);
            return null;
        }
    }

    /**
     * Create incident ticket
     */
    async createIncidentTicket(incident: any): Promise<string | null> {
        return this.createIssue({
            summary: `[INCIDENT] ${incident.title}`,
            description: `
**Severity**: ${incident.severity}
**Category**: ${incident.category}
**Status**: ${incident.status}
**Detected**: ${new Date().toISOString()}

**Description**:
${incident.description || 'No description provided'}
      `.trim(),
            issueType: 'Incident',
            priority: this.mapSeverityToPriority(incident.severity),
            labels: ['grc-platform', 'security-incident', incident.category.toLowerCase()],
        });
    }

    /**
     * Create remediation task
     */
    async createRemediationTask(risk: any): Promise<string | null> {
        return this.createIssue({
            summary: `[REMEDIATION] ${risk.title}`,
            description: `
**Risk Level**: ${risk.severity}
**Category**: ${risk.category}

**Remediation Actions Required**:
${risk.mitigationPlan || 'To be determined'}
      `.trim(),
            issueType: 'Task',
            priority: this.mapSeverityToPriority(risk.severity),
            labels: ['grc-platform', 'risk-remediation'],
        });
    }

    /**
     * Map severity to Jira priority
     */
    private mapSeverityToPriority(severity: string): 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest' {
        const mapping: Record<string, any> = {
            critical: 'Highest',
            high: 'High',
            medium: 'Medium',
            low: 'Low',
        };
        return mapping[severity.toLowerCase()] || 'Medium';
    }
}

export default JiraIntegration;
export { JiraConfig, JiraIssue };

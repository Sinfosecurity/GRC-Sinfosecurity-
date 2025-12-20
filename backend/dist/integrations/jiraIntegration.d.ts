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
declare class JiraIntegration {
    private config;
    constructor(config: JiraConfig);
    /**
     * Create Jira issue
     */
    createIssue(issue: JiraIssue): Promise<string | null>;
    /**
     * Create incident ticket
     */
    createIncidentTicket(incident: any): Promise<string | null>;
    /**
     * Create remediation task
     */
    createRemediationTask(risk: any): Promise<string | null>;
    /**
     * Map severity to Jira priority
     */
    private mapSeverityToPriority;
}
export default JiraIntegration;
export { JiraConfig, JiraIssue };
//# sourceMappingURL=jiraIntegration.d.ts.map
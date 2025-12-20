/**
 * ServiceNow Integration
 * Create incidents and change requests in ServiceNow
 */
interface ServiceNowConfig {
    instance: string;
    username: string;
    password: string;
}
interface ServiceNowIncident {
    sys_id?: string;
    number?: string;
    short_description: string;
    description: string;
    urgency: '1' | '2' | '3';
    impact: '1' | '2' | '3';
    category?: string;
    assigned_to?: string;
}
declare class ServiceNowIntegration {
    private config;
    private baseUrl;
    constructor(config: ServiceNowConfig);
    /**
     * Create incident in ServiceNow
     */
    createIncident(incident: ServiceNowIncident): Promise<string | null>;
    /**
     * Create incident from GRC risk
     */
    createIncidentFromRisk(risk: any): Promise<string | null>;
    /**
     * Create change request
     */
    createChangeRequest(change: any): Promise<string | null>;
    /**
     * Update incident
     */
    updateIncident(incidentNumber: string, updates: Partial<ServiceNowIncident>): Promise<boolean>;
    /**
     * Map GRC severity to ServiceNow urgency
     */
    private mapSeverityToUrgency;
    /**
     * Map GRC severity to ServiceNow impact
     */
    private mapSeverityToImpact;
}
export default ServiceNowIntegration;
export { ServiceNowConfig, ServiceNowIncident };
//# sourceMappingURL=servicenowIntegration.d.ts.map
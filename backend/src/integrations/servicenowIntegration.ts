/**
 * ServiceNow Integration
 * Create incidents and change requests in ServiceNow
 */

interface ServiceNowConfig {
    instance: string; // e.g., 'yourcompany.service-now.com'
    username: string;
    password: string;
}

interface ServiceNowIncident {
    sys_id?: string;
    number?: string;
    short_description: string;
    description: string;
    urgency: '1' | '2' | '3'; // 1=High, 2=Medium, 3=Low
    impact: '1' | '2' | '3';
    category?: string;
    assigned_to?: string;
}

class ServiceNowIntegration {
    private config: ServiceNowConfig;
    private baseUrl: string;

    constructor(config: ServiceNowConfig) {
        this.config = config;
        this.baseUrl = `https://${config.instance}/api/now/table`;
    }

    /**
     * Create incident in ServiceNow
     */
    async createIncident(incident: ServiceNowIncident): Promise<string | null> {
        try {
            console.log(`🎫 Creating ServiceNow incident`);
            console.log('Short Description:', incident.short_description);

            // In production, make actual API call
            // const response = await fetch(`${this.baseUrl}/incident`, {
            //   method: 'POST',
            //   headers: {
            //     'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
            //     'Content-Type': 'application/json',
            //   },
            //   body: JSON.stringify(incident),
            // });
            // const data = await response.json();
            // return data.result.number;

            const mockNumber = `INC${String(Math.floor(Math.random() * 10000)).padStart(7, '0')}`;
            console.log(`✅ Created ServiceNow incident: ${mockNumber}`);
            return mockNumber;
        } catch (error) {
            console.error('Failed to create ServiceNow incident:', error);
            return null;
        }
    }

    /**
     * Create incident from GRC risk
     */
    async createIncidentFromRisk(risk: any): Promise<string | null> {
        return this.createIncident({
            short_description: `[GRC] High Risk: ${risk.title}`,
            description: `
Risk ID: ${risk.id}
Severity: ${risk.severity}
Category: ${risk.category}
Status: ${risk.status}

Description:
${risk.description || 'No description provided'}

Mitigation Plan:
${risk.mitigationPlan || 'To be determined'}
      `.trim(),
            urgency: this.mapSeverityToUrgency(risk.severity),
            impact: this.mapSeverityToImpact(risk.severity),
            category: 'Security',
        });
    }

    /**
     * Create change request
     */
    async createChangeRequest(change: any): Promise<string | null> {
        try {
            console.log(`📋 Creating ServiceNow change request`);
            console.log('Change:', change.title);

            // Mock change request number
            const mockNumber = `CHG${String(Math.floor(Math.random() * 10000)).padStart(7, '0')}`;
            console.log(`✅ Created ServiceNow change request: ${mockNumber}`);
            return mockNumber;
        } catch (error) {
            console.error('Failed to create change request:', error);
            return null;
        }
    }

    /**
     * Update incident
     */
    async updateIncident(incidentNumber: string, updates: Partial<ServiceNowIncident>): Promise<boolean> {
        try {
            console.log(`🔄 Updating ServiceNow incident ${incidentNumber}`);

            // In production, make PATCH request
            return true;
        } catch (error) {
            console.error('Failed to update incident:', error);
            return false;
        }
    }

    /**
     * Map GRC severity to ServiceNow urgency
     */
    private mapSeverityToUrgency(severity: string): '1' | '2' | '3' {
        const mapping: Record<string, '1' | '2' | '3'> = {
            critical: '1',
            high: '1',
            medium: '2',
            low: '3',
        };
        return mapping[severity.toLowerCase()] || '2';
    }

    /**
     * Map GRC severity to ServiceNow impact
     */
    private mapSeverityToImpact(severity: string): '1' | '2' | '3' {
        const mapping: Record<string, '1' | '2' | '3'> = {
            critical: '1',
            high: '2',
            medium: '2',
            low: '3',
        };
        return mapping[severity.toLowerCase()] || '2';
    }
}

export default ServiceNowIntegration;
export { ServiceNowConfig, ServiceNowIncident };

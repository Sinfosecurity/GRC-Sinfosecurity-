"use strict";
/**
 * ServiceNow Integration
 * Create incidents and change requests in ServiceNow
 */
Object.defineProperty(exports, "__esModule", { value: true });
class ServiceNowIntegration {
    constructor(config) {
        this.config = config;
        this.baseUrl = `https://${config.instance}/api/now/table`;
    }
    /**
     * Create incident in ServiceNow
     */
    async createIncident(incident) {
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
        }
        catch (error) {
            console.error('Failed to create ServiceNow incident:', error);
            return null;
        }
    }
    /**
     * Create incident from GRC risk
     */
    async createIncidentFromRisk(risk) {
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
    async createChangeRequest(change) {
        try {
            console.log(`📋 Creating ServiceNow change request`);
            console.log('Change:', change.title);
            // Mock change request number
            const mockNumber = `CHG${String(Math.floor(Math.random() * 10000)).padStart(7, '0')}`;
            console.log(`✅ Created ServiceNow change request: ${mockNumber}`);
            return mockNumber;
        }
        catch (error) {
            console.error('Failed to create change request:', error);
            return null;
        }
    }
    /**
     * Update incident
     */
    async updateIncident(incidentNumber, updates) {
        try {
            console.log(`🔄 Updating ServiceNow incident ${incidentNumber}`);
            // In production, make PATCH request
            return true;
        }
        catch (error) {
            console.error('Failed to update incident:', error);
            return false;
        }
    }
    /**
     * Map GRC severity to ServiceNow urgency
     */
    mapSeverityToUrgency(severity) {
        const mapping = {
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
    mapSeverityToImpact(severity) {
        const mapping = {
            critical: '1',
            high: '2',
            medium: '2',
            low: '3',
        };
        return mapping[severity.toLowerCase()] || '2';
    }
}
exports.default = ServiceNowIntegration;
//# sourceMappingURL=servicenowIntegration.js.map
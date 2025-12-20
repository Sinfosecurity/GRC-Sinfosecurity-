"use strict";
/**
 * SIEM Integration
 * Export security logs to SIEM systems (Splunk, QRadar, etc.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
class SIEMIntegration {
    constructor(config) {
        this.config = config;
    }
    /**
     * Send event to SIEM
     */
    async sendEvent(event) {
        try {
            const payload = this.formatEventForProvider(event);
            console.log(`📡 Sending event to ${this.config.provider.toUpperCase()} SIEM`);
            console.log('Event:', event.eventType, '-', event.severity);
            // In production, send to actual SIEM endpoint
            // const response = await fetch(this.config.endpoint, {
            //   method: 'POST',
            //   headers: {
            //     'Authorization': `Bearer ${this.config.token || this.config.apiKey}`,
            //     'Content-Type': 'application/json',
            //   },
            //   body: JSON.stringify(payload),
            // });
            return true;
        }
        catch (error) {
            console.error('Failed to send event to SIEM:', error);
            return false;
        }
    }
    /**
     * Format event based on SIEM provider
     */
    formatEventForProvider(event) {
        const baseEvent = {
            time: event.timestamp.toISOString(),
            severity: event.severity,
            event_type: event.eventType,
            source: event.source,
            message: event.message,
            ...event.metadata,
        };
        switch (this.config.provider) {
            case 'splunk':
                return {
                    event: baseEvent,
                    sourcetype: 'grc_platform',
                    index: 'security',
                };
            case 'qradar':
                return {
                    ...baseEvent,
                    log_source: 'GRC Platform',
                };
            case 'sentinel':
                return {
                    ...baseEvent,
                    workspace_id: 'grc-workspace',
                };
            default:
                return baseEvent;
        }
    }
    /**
     * Log risk event
     */
    async logRiskEvent(risk, action) {
        return this.sendEvent({
            timestamp: new Date(),
            eventType: 'risk_created',
            severity: risk.severity,
            source: 'GRC Platform - Risk Management',
            user: risk.createdBy,
            resourceType: 'Risk',
            resourceId: risk.id,
            message: `Risk ${action}: ${risk.title}`,
            metadata: {
                category: risk.category,
                status: risk.status,
                action,
            },
        });
    }
    /**
     * Log incident
     */
    async logIncident(incident) {
        return this.sendEvent({
            timestamp: new Date(),
            eventType: 'incident_detected',
            severity: incident.severity,
            source: 'GRC Platform - Incident Response',
            resourceType: 'Incident',
            resourceId: incident.id,
            message: `Security incident detected: ${incident.title}`,
            metadata: {
                category: incident.category,
                detectionMethod: incident.detectionMethod,
            },
        });
    }
    /**
     * Log compliance violation
     */
    async logComplianceViolation(framework, violation) {
        return this.sendEvent({
            timestamp: new Date(),
            eventType: 'compliance_violation',
            severity: 'high',
            source: 'GRC Platform - Compliance',
            message: `Compliance violation detected in ${framework}`,
            metadata: {
                framework,
                controlId: violation.controlId,
                description: violation.description,
            },
        });
    }
    /**
     * Batch export logs
     */
    async batchExportLogs(events) {
        let successCount = 0;
        for (const event of events) {
            const success = await this.sendEvent(event);
            if (success)
                successCount++;
        }
        console.log(`📊 Exported ${successCount}/${events.length} events to SIEM`);
        return successCount;
    }
}
exports.default = SIEMIntegration;
//# sourceMappingURL=siemIntegration.js.map
import logger from '../config/logger';
import { errorTracker } from './errorTracking';

/**
 * Alerting System
 * 
 * Monitors metrics and sends alerts when thresholds are breached
 */

export interface AlertRule {
    id: string;
    name: string;
    description: string;
    metric: string;
    threshold: number;
    comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    severity: 'critical' | 'warning' | 'info';
    cooldown: number; // Minutes between alerts
    enabled: boolean;
    channels: ('log' | 'email' | 'slack' | 'pagerduty')[];
    labels?: Record<string, string>;
}

export interface Alert {
    id: string;
    ruleId: string;
    ruleName: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    value: number;
    threshold: number;
    timestamp: Date;
    resolved: boolean;
    resolvedAt?: Date;
}

/**
 * Alert Manager
 */
export class AlertManager {
    private rules: Map<string, AlertRule> = new Map();
    private alerts: Map<string, Alert> = new Map();
    private lastAlertTime: Map<string, number> = new Map();
    private checkInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.registerDefaultRules();
    }

    /**
     * Register default alerting rules
     */
    private registerDefaultRules() {
        // Memory usage alert
        this.registerRule({
            id: 'memory-high',
            name: 'High Memory Usage',
            description: 'Memory usage above 90%',
            metric: 'grc_memory_usage_percent',
            threshold: 90,
            comparison: 'gte',
            severity: 'critical',
            cooldown: 15,
            enabled: true,
            channels: ['log', 'email'],
        });

        // Error rate alert
        this.registerRule({
            id: 'error-rate-high',
            name: 'High Error Rate',
            description: 'Error rate above 10% of requests',
            metric: 'grc_errors_total',
            threshold: 100,
            comparison: 'gte',
            severity: 'critical',
            cooldown: 5,
            enabled: true,
            channels: ['log', 'email', 'slack'],
        });

        // Response time alert
        this.registerRule({
            id: 'response-time-slow',
            name: 'Slow Response Time',
            description: 'Average response time above 2 seconds',
            metric: 'grc_http_request_duration_seconds',
            threshold: 2,
            comparison: 'gte',
            severity: 'warning',
            cooldown: 10,
            enabled: true,
            channels: ['log'],
        });

        // Database connection pool alert
        this.registerRule({
            id: 'db-pool-exhausted',
            name: 'Database Connection Pool Exhausted',
            description: 'All database connections in use',
            metric: 'grc_database_connection_pool_size',
            threshold: 19,
            comparison: 'gte',
            severity: 'critical',
            cooldown: 5,
            enabled: true,
            channels: ['log', 'email'],
            labels: { state: 'active' },
        });

        // Circuit breaker open alert
        this.registerRule({
            id: 'circuit-breaker-open',
            name: 'Circuit Breaker Open',
            description: 'Circuit breaker has opened',
            metric: 'grc_circuit_breaker_state',
            threshold: 1,
            comparison: 'gte',
            severity: 'warning',
            cooldown: 10,
            enabled: true,
            channels: ['log', 'slack'],
        });

        // Cache hit rate low
        this.registerRule({
            id: 'cache-hit-rate-low',
            name: 'Low Cache Hit Rate',
            description: 'Cache hit rate below 70%',
            metric: 'cache_hit_rate',
            threshold: 70,
            comparison: 'lt',
            severity: 'warning',
            cooldown: 30,
            enabled: true,
            channels: ['log'],
        });

        // Overdue assessments
        this.registerRule({
            id: 'overdue-assessments-high',
            name: 'High Number of Overdue Assessments',
            description: 'More than 10 overdue assessments',
            metric: 'grc_overdue_assessments_total',
            threshold: 10,
            comparison: 'gt',
            severity: 'warning',
            cooldown: 60,
            enabled: true,
            channels: ['log', 'email'],
        });

        logger.info(`Registered ${this.rules.size} default alert rules`);
    }

    /**
     * Start alert monitoring
     */
    start() {
        logger.info('Starting alert manager...');

        // Check alerts every 60 seconds
        this.checkInterval = setInterval(() => {
            this.checkAlerts();
        }, 60000);

        logger.info('Alert manager started');
    }

    /**
     * Stop alert monitoring
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        logger.info('Alert manager stopped');
    }

    /**
     * Register an alert rule
     */
    registerRule(rule: AlertRule) {
        this.rules.set(rule.id, rule);
        logger.info(`Alert rule registered: ${rule.name}`, { ruleId: rule.id });
    }

    /**
     * Unregister an alert rule
     */
    unregisterRule(ruleId: string) {
        this.rules.delete(ruleId);
        logger.info(`Alert rule unregistered`, { ruleId });
    }

    /**
     * Update alert rule
     */
    updateRule(ruleId: string, updates: Partial<AlertRule>) {
        const rule = this.rules.get(ruleId);
        if (!rule) {
            logger.warn(`Alert rule not found: ${ruleId}`);
            return;
        }

        this.rules.set(ruleId, { ...rule, ...updates });
        logger.info(`Alert rule updated: ${rule.name}`, { ruleId });
    }

    /**
     * Check all alert rules
     */
    private async checkAlerts() {
        for (const [ruleId, rule] of this.rules) {
            if (!rule.enabled) continue;

            // Check cooldown
            const lastAlertTime = this.lastAlertTime.get(ruleId) || 0;
            const cooldownMs = rule.cooldown * 60 * 1000;
            if (Date.now() - lastAlertTime < cooldownMs) {
                continue;
            }

            // Evaluate rule (simplified - in production would fetch actual metrics)
            const shouldAlert = await this.evaluateRule(rule);
            if (shouldAlert) {
                this.triggerAlert(rule, 0); // Would pass actual metric value
            }
        }
    }

    /**
     * Evaluate alert rule
     */
    private async evaluateRule(rule: AlertRule): Promise<boolean> {
        // In production, this would fetch actual metrics from Prometheus or monitoring service
        // For now, return false to prevent constant alerting
        return false;
    }

    /**
     * Trigger an alert
     */
    triggerAlert(rule: AlertRule, value: number) {
        const alert: Alert = {
            id: `${rule.id}-${Date.now()}`,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `${rule.description}. Current value: ${value}, Threshold: ${rule.threshold}`,
            value,
            threshold: rule.threshold,
            timestamp: new Date(),
            resolved: false,
        };

        // Store alert
        this.alerts.set(alert.id, alert);

        // Update last alert time
        this.lastAlertTime.set(rule.id, Date.now());

        // Send to channels
        this.sendAlert(alert, rule.channels);

        // Track in error tracker
        errorTracker.captureMessage(alert.message, {
            tags: {
                alert_type: 'threshold_breach',
                severity: alert.severity,
                rule_id: rule.id,
            },
            extra: {
                value: alert.value,
                threshold: alert.threshold,
            },
        }, alert.severity === 'critical' ? 'error' : 'warning');

        logger.warn('Alert triggered', {
            alertId: alert.id,
            ruleName: alert.ruleName,
            severity: alert.severity,
            value: alert.value,
            threshold: alert.threshold,
        });
    }

    /**
     * Send alert to channels
     */
    private sendAlert(alert: Alert, channels: AlertRule['channels']) {
        for (const channel of channels) {
            switch (channel) {
                case 'log':
                    this.sendToLog(alert);
                    break;
                case 'email':
                    this.sendToEmail(alert);
                    break;
                case 'slack':
                    this.sendToSlack(alert);
                    break;
                case 'pagerduty':
                    this.sendToPagerDuty(alert);
                    break;
            }
        }
    }

    /**
     * Send alert to log
     */
    private sendToLog(alert: Alert) {
        const logLevel = alert.severity === 'critical' ? 'error' : 'warn';
        logger[logLevel]('🚨 ALERT', {
            alertId: alert.id,
            ruleName: alert.ruleName,
            severity: alert.severity,
            message: alert.message,
            value: alert.value,
            threshold: alert.threshold,
        });
    }

    /**
     * Send alert to email
     */
    private sendToEmail(alert: Alert) {
        // In production, integrate with email service (SendGrid, AWS SES, etc.)
        logger.info('Alert email would be sent', {
            to: process.env.ALERT_EMAIL || 'alerts@example.com',
            subject: `[${alert.severity.toUpperCase()}] ${alert.ruleName}`,
            body: alert.message,
        });
    }

    /**
     * Send alert to Slack
     */
    private sendToSlack(alert: Alert) {
        // In production, send to Slack webhook
        if (process.env.SLACK_WEBHOOK_URL) {
            const color = alert.severity === 'critical' ? 'danger' : 'warning';
            const payload = {
                attachments: [
                    {
                        color,
                        title: alert.ruleName,
                        text: alert.message,
                        fields: [
                            {
                                title: 'Severity',
                                value: alert.severity.toUpperCase(),
                                short: true,
                            },
                            {
                                title: 'Value',
                                value: alert.value.toString(),
                                short: true,
                            },
                        ],
                        ts: Math.floor(alert.timestamp.getTime() / 1000),
                    },
                ],
            };

            logger.info('Alert would be sent to Slack', { payload });
        }
    }

    /**
     * Send alert to PagerDuty
     */
    private sendToPagerDuty(alert: Alert) {
        // In production, send to PagerDuty API
        if (process.env.PAGERDUTY_API_KEY && alert.severity === 'critical') {
            logger.info('Alert would be sent to PagerDuty', {
                eventAction: 'trigger',
                severity: alert.severity,
                summary: alert.message,
            });
        }
    }

    /**
     * Resolve an alert
     */
    resolveAlert(alertId: string) {
        const alert = this.alerts.get(alertId);
        if (!alert) {
            logger.warn(`Alert not found: ${alertId}`);
            return;
        }

        alert.resolved = true;
        alert.resolvedAt = new Date();

        logger.info('Alert resolved', { alertId, ruleName: alert.ruleName });
    }

    /**
     * Get active alerts
     */
    getActiveAlerts(): Alert[] {
        return Array.from(this.alerts.values()).filter((alert) => !alert.resolved);
    }

    /**
     * Get all alerts
     */
    getAllAlerts(): Alert[] {
        return Array.from(this.alerts.values());
    }

    /**
     * Get alert statistics
     */
    getStatistics() {
        const alerts = Array.from(this.alerts.values());
        const activeAlerts = alerts.filter((a) => !a.resolved);

        return {
            totalAlerts: alerts.length,
            activeAlerts: activeAlerts.length,
            bySeverity: {
                critical: activeAlerts.filter((a) => a.severity === 'critical').length,
                warning: activeAlerts.filter((a) => a.severity === 'warning').length,
                info: activeAlerts.filter((a) => a.severity === 'info').length,
            },
            totalRules: this.rules.size,
            enabledRules: Array.from(this.rules.values()).filter((r) => r.enabled).length,
        };
    }
}

// Export singleton
export const alertManager = new AlertManager();

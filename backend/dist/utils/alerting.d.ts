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
    cooldown: number;
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
export declare class AlertManager {
    private rules;
    private alerts;
    private lastAlertTime;
    private checkInterval;
    constructor();
    /**
     * Register default alerting rules
     */
    private registerDefaultRules;
    /**
     * Start alert monitoring
     */
    start(): void;
    /**
     * Stop alert monitoring
     */
    stop(): void;
    /**
     * Register an alert rule
     */
    registerRule(rule: AlertRule): void;
    /**
     * Unregister an alert rule
     */
    unregisterRule(ruleId: string): void;
    /**
     * Update alert rule
     */
    updateRule(ruleId: string, updates: Partial<AlertRule>): void;
    /**
     * Check all alert rules
     */
    private checkAlerts;
    /**
     * Evaluate alert rule
     */
    private evaluateRule;
    /**
     * Trigger an alert
     */
    triggerAlert(rule: AlertRule, value: number): void;
    /**
     * Send alert to channels
     */
    private sendAlert;
    /**
     * Send alert to log
     */
    private sendToLog;
    /**
     * Send alert to email
     */
    private sendToEmail;
    /**
     * Send alert to Slack
     */
    private sendToSlack;
    /**
     * Send alert to PagerDuty
     */
    private sendToPagerDuty;
    /**
     * Resolve an alert
     */
    resolveAlert(alertId: string): void;
    /**
     * Get active alerts
     */
    getActiveAlerts(): Alert[];
    /**
     * Get all alerts
     */
    getAllAlerts(): Alert[];
    /**
     * Get alert statistics
     */
    getStatistics(): {
        totalAlerts: number;
        activeAlerts: number;
        bySeverity: {
            critical: number;
            warning: number;
            info: number;
        };
        totalRules: number;
        enabledRules: number;
    };
}
export declare const alertManager: AlertManager;
//# sourceMappingURL=alerting.d.ts.map
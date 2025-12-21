"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const monitoring_1 = require("../utils/monitoring");
const errorTracking_1 = require("../utils/errorTracking");
const alerting_1 = require("../utils/alerting");
const logger_1 = __importDefault(require("../config/logger"));
const router = (0, express_1.Router)();
/**
 * Test Sentry integration
 * Captures a test error to verify Sentry is configured correctly
 */
router.post('/test/sentry', async (req, res) => {
    try {
        logger_1.default.info('Testing Sentry integration');
        // Create a test error
        const testError = new Error('Sentry Test Error - This is a test to verify Sentry integration');
        testError.name = 'SentryTestError';
        // Capture the error with context
        errorTracking_1.errorTracker.captureError(testError, {
            route: '/api/v1/monitoring/test/sentry',
        }, 'info');
        res.json({
            success: true,
            message: 'Test error sent to Sentry',
            instructions: 'Check your Sentry dashboard at https://sentry.io for the error',
            sentryDsn: process.env.SENTRY_DSN ? 'Configured ✓' : 'Not configured ✗',
            error: {
                message: testError.message,
                name: testError.name,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error testing Sentry:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test Sentry integration',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * Test Slack integration
 * Sends a test alert to configured Slack webhook
 */
router.post('/test/slack', async (req, res) => {
    try {
        logger_1.default.info('Testing Slack integration');
        const webhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (!webhookUrl) {
            return res.status(400).json({
                success: false,
                error: 'SLACK_WEBHOOK_URL not configured',
                instructions: 'Set SLACK_WEBHOOK_URL in your .env file',
            });
        }
        // Send test message to Slack
        const testAlert = {
            id: 'test-' + Date.now(),
            ruleId: 'test-rule',
            ruleName: 'Test Alert',
            severity: 'info',
            metric: 'test_metric',
            threshold: 100,
            value: 100,
            message: 'This is a test alert to verify Slack integration',
            timestamp: new Date(),
            resolved: false,
        };
        await alerting_1.alertManager.sendToSlack(testAlert);
        res.json({
            success: true,
            message: 'Test alert sent to Slack',
            instructions: 'Check your Slack channel for the test message',
            slackWebhook: webhookUrl.substring(0, 50) + '...',
            alert: testAlert,
        });
    }
    catch (error) {
        logger_1.default.error('Error testing Slack:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test Slack integration',
            details: error instanceof Error ? error.message : 'Unknown error',
            troubleshooting: [
                'Verify SLACK_WEBHOOK_URL is correct',
                'Check webhook URL format: https://hooks.slack.com/services/...',
                'Ensure webhook is not disabled in Slack workspace',
            ],
        });
    }
});
/**
 * Test email integration
 * Sends a test alert email to configured recipients
 */
router.post('/test/email', async (req, res) => {
    try {
        logger_1.default.info('Testing email integration');
        const smtpConfig = {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            user: process.env.SMTP_USER,
            from: process.env.ALERT_EMAIL_FROM,
            to: process.env.ALERT_EMAIL_TO,
        };
        // Check if SMTP is configured
        if (!smtpConfig.host || !smtpConfig.user) {
            return res.status(400).json({
                success: false,
                error: 'SMTP not configured',
                instructions: 'Configure SMTP settings in your .env file',
                required: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'ALERT_EMAIL_FROM', 'ALERT_EMAIL_TO'],
            });
        }
        // Send test email
        const testAlert = {
            id: 'test-' + Date.now(),
            ruleId: 'test-rule',
            ruleName: 'Test Alert',
            severity: 'info',
            metric: 'test_metric',
            threshold: 100,
            value: 100,
            message: 'This is a test alert to verify email integration',
            timestamp: new Date(),
            resolved: false,
        };
        await alerting_1.alertManager.sendToEmail(testAlert);
        res.json({
            success: true,
            message: 'Test email sent successfully',
            instructions: 'Check your inbox for the test alert email',
            config: {
                host: smtpConfig.host,
                port: smtpConfig.port,
                from: smtpConfig.from,
                to: smtpConfig.to,
            },
            alert: testAlert,
        });
    }
    catch (error) {
        logger_1.default.error('Error testing email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test email integration',
            details: error instanceof Error ? error.message : 'Unknown error',
            troubleshooting: [
                'Verify SMTP credentials are correct',
                'Check SMTP_HOST and SMTP_PORT',
                'For Gmail: Use app password, not regular password',
                'Check firewall/network allows SMTP traffic',
            ],
        });
    }
});
/**
 * Test all monitoring services
 * Comprehensive test of all monitoring integrations
 */
router.post('/test/all', async (req, res) => {
    try {
        logger_1.default.info('Testing all monitoring services');
        const results = {
            timestamp: new Date().toISOString(),
            tests: {},
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
            },
        };
        // Test 1: Prometheus metrics
        results.tests.prometheus = await testPrometheus();
        results.summary.total++;
        if (results.tests.prometheus.success)
            results.summary.passed++;
        else
            results.summary.failed++;
        // Test 2: Sentry (only if configured)
        if (process.env.SENTRY_DSN) {
            results.tests.sentry = await testSentryIntegration();
            results.summary.total++;
            if (results.tests.sentry.success)
                results.summary.passed++;
            else
                results.summary.failed++;
        }
        else {
            results.tests.sentry = { success: false, message: 'SENTRY_DSN not configured' };
            results.summary.total++;
            results.summary.failed++;
        }
        // Test 3: Slack (only if configured)
        if (process.env.SLACK_WEBHOOK_URL) {
            results.tests.slack = await testSlackIntegration();
            results.summary.total++;
            if (results.tests.slack.success)
                results.summary.passed++;
            else
                results.summary.failed++;
        }
        else {
            results.tests.slack = { success: false, message: 'SLACK_WEBHOOK_URL not configured' };
            results.summary.total++;
            results.summary.failed++;
        }
        // Test 4: Email (only if configured)
        if (process.env.SMTP_HOST && process.env.SMTP_USER) {
            results.tests.email = await testEmailIntegration();
            results.summary.total++;
            if (results.tests.email.success)
                results.summary.passed++;
            else
                results.summary.failed++;
        }
        else {
            results.tests.email = { success: false, message: 'SMTP not configured' };
            results.summary.total++;
            results.summary.failed++;
        }
        // Test 5: Log aggregation (only if configured)
        if (process.env.LOG_AGGREGATION_ENABLED === 'true') {
            results.tests.logAggregation = await testLogAggregation();
            results.summary.total++;
            if (results.tests.logAggregation.success)
                results.summary.passed++;
            else
                results.summary.failed++;
        }
        else {
            results.tests.logAggregation = { success: false, message: 'Log aggregation not enabled' };
            results.summary.total++;
            results.summary.failed++;
        }
        const overallSuccess = results.summary.failed === 0;
        res.status(overallSuccess ? 200 : 207).json({
            success: overallSuccess,
            message: overallSuccess
                ? 'All monitoring services are working correctly'
                : `${results.summary.failed} of ${results.summary.total} tests failed`,
            results,
            recommendations: getRecommendations(results),
        });
    }
    catch (error) {
        logger_1.default.error('Error testing monitoring services:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test monitoring services',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * Get monitoring configuration status
 */
router.get('/config/status', (req, res) => {
    const config = {
        metrics: {
            enabled: process.env.METRICS_ENABLED === 'true',
            endpoint: '/metrics',
            port: process.env.METRICS_PORT || process.env.PORT,
        },
        sentry: {
            configured: !!process.env.SENTRY_DSN,
            environment: process.env.SENTRY_ENVIRONMENT || 'development',
            release: process.env.SENTRY_RELEASE || 'unknown',
        },
        slack: {
            configured: !!process.env.SLACK_WEBHOOK_URL,
            channels: {
                default: !!process.env.SLACK_WEBHOOK_URL,
                critical: !!process.env.SLACK_WEBHOOK_CRITICAL,
                warning: !!process.env.SLACK_WEBHOOK_WARNING,
            },
        },
        email: {
            configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
            host: process.env.SMTP_HOST || 'not configured',
            from: process.env.ALERT_EMAIL_FROM || 'not configured',
            recipients: process.env.ALERT_EMAIL_TO?.split(',').length || 0,
        },
        pagerduty: {
            configured: !!process.env.PAGERDUTY_INTEGRATION_KEY,
        },
        logAggregation: {
            enabled: process.env.LOG_AGGREGATION_ENABLED === 'true',
            backend: process.env.LOG_AGGREGATION_BACKEND || 'none',
            configured: checkLogAggregationConfig(),
        },
        alerting: {
            enabled: process.env.ALERTING_ENABLED !== 'false',
            checkInterval: parseInt(process.env.ALERT_CHECK_INTERVAL || '60000'),
            thresholds: {
                memory: parseInt(process.env.ALERT_MEMORY_THRESHOLD || '90'),
                errorRate: parseInt(process.env.ALERT_ERROR_THRESHOLD || '100'),
                responseTime: parseInt(process.env.ALERT_RESPONSE_TIME_THRESHOLD || '2000'),
                dbPool: parseInt(process.env.ALERT_DB_POOL_THRESHOLD || '19'),
                cacheHitRate: parseInt(process.env.ALERT_CACHE_HIT_RATE_THRESHOLD || '70'),
            },
        },
        businessMetrics: {
            enabled: process.env.BUSINESS_METRICS_ENABLED !== 'false',
            interval: parseInt(process.env.BUSINESS_METRICS_INTERVAL || '300000'),
        },
    };
    const warnings = [];
    const recommendations = [];
    // Check for missing configurations
    if (!config.sentry.configured) {
        warnings.push('Sentry not configured - error tracking disabled');
        recommendations.push('Configure SENTRY_DSN for error tracking');
    }
    if (!config.slack.configured) {
        warnings.push('Slack not configured - Slack alerts disabled');
        recommendations.push('Configure SLACK_WEBHOOK_URL for alert notifications');
    }
    if (!config.email.configured) {
        warnings.push('Email not configured - email alerts disabled');
        recommendations.push('Configure SMTP settings for email alerts');
    }
    if (!config.logAggregation.configured) {
        warnings.push('Log aggregation not configured');
        recommendations.push('Configure log aggregation backend (ELK, Datadog, CloudWatch, or Loki)');
    }
    res.json({
        config,
        warnings,
        recommendations,
        documentation: '/MONITORING-SETUP-GUIDE.md',
    });
});
// Helper functions
async function testPrometheus() {
    try {
        const metrics = await monitoring_1.monitoringService.getMetrics();
        const metricsCount = metrics.split('\n').filter((line) => line && !line.startsWith('#')).length;
        return {
            success: true,
            message: 'Prometheus metrics available',
            metricsCount,
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to get Prometheus metrics',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
async function testSentryIntegration() {
    try {
        const testError = new Error('Sentry integration test');
        errorTracking_1.errorTracker.captureError(testError, {}, 'info');
        return {
            success: true,
            message: 'Test error sent to Sentry',
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to send error to Sentry',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
async function testSlackIntegration() {
    try {
        const testAlert = {
            id: 'test-' + Date.now(),
            ruleId: 'test-rule',
            ruleName: 'Integration Test',
            severity: 'info',
            metric: 'test',
            threshold: 0,
            value: 0,
            message: 'Slack integration test',
            timestamp: new Date(),
            resolved: false,
        };
        await alerting_1.alertManager.sendToSlack(testAlert);
        return {
            success: true,
            message: 'Test alert sent to Slack',
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to send alert to Slack',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
async function testEmailIntegration() {
    try {
        const testAlert = {
            id: 'test-' + Date.now(),
            ruleId: 'test-rule',
            ruleName: 'Integration Test',
            severity: 'info',
            metric: 'test',
            threshold: 0,
            value: 0,
            message: 'Email integration test',
            timestamp: new Date(),
            resolved: false,
        };
        await alerting_1.alertManager.sendToEmail(testAlert);
        return {
            success: true,
            message: 'Test email sent',
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to send test email',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
async function testLogAggregation() {
    try {
        logger_1.default.info('Log aggregation test', { test: true });
        return {
            success: true,
            message: 'Test log sent',
            backend: process.env.LOG_AGGREGATION_BACKEND,
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to send test log',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
function checkLogAggregationConfig() {
    const backend = process.env.LOG_AGGREGATION_BACKEND;
    switch (backend) {
        case 'elk':
            return !!process.env.ELASTICSEARCH_URL;
        case 'datadog':
            return !!process.env.DATADOG_API_KEY;
        case 'cloudwatch':
            return !!(process.env.AWS_REGION && process.env.CLOUDWATCH_LOG_GROUP);
        case 'loki':
            return !!process.env.LOKI_URL;
        default:
            return false;
    }
}
function getRecommendations(results) {
    const recommendations = [];
    if (!results.tests.sentry?.success) {
        recommendations.push('Set up Sentry: Visit sentry.io, create project, and add SENTRY_DSN to .env');
    }
    if (!results.tests.slack?.success) {
        recommendations.push('Set up Slack: Create incoming webhook and add SLACK_WEBHOOK_URL to .env');
    }
    if (!results.tests.email?.success) {
        recommendations.push('Set up Email: Configure SMTP settings in .env file');
    }
    if (!results.tests.logAggregation?.success) {
        recommendations.push('Set up Log Aggregation: Choose backend (ELK/Datadog/CloudWatch/Loki) and configure');
    }
    if (recommendations.length === 0) {
        recommendations.push('All monitoring services configured correctly! Consider setting up Grafana dashboards.');
    }
    return recommendations;
}
exports.default = router;
//# sourceMappingURL=monitoring.test.routes.js.map
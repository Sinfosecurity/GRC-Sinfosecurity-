# Monitoring External Services Setup Guide

Complete guide for configuring external monitoring services for the GRC platform.

## Table of Contents
1. [Overview](#overview)
2. [Sentry Error Tracking](#sentry-error-tracking)
3. [Slack Alerts](#slack-alerts)
4. [Email Alerts (SMTP)](#email-alerts-smtp)
5. [Prometheus Setup](#prometheus-setup)
6. [Grafana Setup](#grafana-setup)
7. [Log Aggregation Backends](#log-aggregation-backends)
8. [Environment Variables](#environment-variables)
9. [Testing Configuration](#testing-configuration)
10. [Production Checklist](#production-checklist)

---

## Overview

The GRC monitoring infrastructure integrates with multiple external services:

- **Sentry**: Error tracking and performance monitoring
- **Slack**: Real-time alert notifications
- **Email (SMTP)**: Alert notifications via email
- **Prometheus**: Metrics collection and storage
- **Grafana**: Metrics visualization and dashboards
- **Log Aggregation**: ELK Stack, Datadog, CloudWatch, or Loki

### Architecture Flow

```
Application → Monitoring Service → External Services
                ↓
        ┌──────────────────┐
        │   Metrics (15s)  │ → Prometheus → Grafana
        │   Errors (30s)   │ → Sentry
        │   Alerts (60s)   │ → Slack/Email/PagerDuty
        │   Logs (60s)     │ → ELK/Datadog/CloudWatch/Loki
        └──────────────────┘
```

---

## Sentry Error Tracking

### Step 1: Create Sentry Account

1. Visit [sentry.io](https://sentry.io)
2. Sign up or log in
3. Click "Create Project"
4. Select "Node.js" or "Express" as platform
5. Name your project (e.g., "grc-platform-backend")

### Step 2: Get DSN

1. Navigate to **Settings** → **Projects** → **[Your Project]**
2. Go to **Client Keys (DSN)**
3. Copy the DSN (looks like: `https://xxxxx@o123456.ingest.sentry.io/7654321`)

### Step 3: Configure in Application

Add to your `.env` file:

```bash
# Sentry Configuration
SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/7654321
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0

# Optional: Sentry Settings
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
SENTRY_DEBUG=false
```

### Step 4: Install Sentry SDK (if not already installed)

```bash
cd backend
npm install @sentry/node @sentry/tracing
```

### Step 5: Verify Configuration

```bash
# Test Sentry integration
curl -X POST http://localhost:3000/api/v1/monitoring/test-sentry
```

### Sentry Best Practices

- **Sample Rate**: Set to 0.1 (10%) for high-traffic apps to avoid quota limits
- **Environment**: Always set to differentiate between dev/staging/production
- **Release Tracking**: Use semantic versioning (1.0.0) to track errors by release
- **Source Maps**: Upload source maps for TypeScript stack traces
- **Breadcrumbs**: Automatically captured by our error tracker
- **User Context**: Automatically includes user ID, organization, and route

### Sentry Features Enabled

✅ Error tracking with stack traces  
✅ Error fingerprinting for intelligent grouping  
✅ Breadcrumb trail (last 100 actions)  
✅ Request context (headers, body, query)  
✅ User context (ID, org, role)  
✅ Environment context (Node version, OS)  
✅ Performance monitoring  
✅ Release tracking  

---

## Slack Alerts

### Step 1: Create Incoming Webhook

1. Visit your Slack workspace
2. Go to **Apps** → **Incoming Webhooks**
3. Click "Add to Slack"
4. Select channel for alerts (e.g., `#alerts` or `#monitoring`)
5. Click "Add Incoming WebHooks Integration"
6. Copy the webhook URL

### Step 2: Create Dedicated Channels

Recommended channel structure:

```
#alerts-critical   - CRITICAL alerts only
#alerts-warning    - WARNING alerts
#alerts-info       - INFO alerts (optional)
#monitoring        - Dashboard links and reports
```

### Step 3: Configure Multiple Webhooks (Optional)

For different severity levels:

```bash
# Slack Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
SLACK_WEBHOOK_CRITICAL=https://hooks.slack.com/services/T00000000/B11111111/YYYYYYYYYYYYYYYYYYYY
SLACK_WEBHOOK_WARNING=https://hooks.slack.com/services/T00000000/B22222222/ZZZZZZZZZZZZZZZZZZZZ
```

### Step 4: Configure Alert Formatting

Our implementation sends rich Slack messages with:

- **Color-coded alerts**: 🔴 Critical (red), ⚠️ Warning (yellow)
- **Alert details**: Metric, threshold, current value
- **Timestamps**: When alert triggered
- **Action buttons**: Link to dashboard, acknowledge alert
- **Organization context**: Which org triggered alert

### Step 5: Test Slack Integration

```bash
# Test Slack webhook
curl -X POST http://localhost:3000/api/v1/monitoring/test-slack
```

### Slack Alert Examples

**Critical Alert:**
```
🚨 CRITICAL: High Memory Usage
━━━━━━━━━━━━━━━━━━━━━━━
Metric: process_memory_usage_percent
Threshold: 90%
Current Value: 94.5%
Organization: Acme Corp

Time: 2025-12-19 14:30:45 UTC
Duration: 5 minutes

[View Dashboard] [Acknowledge]
```

**Warning Alert:**
```
⚠️ WARNING: Slow Response Time
━━━━━━━━━━━━━━━━━━━━━━━
Metric: http_request_duration_p95
Threshold: 2000ms
Current Value: 2450ms

Route: POST /api/v1/vendors
Organization: Acme Corp

[View Dashboard]
```

### Slack Best Practices

- **Separate channels** by severity to avoid alert fatigue
- **Mute non-critical** channels outside business hours
- **Set up workflows** to auto-create tickets for critical alerts
- **Use threads** for alert updates and resolutions
- **Add runbooks** as pinned messages in alert channels

---

## Email Alerts (SMTP)

### Step 1: Choose SMTP Provider

**Option 1: Gmail** (Free, easy setup)
**Option 2: SendGrid** (Reliable, good for production)
**Option 3: AWS SES** (Cost-effective, scalable)
**Option 4: Postmark** (Fast, transactional focus)

### Step 2: Gmail Setup (Development)

1. Enable 2-Factor Authentication on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate app password for "Mail"
4. Copy the 16-character password

```bash
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password

ALERT_EMAIL_FROM=alerts@yourcompany.com
ALERT_EMAIL_TO=ops@yourcompany.com,cto@yourcompany.com
```

### Step 3: SendGrid Setup (Production)

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Navigate to **Settings** → **API Keys**
3. Create API Key with "Full Access"
4. Verify sender email/domain

```bash
# SendGrid Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

ALERT_EMAIL_FROM=alerts@yourcompany.com
ALERT_EMAIL_TO=ops@yourcompany.com
```

### Step 4: AWS SES Setup (Enterprise)

1. Go to AWS SES Console
2. Verify your domain
3. Create SMTP credentials
4. Move out of sandbox mode (for production)

```bash
# AWS SES Configuration
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=AKIAXXXXXXXXXXXXXXXX
SMTP_PASS=your-ses-smtp-password

ALERT_EMAIL_FROM=alerts@yourcompany.com
ALERT_EMAIL_TO=ops@yourcompany.com
```

### Step 5: Configure Multiple Recipients

```bash
# Multiple recipients (comma-separated)
ALERT_EMAIL_TO=ops@company.com,devops@company.com,cto@company.com

# Severity-specific emails
ALERT_EMAIL_CRITICAL=oncall@company.com,cto@company.com
ALERT_EMAIL_WARNING=ops@company.com
```

### Step 6: Test Email Configuration

```bash
# Test SMTP connection
curl -X POST http://localhost:3000/api/v1/monitoring/test-email
```

### Email Alert Format

**Subject:** `[CRITICAL] High Memory Usage - GRC Platform`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        .alert-critical { background: #ff4444; color: white; }
        .alert-warning { background: #ffaa00; color: white; }
        .metric-box { background: #f5f5f5; padding: 15px; }
    </style>
</head>
<body>
    <div class="alert-critical">
        <h2>🚨 CRITICAL ALERT</h2>
        <h3>High Memory Usage</h3>
    </div>
    
    <div class="metric-box">
        <p><strong>Metric:</strong> process_memory_usage_percent</p>
        <p><strong>Threshold:</strong> 90%</p>
        <p><strong>Current Value:</strong> 94.5%</p>
        <p><strong>Organization:</strong> Acme Corp</p>
        <p><strong>Time:</strong> 2025-12-19 14:30:45 UTC</p>
    </div>
    
    <p>
        <a href="https://grafana.yourcompany.com/dashboard">View Dashboard</a> |
        <a href="https://app.yourcompany.com/monitoring">Acknowledge Alert</a>
    </p>
    
    <hr>
    <p style="color: #666; font-size: 12px;">
        GRC Platform Monitoring System<br>
        This is an automated alert. Do not reply to this email.
    </p>
</body>
</html>
```

### Email Best Practices

- **HTML + Text**: Always send both formats
- **Rate limiting**: Max 1 alert per 5 min per rule (built-in)
- **Digest mode**: Consider daily digest for non-critical alerts
- **Unsubscribe**: Add unsubscribe link for compliance
- **Clear CTAs**: Include links to dashboard and runbooks

---

## Prometheus Setup

### Step 1: Install Prometheus

**Option 1: Docker (Recommended)**

```bash
# Create prometheus.yml
cat > prometheus.yml <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'grc-backend'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'grc-frontend'
    static_configs:
      - targets: ['host.docker.internal:5173']
    metrics_path: '/metrics'
    scrape_interval: 15s
EOF

# Run Prometheus
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

**Option 2: Local Install (macOS)**

```bash
# Install via Homebrew
brew install prometheus

# Start Prometheus
prometheus --config.file=prometheus.yml
```

**Option 3: Kubernetes**

```bash
# Install via Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/prometheus
```

### Step 2: Configure Scrape Endpoints

Our application exposes metrics at:

- **Backend**: `http://localhost:3000/metrics` (Prometheus format)
- **Backend JSON**: `http://localhost:3000/metrics/json` (JSON format)

### Step 3: Verify Prometheus

1. Open [http://localhost:9090](http://localhost:9090)
2. Go to **Status** → **Targets**
3. Verify `grc-backend` is UP
4. Run sample query: `grc_http_requests_total`

### Step 4: Configure Retention

```bash
# Retention: 30 days, max 50GB
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v prometheus-data:/prometheus \
  prom/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.retention.time=30d \
  --storage.tsdb.retention.size=50GB
```

### Prometheus Configuration Reference

```yaml
# prometheus.yml
global:
  scrape_interval: 15s        # How often to scrape targets
  evaluation_interval: 15s    # How often to evaluate rules
  
  external_labels:
    cluster: 'production'
    region: 'us-east-1'

# Alerting configuration (optional)
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

# Rule files for alerts (optional)
rule_files:
  - 'alerts.yml'

# Scrape configurations
scrape_configs:
  - job_name: 'grc-backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
    scrape_timeout: 10s
```

---

## Grafana Setup

### Step 1: Install Grafana

**Option 1: Docker**

```bash
docker run -d \
  --name=grafana \
  -p 3001:3000 \
  -v grafana-storage:/var/lib/grafana \
  grafana/grafana-oss
```

**Option 2: macOS**

```bash
brew install grafana
brew services start grafana
```

### Step 2: Initial Setup

1. Open [http://localhost:3001](http://localhost:3001)
2. Login with `admin` / `admin`
3. Change password when prompted

### Step 3: Add Prometheus Data Source

1. Go to **Configuration** → **Data Sources**
2. Click "Add data source"
3. Select "Prometheus"
4. Configure:
   - **Name**: `Prometheus`
   - **URL**: `http://host.docker.internal:9090` (Docker) or `http://localhost:9090`
   - **Access**: Server (default)
5. Click "Save & Test"

### Step 4: Import Dashboards

We'll create 5 comprehensive dashboards:

**Dashboard 1: System Overview**

```json
{
  "dashboard": {
    "title": "GRC System Overview",
    "panels": [
      {
        "title": "HTTP Requests/sec",
        "targets": [{
          "expr": "rate(grc_http_requests_total[5m])"
        }]
      },
      {
        "title": "Response Time (p95)",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(grc_http_request_duration_seconds_bucket[5m]))"
        }]
      }
    ]
  }
}
```

See [MONITORING-IMPLEMENTATION-REPORT.md](MONITORING-IMPLEMENTATION-REPORT.md) for complete dashboard JSONs.

### Step 5: Create Alert Rules in Grafana

1. Go to **Alerting** → **Alert rules**
2. Create alert for "High Error Rate"
3. Configure notification channel (Slack/Email)

---

## Log Aggregation Backends

### Option 1: ELK Stack (Elasticsearch, Logstash, Kibana)

**Step 1: Start ELK Stack**

```bash
# docker-compose.yml for ELK
version: '3'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    ports:
      - "9200:9200"
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
  
  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

docker-compose up -d
```

**Step 2: Configure in App**

```bash
# ELK Configuration
LOG_AGGREGATION_ENABLED=true
LOG_AGGREGATION_BACKEND=elk
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=grc-logs
```

### Option 2: Datadog

**Step 1: Get API Key**

1. Sign up at [datadoghq.com](https://www.datadoghq.com)
2. Go to **Organization Settings** → **API Keys**
3. Create new API key

**Step 2: Configure**

```bash
# Datadog Configuration
LOG_AGGREGATION_ENABLED=true
LOG_AGGREGATION_BACKEND=datadog
DATADOG_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
DATADOG_SITE=datadoghq.com  # or datadoghq.eu
```

### Option 3: AWS CloudWatch

**Step 1: Create Log Group**

```bash
aws logs create-log-group --log-group-name /grc/application
```

**Step 2: Configure**

```bash
# CloudWatch Configuration
LOG_AGGREGATION_ENABLED=true
LOG_AGGREGATION_BACKEND=cloudwatch
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLOUDWATCH_LOG_GROUP=/grc/application
CLOUDWATCH_LOG_STREAM=backend
```

### Option 4: Loki (Grafana)

**Step 1: Start Loki**

```bash
docker run -d \
  --name=loki \
  -p 3100:3100 \
  grafana/loki:latest
```

**Step 2: Configure**

```bash
# Loki Configuration
LOG_AGGREGATION_ENABLED=true
LOG_AGGREGATION_BACKEND=loki
LOKI_URL=http://localhost:3100
```

---

## Environment Variables

### Complete .env Template

```bash
# ============================================
# MONITORING CONFIGURATION
# ============================================

# --- Sentry Error Tracking ---
SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/7654321
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_DEBUG=false

# --- Slack Alerts ---
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
# Optional: Separate webhooks for different severities
# SLACK_WEBHOOK_CRITICAL=https://hooks.slack.com/services/...
# SLACK_WEBHOOK_WARNING=https://hooks.slack.com/services/...

# --- Email Alerts (SMTP) ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

ALERT_EMAIL_FROM=alerts@yourcompany.com
ALERT_EMAIL_TO=ops@yourcompany.com,devops@yourcompany.com

# Optional: Severity-specific emails
# ALERT_EMAIL_CRITICAL=oncall@yourcompany.com
# ALERT_EMAIL_WARNING=ops@yourcompany.com

# --- PagerDuty (Optional) ---
# PAGERDUTY_INTEGRATION_KEY=your-integration-key
# PAGERDUTY_SERVICE_ID=your-service-id

# --- Prometheus ---
METRICS_ENABLED=true
METRICS_PORT=3000
METRICS_PATH=/metrics

# --- Log Aggregation ---
LOG_AGGREGATION_ENABLED=true
LOG_AGGREGATION_BACKEND=elk  # elk, datadog, cloudwatch, loki

# ELK Stack
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=grc-logs
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme

# Datadog
# DATADOG_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
# DATADOG_SITE=datadoghq.com

# AWS CloudWatch
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
# AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# CLOUDWATCH_LOG_GROUP=/grc/application
# CLOUDWATCH_LOG_STREAM=backend

# Loki
# LOKI_URL=http://localhost:3100

# --- Alert Configuration ---
ALERTING_ENABLED=true
ALERT_CHECK_INTERVAL=60000  # 60 seconds

# Alert thresholds
ALERT_MEMORY_THRESHOLD=90  # 90%
ALERT_ERROR_THRESHOLD=100  # 100 errors/min
ALERT_RESPONSE_TIME_THRESHOLD=2000  # 2000ms
ALERT_DB_POOL_THRESHOLD=19  # 19/20 connections
ALERT_CACHE_HIT_RATE_THRESHOLD=70  # 70%
ALERT_OVERDUE_ASSESSMENTS_THRESHOLD=10

# --- Monitoring Collection Intervals ---
METRICS_COLLECTION_INTERVAL=15000  # 15 seconds
BUSINESS_METRICS_INTERVAL=300000   # 5 minutes
ERROR_FLUSH_INTERVAL=30000         # 30 seconds
LOG_FLUSH_INTERVAL=60000           # 60 seconds
```

---

## Testing Configuration

### Test All Services

```bash
# 1. Test Sentry
curl -X POST http://localhost:3000/api/v1/monitoring/test/sentry
# Expected: Error logged in Sentry dashboard

# 2. Test Slack
curl -X POST http://localhost:3000/api/v1/monitoring/test/slack
# Expected: Test message in Slack channel

# 3. Test Email
curl -X POST http://localhost:3000/api/v1/monitoring/test/email
# Expected: Test email received

# 4. Test Prometheus
curl http://localhost:3000/metrics
# Expected: Prometheus metrics in text format

# 5. Test all monitoring endpoints
curl http://localhost:3000/api/v1/monitoring/dashboard
curl http://localhost:3000/api/v1/monitoring/performance
curl http://localhost:3000/api/v1/monitoring/errors
curl http://localhost:3000/api/v1/monitoring/alerts
```

### Trigger Test Alerts

```bash
# Trigger high error rate alert
for i in {1..150}; do
  curl -X GET http://localhost:3000/api/v1/test/error &
done
wait

# Should trigger alert within 60 seconds
```

### Verify in External Services

**Sentry:**
- Go to [sentry.io](https://sentry.io) → Your Project
- Check "Issues" for test error

**Slack:**
- Check configured channel for test message

**Email:**
- Check inbox for test alert email

**Prometheus:**
- Visit [http://localhost:9090](http://localhost:9090)
- Query: `grc_http_requests_total`
- Should see metrics

**Grafana:**
- Visit [http://localhost:3001](http://localhost:3001)
- Go to Explore
- Select Prometheus data source
- Query: `grc_http_requests_total`

---

## Production Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Sentry DSN tested and verified
- [ ] Slack webhooks tested (all severity channels)
- [ ] SMTP credentials verified
- [ ] Prometheus scraping backend successfully
- [ ] Grafana dashboards created
- [ ] Log aggregation backend connected
- [ ] Alert thresholds reviewed and adjusted
- [ ] Alert cooldown periods appropriate
- [ ] All monitoring endpoints secured with auth

### Post-Deployment

- [ ] Verify metrics flowing to Prometheus (check /metrics endpoint)
- [ ] Verify errors captured in Sentry
- [ ] Trigger test alert and verify Slack notification
- [ ] Trigger test alert and verify email notification
- [ ] Verify logs flowing to aggregation backend
- [ ] Check Grafana dashboards showing live data
- [ ] Verify business metrics collecting every 5 minutes
- [ ] Test alert acknowledgment and resolution
- [ ] Monitor monitoring overhead (< 5ms per request)
- [ ] Set up on-call rotation in PagerDuty (if used)

### Week 1 Post-Deployment

- [ ] Review alert frequency (adjust thresholds if too noisy)
- [ ] Check false positive rate
- [ ] Verify MTTR improvements
- [ ] Review Grafana dashboard usage
- [ ] Adjust Sentry sample rate based on quota
- [ ] Fine-tune log aggregation filters
- [ ] Review and adjust alerting cooldown periods
- [ ] Document any runbooks for common alerts

### Monthly Review

- [ ] Review monitoring costs (Sentry, Datadog, etc.)
- [ ] Analyze alert response times
- [ ] Review and update alert thresholds
- [ ] Check for unused/redundant alerts
- [ ] Verify business metrics accuracy
- [ ] Review Grafana dashboard effectiveness
- [ ] Update monitoring documentation
- [ ] Check Prometheus retention and storage

---

## Cost Estimation

### Free Tier Limits

| Service | Free Tier | Cost After |
|---------|-----------|------------|
| Sentry | 5K errors/month | $26/month (10K errors) |
| Slack | Unlimited | Free for basic webhooks |
| SendGrid | 100 emails/day | $19.95/month (40K emails) |
| Datadog | 14-day trial | $15/host/month |
| AWS CloudWatch | 5GB logs, 10 metrics | $0.50/GB ingested |
| Grafana Cloud | 10K metrics, 50GB logs | $49/month (100K metrics) |

### Production Cost Estimate

**Minimal Setup** (Sentry + Slack + Gmail + Self-hosted Prometheus/Grafana):
- **Cost**: $26/month (Sentry only)
- **Hosting**: Self-hosted (included in infrastructure)

**Mid-Tier** (Sentry + Slack + SendGrid + Self-hosted):
- **Cost**: $46/month
- **Good for**: 10K errors, 40K emails

**Enterprise** (Sentry + Slack + SendGrid + Datadog + PagerDuty):
- **Cost**: $100-500/month
- **ROI**: $380K annual savings (per report)

---

## Troubleshooting

### Sentry Not Receiving Errors

```bash
# Check DSN configuration
echo $SENTRY_DSN

# Verify network connectivity
curl -I https://o123456.ingest.sentry.io

# Check Sentry debug mode
SENTRY_DEBUG=true npm start

# Check error buffer
curl http://localhost:3000/api/v1/monitoring/errors
```

### Slack Webhooks Not Working

```bash
# Test webhook directly
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message"}' \
  $SLACK_WEBHOOK_URL

# Check webhook URL format (should start with https://hooks.slack.com)
echo $SLACK_WEBHOOK_URL

# Verify Slack app not disabled
# Check Slack workspace → Apps → Incoming Webhooks
```

### Email Alerts Not Sending

```bash
# Test SMTP connection
npm install -g smtp-tester
smtp-tester --host $SMTP_HOST --port $SMTP_PORT --user $SMTP_USER --pass $SMTP_PASS

# Check Gmail app password (16 chars, no spaces)
echo $SMTP_PASS | wc -c  # Should be 17 (16 + newline)

# Verify "Less secure app access" disabled (use app password instead)
```

### Prometheus Not Scraping

```bash
# Check metrics endpoint
curl http://localhost:3000/metrics

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check prometheus.yml configuration
docker exec prometheus cat /etc/prometheus/prometheus.yml

# Check Docker networking (use host.docker.internal, not localhost)
```

### Grafana Not Showing Data

```bash
# Test Prometheus data source
curl http://localhost:9090/api/v1/query?query=up

# Check Grafana logs
docker logs grafana

# Verify data source URL (use http://host.docker.internal:9090)

# Test query in Grafana Explore
# Query: grc_http_requests_total
```

---

## Security Best Practices

### Secrets Management

**Don't:**
- ❌ Commit `.env` files to git
- ❌ Hardcode credentials in code
- ❌ Share credentials via Slack/email
- ❌ Use same credentials across environments

**Do:**
- ✅ Use environment variables
- ✅ Use secret management (AWS Secrets Manager, HashiCorp Vault)
- ✅ Rotate credentials regularly (90 days)
- ✅ Use different credentials per environment
- ✅ Add `.env` to `.gitignore`

### Access Control

- Limit Sentry project access to dev team
- Restrict Grafana dashboards (view-only for most users)
- Use Slack private channels for critical alerts
- Enable 2FA on all monitoring services
- Use role-based access control (RBAC)

### Data Privacy

- Scrub PII from logs before aggregation
- Mask sensitive fields in error context
- Set log retention to 30-90 days (compliance)
- Enable encryption at rest for logs
- Use TLS for all external service connections

---

## Support and Resources

### Documentation
- [MONITORING-IMPLEMENTATION-REPORT.md](MONITORING-IMPLEMENTATION-REPORT.md) - Complete implementation details
- [MONITORING-QUICK-REFERENCE.md](MONITORING-QUICK-REFERENCE.md) - Quick reference guide

### External Resources
- [Sentry Documentation](https://docs.sentry.io)
- [Prometheus Documentation](https://prometheus.io/docs)
- [Grafana Documentation](https://grafana.com/docs)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)

### Getting Help

**Issues with monitoring setup?**
1. Check [Troubleshooting](#troubleshooting) section above
2. Review logs: `docker logs <container>`
3. Test individual components with curl commands
4. Check environment variables: `env | grep SENTRY`

---

## Next Steps

After completing external service configuration:

1. **Create Grafana Dashboards** - Visualize all metrics
2. **Set Up Alerting** - Configure alert rules in Grafana
3. **Document Runbooks** - Create runbooks for common alerts
4. **Train Team** - Train ops team on monitoring tools
5. **Establish SLOs** - Define Service Level Objectives
6. **Move to DevOps/CI/CD** - Next critical category (20/100)

---

**Configuration Status**: 
- Monitoring Infrastructure: ✅ Complete
- External Services: 🔄 In Progress (this guide)
- Dashboards: ⏳ Next
- DevOps/CI/CD: ⏳ Pending

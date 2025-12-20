# External Services Configuration - Quick Start

Get your GRC platform monitoring up and running in 15 minutes.

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)

Run the interactive setup script:

```bash
cd /path/to/GRC
./setup-monitoring.sh
```

The script will:
- ✅ Guide you through configuring each service
- ✅ Start the monitoring stack with Docker
- ✅ Install required dependencies
- ✅ Test your configuration
- ✅ Provide next steps

### Option 2: Manual Setup

Follow these steps for manual configuration:

#### 1. Configure Environment Variables (5 min)

Copy the example file:
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add:

```bash
# Sentry (Sign up at sentry.io - Free tier available)
SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/7654321
SENTRY_ENVIRONMENT=production

# Slack (Create webhook at hooks.slack.com)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00/B00/XXXX

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ALERT_EMAIL_FROM=alerts@yourcompany.com
ALERT_EMAIL_TO=ops@yourcompany.com
```

#### 2. Start Monitoring Stack (2 min)

```bash
# Start Prometheus, Grafana, and ELK Stack
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker ps
```

#### 3. Install Dependencies (2 min)

```bash
cd backend
npm install prom-client nodemailer @sentry/node @sentry/tracing axios
```

#### 4. Start Backend (1 min)

```bash
npm run build
npm start
```

#### 5. Verify Setup (2 min)

```bash
# Check metrics
curl http://localhost:4000/metrics

# Check configuration status
curl http://localhost:4000/api/v1/monitoring/config/status

# Test Sentry
curl -X POST http://localhost:4000/api/v1/monitoring/test/sentry

# Test Slack
curl -X POST http://localhost:4000/api/v1/monitoring/test/slack

# Test Email
curl -X POST http://localhost:4000/api/v1/monitoring/test/email
```

## 📊 Access Monitoring Services

Once setup is complete, access these URLs:

| Service | URL | Login |
|---------|-----|-------|
| Prometheus | http://localhost:9090 | No auth |
| Grafana | http://localhost:3001 | admin/admin |
| Kibana | http://localhost:5601 | No auth |
| Backend Metrics | http://localhost:4000/metrics | No auth |
| Monitoring API | http://localhost:4000/api/v1/monitoring/dashboard | Auth required |

## 🔧 Service-Specific Setup

### Sentry Setup (2 min)

1. Go to [sentry.io](https://sentry.io) and sign up
2. Click "Create Project"
3. Select "Node.js" platform
4. Copy your DSN from Project Settings
5. Add to `.env`: `SENTRY_DSN=your-dsn-here`

**Free Tier**: 5,000 errors/month

### Slack Setup (2 min)

1. Go to your Slack workspace
2. Click on your workspace name → Administration → Manage apps
3. Search for "Incoming Webhooks"
4. Click "Add to Slack"
5. Choose a channel (e.g., #alerts)
6. Copy the webhook URL
7. Add to `.env`: `SLACK_WEBHOOK_URL=your-webhook-url`

**Tip**: Create separate channels for different alert severities:
- `#alerts-critical` - CRITICAL alerts only
- `#alerts-warning` - WARNING alerts
- `#monitoring` - General monitoring info

### Email/SMTP Setup (3 min)

**Gmail (Development)**:
1. Enable 2FA on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate app password for "Mail"
4. Add to `.env`:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   ```

**SendGrid (Production)**:
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create API key
3. Add to `.env`:
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=SG.your-api-key
   ```

**Free Tier**: SendGrid offers 100 emails/day free

### Grafana Setup (5 min)

1. Open http://localhost:3001
2. Login with `admin` / `admin`
3. Change password when prompted
4. Prometheus data source should be auto-configured
5. Import sample dashboards:
   - Go to Dashboards → Import
   - Upload JSON from `grafana/dashboards/`

**Create Your First Dashboard**:
1. Click "+" → Dashboard
2. Add panel
3. Query: `rate(grc_http_requests_total[5m])`
4. Panel title: "HTTP Requests/sec"
5. Save dashboard

## 🧪 Testing Your Setup

### Test All Services at Once

```bash
curl -X POST http://localhost:4000/api/v1/monitoring/test/all | jq
```

Expected output:
```json
{
  "success": true,
  "message": "All monitoring services are working correctly",
  "results": {
    "prometheus": { "success": true },
    "sentry": { "success": true },
    "slack": { "success": true },
    "email": { "success": true }
  }
}
```

### Individual Tests

**Test Metrics Collection**:
```bash
curl http://localhost:4000/metrics | grep grc_http_requests_total
```

**Test Sentry**:
```bash
curl -X POST http://localhost:4000/api/v1/monitoring/test/sentry
# Check sentry.io for the error
```

**Test Slack**:
```bash
curl -X POST http://localhost:4000/api/v1/monitoring/test/slack
# Check your Slack channel for the message
```

**Test Email**:
```bash
curl -X POST http://localhost:4000/api/v1/monitoring/test/email
# Check your inbox
```

**View Prometheus Metrics**:
```bash
# Open in browser
open http://localhost:9090

# Run sample query
grc_http_requests_total
```

**View Grafana Dashboard**:
```bash
# Open in browser
open http://localhost:3001

# Login: admin/admin
```

## 🎯 What You Get

After setup, you'll have:

✅ **50+ Metrics** being collected every 15 seconds  
✅ **Error Tracking** with Sentry integration  
✅ **Real-time Alerts** via Slack/Email  
✅ **Performance Monitoring** for requests, DB, cache  
✅ **Business Metrics** for vendors, assessments, risks  
✅ **Log Aggregation** with ELK Stack or alternatives  
✅ **Visual Dashboards** in Grafana  
✅ **API Endpoints** for custom integrations  

### Key Metrics Available

**HTTP Metrics**:
- Request count, duration, size
- Response size, status codes
- p50, p95, p99 latencies

**Database Metrics**:
- Query count, duration
- Connection pool usage
- Slow queries (>100ms)

**Cache Metrics**:
- Hit/miss rates
- Operation duration
- Cache size

**Business Metrics**:
- Vendor count by tier/status
- Assessment status distribution
- Risk levels
- Compliance scores
- Incident counts

**Error Metrics**:
- Error count by type/route
- Error rate trends
- Error fingerprinting

## 🚨 Default Alert Rules

These alerts are active out-of-the-box:

| Alert | Threshold | Severity | Cooldown |
|-------|-----------|----------|----------|
| High Memory Usage | >90% | CRITICAL | 15 min |
| High Error Rate | >100/min | CRITICAL | 5 min |
| Slow Response Time | >2s (p95) | WARNING | 10 min |
| DB Pool Exhausted | >19/20 | CRITICAL | 5 min |
| Circuit Breaker Open | Any | WARNING | 10 min |
| Low Cache Hit Rate | <70% | WARNING | 30 min |
| Overdue Assessments | >10 | WARNING | 60 min |

**Alert Channels**: Log, Email, Slack, PagerDuty (optional)

## 📈 Monitoring Dashboard

Access the comprehensive monitoring dashboard:

```bash
curl http://localhost:4000/api/v1/monitoring/dashboard | jq
```

Available endpoints:

```bash
GET  /api/v1/monitoring/dashboard        # Complete overview
GET  /api/v1/monitoring/performance      # Performance metrics
GET  /api/v1/monitoring/errors           # Error statistics
GET  /api/v1/monitoring/alerts           # Active alerts
GET  /api/v1/monitoring/business         # Business metrics
GET  /api/v1/monitoring/config/status    # Configuration status
POST /api/v1/monitoring/test/all         # Test all services
POST /api/v1/monitoring/test/sentry      # Test Sentry
POST /api/v1/monitoring/test/slack       # Test Slack
POST /api/v1/monitoring/test/email       # Test Email
```

## 🔍 Troubleshooting

### Sentry Not Working

```bash
# Check DSN is set
echo $SENTRY_DSN

# Test network connectivity
curl -I https://o123456.ingest.sentry.io

# Enable debug mode
SENTRY_DEBUG=true npm start
```

### Slack Not Receiving Alerts

```bash
# Test webhook directly
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test"}' \
  $SLACK_WEBHOOK_URL

# Verify webhook format (should start with https://hooks.slack.com)
echo $SLACK_WEBHOOK_URL
```

### Email Not Sending

```bash
# For Gmail: Verify app password (16 chars, no spaces)
echo $SMTP_PASS | wc -c  # Should be 17 (16 + newline)

# Test SMTP connection
npm install -g smtp-tester
smtp-tester --host $SMTP_HOST --port $SMTP_PORT
```

### Prometheus Not Scraping

```bash
# Check metrics endpoint
curl http://localhost:4000/metrics

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq

# View Prometheus logs
docker logs grc-prometheus
```

### Grafana No Data

```bash
# Test Prometheus data source
curl http://localhost:9090/api/v1/query?query=up

# Check Grafana logs
docker logs grc-grafana

# Verify data source in Grafana UI
# Settings > Data Sources > Prometheus > Test
```

## 💰 Cost Summary

| Service | Free Tier | Paid (Starting) | Recommended |
|---------|-----------|-----------------|-------------|
| Sentry | 5K errors/mo | $26/mo (10K) | Free tier for start |
| Slack | Unlimited webhooks | Free | Free forever |
| SendGrid | 100 emails/day | $19.95/mo (40K) | Free for dev |
| Gmail SMTP | Limited | Free | Dev only |
| Prometheus | Self-hosted | Self-hosted | $0 |
| Grafana | Self-hosted | Self-hosted | $0 |
| ELK Stack | Self-hosted | Self-hosted | $0 |

**Monthly Cost (Minimal Setup)**: $0 (all free tiers)  
**Monthly Cost (Production)**: $26-100 (Sentry + SendGrid + optional services)

## 📚 Next Steps

1. **Create Grafana Dashboards**
   - Import sample dashboards from `grafana/dashboards/`
   - Customize for your needs
   - Share with team

2. **Set Up Alerting**
   - Review default alert thresholds
   - Adjust for your system
   - Create custom alert rules

3. **Configure Log Aggregation**
   - Choose backend (ELK, Datadog, CloudWatch, Loki)
   - Configure log shipping
   - Create log queries and filters

4. **Production Deployment**
   - Set up SSL/HTTPS
   - Configure authentication
   - Set up backup for metrics
   - Configure firewall rules

5. **Team Training**
   - Train ops team on dashboards
   - Document runbooks for alerts
   - Establish on-call rotation

## 📖 Full Documentation

- **Complete Guide**: [MONITORING-SETUP-GUIDE.md](MONITORING-SETUP-GUIDE.md) - Detailed setup for all services
- **Quick Reference**: [MONITORING-QUICK-REFERENCE.md](MONITORING-QUICK-REFERENCE.md) - Common tasks and commands
- **Implementation Report**: [MONITORING-IMPLEMENTATION-REPORT.md](MONITORING-IMPLEMENTATION-REPORT.md) - Technical details

## ❓ Getting Help

**Having issues?**
1. Check [MONITORING-SETUP-GUIDE.md](MONITORING-SETUP-GUIDE.md) troubleshooting section
2. Run configuration test: `curl http://localhost:4000/api/v1/monitoring/config/status`
3. Check service logs: `docker-compose -f docker-compose.monitoring.yml logs`
4. Test individual services with test endpoints

**Still stuck?**
- Review environment variables in `backend/.env`
- Check Docker containers are running: `docker ps`
- Verify network connectivity to external services
- Check firewall/security group settings

---

**Setup Time**: ~15 minutes  
**Difficulty**: Easy to Moderate  
**Dependencies**: Docker, Node.js, npm  
**Support**: See documentation files for detailed help  

🎉 **Ready to monitor your GRC platform!**

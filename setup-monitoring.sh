#!/bin/bash

# ============================================
# GRC Platform Monitoring Setup Script
# ============================================
# This script helps you quickly set up monitoring for the GRC platform
# It guides you through configuration and starts all monitoring services

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Header
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  GRC Platform Monitoring Setup${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✓ Created backend/.env${NC}\n"
fi

# Function to prompt for configuration
prompt_config() {
    local var_name=$1
    local description=$2
    local example=$3
    local current_value=$(grep "^${var_name}=" backend/.env 2>/dev/null | cut -d'=' -f2- || echo "")
    
    echo -e "${BLUE}${description}${NC}"
    if [ -n "$example" ]; then
        echo -e "${YELLOW}Example: ${example}${NC}"
    fi
    if [ -n "$current_value" ]; then
        echo -e "Current value: ${current_value}"
    fi
    read -p "Enter value (or press Enter to skip): " value
    
    if [ -n "$value" ]; then
        # Update or add the variable
        if grep -q "^${var_name}=" backend/.env; then
            # Use @ as delimiter since URLs contain /
            sed -i.bak "s@^${var_name}=.*@${var_name}=${value}@" backend/.env
            rm backend/.env.bak
        else
            echo "${var_name}=${value}" >> backend/.env
        fi
        echo -e "${GREEN}✓ Configured ${var_name}${NC}\n"
    else
        echo -e "${YELLOW}⚠️  Skipped ${var_name}${NC}\n"
    fi
}

# Main configuration flow
echo -e "${BLUE}Let's configure your monitoring services...${NC}\n"

# 1. Sentry Configuration
echo -e "${BLUE}═══ 1. Sentry Error Tracking ═══${NC}"
echo "Sentry provides error tracking and performance monitoring."
echo "Sign up at https://sentry.io (free tier available)"
echo ""
read -p "Do you want to configure Sentry? (y/n): " configure_sentry

if [ "$configure_sentry" = "y" ]; then
    prompt_config "SENTRY_DSN" "Sentry DSN from Project Settings > Client Keys" "https://xxxxx@o123456.ingest.sentry.io/7654321"
    prompt_config "SENTRY_ENVIRONMENT" "Environment name (development/staging/production)" "production"
    prompt_config "SENTRY_RELEASE" "Release version" "1.0.0"
else
    echo -e "${YELLOW}⚠️  Skipped Sentry configuration${NC}\n"
fi

# 2. Slack Configuration
echo -e "${BLUE}═══ 2. Slack Alerts ═══${NC}"
echo "Slack provides real-time alert notifications."
echo "Create webhook at: Your Workspace > Apps > Incoming Webhooks"
echo ""
read -p "Do you want to configure Slack? (y/n): " configure_slack

if [ "$configure_slack" = "y" ]; then
    prompt_config "SLACK_WEBHOOK_URL" "Slack webhook URL" "https://hooks.slack.com/services/T00/B00/XXXX"
else
    echo -e "${YELLOW}⚠️  Skipped Slack configuration${NC}\n"
fi

# 3. Email Configuration
echo -e "${BLUE}═══ 3. Email Alerts (SMTP) ═══${NC}"
echo "Configure SMTP for email alerts."
echo ""
read -p "Do you want to configure Email alerts? (y/n): " configure_email

if [ "$configure_email" = "y" ]; then
    prompt_config "SMTP_HOST" "SMTP host" "smtp.gmail.com"
    prompt_config "SMTP_PORT" "SMTP port" "587"
    prompt_config "SMTP_USER" "SMTP username/email" "your-email@gmail.com"
    prompt_config "SMTP_PASS" "SMTP password (for Gmail, use app password)" ""
    prompt_config "ALERT_EMAIL_FROM" "From email address" "alerts@yourcompany.com"
    prompt_config "ALERT_EMAIL_TO" "To email address(es), comma-separated" "ops@yourcompany.com"
else
    echo -e "${YELLOW}⚠️  Skipped Email configuration${NC}\n"
fi

# 4. Log Aggregation
echo -e "${BLUE}═══ 4. Log Aggregation ═══${NC}"
echo "Choose a log aggregation backend:"
echo "  1) ELK Stack (Elasticsearch, Logstash, Kibana) - Included in docker-compose"
echo "  2) Datadog"
echo "  3) AWS CloudWatch"
echo "  4) Loki (Grafana)"
echo "  5) Skip"
echo ""
read -p "Select option (1-5): " log_backend

case $log_backend in
    1)
        echo -e "${GREEN}✓ ELK Stack will be started with docker-compose${NC}"
        sed -i.bak "s@^LOG_AGGREGATION_ENABLED=.*@LOG_AGGREGATION_ENABLED=true@" backend/.env
        sed -i.bak "s@^LOG_AGGREGATION_BACKEND=.*@LOG_AGGREGATION_BACKEND=elk@" backend/.env
        rm backend/.env.bak
        ;;
    2)
        prompt_config "DATADOG_API_KEY" "Datadog API Key" "xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        prompt_config "DATADOG_SITE" "Datadog site" "datadoghq.com"
        sed -i.bak "s@^LOG_AGGREGATION_ENABLED=.*@LOG_AGGREGATION_ENABLED=true@" backend/.env
        sed -i.bak "s@^LOG_AGGREGATION_BACKEND=.*@LOG_AGGREGATION_BACKEND=datadog@" backend/.env
        rm backend/.env.bak
        ;;
    3)
        prompt_config "AWS_REGION" "AWS Region" "us-east-1"
        prompt_config "AWS_ACCESS_KEY_ID" "AWS Access Key ID" "AKIAXXXXXXXXXXXXXXXX"
        prompt_config "AWS_SECRET_ACCESS_KEY" "AWS Secret Access Key" ""
        prompt_config "CLOUDWATCH_LOG_GROUP" "CloudWatch Log Group" "/grc/application"
        sed -i.bak "s@^LOG_AGGREGATION_ENABLED=.*@LOG_AGGREGATION_ENABLED=true@" backend/.env
        sed -i.bak "s@^LOG_AGGREGATION_BACKEND=.*@LOG_AGGREGATION_BACKEND=cloudwatch@" backend/.env
        rm backend/.env.bak
        ;;
    4)
        echo -e "${GREEN}✓ Loki will be available via docker-compose (uncomment in docker-compose.monitoring.yml)${NC}"
        sed -i.bak "s@^LOG_AGGREGATION_ENABLED=.*@LOG_AGGREGATION_ENABLED=true@" backend/.env
        sed -i.bak "s@^LOG_AGGREGATION_BACKEND=.*@LOG_AGGREGATION_BACKEND=loki@" backend/.env
        rm backend/.env.bak
        ;;
    *)
        echo -e "${YELLOW}⚠️  Skipped log aggregation configuration${NC}\n"
        ;;
esac

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Configuration Summary${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check what's configured
check_config() {
    local var_name=$1
    local value=$(grep "^${var_name}=" backend/.env 2>/dev/null | cut -d'=' -f2-)
    if [ -n "$value" ] && [ "$value" != "your-" ] && [ "$value" != "https://xxxxx" ]; then
        echo -e "${GREEN}✓ ${var_name}${NC}"
        return 0
    else
        echo -e "${RED}✗ ${var_name}${NC}"
        return 1
    fi
}

sentry_configured=0
slack_configured=0
email_configured=0
log_configured=0

check_config "SENTRY_DSN" && sentry_configured=1
check_config "SLACK_WEBHOOK_URL" && slack_configured=1
check_config "SMTP_HOST" && email_configured=1
check_config "LOG_AGGREGATION_BACKEND" && log_configured=1

echo ""

# Docker Compose
echo -e "${BLUE}═══ Starting Monitoring Stack ═══${NC}"
echo "This will start:"
echo "  - Prometheus (metrics) on http://localhost:9090"
echo "  - Grafana (dashboards) on http://localhost:3001"
if [ "$log_backend" = "1" ]; then
    echo "  - Elasticsearch on http://localhost:9200"
    echo "  - Kibana (logs) on http://localhost:5601"
fi
echo ""
read -p "Start monitoring stack with docker-compose? (y/n): " start_docker

if [ "$start_docker" = "y" ]; then
    echo -e "${BLUE}Starting monitoring services...${NC}"
    docker-compose -f docker-compose.monitoring.yml up -d
    
    echo ""
    echo -e "${GREEN}✓ Monitoring stack started!${NC}\n"
    
    echo "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    echo -e "\n${BLUE}Service Status:${NC}"
    
    if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Prometheus is running${NC}"
    else
        echo -e "${YELLOW}⚠️  Prometheus may still be starting...${NC}"
    fi
    
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Grafana is running${NC}"
    else
        echo -e "${YELLOW}⚠️  Grafana may still be starting...${NC}"
    fi
    
    if [ "$log_backend" = "1" ]; then
        if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Elasticsearch is running${NC}"
        else
            echo -e "${YELLOW}⚠️  Elasticsearch may still be starting...${NC}"
        fi
    fi
fi

# Install dependencies
echo ""
echo -e "${BLUE}═══ Installing Backend Dependencies ═══${NC}"
read -p "Install monitoring dependencies (prom-client, nodemailer)? (y/n): " install_deps

if [ "$install_deps" = "y" ]; then
    cd backend
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install prom-client nodemailer @sentry/node @sentry/tracing axios
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    cd ..
fi

# Test configuration
echo ""
echo -e "${BLUE}═══ Testing Configuration ═══${NC}"
read -p "Start backend server and test monitoring? (y/n): " test_config

if [ "$test_config" = "y" ]; then
    echo -e "${BLUE}Starting backend server...${NC}"
    cd backend
    npm run build
    npm start &
    SERVER_PID=$!
    cd ..
    
    echo "Waiting for server to start..."
    sleep 5
    
    echo ""
    echo -e "${BLUE}Running tests...${NC}\n"
    
    # Test metrics endpoint
    if curl -s http://localhost:4000/metrics > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Metrics endpoint working${NC}"
    else
        echo -e "${RED}✗ Metrics endpoint not responding${NC}"
    fi
    
    # Test configuration endpoint
    echo ""
    echo -e "${BLUE}Configuration status:${NC}"
    curl -s http://localhost:4000/api/v1/monitoring/config/status | python3 -m json.tool || echo "Could not fetch config status"
    
    # Optional: Run integration tests
    echo ""
    read -p "Run integration tests for configured services? (y/n): " run_tests
    
    if [ "$run_tests" = "y" ]; then
        echo ""
        if [ $sentry_configured -eq 1 ]; then
            echo -e "${BLUE}Testing Sentry...${NC}"
            curl -X POST http://localhost:4000/api/v1/monitoring/test/sentry
            echo ""
        fi
        
        if [ $slack_configured -eq 1 ]; then
            echo -e "${BLUE}Testing Slack...${NC}"
            curl -X POST http://localhost:4000/api/v1/monitoring/test/slack
            echo ""
        fi
        
        if [ $email_configured -eq 1 ]; then
            echo -e "${BLUE}Testing Email...${NC}"
            curl -X POST http://localhost:4000/api/v1/monitoring/test/email
            echo ""
        fi
    fi
    
    # Stop server
    echo ""
    read -p "Stop backend server? (y/n): " stop_server
    if [ "$stop_server" = "y" ]; then
        kill $SERVER_PID 2>/dev/null || true
        echo -e "${GREEN}✓ Server stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  Server still running (PID: $SERVER_PID)${NC}"
    fi
fi

# Final instructions
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${GREEN}Next Steps:${NC}\n"

echo "1. Access monitoring services:"
echo "   - Prometheus: http://localhost:9090"
echo "   - Grafana: http://localhost:3001 (admin/admin)"
if [ "$log_backend" = "1" ]; then
    echo "   - Kibana: http://localhost:5601"
fi
echo "   - Backend Metrics: http://localhost:4000/metrics"
echo "   - Monitoring Dashboard: http://localhost:4000/api/v1/monitoring/dashboard"
echo ""

echo "2. Configure Grafana:"
echo "   - Login to Grafana (admin/admin)"
echo "   - Prometheus data source should be auto-configured"
echo "   - Import dashboards from grafana/dashboards/"
echo ""

echo "3. View logs:"
if [ "$log_backend" = "1" ]; then
    echo "   - Open Kibana: http://localhost:5601"
    echo "   - Create index pattern: grc-logs-*"
    echo "   - View logs in Discover tab"
fi
echo ""

echo "4. Documentation:"
echo "   - Setup Guide: MONITORING-SETUP-GUIDE.md"
echo "   - Quick Reference: MONITORING-QUICK-REFERENCE.md"
echo "   - Implementation Report: MONITORING-IMPLEMENTATION-REPORT.md"
echo ""

echo "5. Production deployment:"
echo "   - Review and adjust alert thresholds in backend/.env"
echo "   - Set up SSL certificates for HTTPS"
echo "   - Configure authentication for Grafana"
echo "   - Set up backup for Prometheus data"
echo "   - Configure firewall rules"
echo ""

if [ $sentry_configured -eq 0 ] || [ $slack_configured -eq 0 ] || [ $email_configured -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: Some services are not configured${NC}"
    echo "You can configure them later by editing backend/.env"
    echo "Then restart the backend server to apply changes"
    echo ""
fi

echo -e "${GREEN}🎉 Monitoring setup complete!${NC}"
echo ""

#!/bin/bash

# Railway Environment Variables Setup Helper
# This script helps you set up environment variables for Railway deployment

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Railway Environment Variables Checklist
echo "\n==== Railway Environment Variables Checklist ===="

echo "\n[Backend]"
echo "DATABASE_URL=    # (Railway PostgreSQL connection string, auto-set if using Railway DB)"
echo "JWT_SECRET=      # (Set a secure random value, min 32 chars)"
echo "NODE_ENV=production"
echo "CORS_ORIGIN=https://<your-frontend-url>.railway.app"
echo "AI_SERVICE_URL=https://<your-ai-service-url>.railway.app"
echo "# (No need to set PORT, Railway injects it)"

echo "\n[AI Service]"
echo "CORS_ORIGINS=https://<your-frontend-url>.railway.app,https://<your-backend-url>.railway.app"
echo "BACKEND_URL=https://<your-backend-url>.railway.app"
echo "# (No need to set PORT, Railway injects it)"

echo "\n[Frontend]"
echo "VITE_API_URL=https://<your-backend-url>.railway.app"
echo "VITE_AI_SERVICE_URL=https://<your-ai-service-url>.railway.app"
echo "# (No need to set PORT, Railway injects it)"

echo "\nAfter setting these, redeploy each service in Railway."
echo "If you change any variable, trigger a redeploy for that service!"
echo "\n==== End Checklist ===="

echo -e "${BLUE}🚂 Railway Environment Variables Setup${NC}"
echo "=========================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    echo "Install it with: npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway${NC}"
    echo "Please run: railway login"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI is ready${NC}"
echo ""

# Function to set variable
set_variable() {
    local key=$1
    local default=$2
    local description=$3
    
    echo -e "${YELLOW}Setting: ${key}${NC}"
    echo "Description: ${description}"
    
    if [ -n "$default" ]; then
        echo "Default: ${default}"
    fi
    
    read -p "Enter value (or press Enter to skip): " value
    
    if [ -n "$value" ]; then
        railway variables set "${key}=${value}"
        echo -e "${GREEN}✅ Set ${key}${NC}"
    else
        echo -e "${YELLOW}⏭️  Skipped ${key}${NC}"
    fi
    echo ""
}

# Main menu
echo "Which service do you want to configure?"
echo "1) Backend"
echo "2) Frontend"
echo "3) AI Service"
echo "4) All services"
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo -e "${BLUE}Configuring Backend Service${NC}"
        echo ""
        set_variable "JWT_SECRET" "" "Secret key for JWT tokens (min 32 chars)"
        set_variable "JWT_EXPIRES_IN" "7d" "JWT token expiration time"
        set_variable "NODE_ENV" "production" "Node environment"
        set_variable "CORS_ORIGIN" "" "Frontend URL for CORS"
        set_variable "AI_SERVICE_URL" "" "AI Service URL"
        ;;
    2)
        echo -e "${BLUE}Configuring Frontend Service${NC}"
        echo ""
        set_variable "VITE_API_URL" "" "Backend API URL"
        set_variable "VITE_AI_SERVICE_URL" "" "AI Service URL"
        ;;
    3)
        echo -e "${BLUE}Configuring AI Service${NC}"
        echo ""
        set_variable "BACKEND_URL" "" "Backend API URL"
        set_variable "ENVIRONMENT" "production" "Environment"
        ;;
    4)
        echo -e "${RED}Please configure each service individually${NC}"
        echo "Run this script 3 times, once for each service"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Environment variables configuration complete!${NC}"
echo ""
echo "To view all variables: railway variables"
echo "To delete a variable: railway variables delete KEY"
echo ""

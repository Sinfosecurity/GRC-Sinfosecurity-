#!/bin/bash

# Railway Deployment Helper Script
# This script helps verify and prepare your project for Railway deployment

set -e

echo "🚂 Railway Deployment Preparation for GRC Platform"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
echo "📦 Checking Railway CLI installation..."
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}⚠️  Railway CLI not found${NC}"
    echo "Install it with: npm install -g @railway/cli"
    echo "Or with homebrew: brew install railway"
    exit 1
else
    echo -e "${GREEN}✅ Railway CLI is installed${NC}"
fi

# Check if logged in
echo ""
echo "🔐 Checking Railway authentication..."
if railway whoami &> /dev/null; then
    echo -e "${GREEN}✅ Logged in to Railway${NC}"
    railway whoami
else
    echo -e "${YELLOW}⚠️  Not logged in to Railway${NC}"
    echo "Please run: railway login"
    exit 1
fi

# Check project structure
echo ""
echo "📁 Verifying project structure..."

REQUIRED_DIRS=("backend" "frontend" "ai-service")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ Found $dir/${NC}"
    else
        echo -e "${RED}❌ Missing $dir/${NC}"
        exit 1
    fi
done

# Check for configuration files
echo ""
echo "⚙️  Checking configuration files..."

CONFIG_FILES=(
    "backend/railway.json"
    "backend/nixpacks.toml"
    "frontend/railway.json"
    "frontend/nixpacks.toml"
    "ai-service/railway.json"
    "ai-service/nixpacks.toml"
)

for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ Found $file${NC}"
    else
        echo -e "${YELLOW}⚠️  Missing $file${NC}"
    fi
done

# Check package.json files
echo ""
echo "📦 Checking package.json files..."

if [ -f "backend/package.json" ]; then
    echo -e "${GREEN}✅ Backend package.json exists${NC}"
else
    echo -e "${RED}❌ Missing backend/package.json${NC}"
    exit 1
fi

if [ -f "frontend/package.json" ]; then
    echo -e "${GREEN}✅ Frontend package.json exists${NC}"
else
    echo -e "${RED}❌ Missing frontend/package.json${NC}"
    exit 1
fi

if [ -f "ai-service/requirements.txt" ]; then
    echo -e "${GREEN}✅ AI service requirements.txt exists${NC}"
else
    echo -e "${RED}❌ Missing ai-service/requirements.txt${NC}"
    exit 1
fi

# Check for Prisma schema
echo ""
echo "🗄️  Checking database configuration..."

if [ -f "backend/prisma/schema.prisma" ]; then
    echo -e "${GREEN}✅ Prisma schema found${NC}"
else
    echo -e "${YELLOW}⚠️  No Prisma schema found${NC}"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}🎉 Pre-deployment checks completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Create a new Railway project: railway init"
echo "2. Link to your project: railway link"
echo "3. Add PostgreSQL database in Railway dashboard"
echo "4. Deploy services using Railway dashboard or:"
echo "   - cd backend && railway up"
echo "   - cd frontend && railway up"
echo "   - cd ai-service && railway up"
echo ""
echo "📖 Full guide: See RAILWAY-DEPLOYMENT.md"
echo ""

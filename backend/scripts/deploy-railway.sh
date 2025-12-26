#!/bin/bash

# ==============================================
# Deploy GRC Backend to Railway
# ==============================================

set -e

echo "🚂 Deploying to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found!"
    echo "📦 Install it: npm install -g @railway/cli"
    echo "🔗 Or visit: https://docs.railway.app/develop/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway first:"
    railway login
fi

echo "📋 Current Railway projects:"
railway list

echo ""
echo "🎯 Linking to Railway project..."
railway link

echo ""
echo "🗄️  Setting up PostgreSQL..."
railway add --plugin postgres

echo ""
echo "🔧 Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set DEV_MODE=false
railway variables set API_VERSION=v1

echo ""
echo "📝 Please set these variables manually in Railway dashboard:"
echo "   - JWT_SECRET (generate a secure random string)"
echo "   - CORS_ORIGIN (your frontend URL)"
echo "   - EMAIL_SERVICE credentials"
echo ""
read -p "Press Enter after setting variables in Railway dashboard..."

echo ""
echo "🚀 Deploying application..."
railway up

echo ""
echo "✅ Deployment complete!"
echo "🔗 Your backend URL: $(railway domain)"
echo ""
echo "📊 Monitor logs: railway logs"
echo "🖥️  Open dashboard: railway open"


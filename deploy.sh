#!/bin/bash

echo "🚀 GRC Platform - Quick Deploy"
echo ""
echo "This script will help you deploy to Vercel + Railway"
echo ""

# Check if user has accounts
echo "Prerequisites:"
echo "1. Vercel account (https://vercel.com)"
echo "2. Railway account (https://railway.app)"
echo "3. GitHub repository with this code"
echo ""
read -p "Have you completed the prerequisites? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Please complete prerequisites first. See vercel-deployment.md for details."
    exit 1
fi

# Deploy Frontend to Vercel
echo ""
echo "📦 Deploying Frontend to Vercel..."
echo ""
cd frontend

if ! command -v vercel &> /dev/null
then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

echo "Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Frontend deployed!"
echo ""
echo "Next steps:"
echo "1. Deploy backend to Railway: https://railway.app"
echo "2. Add databases (PostgreSQL, MongoDB, Redis)"
echo "3. Set environment variables in Railway"
echo "4. Copy backend URL from Railway"
echo "5. Add VITE_API_URL to Vercel environment variables"
echo "6. Redeploy frontend"
echo ""
echo "See vercel-deployment.md for detailed instructions."

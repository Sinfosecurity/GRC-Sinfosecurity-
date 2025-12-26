#!/bin/bash

# ==============================================
# GRC Platform - Database Setup Script
# ==============================================

set -e

echo "🚀 Setting up GRC Platform Database..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please update DATABASE_URL and other secrets!"
    exit 1
fi

# Load environment variables
source .env

echo "📦 Installing dependencies..."
npm install

echo "🔧 Generating Prisma Client..."
npx prisma generate

echo "🗄️  Running database migrations..."
npx prisma migrate dev --name init

echo "🌱 Seeding database with demo data..."
npx ts-node prisma/seed.ts

echo "✅ Database setup complete!"
echo ""
echo "📊 You can now:"
echo "   1. View database: npx prisma studio"
echo "   2. Start server: npm run dev"
echo ""


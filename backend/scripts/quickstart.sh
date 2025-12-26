#!/bin/bash

# ==============================================
# Quick Start Script for GRC Backend
# ==============================================

echo "🚀 GRC Platform Backend - Quick Start"
echo "======================================"
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cat > .env << 'EOF'
NODE_ENV=development
PORT=4000
API_VERSION=v1
DEV_MODE=true

# Local development (no real database needed in dev mode)
DATABASE_URL=postgresql://localhost:5432/grc_dev

# JWT Secrets (dev only - change in production!)
JWT_SECRET=dev-secret-key-not-for-production
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=debug
EOF
    echo "✅ Created .env file"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Generate Prisma Client
echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Create logs directory
mkdir -p logs

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Development mode (no database): npm run dev"
echo "   2. With database: Set DATABASE_URL in .env, then:"
echo "      - Run migrations: npx prisma migrate dev"
echo "      - Seed data: npx ts-node prisma/seed.ts"
echo "      - Start server: npm run dev"
echo ""
echo "📊 Useful commands:"
echo "   - View database: npx prisma studio"
echo "   - Build for production: npm run build"
echo "   - Run production: npm start"
echo ""
echo "🔗 API will be available at: http://localhost:4000/api/v1"
echo "💚 Health check: http://localhost:4000/health"
echo ""


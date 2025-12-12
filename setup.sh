#!/bin/bash

echo "🚀 Setting up GRC Platform..."
echo ""

# Check prerequisites
echo "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 is required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }

echo "✅ All prerequisites found"
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend && npm install
cd ..
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install
cd ..
echo ""

# Install AI service dependencies
echo "📦 Installing AI service dependencies..."
cd ai-service && pip3 install -r requirements.txt
cd ..
echo ""

# Start database services
echo "🐳 Starting database services with Docker..."
docker-compose up -d
echo ""

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
sleep 10
echo ""

# Setup environment files
echo "📝 Setting up environment files..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env from example"
fi

if [ ! -f ai-service/.env ]; then
    cp ai-service/.env.example ai-service/.env
    echo "✅ Created ai-service/.env from example"
fi
echo ""

# Run database migrations
echo "🗄️  Running database migrations..."
cd backend
npx prisma generate
npx prisma db push
cd ..
echo ""

echo "✅ Setup complete!"
echo ""
echo "🎉 You can now start the development servers:"
echo "   npm run dev"
echo ""
echo "Or start services individually:"
echo "   Frontend:  cd frontend && npm run dev"
echo "   Backend:   cd backend && npm run dev"
echo "   AI Service: cd ai-service && python3 main.py"
echo ""
echo "📊 Access the application at:"
echo "   Frontend:   http://localhost:3000"
echo "   Backend API: http://localhost:4000"
echo "   AI Service:  http://localhost:5000"
echo ""

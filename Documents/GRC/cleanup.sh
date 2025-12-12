#!/bin/bash

echo "🧹 Cleaning up GRC Platform..."
echo ""

# Stop Docker containers
echo "Stopping Docker containers..."
docker-compose down

# Remove node_modules
echo "Removing node_modules..."
rm -rf node_modules frontend/node_modules backend/node_modules

# Remove Python virtual env if exists
if [ -d "ai-service/venv" ]; then
    echo "Removing Python virtual environment..."
    rm -rf ai-service/venv
fi

# Remove build directories
echo "Removing build directories..."
rm -rf frontend/dist backend/dist

# Remove generated Prisma client
echo "Removing generated Prisma client..."
rm -rf backend/node_modules/.prisma backend/node_modules/@prisma/client

# Remove logs
echo "Removing logs..."
rm -rf backend/logs/*.log

echo ""
echo "✅ Cleanup complete!"
echo "Run ./setup.sh to reinstall everything."

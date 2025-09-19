#!/bin/bash

# Proctoring System Development Startup Script

echo "🚀 Starting Proctoring System Development Environment..."

# Check if required tools are installed
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    fi
}

echo "📋 Checking prerequisites..."
check_command "node"
check_command "npm"
check_command "python3"
check_command "pip"

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first."
    echo "   On macOS: brew services start mongodb-community"
    echo "   On Ubuntu: sudo systemctl start mongod"
    echo "   Or use Docker: docker run -d -p 27017:27017 mongo"
fi

# Create .env files if they don't exist
echo "📝 Setting up environment files..."

if [ ! -f "server/.env" ]; then
    cp server/env.example server/.env
    echo "✅ Created server/.env"
fi

if [ ! -f "app/.env" ]; then
    cp app/env.example app/.env
    echo "✅ Created app/.env"
fi

# Install dependencies
echo "📦 Installing dependencies..."

echo "Installing backend dependencies..."
cd server
npm install
cd ..

echo "Installing Python dependencies..."
cd app
pip install -r requirements.txt
cd ..

echo "Installing frontend dependencies..."
cd client
npm install
cd ..

echo "🎉 Setup complete!"
echo ""
echo "To start the development environment:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd server && npm run dev"
echo ""
echo "Terminal 2 - Python ML Service:"
echo "  cd app && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "Terminal 3 - Frontend:"
echo "  cd client && npm run dev"
echo ""
echo "Then open http://localhost:5173 in your browser"
echo ""
echo "Or use Docker Compose for easier setup:"
echo "  docker-compose up -d"

#!/bin/bash

# Render Deployment Script for TinyTots
# This script prepares the project for Render deployment

set -e

echo "🚀 Preparing TinyTots for Render deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "client" ]; then
    print_error "Please run this script from the TinyTots project root directory"
    exit 1
fi

print_status "Installing root dependencies..."
npm install

print_status "Installing server dependencies..."
cd server
npm install
cd ..

print_status "Installing client dependencies..."
cd client
npm install
cd ..

print_status "Building client for production..."
cd client
npm run build:prod
cd ..

print_status "Creating deployment directories..."
mkdir -p server/uploads
mkdir -p server/logs

print_status "Setting up environment variables template..."
cat > server/.env.example << EOF
# Server Environment Variables
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tinytots
JWT_SECRET=your-super-secure-jwt-secret-here
CORS_ORIGIN=https://your-frontend-url.vercel.app
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MIN=15
EOF

print_status "✅ TinyTots is ready for Render deployment!"
print_status ""
print_status "Next steps:"
print_status "1. Push this code to GitHub"
print_status "2. Connect your repo to Render"
print_status "3. Use these settings in Render:"
print_status "   - Build Command: npm install && cd server && npm install"
print_status "   - Start Command: cd server && npm start"
print_status "   - Root Directory: (leave empty)"
print_status "4. Set environment variables in Render dashboard"
print_status "5. Deploy and test your application"
print_status ""
print_status "For detailed instructions, see RENDER_DEPLOYMENT_GUIDE.md"

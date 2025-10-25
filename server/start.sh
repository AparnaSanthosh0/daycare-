#!/bin/bash
# Production startup script for TinyTots
# This script ensures proper environment setup

echo "🚀 Starting TinyTots Production Server..."

# Check if NODE_ENV is set
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
    echo "📝 Set NODE_ENV=production"
fi

# Check if MONGODB_URI is set
if [ -z "$MONGODB_URI" ]; then
    echo "⚠️  WARNING: MONGODB_URI not set. Server will start without database."
fi

# Check if JWT_SECRET is set
if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  WARNING: JWT_SECRET not set. Using fallback secret (NOT SECURE FOR PRODUCTION)."
fi

# Start the server
echo "🎯 Starting Node.js server..."
node index.js

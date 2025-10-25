#!/bin/bash

# Production Build Script for TinyTots
# This script builds and prepares the application for production deployment

set -e  # Exit on any error

echo "🚀 Starting TinyTots Production Build..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js version is compatible
check_node_version() {
    print_status "Checking Node.js version..."
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
        print_status "Node.js version $NODE_VERSION is compatible"
    else
        print_error "Node.js version $NODE_VERSION is not compatible. Required: >= $REQUIRED_VERSION"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Root dependencies
    npm install --production=false
    
    # Server dependencies
    cd server
    npm install --production=false
    cd ..
    
    # Client dependencies
    cd client
    npm install --production=false
    cd ..
    
    print_status "Dependencies installed successfully"
}

# Build client
build_client() {
    print_status "Building client for production..."
    cd client
    
    # Set production environment variables
    export NODE_ENV=production
    export GENERATE_SOURCEMAP=false
    
    # Run production build
    npm run build:prod
    
    cd ..
    print_status "Client build completed"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Test server
    cd server
    npm run test:ci
    cd ..
    
    # Test client
    cd client
    npm run test:ci
    cd ..
    
    print_status "All tests passed"
}

# Create production directories
create_directories() {
    print_status "Creating production directories..."
    
    mkdir -p logs
    mkdir -p server/uploads
    mkdir -p server/uploads/certificates
    mkdir -p server/uploads/child_photos
    mkdir -p server/uploads/children
    mkdir -p server/uploads/products
    mkdir -p server/uploads/profile_images
    mkdir -p server/uploads/vendor_licenses
    
    print_status "Production directories created"
}

# Set permissions
set_permissions() {
    print_status "Setting file permissions..."
    
    chmod 755 server/uploads
    chmod 755 logs
    
    print_status "Permissions set"
}

# Main build process
main() {
    print_status "Starting TinyTots Production Build Process"
    
    check_node_version
    install_dependencies
    run_tests
    build_client
    create_directories
    set_permissions
    
    print_status "✅ Production build completed successfully!"
    print_status "Ready for deployment to Vercel (frontend) and Railway/Render (backend)"
}

# Run main function
main "$@"

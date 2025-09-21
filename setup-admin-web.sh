#!/bin/bash

# Safire Admin Web Panel Setup Script
echo "🚀 Setting up Safire Admin Web Panel..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Navigate to admin-web directory
if [ ! -d "admin-web" ]; then
    echo "❌ admin-web directory not found. Please run this script from the project root."
    exit 1
fi

cd admin-web

echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "🔧 Setting up Firebase configuration..."
if [ ! -f "src/firebase.js" ]; then
    echo "❌ Firebase configuration not found. Please ensure src/firebase.js exists."
    exit 1
fi

echo "✅ Firebase configuration found"

echo ""
echo "🎉 Setup complete! To start the admin panel:"
echo ""
echo "   cd admin-web"
echo "   npm start"
echo ""
echo "📖 The admin panel will open at http://localhost:3000"
echo "🔐 Make sure you have admin or super_admin role in Firestore to access the panel"
echo ""
echo "📚 Read admin-web/README.md for detailed setup instructions"

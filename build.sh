#!/bin/bash

# Build script for up-actions TypeScript project

echo "🚀 Building up-actions TypeScript project..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Build TypeScript
echo "🔨 Compiling TypeScript..."
pnpm run build

# Package with ncc
echo "📦 Packaging with ncc..."
pnpm run package

echo "✅ Build completed successfully!"
echo "📁 Output files are in the dist/ directory"

# Show the build size
if [ -f "dist/index.js" ]; then
    SIZE=$(du -h dist/index.js | cut -f1)
    echo "📊 Bundle size: $SIZE"
fi
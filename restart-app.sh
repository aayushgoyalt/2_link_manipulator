#!/bin/bash

echo "🛑 Stopping Electron app..."
killall Electron 2>/dev/null || echo "No Electron process found"

echo "🧹 Cleaning build artifacts..."
rm -rf out/

echo "🔨 Building fresh..."
npm run build

echo "🚀 Starting app..."
npm run dev

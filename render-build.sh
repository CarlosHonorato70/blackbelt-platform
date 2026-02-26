#!/bin/bash
# render-build.sh - Script de build para Render
# Este script é executado automaticamente pelo Render durante o deploy

set -e  # Exit on error

echo "🚀 Starting Render build process..."

# 1. Verificar Node.js version
echo "📦 Node.js version:"
node --version

# 2. Verificar npm/pnpm
echo "📦 Package manager:"
if command -v pnpm &> /dev/null; then
    echo "Using pnpm"
    pnpm --version
else
    echo "pnpm not found, installing..."
    npm install -g pnpm@10.4.1
    pnpm --version
fi

# 3. Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# 4. Build application
echo "🔨 Building application..."
pnpm build

# 5. Verificar se o build foi bem-sucedido
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found after build"
    exit 1
fi

if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: dist/index.js not found after build"
    exit 1
fi

echo "✅ Build completed successfully!"
echo "📊 Build output:"
ls -lh dist/

# 6. Database migrations serão executadas no startup (server/index.ts)
echo "ℹ️  Database migrations will run automatically on startup"

echo "🎉 Render build process completed!"

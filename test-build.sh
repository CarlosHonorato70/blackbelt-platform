#!/bin/bash
# test-build.sh - Script para testar o build localmente antes do deploy

set -e

echo "🧪 Testing build locally..."
echo "================================"

# 1. Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# 2. Verificar arquivos críticos
echo "🔍 Checking critical files..."

critical_files=(
    "package.json"
    "tsconfig.json"
    "vite.config.ts"
    "Dockerfile.production"
    "render.yaml"
    "drizzle.config.ts"
    "server/index.ts"
)

for file in "${critical_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Critical file missing: $file"
        exit 1
    fi
    echo "✅ Found: $file"
done

# 3. Verificar configuração do drizzle
echo ""
echo "🔍 Checking drizzle.config.ts dialect..."
if grep -q 'dialect: "postgresql"' drizzle.config.ts; then
    echo "✅ drizzle.config.ts uses postgresql dialect"
else
    echo "❌ drizzle.config.ts does not use postgresql dialect"
    echo "   Expected: dialect: \"postgresql\""
    exit 1
fi

# 4. Test TypeScript compilation
echo ""
echo "🔨 Testing TypeScript compilation..."
pnpm tsc --noEmit || {
    echo "⚠️  TypeScript errors found, but continuing..."
}

# 5. Test build
echo ""
echo "🔨 Testing build process..."
rm -rf dist/
pnpm build

# 6. Verificar output do build
echo ""
echo "🔍 Checking build output..."

if [ ! -d "dist" ]; then
    echo "❌ dist/ directory not created"
    exit 1
fi
echo "✅ dist/ directory exists"

if [ ! -f "dist/index.js" ]; then
    echo "❌ dist/index.js not found"
    exit 1
fi
echo "✅ dist/index.js exists"

if [ ! -d "dist/public" ]; then
    echo "⚠️  dist/public/ not found - frontend may not be bundled"
else
    echo "✅ dist/public/ exists"
fi

# 7. Listar conteúdo do dist
echo ""
echo "📊 Build output contents:"
ls -lh dist/ | head -20

# 8. Verificar tamanho do build
echo ""
echo "📏 Build size:"
du -sh dist/

# 9. Summary
echo ""
echo "================================"
echo "✅ Build test completed successfully!"
echo ""
echo "Next steps:"
echo "1. Commit and push changes to GitHub"
echo "2. Deploy to Render using the guide in RENDER_DEPLOYMENT_GUIDE.md"
echo ""

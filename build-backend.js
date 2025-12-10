import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

console.log('🔨 Building backend...');

// Copia recursivamente a pasta drizzle
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
      console.log(`✓ Copiado: ${srcPath}`);
    }
  }
}

try {
  // Build do servidor
  await build({
    entryPoints: ['server/index.ts'],
    bundle: false,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    outdir: 'dist',
    sourcemap: true,
    logLevel: 'info'
  });

  // Copia a pasta drizzle inteira
  copyDir('drizzle', 'dist/drizzle');
  copyDir('server', 'dist/server');

  console.log('✅ Backend build completed!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}

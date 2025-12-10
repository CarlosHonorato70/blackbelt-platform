import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

console.log('🔨 Building backend...');

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
  // Build apenas do index.ts
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

  // Build dos outros arquivos principais
  await build({
    entryPoints: ['server/routes.ts', 'server/vite.ts', 'server/db.ts'],
    bundle: false,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    outdir: 'dist',
    sourcemap: true,
    logLevel: 'info'
  });

  // Copia pastas completas
  copyDir('drizzle', 'dist/drizzle');
  
  // Copia subpastas do server
  if (existsSync('server/_core')) copyDir('server/_core', 'dist/_core');
  if (existsSync('server/routers')) copyDir('server/routers', 'dist/routers');
  if (existsSync('server/data')) copyDir('server/data', 'dist/data');
  if (existsSync('server/__tests__')) copyDir('server/__tests__', 'dist/__tests__');

  // Copia arquivos individuais do server
  const serverFiles = ['storage.ts', 'routers.ts'];
  serverFiles.forEach(file => {
    const src = join('server', file);
    const dest = join('dist', file.replace('.ts', '.js'));
    if (existsSync(src)) {
      copyFileSync(src, dest);
      console.log(`✓ Copiado: ${src} → ${dest}`);
    }
  });

  console.log('✅ Backend build completed!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}

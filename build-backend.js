import { build } from 'esbuild';
import { copyFile, mkdir, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔨 Building backend...');

// Plugin para resolver aliases @/ e @/_core
const aliasPlugin = {
  name: 'alias',
  setup(build) {
    build.onResolve({ filter: /^@\/_core/ }, args => {
      return { path: join(__dirname, 'server/_core', args.path.replace('@/_core', '')), external: false };
    });
    build.onResolve({ filter: /^@\// }, args => {
      return { path: join(__dirname, args.path.replace('@/', '')), external: false };
    });
  }
};

// Build dos arquivos principais
await build({
  entryPoints: ['server/index.ts'],
  bundle: false,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outdir: 'dist',
  plugins: [aliasPlugin],
  external: [
    'express',
    'vite',
    'drizzle-orm',
    'postgres',
    '@trpc/server',
    'zod',
    'bcryptjs',
    'jsonwebtoken',
    'nodemailer',
    'stripe',
    'mercadopago',
    '@aws-sdk/*',
    'helmet',
    'cors',
    'express-rate-limit',
    'express-slow-down'
  ]
});

// Build dos módulos auxiliares
await build({
  entryPoints: ['server/routes.ts', 'server/vite.ts', 'server/db.ts'],
  bundle: false,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outdir: 'dist',
  plugins: [aliasPlugin]
});

console.log('✓ Copiando arquivos auxiliares...');

// Copia arquivos necessários
async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
      console.log(`✓ Copiado: ${srcPath} → ${destPath}`);
    }
  }
}

// Copia diretórios necessários
await copyDir('drizzle', 'dist/drizzle');
await copyDir('server/_core', 'dist/server/_core');
await copyDir('server/routers', 'dist/server/routers');
await copyDir('server/data', 'dist/server/data');
await copyDir('server/__tests__', 'dist/server/__tests__');

// Copia arquivos individuais
await copyFile('server/storage.ts', 'dist/storage.js');
await copyFile('server/routers.ts', 'dist/routers.js');

console.log('✅ Backend build completed!');

import { build } from 'esbuild';
import { copyFile, mkdir, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔨 Building backend...');

// Build do index.ts com bundle para resolver aliases
await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: 'dist/index.js',
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
    'express-slow-down',
    'better-sqlite3',
    'pg-native',
    'dotenv',
    'dotenv/config',
    'pdfkit',
    '@babel/*',
    '../drizzle/db',
    './drizzle/db',
  ],
  alias: {
    '@/_core': './server/_core',
    '@': '.'
  }
});

// Build dos módulos auxiliares SEM bundle
await build({
  entryPoints: ['server/routes.ts', 'server/vite.ts', 'server/db.ts'],
  bundle: false,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outdir: 'dist'
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
      console.log(`✓ Copiado: ${srcPath}`);
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

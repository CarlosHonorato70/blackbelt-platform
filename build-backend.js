import { build } from 'esbuild';
import { copyFile, mkdir, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔨 Building backend...');

// Build do index.ts com bundle
// packages: 'external' externaliza TODOS os imports de node_modules automaticamente.
// Isso evita problemas de CommonJS→ESM ao empacotar pacotes como winston, @sentry, etc.
// O Node.js resolve esses imports em runtime via node_modules copiado no Dockerfile.
await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: 'dist/index.js',
  packages: 'external',
  alias: {
    '@/_core': './server/_core',
    '@': '.',
  },
  // Resolver paths relativos
  resolveExtensions: ['.ts', '.js', '.json'],
});

// Build dos módulos auxiliares SEM bundle
await build({
  entryPoints: ['server/routes.ts', 'server/vite.ts', 'server/db.ts'],
  bundle: false,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outdir: 'dist',
});

console.log('✓ Copiando arquivos auxiliares...');

// Função para copiar diretórios recursivamente
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
// Nota: server/__tests__ NAO e copiado para producao

// Copia arquivos individuais
await copyFile('server/storage.ts', 'dist/storage.js');
await copyFile('server/routers.ts', 'dist/routers.js');

console.log('✅ Backend build completed!');

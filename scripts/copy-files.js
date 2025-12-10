import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Copia arquivos necessários para o build
const filesToCopy = [
  { from: 'drizzle', to: 'dist/drizzle' },
  { from: 'db', to: 'dist/db' }
];

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`⚠️ Pasta não encontrada: ${src} - pulando...`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✓ Copiado: ${srcPath} → ${destPath}`);
    }
  }
}

filesToCopy.forEach(({ from, to }) => {
  const srcPath = path.join(rootDir, from);
  const destPath = path.join(rootDir, to);
  copyRecursive(srcPath, destPath);
});

console.log('✅ Arquivos copiados com sucesso!');

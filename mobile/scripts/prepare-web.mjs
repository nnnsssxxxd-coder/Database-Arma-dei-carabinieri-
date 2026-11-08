import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(here, '..');
const repoRoot = path.resolve(mobileRoot, '..');
const destinationDir = path.join(mobileRoot, 'www');

await mkdir(destinationDir, { recursive: true });
for (const file of ['index.html', 'app-icon.svg', 'manifest.webmanifest']) {
  await copyFile(path.join(repoRoot, file), path.join(destinationDir, file));
  console.log(`Asset sincronizzato: ${file}`);
}
console.log('App web bundle sincronizzato con il sito principale.');

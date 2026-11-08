import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(here, '..');
const repoRoot = path.resolve(mobileRoot, '..');
const source = path.join(repoRoot, 'index.html');
const destinationDir = path.join(mobileRoot, 'www');
const destination = path.join(destinationDir, 'index.html');

await mkdir(destinationDir, { recursive: true });
await copyFile(source, destination);
console.log('App web bundle aggiornato dal file index.html principale.');

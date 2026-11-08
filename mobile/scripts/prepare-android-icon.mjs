import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(here, '..');
const repoRoot = path.resolve(mobileRoot, '..');
const resRoot = path.join(mobileRoot, 'android', 'app', 'src', 'main', 'res');
const svg = await readFile(path.join(repoRoot, 'app-icon.svg'));

const legacy = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];
for (const [folder, size] of legacy) {
  const dir = path.join(resRoot, folder);
  await mkdir(dir, { recursive: true });
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
    await sharp(svg).resize(size, size, { fit: 'contain', background: '#050505' }).png().toFile(path.join(dir, name));
  }
}
const adaptive = [
  ['mipmap-mdpi', 108],
  ['mipmap-hdpi', 162],
  ['mipmap-xhdpi', 216],
  ['mipmap-xxhdpi', 324],
  ['mipmap-xxxhdpi', 432],
];
for (const [folder, size] of adaptive) {
  const dir = path.join(resRoot, folder);
  await mkdir(dir, { recursive: true });
  await sharp(svg).resize(size, size, { fit: 'contain', background: '#050505' }).png().toFile(path.join(dir, 'ic_launcher_foreground.png'));
}
const adaptiveDir = path.join(resRoot, 'mipmap-anydpi-v26');
await mkdir(adaptiveDir, { recursive: true });
const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
await writeFile(path.join(adaptiveDir, 'ic_launcher.xml'), adaptiveXml);
await writeFile(path.join(adaptiveDir, 'ic_launcher_round.xml'), adaptiveXml);
const valuesDir = path.join(resRoot, 'values');
await mkdir(valuesDir, { recursive: true });
await writeFile(path.join(valuesDir, 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources><color name="ic_launcher_background">#050505</color></resources>
`);
console.log('Icona personalizzata applicata alle icone Android legacy e adaptive.');

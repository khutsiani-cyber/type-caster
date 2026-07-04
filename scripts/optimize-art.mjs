// Downscales the generated PNGs and re-encodes as WebP for fast loading.
import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'art');

for (const file of readdirSync(OUT).filter((f) => f.endsWith('.png'))) {
  const src = join(OUT, file);
  const dst = src.replace(/\.png$/, '.webp');
  const width = file.startsWith('bg-') ? 1600 : 512;
  const before = statSync(src).size;
  await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(dst);
  const after = statSync(dst).size;
  console.log(`${file} → webp  ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB`);
}

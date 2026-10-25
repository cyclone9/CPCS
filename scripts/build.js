// Builds the static site into dist/: src/ with interface text filled in, assets/, the vendored PNG encoder and LICENSE.
// Usage: npm run build
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { S } from '../src/js/strings.js';
import { START_YEAR } from '../src/js/years.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const VENDOR = [
  ['node_modules/upng-js/UPNG.js', 'UPNG.js'],
  ['node_modules/upng-js/LICENSE', 'UPNG.LICENSE.txt'],
  ['node_modules/pako/dist/pako_deflate.min.js', 'pako_deflate.min.js'],
  ['node_modules/pako/LICENSE', 'pako.LICENSE.txt'],
];

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
// Values that don't live in strings.js. The page replaces the start year with the full range at runtime.
const BUILD = { startYear: String(START_YEAR), version: pkg.version };

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

cpSync(join(root, 'src'), dist, { recursive: true });
cpSync(join(root, 'assets'), join(dist, 'assets'), { recursive: true });
cpSync(join(root, 'LICENSE'), join(dist, 'LICENSE'));

mkdirSync(join(dist, 'vendor'));
for (const [from, to] of VENDOR) {
  const src = join(root, from);
  if (!existsSync(src)) throw new Error(`${from} is missing: run npm ci first`);
  cpSync(src, join(dist, 'vendor', to));
}

const page = join(dist, 'index.html');
const html = readFileSync(page, 'utf8').replace(/\{\{(\w+)\}\}/g, (_, key) => {
  const value = BUILD[key] ?? S[key];
  if (typeof value !== 'string') throw new Error(`index.html: no string "${key}" in strings.js`);
  return escape(value);
});
writeFileSync(page, html);

console.log(`built ${dist}`);

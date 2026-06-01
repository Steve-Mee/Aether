#!/usr/bin/env node
/**
 * CI smoke: fail on banned placeholder/marketing copy in merchant UI.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { fileURLToPath } from 'url';
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src');
const BANNED = [
  /hive mind/i,
  /elon-grade/i,
  /the living standard/i,
  /vs last month/i,
  /lorem ipsum/i,
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.(tsx?|css)$/.test(name)) files.push(p);
  }
  return files;
}

let failed = false;
for (const file of walk(ROOT)) {
  if (file.replace(/\\/g, '/').endsWith('/lib/noPlaceholder.ts')) continue;
  const text = readFileSync(file, 'utf8');
  for (const pattern of BANNED) {
    if (pattern.test(text)) {
      console.error(`BANNED copy in ${file}: ${pattern}`);
      failed = true;
    }
  }
}

const ZINC_DIRS = [join(ROOT, 'pages'), join(ROOT, 'components')];
const ZINC_PATTERN = /(?:text|bg|border|divide|hover:bg|from|to)-zinc-/;

for (const dir of ZINC_DIRS) {
  if (!statSync(dir, { throwIf: false })) continue;
  for (const file of walk(dir)) {
    if (file.replace(/\\/g, '/').includes('/components/ui/')) continue;
    const text = readFileSync(file, 'utf8');
    if (ZINC_PATTERN.test(text)) {
      console.error(`Raw zinc utility in ${file}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('UI copy verify: OK');

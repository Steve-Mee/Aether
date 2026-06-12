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

const PAGES_DIR = join(ROOT, 'pages');
const HARDCODED_PAGE_TITLE = /<PageHeader[^>]*\s+title=["']([A-Za-z][^"']{3,})["']/g;

for (const file of walk(PAGES_DIR)) {
  const text = readFileSync(file, 'utf8');
  if (!text.includes('PageHeader')) continue;
  let match;
  while ((match = HARDCODED_PAGE_TITLE.exec(text)) !== null) {
    const title = match[1];
    if (title.startsWith('{') || title.includes('t(')) continue;
    console.error(`Hardcoded PageHeader title in ${file}: "${title}" — use i18n keys`);
    failed = true;
  }
}

const COMPONENTS_DIR = join(ROOT, 'components');
const HARDCODED_EMPTY = /<EmptyState[^>]*\s+title=["']([A-Za-z][^"']{3,})["']/g;
const HARDCODED_EMPTY_DESC = /<EmptyState[^>]*\s+description=["']([A-Za-z][^"']{5,})["']/g;

for (const file of walk(COMPONENTS_DIR)) {
  if (file.replace(/\\/g, '/').includes('/components/ui/')) continue;
  const text = readFileSync(file, 'utf8');
  if (!text.includes('EmptyState')) continue;
  let match;
  while ((match = HARDCODED_EMPTY.exec(text)) !== null) {
    const title = match[1];
    if (title.startsWith('{') || title.includes('t(')) continue;
    console.error(`Hardcoded EmptyState title in ${file}: "${title}" — use i18n keys`);
    failed = true;
  }
  while ((match = HARDCODED_EMPTY_DESC.exec(text)) !== null) {
    const desc = match[1];
    if (desc.startsWith('{') || desc.includes('t(')) continue;
    console.error(`Hardcoded EmptyState description in ${file}: "${desc}" — use i18n keys`);
    failed = true;
  }
}

const SIDECAR_BANNED = [
  /goedkeuringen/i,
  /Wacht op beslissing/i,
  /lage marge/i,
  /Alles rustig/i,
  /Veilig toepassen/i,
];
const sidecarPath = join(COMPONENTS_DIR, 'ProactiveSidecar.tsx');
if (statSync(sidecarPath, { throwIf: false })) {
  const sidecarText = readFileSync(sidecarPath, 'utf8');
  for (const pattern of SIDECAR_BANNED) {
    if (pattern.test(sidecarText)) {
      console.error(`Hardcoded sidecar copy in ${sidecarPath}: ${pattern}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('UI copy verify: OK');

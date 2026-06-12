import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dirname, '../src');

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.(tsx|ts)$/.test(name)) files.push(p);
  }
  return files;
}

const replacements = [
  ['text-muted-foreground/70', 'text-muted-foreground'],
  ['text-muted-foreground/60', 'text-caption-accessible'],
  ['text-primary/70', 'text-primary-readable'],
  ['text-muted-foreground/50', 'text-muted-foreground'],
  ['placeholder:text-muted-foreground/60', 'placeholder:text-caption-accessible'],
  ['placeholder:text-muted-foreground/50', 'placeholder:text-muted-foreground'],
];

for (const file of walk(root)) {
  let content = readFileSync(file, 'utf8');
  let next = content;
  for (const [from, to] of replacements) {
    next = next.split(from).join(to);
  }
  if (next !== content) {
    writeFileSync(file, next);
    console.log('updated', file.replace(root, ''));
  }
}

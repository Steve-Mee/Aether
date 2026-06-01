#!/usr/bin/env node
/** One-off helper: replace common zinc-* with semantic tokens in pages/components */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src');
const REPLACEMENTS = [
  ['bg-zinc-950', 'bg-[var(--color-bg)]'],
  ['bg-zinc-900', 'bg-[var(--color-surface)]'],
  ['bg-zinc-800/60', 'bg-[var(--color-surface-elevated)]/60'],
  ['bg-zinc-800/50', 'bg-[var(--color-surface-elevated)]/50'],
  ['bg-zinc-800', 'bg-[var(--color-surface-elevated)]'],
  ['hover:bg-zinc-900', 'hover:bg-[var(--color-surface)]'],
  ['hover:bg-zinc-800/60', 'hover:bg-[var(--color-surface-elevated)]/60'],
  ['hover:bg-zinc-800', 'hover:bg-[var(--color-surface-elevated)]'],
  ['hover:bg-zinc-700', 'hover:bg-[var(--color-border)]'],
  ['hover:bg-zinc-600', 'hover:bg-[var(--color-border)]'],
  ['border-zinc-800', 'border-[var(--color-border-subtle)]'],
  ['border-zinc-700', 'border-[var(--color-border)]'],
  ['divide-zinc-800', 'divide-[var(--color-border-subtle)]'],
  ['text-zinc-600', 'text-[var(--color-text-subtle)]'],
  ['text-zinc-500', 'text-[var(--color-text-subtle)]'],
  ['text-zinc-400', 'text-[var(--color-text-muted)]'],
  ['text-zinc-300', 'text-[var(--color-text-muted)]'],
  ['text-zinc-200', 'text-[var(--color-text)]'],
  ['bg-zinc-700', 'bg-[var(--color-surface-elevated)]'],
  ['bg-zinc-600', 'bg-[var(--color-border)]'],
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'ui') continue;
      walk(p, files);
    } else if (/\.tsx$/.test(name)) files.push(p);
  }
  return files;
}

for (const dir of ['pages', 'components']) {
  for (const file of walk(join(ROOT, dir))) {
    let text = readFileSync(file, 'utf8');
    let changed = false;
    for (const [from, to] of REPLACEMENTS) {
      if (text.includes(from)) {
        text = text.split(from).join(to);
        changed = true;
      }
    }
    if (changed) writeFileSync(file, text);
  }
}

console.log('Token migration pass complete');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(__dirname, '../src/lib/i18n.ts');
const outDir = path.join(__dirname, '../src/lib/i18n');
const src = fs.readFileSync(srcPath, 'utf8');

const nlMatch = src.match(/nl:\s*\{([\s\S]*?)\n  \},\n  en:/);
const enMatch = src.match(/en:\s*\{([\s\S]*?)\n  \},\n\};/);
if (!nlMatch || !enMatch) {
  console.error('parse failed');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const header = "import type { LocaleMessages } from './types';\n\nexport const nlMessages: LocaleMessages = {";
const enHeader = header.replace('nlMessages', 'enMessages');
const footer = '\n};\n';

fs.writeFileSync(path.join(outDir, 'nl.ts'), header + nlMatch[1] + footer);
fs.writeFileSync(path.join(outDir, 'en.ts'), enHeader + enMatch[1] + footer);
console.log('nl lines:', nlMatch[1].split('\n').length);
console.log('en lines:', enMatch[1].split('\n').length);

#!/usr/bin/env node
/**
 * Generates secure AETHER secrets and writes aether-core/.env from .env.example.
 *
 * Usage:
 *   node scripts/generate-env.js          # skip if .env exists
 *   node scripts/generate-env.js --force  # regenerate secrets
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');
const ENV_FILE = path.join(ROOT, '.env');

const SECRET_KEYS = ['AETHER_API_KEY', 'VITE_AETHER_API_KEY', 'HIVE_MIND_SALT'];

function generateApiKey() {
  return `aether_${crypto.randomBytes(32).toString('base64url')}`;
}

function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

function setEnvValue(content, key, value) {
  const pattern = new RegExp(`^(${key}=)(.*)$`, 'm');
  if (pattern.test(content)) {
    return content.replace(pattern, `$1${value}`);
  }
  return `${content.trimEnd()}\n${key}=${value}\n`;
}

function main() {
  const force = process.argv.includes('--force');

  if (!fs.existsSync(ENV_EXAMPLE)) {
    console.error('Missing .env.example at', ENV_EXAMPLE);
    process.exit(1);
  }

  if (fs.existsSync(ENV_FILE) && !force) {
    console.log('.env already exists. Run with --force to regenerate secrets.');
    process.exit(0);
  }

  const apiKey = generateApiKey();
  const hiveSalt = generateSalt();

  let envContent = fs.readFileSync(ENV_EXAMPLE, 'utf8');
  envContent = setEnvValue(envContent, 'AETHER_API_KEY', apiKey);
  envContent = setEnvValue(envContent, 'VITE_AETHER_API_KEY', apiKey);
  envContent = setEnvValue(envContent, 'HIVE_MIND_SALT', hiveSalt);

  fs.writeFileSync(ENV_FILE, envContent, { encoding: 'utf8', mode: 0o600 });

  console.log('');
  console.log('AETHER environment ready');
  console.log('────────────────────────────────────────');
  console.log(`File:  ${ENV_FILE}`);
  console.log('');
  console.log('Generated secrets (also saved in .env):');
  console.log(`  AETHER_API_KEY=${apiKey}`);
  console.log(`  VITE_AETHER_API_KEY=${apiKey}`);
  console.log(`  HIVE_MIND_SALT=${hiveSalt}`);
  console.log('');
  console.log('Next steps:');
  console.log('  docker-compose up -d postgres');
  console.log('  cd backend && npm run prisma:migrate && npm run prisma:seed');
  console.log('');
}

main();

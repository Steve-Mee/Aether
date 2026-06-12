#!/usr/bin/env node
/**
 * Pre-flight check for Sentry observability — local env + optional GitHub secrets.
 * Does not print secret values.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const GITHUB_SECRETS = [
  'VITE_SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
  'SENTRY_ORG',
  'SENTRY_PROJECT',
];

const OPTIONAL_GITHUB_SECRETS = ['SENTRY_BACKEND_PROJECT'];

const LOCAL_ENV_FILES = [
  path.join(root, '.env.staging'),
  path.join(root, 'frontend', '.env'),
  path.join(root, 'backend', '.env'),
];

const LOCAL_KEYS = {
  frontend: ['VITE_SENTRY_DSN', 'VITE_SENTRY_ENV', 'VITE_APP_VERSION'],
  backend: ['SENTRY_DSN', 'SENTRY_ENV', 'APP_VERSION'],
};

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) out[key] = value;
  }
  return out;
}

function mergeLocalEnv() {
  const merged = {};
  for (const file of LOCAL_ENV_FILES) {
    Object.assign(merged, parseEnvFile(file));
  }
  return merged;
}

function listGhSecrets() {
  const result = spawnSync('gh', ['secret', 'list', '--json', 'name'], {
    cwd: root,
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0) return null;
  try {
    return JSON.parse(result.stdout).map((row) => row.name);
  } catch {
    return null;
  }
}

function checkGroup(label, keys, env) {
  const missing = keys.filter((key) => !env[key]);
  const present = keys.filter((key) => env[key]);
  console.log(`\n${label}`);
  for (const key of present) console.log(`  ✓ ${key}`);
  for (const key of missing) console.log(`  ✗ ${key} (missing)`);
  return missing.length === 0;
}

function main() {
  console.log('AETHER observability setup check\n');

  const localEnv = mergeLocalEnv();
  const frontendOk = checkGroup('Local frontend runtime', LOCAL_KEYS.frontend, localEnv);
  const backendOk = checkGroup('Local backend runtime', LOCAL_KEYS.backend, localEnv);

  const ghSecrets = listGhSecrets();
  if (ghSecrets === null) {
    console.log('\nGitHub secrets: skipped (gh CLI unavailable or not authenticated)');
  } else {
    console.log('\nGitHub secrets (CI sourcemap upload)');
    for (const name of GITHUB_SECRETS) {
      console.log(ghSecrets.includes(name) ? `  ✓ ${name}` : `  ✗ ${name} (missing)`);
    }
    for (const name of OPTIONAL_GITHUB_SECRETS) {
      console.log(
        ghSecrets.includes(name)
          ? `  ✓ ${name} (optional)`
          : `  ○ ${name} (optional — uses SENTRY_PROJECT for backend)`
      );
    }
  }

  console.log('\nStaging verification (after deploy):');
  console.log('  1. GET  /api/admin/observability/status');
  console.log('  2. POST /api/admin/observability/probe-error  (staging only)');
  console.log('  3. Browser console: __aetherProbeSentryError()  (staging / VITE_SENTRY_DEV)');
  console.log('  See docs/observability-runbook.md for full checklist.\n');

  if (!frontendOk || !backendOk) {
    console.log('WARN — local Sentry env incomplete. Set values in .env.staging or deploy secrets.');
    console.log('Configure GitHub secrets:');
    console.log('  gh secret set VITE_SENTRY_DSN');
    console.log('  gh secret set SENTRY_AUTH_TOKEN');
    console.log('  gh secret set SENTRY_ORG');
    console.log('  gh secret set SENTRY_PROJECT');
    process.exit(1);
  }

  console.log('PASS — local observability env keys present.');
  process.exit(0);
}

main();

#!/usr/bin/env node
/**
 * Runtime DoD — executes API smoke tests via Jest harness.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, '../backend');
const result = spawnSync(
  'npm',
  ['test', '--', '--testPathPattern=runtimeValidation', '--runInBand'],
  { cwd: backendDir, stdio: 'inherit', shell: true }
);

if (result.status !== 0) {
  console.error('\nFAIL — runtime validation blocked release');
  process.exit(1);
}

console.log('\nPASS — runtime API smoke validation complete');
process.exit(0);

#!/usr/bin/env node
/**
 * Append a pilot metrics row to docs/pilot-log.md (table section).
 * Uses API if AETHER_API_KEY set, else runs pilot-metrics-check output parsing is manual.
 *
 * Usage:
 *   AETHER_API_URL=http://localhost:9000 AETHER_API_KEY=... PILOT_TENANT_ID=... node scripts/record-pilot-snapshot.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const logPath = path.join(ROOT, 'docs', 'pilot-log.md');
const tenantId = process.env.PILOT_TENANT_ID || process.env.AETHER_DEFAULT_TENANT || 'tenant_default';
const date = new Date().toISOString().slice(0, 10);

async function fetchMailMetrics() {
  const apiUrl = (process.env.AETHER_API_URL || 'http://localhost:9000').replace(/\/$/, '');
  const apiKey = process.env.AETHER_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(`${apiUrl}/api/emails/metrics?days=30`, {
    headers: {
      'X-Aether-Api-Key': apiKey,
      'X-Aether-Tenant-Id': tenantId,
    },
  });
  if (!response.ok) throw new Error(`metrics ${response.status}`);
  return response.json();
}

async function main() {
  let autoReplyRate = 'n/a';
  let processed = 'n/a';
  let note = 'manual entry';

  try {
    const metrics = await fetchMailMetrics();
    if (metrics) {
      autoReplyRate = String((metrics.autoReplyRate ?? 0).toFixed(2));
      const replied = metrics.autoRepliedCount ?? 0;
      const escalated = metrics.escalatedCount ?? 0;
      processed = String(replied + escalated);
      note = metrics.targetsMet?.autoReplyAbove70Pct ? 'gate70 candidate' : 'below gate';
    }
  } catch (err) {
    note = `api error: ${err instanceof Error ? err.message : String(err)}`;
  }

  const row = `| ${date} | ${tenantId} | ${autoReplyRate} | ${processed} | _run pilot-metrics-check_ | _run PILOT_CAUSAL check_ | ${note} |`;
  let content = fs.readFileSync(logPath, 'utf8');
  const marker = '| _YYYY-MM-DD_ |';
  if (content.includes(marker)) {
    content = content.replace(marker, `${row}\n| _YYYY-MM-DD_ |`);
  } else {
    content = content.replace(
      '## Entries\n\n| Date |',
      `## Entries\n\n${row}\n\n| Date |`
    );
  }
  fs.writeFileSync(logPath, content);
  console.log('Recorded pilot snapshot:', row);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

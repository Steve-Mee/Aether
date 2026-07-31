#!/usr/bin/env node
/**
 * Pilot metrics — DB-backed mail ratio, approval integrity, optional causal checks.
 * Run: DATABASE_URL=... PILOT_TENANT_ID=tenant_xxx node scripts/pilot-metrics-check.js
 * Exit 1 if STRICT_PILOT=true and thresholds fail.
 */

const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const tenantId = process.env.PILOT_TENANT_ID || process.env.AETHER_DEFAULT_TENANT || 'tenant_default';
const periodDays = parseInt(process.env.PILOT_METRICS_DAYS || '30', 10);
const strict = process.env.STRICT_PILOT === 'true';

const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('pilot-metrics-check: DATABASE_URL not set — skipping DB checks');
    process.exit(0);
  }

  // Resolve @prisma/client from backend (script lives in aether-core/scripts/).
  const { createRequire } = require('module');
  const backendRequire = createRequire(path.join(BACKEND, 'package.json'));
  const { PrismaClient } = backendRequire('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const since = new Date(Date.now() - periodDays * 86400000);

    const emails = await prisma.emailMessage.findMany({
      where: { tenantId, createdAt: { gte: since } },
      select: { status: true },
    });

    const replied = emails.filter((e) => e.status === 'replied').length;
    const escalated = emails.filter((e) => e.status === 'escalated').length;
    const processed = replied + escalated;
    const autoReplyRate = processed === 0 ? 0 : replied / processed;

    console.log('Pilot mail metrics (DB)');
    console.log(`  tenant: ${tenantId}`);
    console.log(`  window: ${periodDays}d`);
    console.log(`  replied: ${replied}`);
    console.log(`  escalated: ${escalated}`);
    console.log(`  processed (replied+escalated): ${processed}`);
    console.log(`  autoReplyRate: ${autoReplyRate.toFixed(4)}`);
    console.log(`  gate70: ${autoReplyRate >= 0.7 && processed >= 100 ? 'PASS' : 'OPEN'}`);

    if (processed < 100) {
      warn(`[pilot-mail] processed ${processed} < 100 minimum`);
    }
    if (autoReplyRate < 0.7) {
      warn(`[pilot-mail] autoReplyRate ${autoReplyRate.toFixed(4)} < 0.7`);
    }
    if (strict && (processed < 100 || autoReplyRate < 0.7)) {
      fail('[pilot-mail] Gate 8 mail exit criteria not met');
    }

    const approved = await prisma.approval.findMany({
      where: { tenantId, status: 'approved', resolvedAt: { gte: since } },
      select: { id: true },
    });

    let approvalGaps = 0;
    for (const a of approved) {
      const token = `"approvalId":"${a.id}"`;
      const executed = await prisma.auditLog.findFirst({
        where: {
          tenantId,
          action: 'action_executed',
          details: { contains: token },
        },
      });
      if (!executed) approvalGaps += 1;
    }

    console.log('\nApproval execute integrity (DB)');
    console.log(`  approved in window: ${approved.length}`);
    console.log(`  missing action_executed: ${approvalGaps}`);
    console.log(`  gate100pct: ${approvalGaps === 0 ? 'PASS' : 'FAIL'}`);

    if (approvalGaps > 0) {
      fail(`[pilot-approval] ${approvalGaps} approved without action_executed audit`);
    }

    const assignment = await prisma.experimentAssignment.findFirst({
      where: { tenantId, active: true },
    });
    const verifiedOutcome = await prisma.outcomeRecord.findFirst({
      where: {
        tenantId,
        verificationStatus: { in: ['verified', 'billable'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('\nCausal pilot signals (DB)');
    console.log(`  active holdout assignment: ${assignment ? 'yes' : 'no'}`);
    console.log(`  verified/billable outcome: ${verifiedOutcome ? verifiedOutcome.verificationStatus : 'none'}`);

    if (process.env.PILOT_CAUSAL === 'true') {
      if (!assignment) fail('[pilot-causal] no active ExperimentAssignment');
      if (!verifiedOutcome) fail('[pilot-causal] no verified/billable OutcomeRecord');
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\nErrors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  errors.forEach((e) => console.error('  ✗', e));
  warnings.forEach((w) => console.warn('  ⚠', w));

  if (errors.length) process.exit(1);
  console.log('\nPASS — pilot-metrics-check complete');
  process.exit(0);
}

main().catch((err) => {
  console.error('pilot-metrics-check failed:', err);
  process.exit(1);
});

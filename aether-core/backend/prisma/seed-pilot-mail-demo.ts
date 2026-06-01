/**
 * Staging-only: seed ≥100 emails in the last 30d with ≥70% auto-reply ratio (replied / (replied + escalated)).
 * Never run in production without explicit intent.
 *
 * Usage (from backend/):
 *   SEED_PILOT_MAIL_DEMO=true npx ts-node prisma/seed-pilot-mail-demo.ts
 *
 * Options:
 *   PILOT_TENANT_ID     — default tenant_pilot_demo (created if missing)
 *   PILOT_DEMO_REPLIED  — count of replied (default 78 → 78/104 ≈ 75%)
 *   PILOT_DEMO_ESCALATED — count of escalated (default 26)
 *   PILOT_DEMO_REPLACE  — true deletes prior demo mails for tenant first
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

const DEMO_FROM = 'pilot-demo-sender@aether.local';
const DEMO_SUBJECT_PREFIX = '[PILOT_DEMO]';

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function main() {
  if (process.env.SEED_PILOT_MAIL_DEMO !== 'true') {
    console.error('Refusing to run: set SEED_PILOT_MAIL_DEMO=true (staging/demo only).');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PILOT_DEMO_IN_PROD !== 'true') {
    console.error('Refusing to run in production without ALLOW_PILOT_DEMO_IN_PROD=true');
    process.exit(1);
  }

  const tenantId = process.env.PILOT_TENANT_ID ?? 'tenant_pilot_demo';
  const repliedCount = parseInt(process.env.PILOT_DEMO_REPLIED ?? '78', 10);
  const escalatedCount = parseInt(process.env.PILOT_DEMO_ESCALATED ?? '26', 10);
  const total = repliedCount + escalatedCount;

  if (total < 100) {
    console.error(`Need replied + escalated >= 100 (got ${total})`);
    process.exit(1);
  }
  if (repliedCount / total < 0.7) {
    console.error(`Ratio ${(repliedCount / total).toFixed(2)} < 0.7 — adjust PILOT_DEMO_* counts`);
    process.exit(1);
  }

  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: { name: 'Pilot Demo Merchant' },
    create: {
      id: tenantId,
      name: 'Pilot Demo Merchant',
      slug: tenantId.replace(/_/g, '-'),
    },
  });

  const demoApiKey = process.env.PILOT_DEMO_API_KEY ?? 'pilot-demo-api-key';
  await prisma.apiKey.upsert({
    where: { keyHash: hashKey(demoApiKey) },
    update: { tenantId },
    create: {
      tenantId,
      keyHash: hashKey(demoApiKey),
      label: 'pilot-demo-key',
      role: 'admin',
    },
  });

  if (process.env.PILOT_DEMO_REPLACE === 'true') {
    const deleted = await prisma.emailMessage.deleteMany({
      where: {
        tenantId,
        from: DEMO_FROM,
        subject: { startsWith: DEMO_SUBJECT_PREFIX },
      },
    });
    console.log(`Removed ${deleted.count} prior demo emails`);
  }

  const now = Date.now();
  const rows: {
    tenantId: string;
    from: string;
    subject: string;
    body: string;
    status: string;
    category: string;
    confidence: number;
    sentAt: Date | null;
    createdAt: Date;
    messageId: string;
  }[] = [];

  for (let i = 0; i < repliedCount; i++) {
    const daysAgo = (i % 28) + 1;
    const createdAt = new Date(now - daysAgo * 86400000);
    rows.push({
      tenantId,
      from: DEMO_FROM,
      subject: `${DEMO_SUBJECT_PREFIX} replied ${i}`,
      body: 'Demo auto-reply path',
      status: 'replied',
      category: 'support',
      confidence: 0.9,
      sentAt: createdAt,
      createdAt,
      messageId: `pilot-demo-replied-${tenantId}-${i}`,
    });
  }

  for (let i = 0; i < escalatedCount; i++) {
    const daysAgo = (i % 28) + 1;
    const createdAt = new Date(now - daysAgo * 86400000);
    rows.push({
      tenantId,
      from: DEMO_FROM,
      subject: `${DEMO_SUBJECT_PREFIX} escalated ${i}`,
      body: 'Demo escalation path',
      status: 'escalated',
      category: 'complaint',
      confidence: 0.6,
      sentAt: null,
      createdAt,
      messageId: `pilot-demo-escalated-${tenantId}-${i}`,
    });
  }

  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    await prisma.emailMessage.createMany({
      data: rows.slice(i, i + batchSize),
      skipDuplicates: true,
    });
  }

  const ratio = repliedCount / total;
  console.log('Pilot mail demo seed complete:', {
    tenantId,
    replied: repliedCount,
    escalated: escalatedCount,
    processed: total,
    autoReplyRate: ratio.toFixed(4),
    apiKeyHint: 'Set AETHER_API_KEY to PILOT_DEMO_API_KEY for validate:dod',
    demoApiKey,
  });
  console.log('\nVerify:');
  console.log(`  PILOT_TENANT_ID=${tenantId} npm run pilot:metrics`);
  console.log(
    `  PILOT_RELEASE=true AETHER_API_KEY=${demoApiKey} AETHER_DEFAULT_TENANT=${tenantId} npm run validate:dod`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

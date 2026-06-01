#!/usr/bin/env node
/**
 * Data retention skeleton — purges audit logs older than DATA_RETENTION_DAYS.
 * Run via cron or manual ops: node scripts/data-retention.mjs
 */
import { PrismaClient } from '@prisma/client';

const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS ?? '365', 10);
const prisma = new PrismaClient();

async function main() {
  const cutoff = new Date(Date.now() - retentionDays * 86400000);
  const result = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  console.log(`data-retention: purged ${result.count} audit logs older than ${retentionDays} days`);
}

main()
  .catch((err) => {
    console.error('data-retention failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

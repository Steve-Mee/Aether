/**
 * Verifies BrainMemory, BrainAgentState, and BrainLoRAAdapter tables exist.
 * Skips when DATABASE_URL is unset (CI unit-test jobs).
 */
import { prisma } from '../src/shared/prisma/client';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.log('verify-brain-schema: skipped (no DATABASE_URL)');
    return;
  }

  const checks = [
    { label: 'BrainMemory', fn: () => prisma.brainMemory.count() },
    { label: 'BrainAgentState', fn: () => prisma.brainAgentState.count() },
    { label: 'BrainLoRAAdapter', fn: () => prisma.brainLoRAAdapter.count() },
  ];

  for (const check of checks) {
    try {
      await check.fn();
      console.log(`verify-brain-schema: ok ${check.label}`);
    } catch (err) {
      console.error(`verify-brain-schema: missing or invalid table ${check.label}`, err);
      process.exitCode = 1;
      return;
    }
  }

  console.log('verify-brain-schema: all brain tables reachable');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

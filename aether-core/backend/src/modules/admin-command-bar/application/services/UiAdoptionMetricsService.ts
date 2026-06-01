import { prisma } from '../../../../shared/prisma/client';

/** Estimated merchant minutes saved per successful NL command by intent. */
const MINUTES_PER_INTENT: Record<string, number> = {
  APPROVE_CHANGES: 5,
  PRICE_UPDATE: 8,
  INVENTORY_STATUS: 3,
  ORDER_STATUS: 3,
  EMAIL_SUMMARY: 4,
  FORECAST: 6,
  SUPPLIER_CREATE: 5,
  OUTCOME_VERIFY: 4,
  UNKNOWN: 2,
};

const DEFAULT_MINUTES = 3;
const PERIOD_DAYS = 7;

export interface UiAdoptionMetrics {
  commands7d: number;
  manualNavEvents7d: number;
  nlActionShare7d: number;
  timeSavedMinutes7d: number;
  autonomousActions7d: number;
}

function minutesForIntent(intent: string | null): number {
  if (!intent) return DEFAULT_MINUTES;
  return MINUTES_PER_INTENT[intent] ?? DEFAULT_MINUTES;
}

export async function computeUiAdoptionMetrics(tenantId: string): Promise<UiAdoptionMetrics> {
  const since = new Date(Date.now() - PERIOD_DAYS * 86400000);

  const [commands, navEvents, autonomyAudits] = await Promise.all([
    prisma.command.findMany({
      where: { tenantId, createdAt: { gte: since } },
      select: { intent: true },
    }),
    prisma.auditLog.count({
      where: {
        tenantId,
        module: 'admin-command-bar',
        action: 'ui.navigation',
        createdAt: { gte: since },
      },
    }),
    prisma.auditLog.count({
      where: {
        tenantId,
        action: { startsWith: 'autonomy_' },
        createdAt: { gte: since },
      },
    }),
  ]);

  const commands7d = commands.length;
  const manualNavEvents7d = navEvents;
  const denominator = Math.max(1, commands7d + manualNavEvents7d);
  const nlActionShare7d = commands7d / denominator;

  const timeSavedMinutes7d = commands.reduce(
    (sum, c) => sum + minutesForIntent(c.intent),
    0
  );

  return {
    commands7d,
    manualNavEvents7d,
    nlActionShare7d,
    timeSavedMinutes7d,
    autonomousActions7d: autonomyAudits,
  };
}

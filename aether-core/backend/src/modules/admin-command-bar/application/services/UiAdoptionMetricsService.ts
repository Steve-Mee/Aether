import type { UiAdoptionMetrics, UiAdoptionMetricsPort } from '../ports/UiAdoptionMetricsPort';
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

function minutesForIntent(intent: string | null): number {
  if (!intent) return DEFAULT_MINUTES;
  return MINUTES_PER_INTENT[intent] ?? DEFAULT_MINUTES;
}

export class UiAdoptionMetricsService {
  constructor(private metricsPort: UiAdoptionMetricsPort) {}

  async compute(tenantId: string): Promise<UiAdoptionMetrics> {
    const since = new Date(Date.now() - PERIOD_DAYS * 86400000);
    const since24h = new Date(Date.now() - 86400000);

    const [commands, navEvents, autonomyAudits, policyAuto24h, autonomyExecute24h] =
      await Promise.all([
        this.metricsPort.getCommandIntentsSince(tenantId, since),
        this.metricsPort.countNavEventsSince(tenantId, since),
        this.metricsPort.countAutonomyAuditsSince(tenantId, since),
        this.metricsPort.countPolicyAutoApprovalsSince(tenantId, since24h),
        this.metricsPort.countAutonomyExecuteSince(tenantId, since24h),
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
      lowRiskAutonomous24h: policyAuto24h + autonomyExecute24h,
    };
  }
}

export type { UiAdoptionMetrics };

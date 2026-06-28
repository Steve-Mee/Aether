import { prisma } from '../../../../shared/prisma/client';
import { getMerchantSettings } from '../../../../shared/settings/TenantSettingsService';
import type { AgentPatternDistillationService } from '../../global-knowledge/agent-patterns/AgentPatternDistillationService';
import { AgentPatternContributionGate } from '../../global-knowledge/agent-patterns/AgentPatternContributionGate';
import { isProactiveGlobalPatternsEnabled } from '../proactiveConfig';

const PATTERN_TYPE = 'proactive_trigger_outcome';

function mapTriggerToCategory(triggerId: string): string {
  if (triggerId.startsWith('inventory')) return 'inventory';
  if (triggerId.startsWith('pricing') || triggerId.startsWith('supplier.price')) return 'pricing';
  if (triggerId.startsWith('supplier')) return 'inventory';
  return 'trend';
}

function mapTriggerToAgentKey(triggerId: string, agentKey?: string): string {
  if (agentKey) return agentKey;
  if (triggerId.startsWith('inventory')) return 'inventory';
  if (triggerId.startsWith('pricing')) return 'pricing';
  if (triggerId.startsWith('supplier')) return 'supplier';
  return 'admin';
}

export class ProactivePatternContributionService {
  constructor(
    private distillation: AgentPatternDistillationService,
    private gate: AgentPatternContributionGate = new AgentPatternContributionGate()
  ) {}

  async recordOutcome(
    tenantId: string,
    params: {
      action: 'executed' | 'dismissed' | 'snoozed';
      triggerId: string;
      agentKey?: string;
      riskLevel?: string;
    }
  ): Promise<void> {
    if (!isProactiveGlobalPatternsEnabled()) return;
    if (!(await this.gate.isContributorEnabled(tenantId))) return;

    const settings = await getMerchantSettings(tenantId);
    if (!settings.brainFederatedContributionEnabled) return;

    const category = mapTriggerToCategory(params.triggerId);
    const agentKey = mapTriggerToAgentKey(params.triggerId, params.agentKey);
    const metricKey =
      params.action === 'executed'
        ? 'proactive_execute_rate'
        : params.action === 'dismissed'
          ? 'proactive_dismiss_rate'
          : 'proactive_snooze_rate';

    const existing = await prisma.globalAgentPattern.findUnique({
      where: {
        category_agentKey_patternType: {
          category,
          agentKey,
          patternType: `${PATTERN_TYPE}:${params.triggerId}`,
        },
      },
    });

    const payload = (existing?.payloadJson as Record<string, unknown> | null) ?? {};
    const counts = (payload.counts as Record<string, number> | undefined) ?? {};
    counts[metricKey] = (counts[metricKey] ?? 0) + 1;
    counts.sampleSize = (counts.sampleSize ?? 0) + 1;

    await this.distillation.upsertGlobalPattern(
      {
        category,
        agentKey,
        patternType: `${PATTERN_TYPE}:${params.triggerId}`,
        payload: {
          triggerId: params.triggerId,
          riskLevel: params.riskLevel ?? 'low',
          counts,
          sampleSize: counts.sampleSize,
        },
        tenantCount: 1,
      },
      tenantId
    );
  }
}

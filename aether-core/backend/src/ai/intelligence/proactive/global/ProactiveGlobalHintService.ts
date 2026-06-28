import { prisma } from '../../../../shared/prisma/client';
import { getMerchantSettings } from '../../../../shared/settings/TenantSettingsService';
import { AgentPatternContributionGate } from '../../global-knowledge/agent-patterns/AgentPatternContributionGate';
import { meetsKAnonymity } from '../../global-knowledge/federated/privacyUtils';
import { isProactiveGlobalPatternsEnabled } from '../proactiveConfig';

export type ProactiveGlobalHint =
  | 'peer_merchants_often_execute'
  | 'peer_merchants_often_dismiss'
  | null;

export interface ProactiveGlobalHintResult {
  triggerId: string;
  hint: ProactiveGlobalHint;
  confidence: number;
  sampleSize: number;
}

const PATTERN_PREFIX = 'proactive_trigger_outcome:';

export class ProactiveGlobalHintService {
  constructor(private gate: AgentPatternContributionGate = new AgentPatternContributionGate()) {}

  private async isEnabled(tenantId: string): Promise<boolean> {
    if (!isProactiveGlobalPatternsEnabled()) return false;
    if (!(await this.gate.isEnabled(tenantId))) return false;
    const settings = await getMerchantSettings(tenantId);
    return settings.brainKnowledgeTransferEnabled !== false;
  }

  async getHint(tenantId: string, triggerId: string): Promise<ProactiveGlobalHintResult | null> {
    if (!(await this.isEnabled(tenantId))) return null;

    const rows = await prisma.globalAgentPattern.findMany({
      where: {
        patternType: `${PATTERN_PREFIX}${triggerId}`,
        kAnonymityMet: true,
      },
      take: 1,
    });
    const row = rows[0];
    if (!row) return null;

    const payload = row.payloadJson as Record<string, unknown>;
    const counts = (payload.counts as Record<string, number> | undefined) ?? {};
    const executed = counts.proactive_execute_rate ?? 0;
    const dismissed = counts.proactive_dismiss_rate ?? 0;
    const sampleSize = Number(counts.sampleSize ?? row.tenantCount ?? 0);
    if (!meetsKAnonymity(row.tenantCount, sampleSize)) return null;

    let hint: ProactiveGlobalHint = null;
    if (executed >= 3 && executed > dismissed * 1.5) {
      hint = 'peer_merchants_often_execute';
    } else if (dismissed >= 3 && dismissed > executed * 1.5) {
      hint = 'peer_merchants_often_dismiss';
    }

    if (!hint) return null;

    const total = executed + dismissed || 1;
    return {
      triggerId,
      hint,
      confidence: Math.min(1, Math.max(executed, dismissed) / total),
      sampleSize,
    };
  }

  async getPriorityAdjust(tenantId: string, triggerId: string): Promise<number> {
    const result = await this.getHint(tenantId, triggerId);
    if (!result?.hint) return 0;
    if (result.hint === 'peer_merchants_often_execute') return 1;
    if (result.hint === 'peer_merchants_often_dismiss') return -1;
    return 0;
  }

  formatHintText(hint: ProactiveGlobalHintResult): string {
    if (hint.hint === 'peer_merchants_often_execute') {
      return 'Andere merchants voeren dit type suggestie vaker uit.';
    }
    if (hint.hint === 'peer_merchants_often_dismiss') {
      return 'Andere merchants negeren dit type suggestie vaker.';
    }
    return '';
  }
}

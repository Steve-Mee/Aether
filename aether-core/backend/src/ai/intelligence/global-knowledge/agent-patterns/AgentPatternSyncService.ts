import type { AgentPatternDistillationService } from './AgentPatternDistillationService';
import type { AgentPatternContributionGate } from './AgentPatternContributionGate';

export class AgentPatternSyncService {
  constructor(
    private distillation: AgentPatternDistillationService,
    private gate: AgentPatternContributionGate
  ) {}

  async contributeFromTenant(tenantId: string): Promise<number> {
    if (!(await this.gate.isEnabled(tenantId))) return 0;
    if (!(await this.gate.isContributorEnabled(tenantId))) return 0;
    const patterns = await this.distillation.distillFromCompletedRuns(tenantId);
    for (const pattern of patterns) {
      await this.distillation.upsertGlobalPattern(pattern, tenantId);
    }
    return patterns.length;
  }

  async getContextSnippets(tenantId: string, agentKey?: string): Promise<string[]> {
    if (!(await this.gate.isEnabled(tenantId))) return [];
    const patterns = await this.distillation.listActivePatterns('trend');
    if (agentKey) {
      return patterns.filter((p) => p.agentKey === agentKey).map((p) => p.snippet);
    }
    return patterns.map((p) => p.snippet);
  }
}

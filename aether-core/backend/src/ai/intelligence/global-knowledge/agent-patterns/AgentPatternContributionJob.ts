import { logger } from '../../../../shared/logging/logger';
import { prisma } from '../../../../shared/prisma/client';
import type { AgentPatternSyncService } from './AgentPatternSyncService';

export function createAgentPatternContributionJob(agentPatternSync?: AgentPatternSyncService) {
  let timer: ReturnType<typeof setInterval> | undefined;

  async function contributeAllOptedIn(): Promise<void> {
    if (!agentPatternSync) return;
    const tenants = await prisma.tenantSettings.findMany({
      where: {
        brainCrossTenantAgentPatternsEnabled: true,
        brainFederatedExecutionContribute: true,
      },
      select: { tenantId: true },
    });
    for (const row of tenants) {
      try {
        await agentPatternSync.contributeFromTenant(row.tenantId);
      } catch (err) {
        logger.warn('agent_pattern_contribution_failed', {
          tenantId: row.tenantId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return {
    start() {
      if (process.env.AGENT_PATTERN_CONTRIBUTION_JOB_ENABLED !== 'true' || !agentPatternSync) {
        return;
      }
      const intervalMs = Number(process.env.AGENT_PATTERN_CONTRIBUTION_INTERVAL_MS ?? 3600000);
      timer = setInterval(() => {
        void contributeAllOptedIn();
      }, intervalMs);
    },
    stop() {
      if (timer) clearInterval(timer);
    },
  };
}

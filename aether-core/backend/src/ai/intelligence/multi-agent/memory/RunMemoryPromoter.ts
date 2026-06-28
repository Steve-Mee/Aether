import type { RunWorkingMemoryPort } from './RunWorkingMemoryPort';
import { isMerchantMemoryPromoteEnabled } from './runMemoryConfig';
import {
  listPromotableNamespaces,
  shouldPromoteKey,
} from './merchantMemoryPromoteConfig';

export class RunMemoryPromoter {
  constructor(private memory: RunWorkingMemoryPort) {}

  async promoteRunToMerchant(tenantId: string, runId: string): Promise<number> {
    if (!isMerchantMemoryPromoteEnabled()) return 0;

    let promoted = 0;
    for (const namespace of listPromotableNamespaces()) {
      const entries = await this.memory.list(tenantId, runId, namespace, 'run');
      for (const entry of entries) {
        if (!shouldPromoteKey(namespace, entry.key)) continue;
        await this.memory.mergeWithVersion({
          tenantId,
          runId,
          namespace,
          key: entry.key,
          value: entry.value,
          updatedByAgentKey: entry.updatedByAgentKey,
          scope: 'merchant',
          promotedFromRunId: runId,
        });
        promoted += 1;
      }
    }
    return promoted;
  }
}

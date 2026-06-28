import type { GlobalBrainPort } from '../global-brain/GlobalBrainPort';
import type { KnowledgeTransferPort } from '../knowledge-transfer/KnowledgeTransferPort';
import type { KnowledgeTransferGatePort } from '../knowledge-transfer/KnowledgeTransferGatePort';
import type { GlobalKnowledgeService } from './GlobalKnowledgeService';
import { DEFAULT_BRAIN_AGENT_KEY } from './constants';
import { formatGlobalPatchSnippet, formatMerchantCollectiveSnippet } from './globalKnowledgeUtils';
import type { GlobalKnowledgeSyncResult } from './types';

export interface CollectiveContextInput {
  tenantId: string;
  globalBrain?: GlobalBrainPort;
  knowledgeTransfer?: KnowledgeTransferPort;
  globalKnowledgeService?: GlobalKnowledgeService;
  ktGate: KnowledgeTransferGatePort;
  agentKey?: string;
  syncGlobalKnowledge?: boolean;
  agentPatternSnippets?: string[];
}

export interface CollectiveContextResult {
  merchantCollective: string[];
  globalKnowledgeSnippets: string[];
  knowledgeUpdateSnippets: string[];
  allSnippets: string[];
  syncResult?: GlobalKnowledgeSyncResult;
}

export async function buildCollectiveContext(
  input: CollectiveContextInput
): Promise<CollectiveContextResult> {
  const ktEnabled = await input.ktGate.isEnabled(input.tenantId);
  if (!ktEnabled) {
    return {
      merchantCollective: [],
      globalKnowledgeSnippets: [],
      knowledgeUpdateSnippets: [],
      allSnippets: [],
    };
  }

  let merchantCollective: string[] = [];
  if (input.globalBrain) {
    try {
      const insights = await input.globalBrain.getCollectiveInsights(input.tenantId);
      merchantCollective = insights.map((i) => formatMerchantCollectiveSnippet(i.category, i.summary));
    } catch {
      merchantCollective = [];
    }
  }

  let knowledgeUpdateSnippets: string[] = [];
  if (input.knowledgeTransfer) {
    try {
      const updates = await input.knowledgeTransfer.getKnowledgeUpdates(input.tenantId);
      knowledgeUpdateSnippets = updates.updates.map((u) => u.summary);
    } catch {
      knowledgeUpdateSnippets = [];
    }
  }

  let globalKnowledgeSnippets: string[] = [];
  let syncResult: GlobalKnowledgeSyncResult | undefined;
  if (input.globalKnowledgeService) {
    if (input.syncGlobalKnowledge) {
      syncResult = await input.globalKnowledgeService.syncForTenant(
        input.tenantId,
        input.agentKey ?? DEFAULT_BRAIN_AGENT_KEY
      );
      globalKnowledgeSnippets = syncResult.patches.map(formatGlobalPatchSnippet);
    } else {
      globalKnowledgeSnippets = await input.globalKnowledgeService.getActiveContextSnippets(
        input.tenantId,
        input.agentKey ?? DEFAULT_BRAIN_AGENT_KEY
      );
    }
  }

  const allSnippets = [
    ...merchantCollective,
    ...knowledgeUpdateSnippets,
    ...globalKnowledgeSnippets,
    ...(input.agentPatternSnippets ?? []),
  ];

  return {
    merchantCollective,
    globalKnowledgeSnippets,
    knowledgeUpdateSnippets,
    allSnippets,
    syncResult,
  };
}

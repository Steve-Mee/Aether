import { resolveMemoryAgentKey } from './agentKey';
import {
  isPersonalBrainMemoryEnabled,
  MEMORY_KIND_EPISODIC,
  MEMORY_KIND_INTERACTION,
} from './constants';
import type { ConversationSessionStore } from './ConversationSessionStore';
import type { LongTermMemoryStore } from './LongTermMemoryStore';
import { shouldPromoteToLongTerm, truncateOutcome } from './MemoryConsolidationPolicy';
import type { ShortTermMemoryStore } from './ShortTermMemoryStore';
import type { MemoryRecordInput } from './types';

export interface MemoryRecordOpsDeps {
  longTerm: LongTermMemoryStore;
  shortTerm: ShortTermMemoryStore;
  conversation: ConversationSessionStore;
  pruneLongTerm: (tenantId: string) => Promise<number>;
  pruneInteractionVectors: (tenantId: string) => Promise<number>;
}

export async function recordOutcome(
  deps: MemoryRecordOpsDeps,
  input: MemoryRecordInput
): Promise<string | undefined> {
  if (!isPersonalBrainMemoryEnabled()) {
    return fallbackRemember(deps, input);
  }

  const outcome = truncateOutcome(input.outcome);
  const consolidation = shouldPromoteToLongTerm(input);
  const agentKey = resolveMemoryAgentKey(input.agentKey);

  const brainMemoryId = await deps.longTerm.store({
    tenantId: input.tenantId,
    agentKey,
    command: input.command,
    intent: input.intent,
    summary: outcome,
    priority: consolidation.priority,
    expiresAt: consolidation.promote ? consolidation.expiresAt : undefined,
    commandId: input.commandId,
    outcomeMetrics: {
      uplift: input.verifiedUplift,
      toolsUsed: input.toolsUsed,
    },
    memoryKind: consolidation.promote ? MEMORY_KIND_EPISODIC : MEMORY_KIND_INTERACTION,
  });

  await deps.shortTerm.append(
    input.tenantId,
    {
      command: input.command,
      intent: input.intent,
      outcome,
      timestamp: new Date().toISOString(),
      commandId: input.commandId,
      success: input.success,
      brainMemoryId,
    },
    agentKey
  );

  if (input.commandId) {
    await deps.conversation.appendExchange(input.tenantId, {
      command: input.command,
      result: outcome,
      commandId: input.commandId,
    });
  }

  await deps.pruneLongTerm(input.tenantId).catch(() => undefined);
  await deps.pruneInteractionVectors(input.tenantId).catch(() => undefined);

  return brainMemoryId;
}

export async function fallbackRemember(
  deps: Pick<MemoryRecordOpsDeps, 'longTerm'>,
  input: MemoryRecordInput
): Promise<string | undefined> {
  try {
    return await deps.longTerm.store({
      tenantId: input.tenantId,
      agentKey: input.agentKey,
      command: input.command,
      intent: input.intent,
      summary: truncateOutcome(input.outcome),
      priority: 'low',
      memoryKind: MEMORY_KIND_INTERACTION,
    });
  } catch {
    return undefined;
  }
}

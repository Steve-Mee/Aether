import crypto from 'crypto';
import type { PlanMemoryService } from '../../command-brain/PlanMemoryService';
import type { BrainAdaptiveLearningService } from '../../command-brain/BrainAdaptiveLearningService';
import { resolveMemoryAgentKey } from './agentKey';
import {
  isPersonalBrainMemoryEnabled,
  MEMORY_KIND_ADAPTIVE,
  MEMORY_KIND_EPISODIC,
  MEMORY_KIND_PLAN,
  MEMORY_KIND_REFLECTION,
  MEMORY_KIND_SEMANTIC,
} from './constants';
import { computeDecayScore } from './MemoryDecayScorer';
import type { LongTermMemoryStore } from './LongTermMemoryStore';
import {
  buildUserNotice,
  buildReflectionNotice,
  formatForPrompt,
  formatReflectionBlock,
} from './MemoryPromptFormatter';
import type { ConversationSessionStore } from './ConversationSessionStore';
import type { ShortTermMemoryStore } from './ShortTermMemoryStore';
import { dedupeScored, toScoredEntry } from './memoryRecallScoring';
import type {
  MemoryKind,
  MemoryRecallOptions,
  MemoryRecallResult,
  ScoredMemoryEntry,
} from './types';
import type { StrategicMemoryService } from './StrategicMemoryService';

export interface MemoryRecallPipelineDeps {
  longTerm: LongTermMemoryStore;
  shortTerm: ShortTermMemoryStore;
  conversation: ConversationSessionStore;
  planMemory?: PlanMemoryService;
  adaptiveLearning?: BrainAdaptiveLearningService;
  strategicMemory?: StrategicMemoryService;
}

export async function runRecallForCommand(
  deps: MemoryRecallPipelineDeps,
  tenantId: string,
  command: string,
  options?: MemoryRecallOptions
): Promise<MemoryRecallResult> {
  if (!isPersonalBrainMemoryEnabled()) {
    return { promptBlock: '', memoryRecalled: [], entries: [] };
  }

  const agentKey = resolveMemoryAgentKey(options?.agentKey);

  const semantic = await deps.longTerm.recallSemantic(tenantId, command, 3, agentKey);
  const reflections = await deps.longTerm.recallReflections(tenantId, command, 2, agentKey);
  const episodic = await deps.longTerm.recallEpisodic(tenantId, command, 5, agentKey);
  const shortEntries = await deps.shortTerm.list(tenantId, agentKey);
  const shortScored = deps.shortTerm.scoreForQuery(shortEntries, command).map((s) => ({
    entry: { ...s.entry, kind: MEMORY_KIND_EPISODIC as MemoryKind },
    layer: 'short' as const,
    kind: MEMORY_KIND_EPISODIC as MemoryKind,
    score: computeDecayScore({
      relevanceScore: s.score,
      timestamp: s.entry.timestamp,
    }),
    ageLabel: s.ageLabel,
  }));

  const longScored: ScoredMemoryEntry[] = [
    ...semantic.map((m) => toScoredEntry(m, command, MEMORY_KIND_SEMANTIC)),
    ...reflections.map((m) =>
      toScoredEntry(m, command, MEMORY_KIND_REFLECTION, 'high', m.timestamp, 0.2)
    ),
    ...episodic.map((m) =>
      toScoredEntry(m, command, MEMORY_KIND_EPISODIC, m.priority, m.timestamp)
    ),
  ];

  let planScored: ScoredMemoryEntry[] = [];
  if (deps.planMemory) {
    const plans = await deps.planMemory.recallSimilarPlans(tenantId, command, 1);
    planScored = plans.map((plan) => ({
      entry: {
        id: crypto.randomUUID(),
        command,
        intent: 'AGENT_PLAN',
        outcome: `${plan.goal}: ${plan.steps.map((s) => s.label).join(' → ')}`,
        timestamp: new Date().toISOString(),
        success: true,
        kind: MEMORY_KIND_PLAN,
      },
      layer: 'long',
      kind: MEMORY_KIND_PLAN,
      score: 0.55,
      ageLabel: 'eerder plan',
    }));
  }

  let adaptiveScored: ScoredMemoryEntry[] = [];
  if (deps.adaptiveLearning) {
    const tool = options?.tool ?? 'general';
    const combined = await deps.adaptiveLearning.getCombinedHint(tenantId, {
      tool,
      query: command,
      intent: options?.intent,
      agentKey,
    });
    if (combined.hint) {
      adaptiveScored = [
        {
          entry: {
            id: crypto.randomUUID(),
            command,
            intent: 'ADAPTIVE',
            outcome: combined.hint,
            timestamp: new Date().toISOString(),
            success: true,
            kind: MEMORY_KIND_ADAPTIVE,
          },
          layer: 'long',
          kind: MEMORY_KIND_ADAPTIVE,
          score: combined.preferConfirm ? 0.65 : 0.5,
          ageLabel: 'leerervaring',
        },
      ];
    }
  }

  let strategicScored: ScoredMemoryEntry[] = [];
  if (deps.strategicMemory) {
    const strategies = await deps.strategicMemory.recallStrategies(tenantId, command, 2, agentKey);
    strategicScored = strategies.map((strat) => ({
      entry: {
        id: strat.id,
        command,
        intent: 'STRATEGIC',
        outcome: `${strat.strategy} | ${strat.context} | ${strat.outcome}`,
        timestamp: strat.timestamp ?? new Date().toISOString(),
        success: strat.outcome.includes('success'),
        kind: MEMORY_KIND_PLAN,
      },
      layer: 'long' as const,
      kind: MEMORY_KIND_PLAN,
      score: strat.score * 0.6,
      ageLabel: 'strategie',
    }));
  }

  const merged = dedupeScored([
    ...longScored.filter((e) => e.kind === MEMORY_KIND_SEMANTIC),
    ...longScored.filter((e) => e.kind === MEMORY_KIND_REFLECTION),
    ...longScored.filter((e) => e.kind === MEMORY_KIND_EPISODIC),
    ...shortScored,
    ...planScored,
    ...adaptiveScored,
    ...strategicScored,
  ]).sort((a, b) => b.score - a.score);

  const conversationTurns = await deps.conversation.getRecentTurns(tenantId);
  const conversationBlock = deps.conversation.formatForPrompt(conversationTurns);
  const experienceBlock = formatForPrompt(merged);
  const reflectionBlock = formatReflectionBlock(merged);
  const promptBlock = [reflectionBlock, experienceBlock, conversationBlock]
    .filter(Boolean)
    .join('\n\n');
  const top = merged.find((e) => e.kind !== MEMORY_KIND_REFLECTION) ?? merged[0];
  const reflectionEntries = merged.filter((e) => e.kind === MEMORY_KIND_REFLECTION);
  const userNotice = buildUserNotice(top);
  const reflectionNotice = buildReflectionNotice(reflectionEntries);

  return {
    promptBlock,
    conversationBlock: conversationBlock || undefined,
    userNotice,
    reflectionNotice,
    memoryRecalled: merged.slice(0, 5).map((e) => ({
      summary: e.entry.outcome || e.entry.command,
      age: e.ageLabel,
      layer: e.layer,
      kind: e.kind,
    })),
    entries: merged,
  };
}

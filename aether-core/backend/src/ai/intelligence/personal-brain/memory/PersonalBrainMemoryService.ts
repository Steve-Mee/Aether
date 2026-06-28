import crypto from 'crypto';
import type { PlanMemoryService } from '../../command-brain/PlanMemoryService';
import type { BrainAdaptiveLearningService } from '../../command-brain/BrainAdaptiveLearningService';
import type { PersonalBrainRegistry } from '../PersonalBrainRegistry';
import { ExperienceReflectionService } from '../reflection/ExperienceReflectionService';
import { ReflectionHandoffService } from '../reflection/ReflectionHandoffService';
import type { ExperienceReflectionResult } from '../reflection/types';
import { resolveTrigger } from '../reflection/ReflectionTriggerPolicy';
import { resolveMemoryAgentKey, DEFAULT_BRAIN_AGENT_KEY } from './agentKey';
import { ConversationSessionStore } from './ConversationSessionStore';
import {
  DEFAULT_INTERACTION_TTL_DAYS,
  DEFAULT_LOW_PRIORITY_MAX_AGE_DAYS,
  isPersonalBrainMemoryEnabled,
  MEMORY_KIND_ADAPTIVE,
  MEMORY_KIND_EPISODIC,
  MEMORY_KIND_INTERACTION,
  MEMORY_KIND_PLAN,
  MEMORY_KIND_REFLECTION,
  MEMORY_KIND_SEMANTIC,
} from './constants';
import { computeDecayScore } from './MemoryDecayScorer';
import { LongTermMemoryStore } from './LongTermMemoryStore';
import type { MemoryPort } from './MemoryPort';
import { shouldPromoteToLongTerm, truncateOutcome } from './MemoryConsolidationPolicy';
import {
  buildUserNotice,
  buildReflectionNotice,
  formatForPrompt,
  formatReflectionBlock,
  formatRelativeAge,
} from './MemoryPromptFormatter';
import { MemoryReflectionService } from './MemoryReflectionService';
import { MemorySummarizationService } from './MemorySummarizationService';
import { ShortTermMemoryStore } from './ShortTermMemoryStore';
import type {
  ExperienceReflectionRecordInput,
  MemoryKind,
  MemoryRecallOptions,
  MemoryRecallResult,
  MemoryRecordInput,
  MemorySummary,
  ReflectionMemoryInput,
  ScoredMemoryEntry,
} from './types';

export class PersonalBrainMemoryService implements MemoryPort {
  private shortTerm: ShortTermMemoryStore;
  longTerm: LongTermMemoryStore;
  conversation: ConversationSessionStore;
  reflection: MemoryReflectionService;
  experienceReflection: ExperienceReflectionService;
  reflectionHandoff?: ReflectionHandoffService;
  summarization: MemorySummarizationService;

  constructor(
    private personalBrains: PersonalBrainRegistry,
    private planMemory?: PlanMemoryService,
    private adaptiveLearning?: BrainAdaptiveLearningService,
    experienceReflection?: ExperienceReflectionService,
    reflectionHandoff?: ReflectionHandoffService
  ) {
    this.shortTerm = new ShortTermMemoryStore(personalBrains);
    this.longTerm = new LongTermMemoryStore(personalBrains);
    this.conversation = new ConversationSessionStore(personalBrains);
    this.experienceReflection =
      experienceReflection ?? new ExperienceReflectionService(this.longTerm);
    this.reflectionHandoff = reflectionHandoff;
    this.reflection = new MemoryReflectionService(this.longTerm, this.experienceReflection);
    this.summarization = new MemorySummarizationService(
      personalBrains,
      this.shortTerm,
      this.longTerm
    );
  }

  async recallForCommand(
    tenantId: string,
    command: string,
    options?: MemoryRecallOptions
  ): Promise<MemoryRecallResult> {
    if (!isPersonalBrainMemoryEnabled()) {
      return { promptBlock: '', memoryRecalled: [], entries: [] };
    }

    const agentKey = resolveMemoryAgentKey(options?.agentKey);

    const semantic = await this.longTerm.recallSemantic(tenantId, command, 3, agentKey);
    const reflections = await this.longTerm.recallReflections(tenantId, command, 2, agentKey);
    const episodic = await this.longTerm.recallEpisodic(tenantId, command, 5, agentKey);
    const shortEntries = await this.shortTerm.list(tenantId, agentKey);
    const shortScored = this.shortTerm.scoreForQuery(shortEntries, command).map((s) => ({
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
    if (this.planMemory) {
      const plans = await this.planMemory.recallSimilarPlans(tenantId, command, 1);
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
    if (this.adaptiveLearning) {
      const tool = options?.tool ?? 'general';
      const combined = await this.adaptiveLearning.getCombinedHint(tenantId, {
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

    const merged = dedupeScored([
      ...longScored.filter((e) => e.kind === MEMORY_KIND_SEMANTIC),
      ...longScored.filter((e) => e.kind === MEMORY_KIND_REFLECTION),
      ...longScored.filter((e) => e.kind === MEMORY_KIND_EPISODIC),
      ...shortScored,
      ...planScored,
      ...adaptiveScored,
    ]).sort((a, b) => b.score - a.score);

    const conversationTurns = await this.conversation.getRecentTurns(tenantId);
    const conversationBlock = this.conversation.formatForPrompt(conversationTurns);
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

  async recordOutcome(input: MemoryRecordInput): Promise<string | undefined> {
    if (!isPersonalBrainMemoryEnabled()) {
      return this.fallbackRemember(input);
    }

    const outcome = truncateOutcome(input.outcome);
    const consolidation = shouldPromoteToLongTerm(input);
    const agentKey = resolveMemoryAgentKey(input.agentKey);

    const brainMemoryId = await this.longTerm.store({
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

    await this.shortTerm.append(
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
      await this.conversation.appendExchange(input.tenantId, {
        command: input.command,
        result: outcome,
        commandId: input.commandId,
      });
    }

    await this.pruneLongTerm(input.tenantId).catch(() => undefined);
    await this.pruneInteractionVectors(input.tenantId).catch(() => undefined);

    return brainMemoryId;
  }

  async recordReflection(input: ReflectionMemoryInput): Promise<string[]> {
    return this.reflection.extractAndStore({
      ...input,
      trigger: input.trigger ?? resolveTrigger({
        intent: input.intent,
        goalReached: input.summary.goalReached,
        toolsUsed: input.toolTrace?.length ?? 0,
        usedAgentLoop: input.usedAgentLoop ?? false,
        checkpoint: input.checkpoint,
      }) ?? undefined,
    });
  }

  async recordExperienceReflection(
    input: ExperienceReflectionRecordInput
  ): Promise<ExperienceReflectionResult | null> {
    const agentKey = resolveMemoryAgentKey(input.agentKey);
    const result = await this.experienceReflection.reflectAndStore({
      tenantId: input.tenantId,
      command: input.command,
      intent: input.intent,
      summary: input.summary,
      plan: input.plan,
      toolTrace: input.toolTrace,
      stepReflections: input.reflections,
      trigger: input.trigger,
      agentKey,
    });

    if (
      result &&
      agentKey !== DEFAULT_BRAIN_AGENT_KEY &&
      this.reflectionHandoff
    ) {
      await this.reflectionHandoff.handoffToAdmin(input.tenantId, agentKey).catch(() => undefined);
    }

    return result;
  }

  async consolidateTenant(tenantId: string): Promise<number> {
    return this.summarization.consolidateTenant(tenantId);
  }

  async getSummary(tenantId: string): Promise<MemorySummary> {
    const short = await this.shortTerm.list(tenantId);
    const session = await this.conversation.getSession(tenantId);
    const entries = await this.longTerm.listEntries(tenantId);
    const ctx = await this.personalBrains.get(tenantId, 'admin').getContext();
    const episodic = entries.filter((e) => e.kind === MEMORY_KIND_EPISODIC).length;
    const semantic = entries.filter((e) => e.kind === MEMORY_KIND_SEMANTIC).length;
    const interaction = entries.filter((e) => e.kind === MEMORY_KIND_INTERACTION).length;
    return {
      shortTermCount: short.length,
      conversationTurnCount: session?.turns.length ?? 0,
      episodicCount: episodic,
      semanticCount: semantic,
      interactionCount: interaction,
      lastConsolidatedAt: ctx.lastConsolidatedAt,
    };
  }

  async listEntries(tenantId: string, kind?: MemoryKind, limit = 50) {
    return this.longTerm.listEntries(tenantId, kind, limit);
  }

  async removeByCommandId(tenantId: string, commandId: string): Promise<void> {
    const entries = await this.shortTerm.list(tenantId);
    const match = entries.find((e) => e.commandId === commandId);
    if (match?.brainMemoryId) {
      await this.longTerm.forget(tenantId, match.brainMemoryId).catch(() => undefined);
    }
    await this.shortTerm.removeByCommandId(tenantId, commandId);
  }

  async removeByBrainMemoryId(tenantId: string, brainMemoryId: string): Promise<void> {
    await this.longTerm.forget(tenantId, brainMemoryId).catch(() => undefined);
    await this.shortTerm.removeByBrainMemoryId(tenantId, brainMemoryId);
  }

  async pruneLongTerm(tenantId: string): Promise<number> {
    const now = Date.now();
    const lowMaxAgeMs = DEFAULT_LOW_PRIORITY_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const items = await this.longTerm.listForPrune(tenantId);
    let pruned = 0;

    for (const item of items) {
      let shouldDelete = false;
      if (item.expiresAt && new Date(item.expiresAt).getTime() < now) {
        shouldDelete = true;
      } else if (
        item.priority === 'low' &&
        item.rememberedAt &&
        now - new Date(item.rememberedAt).getTime() > lowMaxAgeMs
      ) {
        shouldDelete = true;
      }
      if (shouldDelete) {
        await this.longTerm.forget(tenantId, item.id).catch(() => undefined);
        pruned += 1;
      }
    }
    return pruned;
  }

  async pruneInteractionVectors(tenantId: string): Promise<number> {
    const now = Date.now();
    const maxAgeMs = DEFAULT_INTERACTION_TTL_DAYS * 24 * 60 * 60 * 1000;
    const items = await this.longTerm.listInteractionVectors(tenantId);
    let pruned = 0;
    for (const item of items) {
      if (!item.rememberedAt) continue;
      if (now - new Date(item.rememberedAt).getTime() > maxAgeMs) {
        await this.longTerm.forget(tenantId, item.id).catch(() => undefined);
        pruned += 1;
      }
    }
    return pruned;
  }

  async clearShortTerm(tenantId: string): Promise<void> {
    await this.shortTerm.clear(tenantId);
  }

  async clearConversation(tenantId: string): Promise<void> {
    await this.conversation.clearSession(tenantId);
  }

  private async fallbackRemember(input: MemoryRecordInput): Promise<string | undefined> {
    try {
      return await this.longTerm.store({
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
}

function toScoredEntry(
  m: {
    id: string;
    summary: string;
    score: number;
    timestamp?: string;
    priority?: import('./types').MemoryPriority;
  },
  command: string,
  kind: MemoryKind,
  priority?: import('./types').MemoryPriority,
  timestamp?: string,
  scoreBoost = 0
): ScoredMemoryEntry {
  const ts = timestamp ?? m.timestamp ?? new Date().toISOString();
  return {
    entry: {
      id: m.id,
      command,
      intent: 'MEMORY',
      outcome: m.summary,
      timestamp: ts,
      success: true,
      kind,
    },
    layer: 'long',
    kind,
    score: computeDecayScore({
      relevanceScore: Math.min(1, m.score + scoreBoost),
      timestamp: ts,
      priority: priority ?? m.priority,
    }),
    ageLabel: formatRelativeAge(ts),
  };
}

function dedupeScored(entries: ScoredMemoryEntry[]): ScoredMemoryEntry[] {
  const seen = new Set<string>();
  const result: ScoredMemoryEntry[] = [];
  for (const entry of entries) {
    const key = crypto
      .createHash('sha256')
      .update(`${entry.kind}:${entry.entry.command}:${entry.entry.outcome}`)
      .digest('hex')
      .slice(0, 16);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
}

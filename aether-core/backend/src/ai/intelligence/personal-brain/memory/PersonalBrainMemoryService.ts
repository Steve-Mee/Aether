import type { PlanMemoryService } from '../../command-brain/PlanMemoryService';
import type { BrainAdaptiveLearningService } from '../../command-brain/BrainAdaptiveLearningService';
import type { PersonalBrainRegistry } from '../PersonalBrainRegistry';
import { ExperienceReflectionService } from '../reflection/ExperienceReflectionService';
import { ReflectionHandoffService } from '../reflection/ReflectionHandoffService';
import type { ExperienceReflectionResult } from '../reflection/types';
import { resolveTrigger } from '../reflection/ReflectionTriggerPolicy';
import { resolveMemoryAgentKey, DEFAULT_BRAIN_AGENT_KEY } from './agentKey';
import { ConversationSessionStore } from './ConversationSessionStore';
import { MEMORY_KIND_EPISODIC, MEMORY_KIND_INTERACTION, MEMORY_KIND_SEMANTIC } from './constants';
import { LongTermMemoryStore } from './LongTermMemoryStore';
import type { MemoryPort } from './MemoryPort';
import { MemoryReflectionService } from './MemoryReflectionService';
import { MemorySummarizationService } from './MemorySummarizationService';
import { ShortTermMemoryStore } from './ShortTermMemoryStore';
import { runRecallForCommand } from './memoryRecallPipeline';
import { pruneInteractionVectors, pruneLongTerm } from './memoryPruneOps';
import { recordOutcome } from './memoryRecordOps';
import { StrategicMemoryService } from './StrategicMemoryService';
import { StrategicReflectionService } from '../reflection/StrategicReflectionService';
import type {
  ExperienceReflectionRecordInput,
  MemoryKind,
  MemoryRecallOptions,
  MemoryRecallResult,
  MemoryRecordInput,
  MemorySummary,
  ReflectionMemoryInput,
} from './types';

export class PersonalBrainMemoryService implements MemoryPort {
  private shortTerm: ShortTermMemoryStore;
  longTerm: LongTermMemoryStore;
  conversation: ConversationSessionStore;
  reflection: MemoryReflectionService;
  experienceReflection: ExperienceReflectionService;
  reflectionHandoff?: ReflectionHandoffService;
  summarization: MemorySummarizationService;
  strategicMemory: StrategicMemoryService;
  strategicReflection: StrategicReflectionService;

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
    this.strategicMemory = new StrategicMemoryService(this.longTerm);
    this.strategicReflection = new StrategicReflectionService(
      this.longTerm,
      this.strategicMemory
    );
  }

  async recallForCommand(
    tenantId: string,
    command: string,
    options?: MemoryRecallOptions
  ): Promise<MemoryRecallResult> {
    return runRecallForCommand(
      {
        longTerm: this.longTerm,
        shortTerm: this.shortTerm,
        conversation: this.conversation,
        planMemory: this.planMemory,
        adaptiveLearning: this.adaptiveLearning,
        strategicMemory: this.strategicMemory,
      },
      tenantId,
      command,
      options
    );
  }

  async recordOutcome(input: MemoryRecordInput): Promise<string | undefined> {
    return recordOutcome(
      {
        longTerm: this.longTerm,
        shortTerm: this.shortTerm,
        conversation: this.conversation,
        pruneLongTerm: (tenantId) => this.pruneLongTerm(tenantId),
        pruneInteractionVectors: (tenantId) => this.pruneInteractionVectors(tenantId),
      },
      input
    );
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
    return pruneLongTerm({ longTerm: this.longTerm }, tenantId);
  }

  async pruneInteractionVectors(tenantId: string): Promise<number> {
    return pruneInteractionVectors({ longTerm: this.longTerm }, tenantId);
  }

  async clearShortTerm(tenantId: string): Promise<void> {
    await this.shortTerm.clear(tenantId);
  }

  async clearConversation(tenantId: string): Promise<void> {
    await this.conversation.clearSession(tenantId);
  }
}

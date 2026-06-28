import type { PersonalBrainRegistry } from '../PersonalBrainRegistry';
import type { ExperienceReflection } from '../reflection/types';
import { resolveMemoryAgentKey } from './agentKey';
import {
  MEMORY_INTENT,
  MEMORY_KIND_EPISODIC,
  MEMORY_KIND_INTERACTION,
  MEMORY_KIND_REFLECTION,
  MEMORY_KIND_SEMANTIC,
  MEMORY_PREFIX,
  RECALLABLE_MEMORY_KINDS,
  isRecallableMemoryKind,
  normalizeMemoryKind,
} from './constants';
import type { ReflectionMemoryMatch } from './reflectionTypes';
import type { MemoryKind, MemoryOutcomeMetrics, MemoryPriority } from './types';

export interface StoreLongTermInput {
  tenantId: string;
  command: string;
  intent: string;
  summary: string;
  priority: MemoryPriority;
  agentKey?: string;
  expiresAt?: string;
  commandId?: string;
  outcomeMetrics?: MemoryOutcomeMetrics;
  memoryKind?: MemoryKind;
  lessonLearned?: boolean;
  consolidatedAt?: string;
  reflectionPayload?: ExperienceReflection;
  sourceAgentKey?: string;
  handoffAt?: string;
}

export class LongTermMemoryStore {
  constructor(private personalBrains: PersonalBrainRegistry) {}

  private brain(tenantId: string, agentKey?: string) {
    return this.personalBrains.get(tenantId, resolveMemoryAgentKey(agentKey));
  }

  async store(input: StoreLongTermInput): Promise<string> {
    const brain = this.brain(input.tenantId, input.agentKey);
    const memoryKind = input.memoryKind ?? MEMORY_KIND_EPISODIC;
    return brain.remember({
      command: input.command,
      intent: MEMORY_INTENT,
      result: input.summary,
      metadata: {
        memoryType: memoryKind,
        intent: input.intent,
        command: input.command,
        priority: input.priority,
        rememberedAt: new Date().toISOString(),
        expiresAt: input.expiresAt,
        commandId: input.commandId,
        outcomeMetrics: input.outcomeMetrics,
        lessonLearned: input.lessonLearned,
        consolidatedAt: input.consolidatedAt,
        reflectionPayload: input.reflectionPayload,
        sourceAgentKey: input.sourceAgentKey,
        handoffAt: input.handoffAt,
      },
    });
  }

  async recall(
    tenantId: string,
    query: string,
    limit = 5,
    kinds: MemoryKind[] = [...RECALLABLE_MEMORY_KINDS],
    agentKey?: string
  ): Promise<
    Array<{
      id: string;
      content: string;
      score: number;
      summary: string;
      timestamp?: string;
      kind: MemoryKind;
      priority?: MemoryPriority;
    }>
  > {
    const brain = this.brain(tenantId, agentKey);
    const metadataFilter = { memoryType: kinds };
    const prefixed = await brain.recall(`${MEMORY_PREFIX} ${query}`, limit * 3, { metadataFilter });
    const plain = await brain.recall(query, limit * 3, { metadataFilter });
    const recallMatches = dedupeMatches([...prefixed.matches, ...plain.matches]);
    const results: Array<{
      id: string;
      content: string;
      score: number;
      summary: string;
      timestamp?: string;
      kind: MemoryKind;
      priority?: MemoryPriority;
    }> = [];

    for (const match of recallMatches) {
      if (!match.content?.includes(`[${MEMORY_INTENT}]`)) continue;
      const kind = normalizeMemoryKind(match.metadata?.memoryType) as MemoryKind | undefined;
      if (!kind || !isRecallableMemoryKind(kind)) {
        if (!isLegacyRecallable(match)) continue;
      }

      const summary = parseSummaryFromSnippet(match.content ?? '');
      if (!summary) continue;

      const meta = match.metadata;
      const resolvedKind = (kind ?? MEMORY_KIND_EPISODIC) as MemoryKind;
      results.push({
        id: match.id,
        content: match.content ?? '',
        score: match.score,
        summary: stripLegacyTags(summary),
        timestamp: typeof meta?.rememberedAt === 'string' ? meta.rememberedAt : undefined,
        kind: resolvedKind,
        priority: meta?.priority as MemoryPriority | undefined,
      });
      if (results.length >= limit) break;
    }

    return results;
  }

  async recallSemantic(tenantId: string, query: string, limit = 3, agentKey?: string) {
    return this.recall(tenantId, query, limit, [MEMORY_KIND_SEMANTIC], agentKey);
  }

  async recallEpisodic(tenantId: string, query: string, limit = 5, agentKey?: string) {
    return this.recall(tenantId, query, limit, [MEMORY_KIND_EPISODIC], agentKey);
  }

  async recallReflections(
    tenantId: string,
    query: string,
    limit = 2,
    agentKey?: string
  ): Promise<ReflectionMemoryMatch[]> {
    const brain = this.brain(tenantId, agentKey);
    const metadataFilter = { memoryType: [MEMORY_KIND_REFLECTION] };
    const recallOpts = { metadataFilter, minScore: -1 };
    const prefixed = await brain.recall(`${MEMORY_PREFIX} ${query}`, limit * 3, recallOpts);
    const plain = await brain.recall(query, limit * 3, recallOpts);
    return parseReflectionMatches(dedupeMatches([...prefixed.matches, ...plain.matches]), limit);
  }

  async listReflections(
    tenantId: string,
    limit = 50,
    agentKey?: string
  ): Promise<ReflectionMemoryMatch[]> {
    const brain = this.brain(tenantId, agentKey);
    const recallOpts = {
      metadataFilter: { memoryType: [MEMORY_KIND_REFLECTION] },
      minScore: -1,
    };
    const raw = await brain.recall(MEMORY_PREFIX, limit, recallOpts);
    return parseReflectionMatches(raw.matches, limit);
  }

  async forget(tenantId: string, id: string, agentKey?: string): Promise<void> {
    const brain = this.brain(tenantId, agentKey);
    await brain.forgetMemory(id);
  }

  async listForPrune(tenantId: string, agentKey?: string) {
    const brain = this.brain(tenantId, agentKey);
    const recall = await brain.recall(MEMORY_PREFIX, 200, {
      metadataFilter: { memoryType: [MEMORY_KIND_EPISODIC, MEMORY_KIND_SEMANTIC, 'long_term'] },
      minScore: -1,
    });
    const items: Array<{
      id: string;
      priority?: MemoryPriority;
      expiresAt?: string;
      rememberedAt?: string;
      kind?: MemoryKind;
    }> = [];

    for (const match of recall.matches) {
      if (!match.content?.includes(`[${MEMORY_INTENT}]`)) continue;
      const kind = normalizeMemoryKind(match.metadata?.memoryType);
      if (kind === MEMORY_KIND_INTERACTION) continue;
      const meta = match.metadata;
      items.push({
        id: match.id,
        priority: meta?.priority as MemoryPriority | undefined,
        expiresAt: typeof meta?.expiresAt === 'string' ? meta.expiresAt : undefined,
        rememberedAt: typeof meta?.rememberedAt === 'string' ? meta.rememberedAt : undefined,
        kind: kind as MemoryKind | undefined,
      });
    }
    return items;
  }

  async listInteractionVectors(tenantId: string, agentKey?: string) {
    const brain = this.brain(tenantId, agentKey);
    const recall = await brain.recall(MEMORY_PREFIX, 200, {
      metadataFilter: { memoryType: [MEMORY_KIND_INTERACTION, 'interaction'] },
      minScore: -1,
    });
    return recall.matches
      .filter((m) => m.content?.includes(`[${MEMORY_INTENT}]`))
      .map((m) => ({
        id: m.id,
        rememberedAt: typeof m.metadata?.rememberedAt === 'string' ? m.metadata.rememberedAt : undefined,
      }));
  }

  async listEntries(tenantId: string, kind?: MemoryKind, limit = 50, agentKey?: string) {
    const kinds =
      kind ?
        [kind]
      : [MEMORY_KIND_EPISODIC, MEMORY_KIND_SEMANTIC, MEMORY_KIND_INTERACTION, MEMORY_KIND_REFLECTION];
    const brain = this.brain(tenantId, agentKey);
    const recall = await brain.recall(MEMORY_PREFIX, limit, {
      metadataFilter: { memoryType: kinds },
      minScore: -1,
    });
    return recall.matches
      .filter((m) => m.content?.includes(`[${MEMORY_INTENT}]`))
      .map((m) => {
        const summary = stripLegacyTags(parseSummaryFromSnippet(m.content ?? '') ?? '');
        return {
          id: m.id,
          kind: (normalizeMemoryKind(m.metadata?.memoryType) ?? MEMORY_KIND_EPISODIC) as MemoryKind,
          command: String(m.metadata?.command ?? ''),
          summary,
          priority: m.metadata?.priority as MemoryPriority | undefined,
          rememberedAt: typeof m.metadata?.rememberedAt === 'string' ? m.metadata.rememberedAt : undefined,
          expiresAt: typeof m.metadata?.expiresAt === 'string' ? m.metadata.expiresAt : undefined,
        };
      });
  }

  async markConsolidated(tenantId: string, id: string, agentKey?: string): Promise<void> {
    const brain = this.brain(tenantId, agentKey);
    const recall = await brain.recall(MEMORY_PREFIX, 200, { minScore: -1 });
    const match = recall.matches.find((m) => m.id === id);
    if (!match?.content) return;
    const summary = stripLegacyTags(parseSummaryFromSnippet(match.content) ?? '');
    await brain.remember({
      command: String(match.metadata?.command ?? 'consolidated'),
      intent: MEMORY_INTENT,
      result: summary,
      metadata: {
        ...match.metadata,
        consolidatedAt: new Date().toISOString(),
      },
    });
  }
}

function parseReflectionMatches(
  matches: Array<{ id: string; score: number; content?: string; metadata?: Record<string, unknown> }>,
  limit: number
): ReflectionMemoryMatch[] {
  const results: ReflectionMemoryMatch[] = [];
  for (const match of matches) {
    if (!match.content?.includes(`[${MEMORY_INTENT}]`)) continue;
    const summary = parseSummaryFromSnippet(match.content ?? '');
    if (!summary) continue;
    const meta = match.metadata;
    results.push({
      id: match.id,
      content: match.content ?? '',
      score: match.score,
      summary: stripLegacyTags(summary),
      timestamp: typeof meta?.rememberedAt === 'string' ? meta.rememberedAt : undefined,
      kind: MEMORY_KIND_REFLECTION,
      priority: meta?.priority as MemoryPriority | undefined,
      reflectionPayload: parseReflectionPayload(meta?.reflectionPayload),
      consolidatedAt:
        typeof meta?.consolidatedAt === 'string' ? meta.consolidatedAt : undefined,
    });
    if (results.length >= limit) break;
  }
  return results;
}

function parseReflectionPayload(raw: unknown): ExperienceReflection | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.intent !== 'string' || typeof obj.goal !== 'string') return undefined;
  return raw as ExperienceReflection;
}

function isLegacyRecallable(match: { content?: string; metadata?: Record<string, unknown> }): boolean {
  if (match.content?.includes('[long_term]')) return true;
  if (match.content?.includes('[interaction]')) return false;
  return match.metadata?.memoryType === 'long_term';
}

function parseSummaryFromSnippet(snippet: string): string | null {
  const arrowIdx = snippet.indexOf('→');
  if (arrowIdx < 0) return null;
  return snippet.slice(arrowIdx + 1).trim() || null;
}

function stripLegacyTags(summary: string): string {
  return summary
    .replace('[long_term]', '')
    .replace('[interaction]', '')
    .replace('[episodic]', '')
    .replace('[semantic]', '')
    .trim();
}

function dedupeMatches(
  matches: Array<{ id: string; score: number; content?: string; metadata?: Record<string, unknown> }>
) {
  const seen = new Set<string>();
  const merged: typeof matches = [];
  for (const match of matches.sort((a, b) => b.score - a.score)) {
    if (seen.has(match.id)) continue;
    seen.add(match.id);
    merged.push(match);
  }
  return merged;
}

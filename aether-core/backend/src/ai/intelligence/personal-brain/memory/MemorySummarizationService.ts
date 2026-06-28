import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';
import { defaultOllamaInference } from '../../../../shared/ai/OllamaInferenceAdapter';
import type { PersonalBrainRegistry } from '../PersonalBrainRegistry';
import type { BrainContext } from '../types';
import { resolveMemoryAgentKey } from './agentKey';
import {
  getReflectionConsolidationMaxPerTenant,
  getReflectionConsolidationMinAgeDays,
  isMemorySummarizationLlmEnabled,
  isReflectionConsolidationEnabled,
  MEMORY_KIND_SEMANTIC,
} from './constants';
import type { LongTermMemoryStore } from './LongTermMemoryStore';
import type { ShortTermMemoryStore } from './ShortTermMemoryStore';

export class MemorySummarizationService {
  constructor(
    private personalBrains: PersonalBrainRegistry,
    private shortTerm: ShortTermMemoryStore,
    private longTerm: LongTermMemoryStore,
    private llm: LlmInferencePort = defaultOllamaInference
  ) {}

  async consolidateTenant(tenantId: string, agentKey?: string): Promise<number> {
    const episodicWritten = await this.consolidateEpisodicAndShortTerm(tenantId, agentKey);
    const reflectionWritten = await this.consolidateReflections(tenantId, agentKey);
    return episodicWritten + reflectionWritten;
  }

  async consolidateReflections(tenantId: string, agentKey?: string): Promise<number> {
    if (!isReflectionConsolidationEnabled()) return 0;

    const minAgeMs = getReflectionConsolidationMinAgeDays() * 24 * 60 * 60 * 1000;
    const maxPerTenant = getReflectionConsolidationMaxPerTenant();
    const now = Date.now();
    const reflections = await this.longTerm.listReflections(tenantId, maxPerTenant * 2, agentKey);

    const eligible = reflections.filter((r) => {
      if (r.consolidatedAt) return false;
      if (!r.timestamp) return true;
      return now - new Date(r.timestamp).getTime() >= minAgeMs;
    });

    if (eligible.length === 0) return 0;

    const grouped = new Map<string, string[]>();
    for (const match of eligible.slice(0, maxPerTenant)) {
      const payload = match.reflectionPayload;
      const key = `${payload?.intent ?? 'general'}:${payload?.trigger ?? 'unknown'}`;
      const learnings =
        payload?.futureLearnings?.length ?
          payload.futureLearnings
        : [match.summary];
      const existing = grouped.get(key) ?? [];
      grouped.set(key, [...existing, ...learnings]);
    }

    const facts = isMemorySummarizationLlmEnabled()
      ? await this.llmSummarizeReflections(grouped)
      : this.heuristicReflectionFacts(grouped);

    let written = 0;
    for (const fact of facts.slice(0, 5)) {
      await this.longTerm.store({
        tenantId,
        agentKey,
        command: 'Geconsolideerd reflectie-patroon',
        intent: 'SEMANTIC',
        summary: fact,
        priority: 'medium',
        memoryKind: MEMORY_KIND_SEMANTIC,
        consolidatedAt: new Date().toISOString(),
      });
      written += 1;
    }

    for (const match of eligible.slice(0, maxPerTenant)) {
      await this.longTerm.markConsolidated(tenantId, match.id, agentKey).catch(() => undefined);
    }

    return written;
  }

  private async consolidateEpisodicAndShortTerm(tenantId: string, agentKey?: string): Promise<number> {
    const shortEntries = await this.shortTerm.list(tenantId, agentKey);
    const recentEpisodic = await this.longTerm.recallEpisodic(tenantId, '', 20, agentKey);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const candidates = [
      ...shortEntries.map((e) => ({
        text: `${e.intent}: ${e.command} → ${e.outcome}`,
        sourceId: e.brainMemoryId,
      })),
      ...recentEpisodic
        .filter((e) => !e.timestamp || new Date(e.timestamp).getTime() >= sevenDaysAgo)
        .map((e) => ({ text: e.summary, sourceId: e.id })),
    ];

    if (candidates.length < 2) return 0;

    const facts = isMemorySummarizationLlmEnabled()
      ? await this.llmSummarize(candidates.map((c) => c.text))
      : this.heuristicSummarize(candidates.map((c) => c.text));

    let written = 0;
    for (const fact of facts.slice(0, 5)) {
      await this.longTerm.store({
        tenantId,
        agentKey,
        command: 'Geconsolideerd patroon',
        intent: 'SEMANTIC',
        summary: fact,
        priority: 'medium',
        memoryKind: MEMORY_KIND_SEMANTIC,
        consolidatedAt: new Date().toISOString(),
      });
      written += 1;
    }

    const brain = this.personalBrains.get(tenantId, resolveMemoryAgentKey(agentKey));
    await brain.updateAgentState({
      lastConsolidatedAt: new Date().toISOString(),
    } as Partial<BrainContext>);

    return written;
  }

  private heuristicReflectionFacts(grouped: Map<string, string[]>): string[] {
    const facts: string[] = [];
    for (const [key, learnings] of grouped) {
      const [intent] = key.split(':');
      const unique = [...new Set(learnings)].slice(0, 2);
      facts.push(`${intent}: ${unique.join('; ')}`.slice(0, 150));
    }
    return facts.slice(0, 3);
  }

  private async llmSummarizeReflections(grouped: Map<string, string[]>): Promise<string[]> {
    const lines = [...grouped.entries()].map(
      ([key, learnings]) => `${key}: ${learnings.join(' | ')}`
    );
    const prompt = `Destilleer deze reflecties tot max 3 generaliseerbare semantische feiten (max 150 tekens).
Geen productnamen, prijzen of SKU's. Geef JSON: { "facts": ["...", "..."] }

Reflecties:
${lines.join('\n')}

Antwoord alleen met geldige JSON.`;

    try {
      const text = await this.llm.generate({ prompt, temperature: 0.2 });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return this.heuristicReflectionFacts(grouped);
      const parsed = JSON.parse(jsonMatch[0]) as { facts?: string[] };
      if (Array.isArray(parsed.facts) && parsed.facts.length > 0) {
        return parsed.facts.map((f) => f.slice(0, 150));
      }
    } catch {
      // fallback
    }
    return this.heuristicReflectionFacts(grouped);
  }

  private heuristicSummarize(texts: string[]): string[] {
    const byIntent = new Map<string, number>();
    for (const text of texts) {
      const intent = text.split(':')[0]?.trim() ?? 'general';
      byIntent.set(intent, (byIntent.get(intent) ?? 0) + 1);
    }
    return [...byIntent.entries()]
      .filter(([, count]) => count >= 2)
      .map(([intent, count]) => `Merchant voerde ${count}x vergelijkbare ${intent}-acties uit`)
      .slice(0, 3);
  }

  private async llmSummarize(texts: string[]): Promise<string[]> {
    const prompt = `Consolideer deze merchant interacties tot max 3 korte semantische feiten (max 150 tekens elk).
Geef JSON: { "facts": ["...", "..."] }

Interacties:
${texts.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Antwoord alleen met geldige JSON.`;

    try {
      const text = await this.llm.generate({ prompt, temperature: 0.2 });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return this.heuristicSummarize(texts);
      const parsed = JSON.parse(jsonMatch[0]) as { facts?: string[] };
      if (Array.isArray(parsed.facts) && parsed.facts.length > 0) {
        return parsed.facts.map((f) => f.slice(0, 150));
      }
    } catch {
      // fallback
    }
    return this.heuristicSummarize(texts);
  }
}

import crypto from 'crypto';
import type { PersonalBrainRegistry } from '../PersonalBrainRegistry';
import type { BrainContext } from '../types';
import { resolveMemoryAgentKey } from './agentKey';
import { getShortTermLimit } from './constants';
import type { MemoryEntry } from './types';

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

export class ShortTermMemoryStore {
  constructor(private personalBrains: PersonalBrainRegistry) {}

  private brain(tenantId: string, agentKey?: string) {
    return this.personalBrains.get(tenantId, resolveMemoryAgentKey(agentKey));
  }

  async list(tenantId: string, agentKey?: string): Promise<MemoryEntry[]> {
    const brain = this.brain(tenantId, agentKey);
    const ctx = await brain.getContext();
    return ctx.shortTermMemory ?? [];
  }

  async append(
    tenantId: string,
    entry: Omit<MemoryEntry, 'id'> & { id?: string },
    agentKey?: string
  ): Promise<MemoryEntry> {
    const brain = this.brain(tenantId, agentKey);
    const ctx = await brain.getContext();
    const limit = getShortTermLimit();
    const full: MemoryEntry = {
      ...entry,
      id: entry.id ?? crypto.randomUUID(),
    };
    const existing = ctx.shortTermMemory ?? [];
    const next = [...existing, full].slice(-limit);
    await brain.updateAgentState({ shortTermMemory: next } as Partial<BrainContext>);
    return full;
  }

  async removeByCommandId(tenantId: string, commandId: string, agentKey?: string): Promise<void> {
    const brain = this.brain(tenantId, agentKey);
    const ctx = await brain.getContext();
    const existing = ctx.shortTermMemory ?? [];
    const next = existing.filter((e) => e.commandId !== commandId);
    if (next.length === existing.length) return;
    await brain.updateAgentState({ shortTermMemory: next } as Partial<BrainContext>);
  }

  async removeByBrainMemoryId(
    tenantId: string,
    brainMemoryId: string,
    agentKey?: string
  ): Promise<void> {
    const brain = this.brain(tenantId, agentKey);
    const ctx = await brain.getContext();
    const existing = ctx.shortTermMemory ?? [];
    const next = existing.filter((e) => e.brainMemoryId !== brainMemoryId);
    if (next.length === existing.length) return;
    await brain.updateAgentState({ shortTermMemory: next } as Partial<BrainContext>);
  }

  async clear(tenantId: string, agentKey?: string): Promise<void> {
    const brain = this.brain(tenantId, agentKey);
    await brain.updateAgentState({ shortTermMemory: [] } as Partial<BrainContext>);
  }

  scoreForQuery(entries: MemoryEntry[], query: string, now = Date.now()): Array<{ entry: MemoryEntry; score: number; ageLabel: string }> {
    const keywords = new Set(extractKeywords(query));
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;

    return entries
      .map((entry, index) => {
        const entryKeywords = extractKeywords(`${entry.command} ${entry.outcome} ${entry.intent}`);
        let overlap = 0;
        for (const kw of entryKeywords) {
          if (keywords.has(kw)) overlap += 1;
        }
        const recencyBoost = 1 - index / Math.max(entries.length, 1);
        const ageMs = now - new Date(entry.timestamp).getTime();
        const recencyFactor = Number.isFinite(ageMs) ? Math.max(0, 1 - ageMs / maxAgeMs) : 0;
        const score = overlap * 0.6 + recencyBoost * 0.25 + recencyFactor * 0.15;
        return {
          entry,
          score,
          ageLabel: formatShortAge(entry.timestamp, now),
        };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
  }
}

function formatShortAge(timestamp: string, now: number): string {
  const then = new Date(timestamp).getTime();
  if (!Number.isFinite(then)) return 'recent';
  const diffHours = Math.floor((now - then) / (60 * 60 * 1000));
  if (diffHours < 1) return 'zojuist';
  if (diffHours < 24) return `${diffHours} uur geleden`;
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? 'gisteren' : `${diffDays} dagen geleden`;
}

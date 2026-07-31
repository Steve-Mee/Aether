import crypto from 'crypto';
import { computeDecayScore } from './MemoryDecayScorer';
import { formatRelativeAge } from './MemoryPromptFormatter';
import type { MemoryKind, MemoryPriority, ScoredMemoryEntry } from './types';

export function toScoredEntry(
  m: {
    id: string;
    summary: string;
    score: number;
    timestamp?: string;
    priority?: MemoryPriority;
  },
  command: string,
  kind: MemoryKind,
  priority?: MemoryPriority,
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

export function dedupeScored(entries: ScoredMemoryEntry[]): ScoredMemoryEntry[] {
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

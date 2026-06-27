import type { MemoryPriority } from './types';

const PRIORITY_WEIGHT: Record<MemoryPriority, number> = {
  high: 1.2,
  medium: 1.0,
  low: 0.8,
};

export interface DecayScoreInput {
  relevanceScore: number;
  timestamp: string;
  priority?: MemoryPriority;
  verifiedUplift?: number;
  goalReached?: boolean;
  now?: number;
}

/** finalScore = relevance × recencyDecay × priorityWeight × impactWeight */
export function computeDecayScore(input: DecayScoreInput): number {
  const now = input.now ?? Date.now();
  const then = new Date(input.timestamp).getTime();
  const ageMs = Number.isFinite(then) ? Math.max(0, now - then) : 0;
  const maxAgeMs = 90 * 24 * 60 * 60 * 1000;
  const recencyDecay = Math.max(0.15, 1 - ageMs / maxAgeMs);

  const priorityWeight = PRIORITY_WEIGHT[input.priority ?? 'medium'];
  let impactWeight = 1;
  if (input.goalReached) impactWeight += 0.15;
  if (input.verifiedUplift != null && Math.abs(input.verifiedUplift) >= 1) {
    impactWeight += Math.min(0.25, Math.abs(input.verifiedUplift) / 20);
  }

  return input.relevanceScore * recencyDecay * priorityWeight * impactWeight;
}

export function applyDecayToEntries<T extends { score: number; timestamp?: string; priority?: MemoryPriority; goalReached?: boolean; verifiedUplift?: number }>(
  entries: T[],
  now = Date.now()
): Array<T & { decayScore: number }> {
  return entries
    .map((e) => ({
      ...e,
      decayScore: computeDecayScore({
        relevanceScore: e.score,
        timestamp: e.timestamp ?? new Date(now).toISOString(),
        priority: e.priority,
        goalReached: e.goalReached,
        verifiedUplift: e.verifiedUplift,
        now,
      }),
    }))
    .sort((a, b) => b.decayScore - a.decayScore);
}

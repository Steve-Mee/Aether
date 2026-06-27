import { computeDecayScore, applyDecayToEntries } from '../MemoryDecayScorer';

describe('MemoryDecayScorer', () => {
  const now = new Date('2026-06-26T12:00:00Z').getTime();

  it('applies recency decay to older entries', () => {
    const recent = computeDecayScore({
      relevanceScore: 0.9,
      timestamp: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      now,
    });
    const old = computeDecayScore({
      relevanceScore: 0.9,
      timestamp: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(),
      now,
    });
    expect(recent).toBeGreaterThan(old);
  });

  it('boosts high priority and goal reached', () => {
    const base = computeDecayScore({
      relevanceScore: 1,
      timestamp: new Date(now).toISOString(),
      priority: 'medium',
      now,
    });
    const boosted = computeDecayScore({
      relevanceScore: 1,
      timestamp: new Date(now).toISOString(),
      priority: 'high',
      goalReached: true,
      verifiedUplift: 5,
      now,
    });
    expect(boosted).toBeGreaterThan(base);
  });

  it('sorts entries by decay score descending', () => {
    const scored = applyDecayToEntries(
      [
        { score: 0.8, timestamp: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString() },
        { score: 0.7, timestamp: new Date(now).toISOString(), goalReached: true },
      ],
      now
    );
    expect(scored[0]!.decayScore).toBeGreaterThanOrEqual(scored[1]!.decayScore);
  });
});

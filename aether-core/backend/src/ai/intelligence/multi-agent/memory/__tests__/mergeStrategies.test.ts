import { mergeByStrategy } from '../mergeStrategies';
import { memoryExpiresAt, defaultRunMemoryTtlMs } from '../runMemoryConfig';
import { SHARED_MEMORY_KEYS } from '../sharedMemorySchema';

describe('mergeStrategies', () => {
  it('mergeById keeps latest price drop per sku', () => {
    const merged = mergeByStrategy('shared', SHARED_MEMORY_KEYS.priceDrops, [
      { sku: 'A', changePct: 5, detectedAt: '2026-01-01T00:00:00Z' },
    ], [{ sku: 'A', changePct: 10, detectedAt: '2026-01-02T00:00:00Z' }]);
    expect(merged).toEqual([
      { sku: 'A', changePct: 10, detectedAt: '2026-01-02T00:00:00Z' },
    ]);
  });

  it('appendUnique dedupes recent decisions', () => {
    const item = { from: 'supplier', timestamp: '2026-01-01T00:00:00Z' };
    const merged = mergeByStrategy('shared', SHARED_MEMORY_KEYS.recentDecisions, [item], [item]);
    expect(merged).toHaveLength(1);
  });
});

describe('memoryExpiresAt', () => {
  it('uses default run TTL for unknown keys', () => {
    const from = Date.parse('2026-01-01T00:00:00Z');
    const exp = memoryExpiresAt('run', 'pricing', 'customKey', from);
    expect(exp.getTime()).toBe(from + defaultRunMemoryTtlMs());
  });
});

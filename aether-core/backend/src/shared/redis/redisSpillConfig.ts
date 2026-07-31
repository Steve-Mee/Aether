export function isRedisSpillEnabled(): boolean {
  return process.env.REDIS_SPILL_ENABLED !== 'false';
}

export function resolveRedisMemorySoftRatio(): number {
  const raw = process.env.REDIS_MEMORY_SOFT_RATIO;
  if (!raw) return 0.75;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 && n < 1 ? n : 0.75;
}

export function resolveRedisMemoryHardRatio(): number {
  const raw = process.env.REDIS_MEMORY_HARD_RATIO;
  if (!raw) return 0.9;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0.9;
}

export function resolveRedisMemoryGovernorMs(): number {
  const raw = process.env.REDIS_MEMORY_GOVERNOR_MS;
  if (!raw) return 30_000;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 5_000 ? n : 30_000;
}

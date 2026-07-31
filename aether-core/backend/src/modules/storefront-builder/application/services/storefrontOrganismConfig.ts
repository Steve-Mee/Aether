/** Storefront organism autonomy (self-heal + wall triggers). Opt-out via STOREFRONT_ORGANISM_ENABLED=false. */

export function isStorefrontOrganismEnabled(): boolean {
  return process.env.STOREFRONT_ORGANISM_ENABLED !== 'false';
}

/** Consecutive failed builds before wall trigger + self-heal attempt. */
export function resolveBuildWallFailureThreshold(): number {
  const raw = process.env.STOREFRONT_BUILD_WALL_FAILURES;
  if (!raw) return 3;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 2 ? n : 3;
}

/** Health scan interval (default 60s). */
export function resolveOrganismIntervalMs(): number {
  const raw = process.env.STOREFRONT_ORGANISM_INTERVAL_MS;
  if (!raw) return 60_000;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 5_000 ? n : 60_000;
}

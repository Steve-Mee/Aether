# Frontend Performance

Performance optimizations for the AETHER admin frontend. Measure with `npm run build` and inspect `dist/assets/`.

## Bundle analysis

```bash
cd aether-core/frontend
npm run build              # production build
npm run build:analyze      # build + stats.html treemap (rollup-plugin-visualizer)
```

Open `stats.html` in the browser after `build:analyze` (generated at repo root of `frontend/`, gitignored).

### Audit snapshot (2026-06-11, `build:analyze`)

| Chunk | Raw | Gzip | Role |
|-------|-----|------|------|
| `index-cnEB4Hll.js` | 382 KB | **96 KB** | App bootstrap + core |
| `vendor-C225wmFg.js` | 347 KB | 108 KB | React, router, shared libs |
| `WLGSOJG7-goIWxArU.js` | 227 KB | **64 KB** | i18n catalog (largest shared after vendor) |
| `index-x_YiO0eu.js` | 45 KB | 16 KB | Secondary bootstrap |
| `query-B2-UReSp.js` | 58 KB | 19 KB | TanStack Query |
| `radix-B24yXNjl.js` | 68 KB | 23 KB | Radix UI |
| `CommandPalette-DgVx8Vnp.js` | 6 KB | 2 KB | Deferred until Cmd+K |
| `AISidecar-DGgrnz1o.js` | 11 KB | 3 KB | Deferred off command-center home |

**Initial JS (login → shell path, gzip):** vendor (108) + app core (96) + bootstrap (16) ≈ **220 KB** vs previous single chunk **263 KB**.

## Before / after (2026-06-11)

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Main entry chunk (raw) | 917 KB (`index-*.js`) | 382 KB (`index-cnEB4Hll.js`) | **−58%** |
| Main entry chunk (gzip) | 263 KB | 96 KB | **−63%** |
| React Query Devtools in prod | 231 KB / 66 KB gzip | removed (dev-only lazy) | **−66 KB gzip** |
| Vendor chunk | (bundled in main) | 347 KB / 108 KB gzip | cacheable |
| CommandPalette + AISidecar | in main shell | interaction-deferred lazy chunks | off critical path |
| Insights demo data | in Insights chunk | dynamic import (`insightsPageDemo.data.ts`) | separate chunk |

## Code splitting

- **Routes:** all pages lazy-loaded via [`appRoutes.tsx`](../src/lib/navigation/appRoutes.tsx).
- **Shell:** `CommandPalette` is always mounted (Radix `open` prop); lazy-loaded via `Suspense`. `AISidecar` only when not on command-center home ([`AppShell.tsx`](../src/components/AppShell.tsx)).
- **Devtools:** `@tanstack/react-query-devtools` lazy-loaded only when `env.isDev`.
- **Insights demo:** [`insightsPageDemo.data.ts`](../src/lib/insightsPageDemo.data.ts) loaded on demand in `useInsightsPage`.

## Nav prefetch

On sidebar hover/focus ([`MinimalSidebar.tsx`](../src/components/navigation/MinimalSidebar.tsx)) and mobile nav touch/focus ([`MobileNav.tsx`](../src/components/MobileNav.tsx)):

1. **Query prefetch** — [`navPrefetch.ts`](../src/lib/navigation/navPrefetch.ts) warms TanStack Query cache.
2. **Chunk prefetch** — [`prefetchPageChunk.ts`](../src/lib/navigation/prefetchPageChunk.ts) triggers route dynamic imports.

## TanStack Query tuning

Defaults in [`client.ts`](../src/lib/query/client.ts):

| Setting | Value |
|---------|-------|
| `staleTime` (default) | 30s |
| `refetchOnWindowFocus` | false |
| Settings | stale 5m, gc 30m |
| Activity (100 items) | stale 60s, gc 10m |
| Insights reports | stale 60s, gc 10m |
| Drawer queries | stale 2m, gc 5m |

**Activity cache keys** include `limit` to prevent home (5), approvals (50), and activity page (100) from sharing one cache entry.

**Period switching:** `keepPreviousData` on Insights and Activity queries avoids loading flashes.

**Home landing invalidation:** explicit invalidation of `activity({ days: 7, limit: 5 })`, `approvals.list`, `suppliers.overview`.

## Live updates

- **SSE dashboard:** [`useDashboardStream.ts`](../src/lib/useDashboardStream.ts) — fallback poll 60s (was 30s), skips fetch when cache is fresh.
- **Invalidation bridge:** [`QueryInvalidationBridge.tsx`](../src/lib/query/QueryInvalidationBridge.tsx) — 300ms debounce batches rapid live-bus events.

## Production build

[`vite.config.ts`](../vite.config.ts):

- `target: es2020`
- `sourcemap: hidden` (Sentry-ready, not public)
- `manualChunks`: vendor, query, radix
- `chunkSizeWarningLimit: 500`

**Environment:** use [`env.ts`](../src/lib/config/env.ts); set `VITE_AETHER_API_KEY` in production (console warning if default dev key is used).

## Bundle size gate (CI)

[`size-limit`](https://github.com/ai/size-limit) runs on every PR after `npm run build`. Budgets in [`.size-limit.json`](../.size-limit.json) (brotli size, ~10% headroom above baseline).

```bash
npm run build
npm run size:check
```

## Core Web Vitals baseline

### Local

```bash
npm run build && npm run preview -- --host 127.0.0.1 --port 4173
node scripts/lighthouse-cwv.mjs
```

Optional minimum score (default `0.75`; CI weekly uses `0.60` until LCP improves):

```bash
LH_MIN_SCORE=0.75 node scripts/lighthouse-cwv.mjs
```

| Route | LCP | CLS | FCP | Perf score |
|-------|-----|-----|-----|------------|
| `/command-center` | 4.1 s | 0 | 3.5 s | 0.69 |
| `/insights` | 4.2 s | 0 | 3.6 s | 0.63 |

CLS is stable (0). LCP is dominated by JS parse on cold preview — repeat with auth + CDN for production targets. **Stretch target:** performance score ≥ 0.75 per route.

### Weekly CI

[`.github/workflows/lighthouse-weekly.yml`](../../../.github/workflows/lighthouse-weekly.yml) runs Mondays 06:00 UTC (and on manual dispatch):

1. Production build + preview on `:4173`
2. `node scripts/lighthouse-cwv.mjs` with `LH_MIN_SCORE=0.60` (regression gate)
3. Upload `.lighthouse-cwv-summary.json` as artifact

## Verification

```bash
npm run verify:ci
npm run verify:ci:e2e
```

E2E visual/a11y specs use [`e2e/visual/setup.ts`](../e2e/visual/setup.ts) (`setupVisualPage` = auth session + mocked admin API).

## Remaining attention points

- **i18n:** full NL+EN catalog in [`lib/i18n`](../src/lib/i18n) — locale-based splitting is the largest next win (~64 KB gzip).
- **UI/data barrels:** `@/components/ui` and `@/lib/data` — migrate hot paths to direct imports if visualizer shows benefit.
- **Pre-compressed assets:** add `vite-plugin-compression` only if static hosting does not gzip/brotli on the fly.

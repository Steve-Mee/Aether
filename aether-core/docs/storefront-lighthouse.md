# Storefront runtime — Lighthouse budgets

Local/CI guidance for `aether-core/storefront-runtime` (Next.js allowlisted host).

## Budgets (mobile, simulated 4G)

| Metric | Budget | Notes |
|--------|--------|-------|
| Performance score | ≥ 85 | Fixture + live tenant slug |
| LCP | ≤ 2.5s | Hero + ProductGrid above-the-fold |
| CLS | ≤ 0.1 | Reserve image aspect-ratio (ProductGrid) |
| INP / TBT | ≤ 200ms / ≤ 300ms | Avoid heavy client JS in blocks |
| Accessibility | ≥ 90 | Landmarks, alt, empty states |
| Best practices / SEO | ≥ 90 | Tokens + page SEO JSON |

## ProductGrid performance basics

- Cap visible products via `limit` prop (default 24).
- Images use intrinsic `aspect-ratio: 1` + `loading="lazy"` + empty `alt` when decorative beside product name.
- Prefer CSS grid; no client-side virtualization until catalogs exceed ~100 visible SKUs.
- Empty state uses `role="status"` (no layout shift from missing cards).

## How to measure

```bash
cd aether-core/storefront-runtime
npm run build && npm start
# Fixture (no backend): http://localhost:4177/lh-fixture
# Live: http://localhost:4177/{tenantSlug} with STOREFRONT_PUBLIC_API_ENABLED=true
npm run lighthouse:ci
```

## CI gate

1. Doc assert: `assert-storefront-lighthouse-budgets.js` (budget markers + port **4177**).
2. **Chrome Lighthouse** against `/lh-fixture` after `next build` + `next start` on **localhost:4177** (`scripts/lighthouse-budgets.mjs`).
3. Artifacts uploaded as `storefront-lighthouse-*`.

Manual Lighthouse against a live tenant slug remains recommended for pilot demos.

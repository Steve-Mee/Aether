# AETHER Storefront Runtime

Next.js App Router host that renders **allowlisted** PageTrees from the public Storefront API. No merchant arbitrary code execution.

## Prerequisites

- Node.js 20.x
- AETHER Core backend with `STOREFRONT_PUBLIC_API_ENABLED` (public `/api/storefront/*`)

## Setup

```bash
cd aether-core/storefront-runtime
cp .env.example .env.local
# edit NEXT_PUBLIC_AETHER_API_BASE if needed (default http://localhost:9000)
npm install
npm run dev
```

Dev / preview server: [http://localhost:4177](http://localhost:4177) (`STOREFRONT_PREVIEW_PORT`, Appendix G).

## Routes

| Mode | URL |
|------|-----|
| Live | `/{tenantSlug}` or `/{tenantSlug}/products` |
| Preview | `/preview/{revisionId}?token={hmac}&slug={tenantSlug}` |

Optional preview path: `&path=/about` (default `/`).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js on port **4177** |
| `npm run build` | Production build |
| `npm start` | Serve production build on **4177** |
| `npm test` | Vitest (PageTreeRenderer + Appendix H fixture) |
| `npm run lint` | `tsc --noEmit` |

## Admin iframe handoff (P10)

Point the Website admin preview iframe at:

```
http://localhost:4177/preview/{revisionId}?token={hmac}&slug={project.slug}
```

- `previewUrl` from `GET /api/website/preview/:revisionId` already includes `token` and uses port **4177**.
- Append `&slug=<project.slug>` if missing (public API is slug-scoped).
- Never put admin API keys in the iframe URL.

## Security

- Consumes **public** Storefront API only.
- Unknown block types → safe fallback UI (no eval / no remote code).
- Publish remains an Approvals concern in Core — this package only renders.

## Performance

Lighthouse budgets and ProductGrid notes: [`../docs/storefront-lighthouse.md`](../docs/storefront-lighthouse.md).

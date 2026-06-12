# AETHER Admin Frontend

Intent-first merchant cockpit for AETHER Core v0.8.1+.

## Features

- **Intent-first cockpit** (`/`) — NL command timeline, quick intents, outcome metrics
- **⌘K Command palette** — keyboard-driven command OS with suggested commands
- **Proactive sidecar** — realtime signals (30s poll): approvals, margin, mail, uplift
- **Unified workstream** (`/workstream`) — Mail + Supplier + Autonomy priority stream
- **Decision intelligence** — approval cards with risk bands + explain drawer
- **Voice input** — Web Speech API stub (Chrome/Edge)
- **Design system v1** — tokens, Card/Button/AsyncBoundary primitives
- **Mobile shell** — collapsible nav, bottom command trigger
- **i18n foundation** — NL default via `lib/i18n.ts`

## Architecture

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the full foundation:

- **App shell:** nested React Router layouts (`AppShell` + `<Outlet />`)
- **Server state:** TanStack Query (cache, mutations, optimistic updates)
- **Client state:** Zustand (sidebar, command palette, notification panel UI)
- **API layer:** `lib/api/` with typed errors, retry, and mock/live adapter switch
- **Auth:** stub `AuthProvider` by default; `VITE_AUTH_PROVIDER=jwt` for backend login
- **Route registry:** single source in `lib/navigation/routes.ts`

**TanStack Query Devtools** appear bottom-left in dev mode.

## Testing

See **[docs/testing.md](./docs/testing.md)** for the full pyramid and mocking guide.

```bash
npm run lint              # TypeScript check
npm run lint:eslint       # ESLint
npm run format:check      # Prettier
npm test                  # Vitest unit + integration
npm run test:coverage     # Coverage report (lib + hooks)
npm run build && npm run test:flows   # Critical Playwright flows
```

## CI/CD

Every push and pull request to `main` or `develop` (when `aether-core/**` changes) runs the GitHub Actions workflow at [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).

The **`frontend`** job runs in parallel with backend and executes:

1. TypeScript, ESLint, Prettier
2. Vitest unit/integration tests
3. UI copy verification (`verify:copy`)
4. Production + staging Vite builds
5. Bundle size check (`size:check`)
6. Playwright flows, visual regression, and a11y (axe + keyboard)
7. Production dependency audit (`audit:ci`); dev audit informational (`audit:ci:dev`)

Reproduce CI locally:

```bash
npm ci
npm run verify:ci          # lint, test, build, audit (~2 min)
npx playwright install chromium
npm run verify:ci:e2e      # + Playwright flows, visual, a11y
```

Or step-by-step:

```bash
npm run lint && npm run lint:eslint && npm run format:check
npm test && npm run verify:copy && npm run build
npm run test:flows && npm run test:visual && npm run test:a11y
npm run audit:ci
```

Branch protection, review requirements, and optional preview deployments: **[CONTRIBUTING.md](../../CONTRIBUTING.md)**.

## Environment setup

Vite reads env from **`aether-core/.env`** (parent directory). Copy the template:

```bash
cp ../.env.example ../.env
```

| Mode | Command |
|------|---------|
| Live API + dev proxy (default) | `npm run dev` — uses `aether-core/.env.development` |
| Offline mock | `VITE_USE_MOCK=true npm run dev` |
| API-only staging build | `npm run build:staging` — uses `aether-core/.env.staging` |
| Production build | `npm run build` — uses `aether-core/.env.production` |

See **[docs/API_INTEGRATION.md](./docs/API_INTEGRATION.md)** for the full mock/live matrix, API client docs, and backend checklist.

## Docs

- [API Integration](./docs/API_INTEGRATION.md)
- [Architecture](./ARCHITECTURE.md)
- [Testing](./docs/testing.md)
- [UI gap matrix](../docs/ui-gap-matrix.md)
- [P0 interaction spec](../docs/ui-p0-interaction-spec.md)
- [P1 autonomy experience](../docs/ui-p1-autonomy-experience.md)
- [P2 quality gates](../docs/ui-p2-quality-gates.md)
- [P3 boundary concepts](../docs/ui-p3-boundary-concepts.md)

## How to run

```bash
npm install
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:9000 (Command Bar + sidecar require API)

## Keyboard

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open command palette |
| `/` | Focus command bar |
| `Esc` | Close palette / explain drawer |

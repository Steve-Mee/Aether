# API Integration Guide

How the AETHER frontend connects to AETHER Core — mock vs live, configuration, and backend onboarding.

---

## Quick start

1. Copy the monorepo env template:

   ```bash
   cp aether-core/.env.example aether-core/.env
   ```

2. Set `AETHER_API_KEY` in `.env` (backend) and `VITE_AETHER_API_KEY` to the same value.

3. Start backend and frontend:

   ```bash
   # Terminal 1 — backend (port 9000)
   cd aether-core/backend && npm run dev

   # Terminal 2 — frontend (port 5173, proxies /api → 9000)
   cd aether-core/frontend && npm run dev
   ```

4. Open http://localhost:5173 — live mode uses the real API by default.

**Offline UI (no backend):**

```bash
VITE_USE_MOCK=true npm run dev
```

---

## Environment files

Vite reads env from **`aether-core/`** (parent of `frontend/`), configured in `vite.config.ts` (`envDir`).

| File | When loaded |
|------|-------------|
| `.env` | All modes (gitignored — your local secrets) |
| `.env.development` | `npm run dev` (committed template) |
| `.env.staging` | `npm run build:staging` (committed template) |
| `.env.production` | `npm run build` (committed template) |
| `.env.example` | Template — copy to `.env` |

All reads go through [`src/lib/config/env.ts`](../src/lib/config/env.ts). Application code must **not** use `import.meta.env` directly.

---

## Mock vs Live

### Primary switch

| Variable | Values | Default |
|----------|--------|---------|
| `VITE_USE_MOCK` | `true` / `false` | *(unset)* |
| `VITE_DATA_SOURCE` | `mock` / `live` | `live` |

**Precedence:** `VITE_USE_MOCK` overrides `VITE_DATA_SOURCE`.

```bash
# Option A — explicit mock flag
VITE_USE_MOCK=true npm run dev

# Option B — data source
VITE_DATA_SOURCE=mock npm run dev
```

The switch is implemented in [`createDataAdapter.ts`](../src/lib/data/createDataAdapter.ts):

- `mock` → `mockDataAdapter` (offline demo data)
- `live` → `httpDataAdapter` (real HTTP via `apiFetch`)

No page or hook code changes are needed to switch modes.

### Demo layers (separate from mock/live)

| Layer | Variable | Purpose |
|-------|----------|---------|
| **Offline mock** | `VITE_DATA_SOURCE=mock` | Full adapter swap — all data from `*PageDemo.ts` |
| **Hybrid padding** | `VITE_HYBRID_DEMO` | In live mode, pad thin API responses (activity, insights) |
| **Suppliers demo** | `VITE_SUPPLIERS_DEMO` | Force demo suppliers when API is empty |
| **Live demo UI** | `VITE_LIVE_DEMO` | Opt-in (`true`/`1`): simulated notifications every ~12–18s; seeds notification inbox in live mode. **Default off** when unset. |
| **Command demo** | `localIntentMatcher` | Local NL intent matching (always available) |

For staging/production backend integration, disable demo layers:

```env
VITE_HYBRID_DEMO=false
VITE_LIVE_DEMO=false
VITE_SUPPLIERS_DEMO=false
```

### Per-environment matrix

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| `VITE_DATA_SOURCE` | `live` | `live` | `live` |
| `VITE_API_URL` | empty (proxy) | explicit URL | empty or explicit |
| `VITE_HYBRID_DEMO` | `true` | `false` | `false` |
| `VITE_LIVE_DEMO` | unset (off) | `false` | `false` |
| `VITE_AETHER_API_KEY` | optional | required | required |
| `VITE_SENTRY_DSN` | empty | recommended | recommended |
| `VITE_SENTRY_ENV` | — | `staging` | `production` |
| `VITE_APP_VERSION` | — | git SHA / semver | git SHA / semver |
| `VITE_SENTRY_DEV` | `true` to test locally | — | — |

---

## Data flow

```
Page / Hook
  → feature api.ts (e.g. features/approvals/api.ts)
    → repository (lib/data/repositories/)
      → getDataAdapter() → mockAdapter | httpAdapter
        → apiFetch (lib/api/client.ts)
          → AETHER Core REST API
```

TanStack Query wraps reads/mutations in `lib/query/hooks.ts` (`useAetherQuery`, `useAetherMutation`).

Type contracts live in:
- [`DataAdapter.ts`](../src/lib/data/adapters/DataAdapter.ts) — adapter interface
- [`src/types/`](../src/types/) — domain request/response types
- [`lib/api/routes.ts`](../src/lib/api/routes.ts) — REST path registry

---

## API client

Import from `@/lib/api`:

```typescript
import { apiFetch, apiRoutes } from '@/lib/api';

const approvals = await apiFetch(apiRoutes.approvals.list);
```

### Request headers (every call)

| Header | Source |
|--------|--------|
| `Content-Type` | `application/json` |
| `X-Aether-Api-Key` | `VITE_AETHER_API_KEY` |
| `X-Aether-Tenant-Id` | Auth session or `VITE_AETHER_TENANT` |
| `Authorization` | `Bearer <token>` when JWT auth is active |
| `X-Request-Id` | Auto-generated UUID per request |

All requests use `credentials: 'include'` so the HttpOnly refresh cookie (`aether_refresh`) is sent on auth refresh. Access tokens live in `sessionStorage` only.

### Retry policy

- **GET/HEAD:** up to 3 retries on 408, 429, 5xx, or network failure (exponential backoff)
- **POST/PATCH/PUT/DELETE:** no retry by default
- TanStack Query may retry queries once more (`failureCount < 2` + retryable error)

### Timeout & abort

Default timeout: 30 seconds. Override per call:

```typescript
await apiFetch('/api/approvals', {}, { timeoutMs: 10_000, signal: abortController.signal });
```

### Error taxonomy

[`lib/api/errors.ts`](../src/lib/api/errors.ts):

- `ApiError` — HTTP 4xx/5xx with parsed `{ error: string }` body
- `NetworkError` — fetch failure, timeout, abort
- `classifyError()` → `{ kind, retryable, status }`
- `toUserMessage()` → i18n user-facing string

Errors are logged via `logger` and reported via `errorReporter` (see below).

### Dev proxy

When `VITE_API_URL` is empty in development, Vite proxies `/api/*` to `http://localhost:9000`. Set an explicit URL for cross-origin staging/production builds.

---

## Backend connection checklist

1. **API key parity** — `VITE_AETHER_API_KEY` must equal backend `AETHER_API_KEY`
2. **Tenant ID** — `VITE_AETHER_TENANT` must match a valid tenant in the database
3. **CORS** — not needed when using same-origin proxy or reverse proxy; required for cross-origin `VITE_API_BASE_URL`
4. **Database** — backend migrations applied (`npx prisma migrate deploy`)
5. **Disable demo layers** — set `VITE_HYBRID_DEMO=false`, `VITE_LIVE_DEMO=false` for pure API data
6. **JWT auth** — set `VITE_AUTH_PROVIDER=jwt` and matching `AETHER_JWT_SECRET` on backend (min 16 chars)

**Notifications inbox (`GET /api/admin/notifications`):** Live mode fetches the API inbox and merges optional demo seed when `VITE_HYBRID_DEMO` or `VITE_LIVE_DEMO` is enabled. With both disabled, the inbox shows **API data only** (activity-derived + pending approvals summary).

### Verify connection

```bash
# Backend health
curl -H "X-Aether-Api-Key: YOUR_KEY" -H "X-Aether-Tenant-Id: tenant_default" \
  http://localhost:9000/api/admin/dashboard

# Frontend live mode
VITE_DATA_SOURCE=live npm run dev
```

---

## Error monitoring

Reporting is abstracted in [`lib/observability/errorReporter.ts`](../src/lib/observability/errorReporter.ts).

**Default (no config):** errors go to structured console logger.

**Enable Sentry:**

```env
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project
VITE_SENTRY_ENV=production
VITE_APP_VERSION=0.8.1
# VITE_SENTRY_DEV=true   # optional — local dev only
```

Sentry initializes before first render (`main.tsx` bootstrap). Active only when DSN is set and not in dev (unless `VITE_SENTRY_DEV=true`). Errors are captured from:

- `apiFetch` / `apiStreamFetch` — network and 5xx failures (not 401/422)
- `ErrorBoundary` — React render crashes
- TanStack Query/Mutation caches — failed queries and unhandled mutations (deduped)
- `window.onerror` / `unhandledrejection` — global uncaught errors

Business events (`command.executed`, `approval.bulk_resolved`, etc.) go through `lib/observability/businessEvents.ts`. User/tenant/route context is set by `ObservabilityBridge`. Performance spans use `lib/observability/performanceSpans.ts`.

`apiFetch` propagates `sentry-trace` and `baggage` to the backend when Sentry is active, linking frontend and server traces.

Build uses hidden sourcemaps (`vite.config.ts`). Upload in CI when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and `VITE_SENTRY_DSN` are set. See [`docs/error-handling.md`](error-handling.md#observability-sentry).

---

## Testing mocks (not runtime)

| Layer | Tool | Scope |
|-------|------|-------|
| Unit/integration | `createTestDataAdapter()` | Vitest — inject mock adapter |
| HTTP contract | MSW (`src/test/handlers/`) | Vitest — verify `httpAdapter` paths |
| E2E/visual | Playwright `page.route` | Browser — intercept HTTP in preview |

See [testing.md](./testing.md) for details. E2E mocks do not affect runtime mock/live switching.

---

## JWT authentication

Enable on both sides:

```env
# Backend (aether-core/.env)
AETHER_JWT_SECRET=your-secret-min-16-chars
AETHER_JWT_EXPIRES_IN=15m
AETHER_REFRESH_EXPIRES_IN=7d
AETHER_CORS_ORIGINS=http://localhost:5173
AETHER_SEED_USER_PASSWORD=AetherDev2026!

# Frontend
VITE_AUTH_PROVIDER=jwt
```

**Endpoints** (`apiRoutes.auth`):

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/login` | Public — body: `{ email, password, tenantId? }` |
| POST | `/api/auth/refresh` | Public — HttpOnly `aether_refresh` cookie |
| GET | `/api/auth/session` | Bearer JWT |
| POST | `/api/auth/logout` | Public — revokes refresh cookie |

Users are resolved from the `User` table (`tenantId` + `email` + Argon2id `passwordHash`). Seed users: `admin@aether.local`, `ops@aether.local`, `view@aether.local` (password from `AETHER_SEED_USER_PASSWORD`).

**Token storage:**
- Access token: `sessionStorage` (`aether.session.v1`) — sent as `Authorization: Bearer`
- Refresh token: HttpOnly cookie only (never in JS)
- All API calls use `credentials: 'include'` for cookie refresh

On HTTP 401 the client attempts `POST /api/auth/refresh` once before `signOut()`.

---

## Notifications inbox (read state)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/notifications?limit=30` | Derived inbox merged with per-user read/dismiss state |
| PATCH | `/api/admin/notifications/:id/read` | Mark one notification read |
| POST | `/api/admin/notifications/mark-all-read` | Mark all (optional body `{ ids: string[] }`) |
| DELETE | `/api/admin/notifications/:id` | Dismiss notification |

Read state is scoped by `tenantId` + `actorId` (JWT user id or API-key actor). In mock mode the frontend keeps read state in-memory only.

---

## Next steps for full backend integration

1. Email channel for outbound merchant notifications
2. Enable Sentry DSN in production deployment
3. Password reset / invite flows

# Error handling

How AETHER frontend surfaces failures without crashing or duplicating retries.

## Error taxonomy

Defined in [`src/lib/api/errors.ts`](../src/lib/api/errors.ts):

| Kind | Typical source | User message (i18n) | Retryable |
|------|----------------|---------------------|-----------|
| `network` | `fetch` failed, `NetworkError` | `api.error.network` | Yes |
| `timeout` | HTTP 408 | `api.error.timeout` | Yes |
| `rate_limit` | HTTP 429 | `api.error.rate_limit` | Yes |
| `server` | HTTP 5xx | `api.error.server` | Yes |
| `auth` | HTTP 401/403 | `api.error.auth` | No |
| `validation` | HTTP 400/422 | Server message or `api.error.validation` | No |
| `unknown` | Other | Error message | No |

Use `classifyError(err)` for retry policy; use `toUserMessage(err)` for UI.

## Retry layers (do not stack blindly)

1. **Transport** — `apiFetch` retries GET/HEAD up to 3× on retryable status or network (`src/lib/api/client.ts`).
2. **TanStack Query** — `retry: (count, err) => count < 2 && classifyError(err).retryable` (`src/lib/query/client.ts`).
3. **Mutations** — `retry: false` by default; use `useAetherMutation` for consistent logging/toast.

Reads may therefore retry at both transport and query level; that is intentional for flaky networks.

## UX policy

| Failure type | UI |
|--------------|-----|
| Initial page load | `AsyncBoundary` → `ErrorState` (no toast) |
| Mutation | `showErrorToast` via `useAetherMutation` (override with `silentToast`) |
| React render throw | `ErrorBoundary` → calm copy; dev shows raw message |
| App-root crash | `CriticalErrorDialog` (reload / Command Center) |

## Logging

[`src/lib/observability/logger.ts`](../src/lib/observability/logger.ts) — structured entries, console in dev, JSON in prod. Level via `VITE_LOG_LEVEL` (`debug` | `info` | `warn` | `error`).

Logged automatically: failed `apiFetch`, `QueryCache`/`MutationCache` errors, boundary catches.

## Mock vs live

`VITE_DATA_SOURCE=mock` routes all repository calls through `mockDataAdapter` (offline UI). `live` uses `httpDataAdapter` → same REST paths as production.

## Auth

When `VITE_AUTH_PROVIDER=jwt`, HTTP 401 triggers `setOnUnauthorized` → `signOut()` in `AuthProvider`.

## Mutations

All write paths use `useAetherMutation` from [`src/lib/query/hooks.ts`](../src/lib/query/hooks.ts) with `meta.domain` for logging. Optimistic updates use [`src/lib/query/optimistic.ts`](../src/lib/query/optimistic.ts) (`optimisticListRemove`, `optimisticPatch`, `rollbackQueryData`).

Telemetry (`navigation` ui-events) goes through `adminRepository.trackUiEvent` (mock no-op).

## Observability (Sentry)

Error monitoring uses [Sentry](https://sentry.io) via [`src/lib/observability/errorReporter.ts`](../src/lib/observability/errorReporter.ts). Sentry is **off by default in development** unless `VITE_SENTRY_DSN` and `VITE_SENTRY_DEV=true` are set.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_SENTRY_DSN` | Sentry project DSN — enables reporting when set |
| `VITE_SENTRY_ENV` | Environment tag (`staging`, `production`) |
| `VITE_APP_VERSION` | Release name in Sentry |
| `VITE_SENTRY_DEV` | Set `true` to test Sentry locally |
| `VITE_SENTRY_REPLAY_ENABLED` | Enable session replay in staging (`true`) |
| `VITE_SENTRY_REPLAY_SESSION_RATE` | Fraction of sessions recorded (default `0`) |
| `VITE_SENTRY_REPLAY_ERROR_RATE` | Fraction of error sessions recorded (default `0.1` prod) |

Recommended replay rates: **production** session `0`, error `0.1`; **staging** session `0.05`, error `0.25`.

CI/deploy sourcemap upload (not exposed to the browser):

| GitHub secret | Purpose |
|---------------|---------|
| `VITE_SENTRY_DSN` | Enables `@sentry/vite-plugin` upload during `npm run build` |
| `SENTRY_AUTH_TOKEN` | Sentry auth token (org:ci scope) |
| `SENTRY_ORG` | Sentry organization slug |
| `SENTRY_PROJECT` | Sentry project slug (frontend) |
| `SENTRY_BACKEND_PROJECT` | Optional separate Sentry project for backend sourcemaps (falls back to `SENTRY_PROJECT`) |

When secrets are unset, CI builds succeed without sourcemap upload. Configure all four in staging/production repos for readable stack traces.

Backend uses `SENTRY_DSN`, `SENTRY_ENV`, `APP_VERSION` — see [`backend/README.md`](../../backend/README.md). Staging verification: [`observability-runbook.md`](../../docs/observability-runbook.md).

### What is captured

| Source | Examples |
|--------|----------|
| React | `ErrorBoundary`, app-root `CriticalErrorDialog` |
| Global | `window.onerror`, unhandled promise rejections |
| API | `apiFetch`, `apiStreamFetch` — network/5xx only |
| TanStack Query | Query/mutation failures (deduped, filtered) |

**Not sent to Sentry:** HTTP 401/403, 400/422 validation, user-aborted requests, `meta.handled` mutation errors.

### Business events

[`src/lib/observability/businessEvents.ts`](../src/lib/observability/businessEvents.ts) tracks merchant actions as info-level events:

- `command.executed`, `command.undo`
- `approval.resolved`, `approval.bulk_resolved`, `approval.auto_apply`
- `supplier.synced`, `supplier.created`, `supplier.settings_updated`
- `autonomous.executed`
- `settings.updated`, `outcomes.reconciled`
- `auth.sign_in`, `auth.sign_out`
- `truth.review_submitted`, `notification.read`
- `mutation.failed`

### Performance spans

[`src/lib/observability/performanceSpans.ts`](../src/lib/observability/performanceSpans.ts) wraps critical flows for Sentry Performance:

- `approval.bulk_resolve`, `approval.resolve`
- `command.execute`, `supplier.sync`

Backend mirrors: `command.execute`, `approval.resolve`, `supplier.monitor`.

### Distributed tracing

`apiFetch` sends `sentry-trace` and `baggage` headers when Sentry is active. The backend continues the trace in `tracingMiddleware` so frontend errors link to backend spans.

### Context attached to errors

- User id (no email/name)
- `tenantId`, current route `module`, `pathname`
- Last command intent/id (not raw NL text)
- Request path, method, `requestId` for API failures

### Viewing errors

1. Create a Sentry project and copy the DSN into deployment secrets.
2. Set `VITE_SENTRY_ENV` and `VITE_APP_VERSION` at build time.
3. Open the Sentry dashboard → Issues, filtered by environment/release.
4. For readable stack traces, configure `SENTRY_AUTH_TOKEN` in CI so sourcemaps upload on `build:staging` / `build`.

### PII policy

Tokens, API keys, emails, passwords, and raw command strings are redacted in `beforeSend`. Never log secrets in mutation context.

## Verification

```bash
cd aether-core/frontend
npm test
npm run verify:ui
```

### Mock smoke (offline, no backend)

```bash
# In aether-core/.env or frontend .env:
# VITE_DATA_SOURCE=mock
npm run dev
```

Open each sidebar module once; confirm no red error states on first load:

- Command Center, Workstream, Approvals, Insights, Timeline
- Suppliers, Products, Orders, Emails, Autonomous, Negotiations, Outcomes
- Settings (sections: policy, connections, metrics)

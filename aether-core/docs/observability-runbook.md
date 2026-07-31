# Observability Runbook — Sentry

Staging/production verification for frontend + backend error monitoring.

## Prerequisites

### GitHub secrets (CI + deploy)

| Secret | Used by |
|--------|---------|
| `VITE_SENTRY_DSN` | Frontend build + runtime |
| `SENTRY_AUTH_TOKEN` | CI sourcemap upload |
| `SENTRY_ORG` | CI sourcemap upload |
| `SENTRY_PROJECT` | Frontend CI sourcemap upload |
| `SENTRY_BACKEND_PROJECT` | Backend CI sourcemap upload (optional, separate project) |
| `SENTRY_DSN` | Backend runtime |

### Runtime env (staging)

```bash
# Frontend
VITE_SENTRY_DSN=...
VITE_SENTRY_ENV=staging
VITE_APP_VERSION=<git-sha-or-semver>

# Backend
SENTRY_DSN=...
SENTRY_ENV=staging
APP_VERSION=<same release id>
```

## 1. Verify sourcemap upload (CI)

1. Push to a branch with Sentry secrets configured.
2. Open the CI `Build` or `Staging build` job log.
3. Confirm `@sentry/vite-plugin` reports sourcemap upload (no upload errors).
4. In Sentry → Releases → select release matching `VITE_APP_VERSION` / `github.sha`.
5. Confirm artifacts are attached.

## 0. Pre-flight check (local / CI)

```bash
cd aether-core
node scripts/verify-observability-setup.js
```

Configure missing GitHub secrets (values from Sentry → Settings → Auth Tokens / Client Keys):

```bash
gh secret set VITE_SENTRY_DSN
gh secret set SENTRY_AUTH_TOKEN   # org:ci scope
gh secret set SENTRY_ORG
gh secret set SENTRY_PROJECT
# optional — separate backend project:
gh secret set SENTRY_BACKEND_PROJECT
```

## 2. Verify frontend error capture

1. Deploy staging with `VITE_SENTRY_DSN` set.
2. In browser devtools console, run `__aetherProbeSentryError()` (available when `VITE_SENTRY_ENV=staging` or `VITE_SENTRY_DEV=true`).
3. In Sentry Issues, confirm:
   - Environment = `staging`
   - Release matches `VITE_APP_VERSION`
   - Stack trace shows original TypeScript file names (not minified `vendor-*.js` only)

## 3. Verify backend error capture

1. Ensure `SENTRY_DSN` and `APP_VERSION` are set on the backend process.
2. Check status: `GET /api/admin/observability/status` (authenticated).
3. Trigger probe: `POST /api/admin/observability/probe-error` — allowed in `staging`, `SENTRY_DEV=true`, or `OBSERVABILITY_PROBE_ENABLED=true` (never in production).
4. Confirm issue in Sentry with `tenantId` and `correlationId` tags.

## 4. Verify distributed tracing

1. Perform a merchant action that calls the API (e.g. approve an item).
2. In Sentry Performance → Traces, find a trace that spans:
   - Frontend `command.execute` or `approval.resolve` span
   - Backend `http.POST./api/...` child span
3. Confirm `sentry-trace` header is present on API requests (Network tab).

## 5. Verify business events

1. Execute a command or resolve an approval in staging.
2. In Sentry, open a session or issue breadcrumbs.
3. Confirm info-level messages: `command.executed`, `approval.resolved`, etc.
4. Storefront / Website lifecycle (domain events + structured logs):
   - `website.revision.created`
   - `website.build.finished` (payload.status `succeeded`|`failed`)
   - `website.publish.approved`
   - `website.deploy.succeeded` | `website.deploy.failed`
5. Confirm checkout logs use `storefront_checkout_created` **without** customer email/address (PII scrubbed).

## Incident response

1. Filter Sentry Issues by `environment:production` and latest `release`.
2. Use `tenantId` tag to identify affected merchant.
3. Use `correlationId` to correlate with backend structured logs (`http_request_traced`).
4. Check Performance tab for slow `approval.bulk_resolve` or `command.execute` spans.

## Local testing

```bash
# Frontend — enable Sentry in dev
VITE_SENTRY_DSN=... VITE_SENTRY_DEV=true npm run dev

# Backend
SENTRY_DSN=... SENTRY_DEV=true npm run dev
```

Never commit DSN values or auth tokens to the repository.

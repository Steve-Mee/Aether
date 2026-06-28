# AETHER Core Backend

Modular AI-native commerce API. See [../docs/truth-matrix.md](../docs/truth-matrix.md) for feature status.

## Modules (17)

Product catalog, orders, AETHER Mail, supplier intelligence, autonomous ops, admin command bar, predictive (experimental), self-evolving (experimental), agentic commerce, inventory/pricing (experimental), plugins (experimental), hive mind, physical-digital (experimental), co-ownership (experimental), payment/fulfillment, approvals, outcomes.

Mounted modules are listed on `GET /health`.

## Architecture

```
api → application → domain ← infrastructure
         ↓
    shared/events, shared/security, ai/orchestrator
```

## Local development

Start Postgres (Docker):

```bash
cd .. && docker compose up -d postgres
```

Postgres listens on **host port 15432** so it does not clash with native Windows PostgreSQL (commonly on 5432 or 5433). Copy `backend/.env.example` to `../.env` (or run `npm run setup:env`) and run migrations:

```bash
npm install
npm run prisma:migrate
npm run dev
```

DB-backed E2E tests (`mail-approval.e2e.test.ts`) run when `CI=true` and `DATABASE_URL` points at the migrated database.

All `/api/*` routes require `X-Aether-Api-Key`. Webhook routes use endpoint-specific signature or `X-Webhook-Secret` headers.

## Validation

Mutating JSON endpoints use Zod schemas. Webhook endpoints (`/api/payments/webhook/stripe`, `/api/suppliers/webhook`, `/api/payments/webhook`) validate via Stripe signature or shared secrets — not Zod body schemas.

## Observability

### OpenTelemetry (local / Jaeger)

OpenTelemetry SDK starts via `src/shared/observability/otelBootstrap.ts`. Set `OTEL_EXPORTER_OTLP_ENDPOINT` for Jaeger/OTLP export; console exporter is used when unset. Span helpers live in `src/shared/observability/telemetry.ts`.

### Sentry (staging / production)

Server-side error monitoring via `src/shared/observability/sentry.ts`:

```env
SENTRY_DSN=https://your-dsn@sentry.io/project
SENTRY_ENV=staging
APP_VERSION=0.8.1
# SENTRY_DEV=true   # optional — enable in local development
```

- Initialized in `src/index.ts` before the Express app starts
- Express errors captured via `setupExpressErrorHandler` (5xx only; 4xx filtered)
- Request context: `tenantId`, `actorId`, `correlationId` from `tracingMiddleware`
- Distributed tracing: continues `sentry-trace` / `baggage` headers from the frontend
- Custom spans: `command.execute`, `approval.resolve`, `supplier.monitor`

OTEL and Sentry run in parallel — use OTEL for deep local tracing, Sentry for production incident response.

# AETHER Release Gates

No release to pilot merchants unless **pilot gates** (Gates 1–4 below) pass.

## Claim policy

**No green checkbox without provable evidence.** Every `[x]` must be backed by runtime behavior, automated tests, and/or CI (`validate:dod` + `truth-review.js`).  
Partial/experimental features must stay labeled honestly in `feature-status.json` and `truth-matrix.md`.

Canonical execution truth: [`runtime-charter.md`](./runtime-charter.md)

Webhook routes validate via signature or shared secret — not Zod body schemas.

## Gate 1 — Security
- [x] All `/api/*` routes require authenticated tenant context (API key)
- [x] Tenant header must match API key tenant (no cross-tenant escape)
- [x] Test auth bypass only with explicit `AETHER_TEST_AUTH_BYPASS=true`
- [x] RBAC enforced on mutating routes (`requireOperator`)
- [x] Viewer role on read-only GET routes (products, orders, dashboard, outcomes, emails, suppliers, negotiations, hive insights, approvals, autonomous, plugins, physical, co-ownership)
- [x] DB-backed API keys with role resolution (Prisma `ApiKey` + env bootstrap key)
- [x] Input validation (Zod) on mutating endpoints with JSON bodies
- [x] Rate limiting active (global middleware; optional Redis via `REDIS_URL`)
- [x] Webhook signature/secret verification per endpoint
- [x] IMAP TLS verification on by default
- [x] Repositories require explicit `tenantId` — no hardcoded tenant in persistence layer

## Gate 2 — Data integrity
- [x] Prisma schema matches migrations (`v070_foundation` + `v080_roadmap` + `roadmap_v1` + `event_outbox`)
- [x] Mock/simulation endpoints labeled `experimental` or behind feature flags
- [x] Audit log writes for autonomous and high-risk actions
- [x] GDPR-by-design checklist documented ([compliance-baseline.md](./compliance-baseline.md))
- [x] Tenant-scoped data isolation at repository layer
- [x] Event outbox with idempotency keys on critical domain events

## Gate 3 — Quality
- [x] `npm run build` passes (backend + frontend)
- [x] `npm test` passes — no silent empty test runs in CI (`--passWithNoTests=false` on `test:ci`)
- [x] Tenant isolation integration test in CI
- [x] DB-backed mail→approval→rollback E2E in CI
- [x] DB-backed storefront Birth Gate E2E in CI (`storefront-birth.e2e` — locked Appendix G path)
- [x] DB-backed storefront create→build→publish-approval→public GET E2E in CI (`storefront-publish.e2e`)
- [x] DB-backed storefront catalog→cart→checkout E2E in CI (`storefront-checkout.e2e`)
- [x] CI workflow runs validate, migrate, build, lint, test with coverage threshold
- [x] ≥60% coverage on application + API controller layers
- [x] Architecture boundary tests in CI (`architecture.test.ts`)
- [x] Tenant hardening tests (`tenantHardening.test.ts`)
- [x] Event integrity tests (`eventIntegrity.test.ts`)

## Gate 4 — Observability
- [x] Structured JSON logging on HTTP requests and domain actions
- [x] Health endpoint reports version + module list
- [x] OpenTelemetry SDK export via `otelBootstrap.ts`
- [x] Operating metrics endpoint (`/api/admin/operating-metrics`)

## Gate 5 — Truth sync
- [x] `feature-status.json` is machine-readable truth source
- [x] `truth-matrix.md` synced with feature-status.json
- [x] `runtime-charter.md` is canonical execution authority
- [x] Frontend status badges from `/api/admin/truth-status`
- [x] Automated DoD validation via `npm run validate:dod` (runtime + doc checks)
- [x] Weekly truth review via `node scripts/truth-review.js`

## Gate 6 — Local AI First
- [x] Ollama service in `docker-compose.yml` as first-class dependency
- [x] `OLLAMA_BASE_URL` defaults to docker-internal `http://ollama:11434`
- [x] Ollama contract test documents and validates dependency (`ollamaContract.test.ts`)

## Gate 7 — Event & outcome integrity
- [x] Required event handlers registered at bootstrap (`eventHandlerRegistry.ts`)
- [x] Outcome Truth Firewall blocks admin/command sources from billable outcomes
- [x] `/api/outcomes/verify` requires evidence payload for verified/billable transitions
- [x] Composition root wires dependencies (`bootstrap/compositionRoot.ts`)

## Gate 8 — Autonomy & causal proof (world-class target)
- [x] Autonomy metrics endpoint (`/api/admin/autonomy`)
- [x] Mail metrics endpoint (`/api/emails/metrics`) for auto-reply ratio
- [x] Causal uplift required for outcome verification (unless manual_review with actor)
- [ ] ≥70% mail auto-reply rate in pilot (honest partial until proven)
- [x] Approval resolve executes registered actions (`ApprovalExecutor`; mail/supplier/refund/proposal)
- [x] Holdout-based causal attribution v2 (ExperimentAssignment + estimateHoldoutUplift)

**Pilot release:** Gates 1–5 and 7 must be fully green. Gate 6 required for docker deployments. Gate 8 partial items remain honestly labeled until exit criteria met.

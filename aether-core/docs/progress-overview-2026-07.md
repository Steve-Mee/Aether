# AETHER Progress Overview — July 2026

**Runtime version:** 0.8.1  
**Repo:** [Steve-Mee/Aether](https://github.com/Steve-Mee/Aether)  
**Canonical truth:** [`runtime-charter.md`](./runtime-charter.md) · [`truth-matrix.md`](./truth-matrix.md) · [`feature-status.json`](./feature-status.json)

This document summarizes what exists in runtime versus vision-only claims. It is a planning aid, not a green checkbox for unimplemented features.

---

## 1. What is live or partial in `aether-core/`

| Domain | Status | Evidence |
|--------|--------|----------|
| Custom commerce core (Node.js + Prisma + PostgreSQL) | Foundation complete | Tenant-scoped models; migrations `v070` / `v080` / roadmap |
| Product catalog API | Live (basic CRUD) | `backend/src/modules/product-catalog/` |
| Order management API | Live | `backend/src/modules/order-management/` |
| Customer model + AdminDataPort analytics | Partial | Prisma `Customer`; customers REST + UI pages (P11) |
| Merchant admin UI (Vite + React) | Live / partial commerce | Command Center, Overview, Approvals, Settings; commerce detail + website hub |
| Multi-agent specialists (ops + storefront) | Implemented / partial | Ops agents + `store_builder` / `design` / `copy_seo` / `store_qa` |
| PersonalBrain + Memory v2 | Partial / live pieces | RAG for mail/supplier; reflection; consolidation |
| GlobalBrain / hive mind | Partial | DP metrics; opt-in; federated jobs gated |
| AETHER Mail | Partial | Ollama path + approval-execute; Gate 8 autonomy metric open |
| Supplier Intelligence | Live / partial | Playwright worker; approval-apply |
| Admin Command Center | Partial | NL parser + LLM fallback; dashboard aggregations |
| Payments | Partial | Stripe Connect + Adyen sandbox stub |
| Outcomes / attribution | Partial | Causal uplift MVP; verified-only billing hook |
| Storefront Builder | **Partial** | Allowlisted codegen → preview → `PUBLISH_STOREFRONT` approval → public API; Birth Gate [`BIRTH_GATE.md`](./BIRTH_GATE.md); E2E [`storefront-birth.e2e.test.ts`](../backend/src/modules/storefront-builder/__tests__/storefront-birth.e2e.test.ts) |
| Public storefront API | **Partial** | `/api/storefront` feature-gated; HTTP + publish E2E + checkout E2E [`storefront-checkout.e2e.test.ts`](../backend/src/__tests__/storefront-checkout.e2e.test.ts) |
| CI/CD | Live | GitHub Actions backend + frontend gates; storefront Birth + publish + checkout E2E steps |
| Observability | Live | Sentry FE/BE; OpenTelemetry |

---

## 2. What does not exist yet (honest gap)

| Capability | Vision reference | Runtime |
|------------|------------------|---------|
| Pilot-complete “AI store in one click” | Master Roadmap / investor packages | **Partial only** — vertical slice proven in CI; not an instant-live marketing claim |
| Production edge deploy (Cloudflare/Vercel) | Storefront charter deploy ports | LocalDeployAdapter + staged pointer only |
| Full Pages CMS / visual editor | Merchant OS expectation | Admin website pages list/preview; no drag-drop CMS |
| Storefront-runtime Lighthouse budgets / CWV gate | P15 hardening | Doc assert + Chrome Lighthouse on `/lh-fixture` (:4177) in CI |
| MedusaJS commerce engine | Archived `Project/Info/` | **Never deployed** — custom core is truth |

---

## 3. GitHub snapshot (as of design pass)

- **Repo created:** 2026-05-03  
- **Notable merged work:** CI/CD activation (PR #1), CI typecheck/test/stripe-mock fixes (PR #15), dependency bumps  
- **Open PRs:** mostly Dependabot / dependency alignment (e.g. Prisma size-limit fix PR #27)  
- **Deployment source of truth:** `aether-core/` only; `Project/` and root Master Roadmap are ambition archives

---

## 4. Phase status (charter taxonomy)

| Phase | Focus | Status |
|-------|-------|--------|
| Fase 0 | Foundation | Complete |
| Fase 1 | Mail + Supplier + Admin v0.5 | Partial |
| Fase 2–5 | Events, outcomes, autonomy, ecosystem | Partial / gated |

**Parallel track (July 2026):** Storefront Builder + merchant commerce dashboard — **partial** with Birth + checkout CI E2E (P14). P15 pilot: security checklist + fail-closed live + organism + Redis public RL + hybrid Redis spill + LocalEdge/Cloudflare deploy + Chrome Lighthouse fixture CI + payments transaction list + Hero copy-edit CMS. Cosmic multi-region/hive remain planned-only. Specs:

- [`../../project-dna/Aether/storefront-builder.md`](../../project-dna/Aether/storefront-builder.md)
- [`storefront-architecture.md`](./storefront-architecture.md)
- [`storefront-api-contracts.md`](./storefront-api-contracts.md)
- [`merchant-dashboard-ia.md`](./merchant-dashboard-ia.md)
- [`BIRTH_GATE.md`](./BIRTH_GATE.md)

Status in truth matrix: `partial` with evidence links; not `implemented` until pilot edge deploy + real CWV evidence.

---

## 5. Design decision recorded

**AI storefront generation** uses **allowlisted AST/DSL codegen** (real TSX/CSS revision artifacts inside a fixed `storefront-runtime` host). Agents must not emit arbitrary server-side Node. Publish remains high-risk and goes through the existing Approvals executor.

See evolution-log entry 2026-07-26.

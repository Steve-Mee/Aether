# Architecture Audit Checklist (Living)

**Last Updated**: 2026-07-31  
**Authority**: [`AGENTS.md`](./AGENTS.md) + [`aether-core/docs/runtime-charter.md`](../../aether-core/docs/runtime-charter.md)  
**Objective**: Eventually audit every in-scope source file. Hotspot sample ≠ bucket done.

---

## Waves completed

| Wave | Status | Notes |
|------|--------|-------|
| 0–7 | Done | DNA SSOT, honesty, AdminController, ExecuteNL helpers, prisma allowlists empty, bootstrap/AI, FE hotspots, full-scan inventory |
| 8 | Done | BrainAgentLoop, appendixH/site/websiteRouter, Autonomy + Collaboration, wireMultiAgent |
| 9 | Done | AgentOrchestrator + explainability; routes/stream/CommandResultCard; liveDemo/suppliers honesty |
| 10 | Done | ExecuteNL phases, SupplierOverview, merchantSettings, PaymentProvider; DNA skills sync; Lighthouse docs; live demo overlay cut |
| 11 | Done | PrismaAdminDataAdapter domains; Overview SSE/explain; prepareCommandContext; specialist paths; todayReady barrel; DNA-only skills mirrored |
| 12 | Done | todayReady import migration; structured module + FE scan inventory (findings only; no god-file splits) |
| 13 | Done | ExecuteNL phase modules (~356 façade); AutonomyGuardSteps → autonomyGuard/* + thin façade |
| 14 | Done | `@prisma/client` removed from application/controllers; architecture tests ban `@prisma/client` |
| 15 | Done | OverviewFeed / PersonalBrainMemory / collaborationRules / PrismaSiteRepository extracts |
| 16 | Done | OpenAPI inventory + validate CI; prisma/README; Lighthouse dual floors documented as intentional |
| 17 | Done | Express↔OpenAPI drift; commerce.yaml + admin.yaml; website page copy path |
| 18 | Done | platform.yaml + admin bilateral; schema enrichment; OpenAPI architecture track **closed** |

---

## Architecture allowlists

| Allowlist | Status |
|-----------|--------|
| APPLICATION_PRISMA_ALLOWLIST | **Empty** (bans `shared/prisma/client` **and** `@prisma/client`) |
| CONTROLLER_PRISMA_ALLOWLIST | **Empty** (same) |
| CROSS_MODULE_INFRA_ALLOWLIST | **Empty** |

---

## Done — Wave 17

- [x] Path drift: `openapi-route-drift.mjs` + wired into `openapi:validate`
- [x] `website.yaml` includes `PATCH /pages/{pageId}/copy`
- [x] `commerce.yaml` — 6 mounts / 37 ops (drift OK)
- [x] `admin.yaml` — command-bar / 91 ops (drift OK); bilateral excluded at the time
- [x] Contracts §7 + README inventory updated

---

## Done — Wave 18 (OpenAPI track closed)

- [x] `platform.yaml` — always-on mounts (~48 ops): auth, media, emails, suppliers, approvals, outcomes, autonomous, plugins, hive-mind, bilateral
- [x] `admin.yaml` includes `/bilateral/audit` (92 ops drift OK)
- [x] Schema fidelity: commerce key DTOs; admin command/overview/bilateral audit; platform bilateral/emails/suppliers/approvals (`openapi:enrich`)
- [x] `openapi:validate` — five specs + drift; generators + enrich via `openapi:generate`
- [x] Contracts §7 final inventory; experimental mounts documented as accepted residual

### Explicitly OUT OF SCOPE (N/A)

- [x] N/A `Project/**`, `fase2/**`, `admin-luxury/**`, `backend-command/**`
- [x] N/A `node_modules`, `dist`, coverage, `_ci_*` / `_pw_*` scratch

---

## Accepted honest stubs / intentional flags

- StubDeployAdapter, StubStorefrontCatalogAdapter, AllowlistCodegenCompilerStub
- PlaceholderGlobalBrain (`mode: 'placeholder'` on `/health`)
- KnowledgeTransferService without hive bridge (`accepted: false`)
- ProductGenesis / self-evolving fixture proposals (gated / labeled)
- MockDeviceAdapter, NoOpMessageBroker, AdyenStubPaymentProvider
- Payout ledger empty response (honest message)
- Plugin module: persistence only, no runtime sandbox
- Live demo / suppliers demo / command demo overlay: **opt-in or mock-only**
- **`hybridDemo`**: intentional live padding gated by `VITE_HYBRID_DEMO` (DEV default true). Pure live: set `VITE_HYBRID_DEMO=false`.
- **i18n locale tables** (`nl.ts` / `en.ts`): intentional large data files
- **Lighthouse dual floors**: storefront CI 0.85 vs admin weekly 0.60 — intentional (Wave 10/16)
- **OpenAPI experimental exclusions**: `/api/predictive`, `/api/self-evolving`, `/api/agentic`, `/api/physical`, `/api/co-ownership` — no OpenAPI until product promotes them to core
- **OpenAPI thin residuals**: non-critical platform/admin ops may remain path-only (beyond Wave 18 enrich set)

# AETHER First-Principles Audit

**Datum:** 31 mei 2026  
**Runtime versie:** 0.8.1  
**Scope:** `aether-core/backend` + `aether-core/docs`  
**Execution truth:** [`runtime-charter.md`](./runtime-charter.md) — `Project/Info/` is archief, geen deployment truth

---

## 1. Executive summary

AETHER v0.8.1 heeft een **zeldzaam sterke foundation**: modulaire monolith, runtime truth governance, autonomy kernel, outcome firewall, en serieuze CI. De missie faalt op één punt: **de autonomie-lus is niet gesloten** — approvals worden opgeslagen maar niet uitgevoerd, background jobs gebruiken andere wiring dan HTTP, en events worden te vroeg als verwerkt gemarkeerd.

**Eindoordeel:** Geen “wereld's beste AI-e-commerce organisme” — wel een **eerlijk, schaalbaar platform** dat met P0-remediatie (2–4 weken) pilot-waardig kan worden.

---

## 2. Truth-gap matrix

Status: `implemented` | `partial` | `hallucinated`

### 2.1 Platform & stack

| Claim | Status | Evidence |
|-------|--------|----------|
| Custom AETHER Core (Node/TS/Prisma/PostgreSQL) | implemented | `backend/src`, `prisma/schema.prisma` |
| MedusaJS commerce engine | hallucinated | Alleen `Project/Info/` |
| Prisma migrations v0.7→v0.8 | implemented | `prisma/migrations/` |
| CI quality gates | implemented | `.github/workflows/ci.yml`, `architecture.test.ts` |
| Single runtime truth docs | implemented | `runtime-charter.md`, `truth-matrix.md`, `feature-status.json` |
| `AETHER_Core_v1_Architecture_Document.md` | hallucinated | Bestand ontbreekt |
| Frontend admin truth badges | implemented | `/api/admin/truth-status` |
| Auth RBAC + tenant match | implemented | `shared/security/auth.ts` |

### 2.2 Fase 1 — Mail, Supplier, Admin

| Claim | Status | Evidence |
|-------|--------|----------|
| AETHER Mail Ollama classification | partial | `EmailClassifierService.ts`, `ollamaContract.test.ts` |
| IMAP autonome polling | partial | `ImapPollingService.ts` — wiring gefixt via composition root |
| Mail auto-reply bij low risk | partial | `ProcessIncomingEmailUseCase.ts` |
| Post-approve mail send | partial → implemented | `ApprovalExecutor` + `email_response` handler |
| Supplier scrape + monitor | implemented | `MonitorSupplierUseCase`, supplier-worker CI |
| Supplier scheduler volledig | partial → implemented | `MonitorSupplierJob` via `getCompositionRoot()` |
| Admin NL commands | partial | `CommandParserService`, regex fallback |
| Admin hardcoded llama3.2 | partial | P1: `LlmInferencePort` |
| 70% mail autonomy | hallucinated (onbewezen) | Gate 8 open in `release-gates.md` |
| Air-gapped inference | hallucinated | Ollama HTTP only |

### 2.3 Autonomie & approvals

| Claim | Status | Evidence |
|-------|--------|----------|
| Approval create + API | implemented | `approvalService.ts`, `approvals/index.ts` |
| Approval execute na resolve | partial → implemented | `ApprovalExecutor` |
| Autonomy kernel unified gate | implemented | `DecisionContract.ts` |
| Merchant notification bij pending | partial | P1: `MerchantNotificationPort` |
| Multi-tenant background jobs | partial → implemented | Supplier job all tenants |

### 2.4 AI / orchestration

| Claim | Status | Evidence |
|-------|--------|----------|
| Orchestrator + workflow trace | partial | `Orchestrator.ts`, `workflowTrace.test.ts` |
| LangGraph multi-agent | hallucinated | 0 references in `aether-core` |
| TaskExecutor module tasks | partial | `TaskExecutor.ts` — P2 refactor |
| Local AI First policy | partial | Mail/Admin Ollama; supplier rules-only |

### 2.5 Outcomes & billing

| Claim | Status | Evidence |
|-------|--------|----------|
| Outcome Truth Firewall | implemented | `OutcomeVerificationService`, `eventHandlers.ts` |
| Causal attribution MVP | partial | `CausalAttributionService.ts` |
| Outcome-Only billing live | partial | `billingService` on `outcome.verified` |
| 80–90% autonome merchant agent | hallucinated | Expansion plan target, geen metrics |

### 2.6 Radical features

| Claim | Status | Evidence |
|-------|--------|----------|
| ZK-SNARK commerce | hallucinated | `ZkProofService.ts` = HMAC commitments |
| Hive federated learning | partial | Count aggregation + DP; `ECOSYSTEM_JOBS_ENABLED` |
| Self-evolving codebase | partial | Staged proposals; geen auto-apply |
| Product Genesis AI | hallucinated | `ProductGenesisService.ts` TODO + hardcoded ideas |
| Physical-digital symbiosis | partial | Mock/HTTP adapter |
| Agentic commerce LLM | partial | `AGENTIC_LLM_ENABLED` flag |
| IPO Prep / Sprint 7 | hallucinated | `Project/backend/ai-agents/sprint7/` niet in runtime |
| Merchant co-ownership | partial | Marketplace + economy load test |

### 2.7 Docs governance

| Claim | Status | Evidence |
|-------|--------|----------|
| Master Roadmap = enige waarheid | hallucinated | Conflicteert met runtime-charter |
| Achievement Summary Sprint 1–7 voltooid | hallucinated | Charter rejected |
| CursorRules → v1.1 roadmap path | partial | `.cursorrules` → runtime-charter (P0-8) |
| Drie fasemodellen tegelijk | hallucinated | Master / Expansion / Runtime Fase 0–5 |

---

## 3. Documentconflicten (appendix)

| Conflict | Bron A | Bron B |
|----------|--------|--------|
| Commerce stack | Investor roadmap: Medusa | Runtime: Custom Core |
| Fase 1 definitie | Master: Mail/Supplier/Admin | Expansion: 80–90% autonomie |
| Sprint 1–7 complete | Achievement Summary | `runtime-charter.md` rejected |
| ZK privacy | Roadmap ZK-SNARK | Runtime HMAC only |
| Architecture doc | Roadmap appendix refs | Bestand ontbreekt |

---

## 4. Runtime deep audit — module scorecards

| Module | Sterk | Zwak | Tests |
|--------|-------|------|-------|
| aether-mail | Use-case, Ollama, policy, context port | Was: IMAP wiring; post-approve | mail E2E, classifier, approval-execute E2E |
| supplier-intelligence | Scrape, decision engine, changes port | Was: job deps | monitor, scrape integration |
| admin-command-bar | Ports, intents | Hardcoded model | NL command test |
| payment-fulfillment | Stripe, idempotency | Refund execute via approval | payment tests |
| approvals | API + RBAC + executor | — | ApprovalExecutor unit |
| ai/orchestrator | Workflow trace | TaskExecutor 2e root | orchestrator |
| order/product/inventory | CRUD, tenant-scoped | Dun domain | **gap** |
| predictive-commerce | Feature gate | ProductGenesis stub | minimal |
| self-evolving | Staged rollout | No live auto-apply | partial |
| hive-mind | Privacy budget | No real FL | FederatedHiveJob test |
| physical-digital | Adapter pattern | Mock default | E2E optional |
| autonomous-operations | Decision log | Thin coupling | minimal |

### 4.1 Architectuur-checklist

| # | Check | Resultaat |
|---|-------|-----------|
| 1 | Clean Architecture layer tests | Pass — `architecture.test.ts` |
| 2 | God files ≥300 regels | Pass — geen in `src/` |
| 3 | DIP in use-cases | Fail — direct `orchestrator` imports (P2) |
| 4 | Composition roots | Was 5 — P0: factories in `compositionRoot` |
| 5 | IMAP vs HTTP mail wiring | **Fixed** — `processIncomingEmailUseCase` factory |
| 6 | Supplier job wiring | **Fixed** — `getCompositionRoot().monitorSupplierUseCase` |
| 7 | Event processedAt race | **Fixed** — await handlers before update |
| 8 | Approval execute | **Fixed** — `ApprovalExecutor` |
| 9 | tenant_default schema | **Fixed** — defaults removed, migration |
| 10 | Security baseline | Pass RBAC; geen air-gap |

---

## 5. Radicale eerlijkheidsbeoordeling

### 5.1 Echt goed

- Runtime truth governance (charter, matrix, feature-status, validate:dod)
- Modular monolith + architecture boundary tests
- `merchantAutonomyKernel` / DecisionContract
- Outcome Truth Firewall + holdout attribution MVP
- Mail/supplier decision + audit trail patterns
- ~69 test files, mail E2E, Ollama contract

**Mission-impact:** Defensibility en team alignment — zeldzaam in early-stage platforms.

### 5.2 Middelmatig / fragiel

- Payment (Stripe partial, Adyen stub)
- Orchestrator zonder agent graph
- Hive/physical/co-ownership feature-gated
- Admin NL zonder unified LLM port (P1)

**Mission-impact:** Werkt in demo; breekt onder multi-merchant schaal zonder P1/P2.

### 5.3 Slecht / gevaarlijk (pre-remediatie)

- Approval zonder execute → **remediated in P0**
- IMAP/job inconsistent wiring → **remediated in P0**
- Event processedAt race → **remediated in P0**
- Schema tenant defaults → **remediated in P0**

### 5.4 Roadmap-leugen / theater

- Sprint 1–7 “één dag voltooid”
- ZK-SNARK, air-gapped, LangGraph
- ProductGenesis hardcoded
- Python agents in `Project/backend` niet wired

**Mission-impact:** Investor/team verwachtingen scheef; ondermijnt merchant trust als niet gelabeld ARCHIVE.

---

## 6. P0–P3 verbeterprogramma

### P0 (geïmplementeerd in deze sprint)

| ID | Actie | Status |
|----|-------|--------|
| P0-1 | ApprovalExecutor registry | Done |
| P0-2 | email_response execute | Done |
| P0-3 | IMAP factory in composition root | Done |
| P0-4 | Supplier job via composition root | Done |
| P0-5 | Event bus await handlers | Done |
| P0-6 | DI factories exported | Done |
| P0-7 | Remove tenant_default defaults | Done |
| P0-8 | Archive banners + charter DoD sync | Done |

### P1 (afgerond post-P0 plan)

| ID | Actie | Status |
|----|-------|--------|
| P1-1 | `WebhookMerchantNotificationAdapter` + `MERCHANT_*` env | Done |
| P1-2 | `SupplierChangePort.applyPendingChanges` + approval handler | Done |
| P1-3 | Mail `EmailClassifierService` → `LlmInferencePort` | Done |
| P1-4 | LangGraph “not implemented” in charter + truth-matrix + project-dna | Done |
| P1-5 | [`pilot-autonomy-metrics.md`](./pilot-autonomy-metrics.md) | Done |
| P1-6 | Roadmap Fase 1 trace in truth-matrix | Done |

### P2 (afgerond)

| Item | Status |
|------|--------|
| Commerce integration tests (`commerce.integration.test.ts`) | Done (CI-gated) |
| TaskExecutor → composition root, no prisma import | Done |
| Migration `20260531220100_roadmap_v1` (unique timestamp) | Done |
| ProductGenesis / predictive `experimental` gate | Done |
| Architecture tests (composition root, TaskExecutor, OrchestratorPort) | Done |

### P3 (minimum afgerond)

| Item | Status |
|------|--------|
| `GET /api/admin/explain` + `GET /api/admin/autonomy/trace` | Done |
| Autonomy audit stages in mail flow | Done |
| [`pilot-outcome-contract.md`](./pilot-outcome-contract.md) + holdout outcome E2E | Done |

### Module ROI (90 dagen — richting)

| Module | ROI-signaal | Besluit |
|--------|-------------|---------|
| aether-mail | Hoog — pilot Gate 8, approval execute | **Keep** — meet 70% metric |
| supplier-intelligence | Hoog — scrape + apply na approval | **Keep** |
| admin-command-bar | Medium — NL commands + explain API | **Keep** |
| agentic-commerce | Medium — feature-gated, negotiation caps | **Keep** (gated) |
| predictive-commerce | Laag — ProductGenesis stub | **Gate** (`experimental`) |
| physical-commerce | Laag — mock adapter default | **Gate** |
| self-evolving / hive-mind | Strategisch, niet pilot-kritisch | **Gate** |
| order / catalog / inventory | Core merchant — tests toegevoegd | **Keep** — uitbreiden coverage |

---

## 7. Definition of Done — wereldklasse runtime

| Domein | Criterium | Verificatie | Status |
|--------|-----------|-------------|--------|
| Autonomie | ≥70% mail auto-reply (30d) | `/api/emails/metrics` | Open |
| Autonomie | 0 approved zonder `action_executed` audit | E2E + DB | **Target met ApprovalExecutor** |
| Architectuur | 1 composition root voor use-cases | architecture test | **Improved** (TaskExecutor delegated) |
| Tenant | 0 tenant_default in schema | migration | **Done** |
| Events | processedAt na handler success | eventIntegrity test | **Done** |
| Outcomes | Billable met holdout + evidence | outcome E2E | Partial |
| Local AI | Ollama + shared LLM port | contract + mail/admin port | **Done** (mail + admin) |
| Truth | feature-status = matrix = behavior | validate:dod | Ongoing |
| Merchant | ≥1 pilot causal uplift | pilot report | Open |

---

## 8. Referenties

- [`runtime-charter.md`](./runtime-charter.md)
- [`truth-matrix.md`](./truth-matrix.md)
- [`release-gates.md`](./release-gates.md)
- [`feature-status.json`](./feature-status.json)

*Last updated: First-Principles Audit implementation — 2026-05-31*

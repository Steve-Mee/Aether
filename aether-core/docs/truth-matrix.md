# AETHER Truth Matrix

**Single execution truth:** `aether-core/` only.  
**Canonical charter:** [`runtime-charter.md`](./runtime-charter.md)  
**Reference archive:** `Project/` (not deployed).  
**Machine-readable source:** [`feature-status.json`](./feature-status.json)  
**Runtime version:** backend `0.8.1` ([`app.ts`](../backend/src/app.ts))

Status legend: `implemented` | `partial` | `planned` | `experimental` | `scaffold`

| Feature | Status | Evidence |
|---------|--------|----------|
| Product catalog CRUD | implemented | [`product-catalog/`](../backend/src/modules/product-catalog/), tenant-scoped API, viewer GET |
| Order management | implemented | [`order-management/`](../backend/src/modules/order-management/), tenant-scoped, viewer GET |
| AETHER Mail v1 | partial | Ollama path + heuristic fallback; metrics API; IMAP polling; mail E2E in CI |
| Supplier Intelligence v1 | implemented | Docker `supplier-worker`, `SUPPLIER_ALLOWLIST`, Playwright scrape in CI |
| Admin Command Center v1 | partial | Parser-first NL commands with regex fallback; dashboard aggregations; command history |
| Auth / RBAC / tenant | implemented | DB `ApiKey` + roles; tenant header must match key; viewer on read GET routes |
| Payment fulfillment | partial | Stripe Connect + invoice drafts; Adyen Checkout experimental sandbox stub; reconciliation endpoint |
| Autonomous operations | implemented | Decision log + audit + events; viewer GET |
| Predictive commerce | experimental | Order-history forecaster; feature-gated |
| Self-evolving codebase | partial | Staged rollout state machine; sandbox gate; rollback endpoint |
| Agentic commerce | partial | Persistent negotiation rounds; risk caps; Ollama behind `AGENTIC_LLM_ENABLED` |
| Hive mind | partial | Federated job (gated by `ECOSYSTEM_JOBS_ENABLED`); Laplace DP; privacy budget |
| Physical-digital | partial | HTTP device adapter E2E in CI; mock fallback when URL unset |
| Merchant co-ownership | partial | Marketplace anti-abuse; economy load test; viewer GET on listings |
| Feature flags | implemented | `TenantFeature` + env overrides + `featureGate()` in [`app.ts`](../backend/src/app.ts) |
| Attribution / outcome billing | partial | Causal uplift MVP; Outcomes billing tab; verified-only billing hook |
| AI orchestration layer | partial | [`Orchestrator.ts`](../backend/src/ai/orchestrator/Orchestrator.ts) + `OrchestratorPort`; no LangGraph |
| Intelligence Layer foundation | partial | [`ai/intelligence/`](../backend/src/ai/intelligence/) — PersonalBrain, pgvector, AgentRuntime, hive-mind bridge, GlobalBrain |
| Global → Personal knowledge (v1–v4) | partial | [`global-knowledge/`](../backend/src/ai/intelligence/global-knowledge/) — static + DB patches, federated aggregates (v2 flag), distillation drafts, LoRA/vector kinds (v3 flag), A/B experiments; tests in `__tests__/` |
| Brain multi-step agent loop | implemented | [`BrainAgentLoop`](../backend/src/ai/intelligence/command-brain/BrainAgentLoop.ts) — ReAct tools, checkpoints, resume |
| Explicit agent planning | implemented | [`BrainAgentPlanner`](../backend/src/ai/intelligence/command-brain/BrainAgentPlanner.ts) — plan-before-execute, max 5 steps |
| Agent step reflection | implemented | [`BrainAgentReflector`](../backend/src/ai/intelligence/command-brain/BrainAgentReflector.ts) — post-tool observe-evaluate, `reflection` SSE |
| Dynamic agent replan | implemented | [`BrainAgentPlanner.replan`](../backend/src/ai/intelligence/command-brain/BrainAgentPlanner.ts) — error + reflection triggers, `plan_revised` SSE |
| Agent plan memory | implemented | [`PlanMemoryService`](../backend/src/ai/intelligence/command-brain/PlanMemoryService.ts) — PersonalBrain recall of successful plans |
| Personal brain episodic memory | implemented | [`PersonalBrainMemoryService`](../backend/src/ai/intelligence/personal-brain/memory/PersonalBrainMemoryService.ts) — short-term ring buffer + long-term vector recall |
| Personal brain memory v2 | implemented | Metadata SQL filter, unified recall orchestration, reflection/summarization, session resume, consolidation job, admin memory panel |
| Multi-agent delegation (Phase 5) | partial | [`AgentSupervisorOrchestrator`](../backend/src/ai/intelligence/multi-agent/AgentSupervisorOrchestrator.ts) — admin ↔ mail/supplier; `BrainAgentRun` delegation fields |
| Reflection → patch distillation (HITL) | partial | [`ReflectionDistillationService`](../backend/src/ai/intelligence/global-knowledge/distillation/ReflectionDistillationService.ts) — draft patches only; separate from hive metrics |
| Reflection quality A/B | partial | [`ReflectionExperimentService`](../backend/src/ai/intelligence/personal-brain/reflection/experiments/ReflectionExperimentService.ts) — tenant bucket; distinct from GlobalKnowledge experiments |
| Cross-agent reflection timeline | partial | `GET /api/admin/brain/reflections/timeline` + [`ReflectionTimelinePanel`](../frontend/src/components/settings/ReflectionTimelinePanel.tsx) |
| Compound command intent | implemented | [`CompoundCommandParser`](../backend/src/ai/intelligence/agent-runtime/CompoundCommandParser.ts) — `COMPOUND_WORKFLOW` in AgentRuntime |
| Intelligence RAG (Mail/Supplier) | implemented | [`ProcessIncomingEmailUseCase.test.ts`](../backend/src/modules/aether-mail/__tests__/ProcessIncomingEmailUseCase.test.ts), [`MonitorSupplierUseCase.test.ts`](../backend/src/modules/supplier-intelligence/__tests__/MonitorSupplierUseCase.test.ts) |
| Intelligence event chaining | implemented | [`eventHandlers.ts`](../backend/src/bootstrap/eventHandlers.ts) → `insight.submit`; [`eventHandlers.test.ts`](../backend/src/bootstrap/__tests__/eventHandlers.test.ts) |
| Intelligence self-hosted vectors | partial | [`JsonFileVectorStoreAdapter`](../backend/src/ai/intelligence/vector-store/adapters/JsonFileVectorStoreAdapter.ts), [`BrainMemoryService.test.ts`](../backend/src/ai/intelligence/brain-memory/__tests__/BrainMemoryService.test.ts) |
| LangGraph / multi-agent graph | partial | `NativeGraphOrchestrator` + `LangGraphOrchestrator` behind `MULTI_AGENT_GRAPH_ORCHESTRATION` |
| Event bus | implemented | In-process + optional `EVENT_BUS_URL` forward |
| Approvals & audit | implemented | `/api/approvals` + ApprovalExecutor on resolve; mail approval-execute E2E |
| Activity log / audit trail | partial | `GET /api/admin/activity`; `/timeline` UI; hybrid demo feed |
| Frontend admin UI | implemented | Status badges from `/api/admin/truth-status`; no hardcoded live claims |
| Observability (Sentry) | implemented | Frontend `errorReporter` + `businessEvents`; backend `sentry.ts`; distributed trace propagation; OTEL parallel |
| CI quality gates | implemented | Runtime DoD validation + coverage ≥60%; mandatory E2E in CI |
| Prisma schema / migrations | implemented | `v070_foundation` + `v080_roadmap` + `roadmap_v1` |

## Master Roadmap Fase 1 trace (Mail / Supplier / Admin v0.5)

| Deliverable | Status | Test / metric |
|-------------|--------|---------------|
| AETHER Mail v0.5 (Ollama classify + policy) | partial | `emailClassifier.test.ts`, `mail-approval-execute.e2e.test.ts`, `/api/emails/metrics` |
| IMAP autonome polling | partial | `ImapPollingService` via composition root |
| Post-approve mail execute | implemented | `ApprovalExecutor` + `mail-approval-execute.e2e.test.ts` |
| Supplier Intelligence v0.5 | partial | `supplierScrape.integration.test.ts`, `supplierApprovalApply.test.ts` |
| Supplier approval price apply | implemented | `SupplierChangePort.applyPendingChanges` |
| Admin Command Center v0.5 | partial | `ExecuteNaturalLanguageCommandUseCase.test.ts`, `LlmInferencePort` on parser |
| LangGraph multi-agent | partial | Graph port + native executor; full `@langchain/langgraph` StateGraph optional |
| 70% mail autonomy (pilot) | planned | [`pilot-autonomy-metrics.md`](./pilot-autonomy-metrics.md) |

## Fase 3–5 (2027–2029) — explicit status

| Phase | Status | Notes |
|-------|--------|-------|
| Fase 3 Orchestration + Outcome productization | partial | WorkflowRun trace; causal attribution MVP; billing on verified outcomes only |
| Fase 4 Radical autonomy | partial | Autonomy metrics; staged rollout + rollback; negotiation persistence |
| Fase 5 Ecosystem expansion | partial | Jobs gated by reliability flag; marketplace anti-abuse |

## Claim policy

**No green checkbox without provable evidence.** Status changes require update to `feature-status.json`, this matrix, and passing `npm run validate:dod`.

Last updated: Elon-grade perfectie v0.8.1

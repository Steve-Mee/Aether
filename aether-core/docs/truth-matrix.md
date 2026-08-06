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
| AETHER Mail v1.1 (summarize + draft reply persist; approve sends via SMTP with stored draft body) | partial | [`aether-mail/`](../backend/src/modules/aether-mail/); summarize/draft persist; approval execute sends via [`SmtpClient`](../backend/src/modules/aether-mail/infrastructure/smtp/SmtpClient.ts); mail E2E |
| Supplier Intelligence v1 | implemented | Docker `supplier-worker`, `SUPPLIER_ALLOWLIST`, Playwright scrape in CI |
| Admin Command Center v1 | partial | Parser-first NL commands with regex fallback; dashboard aggregations; command history |
| Auth / RBAC / tenant | implemented | DB `ApiKey` + roles; tenant header must match key; viewer on read GET routes |
| Payment fulfillment (transaction list + summary; payouts/reconcile shells; no live payout ledger) | partial | Stripe Connect + invoice drafts; Adyen Checkout experimental sandbox stub; admin summary/payouts shells; outcome-billing reconcile (not live PSP payouts) |
| Promotions list/create draft + AI propose persist | partial | Prisma Promotion + GET/POST `/api/promotions`; AI `createPromotion` persists draft after approval |
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
| Intelligence Layer Phase 2 (RAG, hive-mind bridge, GlobalBrain, LoRA registry, JSON export) | partial | [`ai/intelligence/`](../backend/src/ai/intelligence/) — PersonalBrain, RAG, hive-mind bridge, GlobalBrain, and export paths |
| Mail/Supplier RAG via PersonalBrainRegistry | implemented | [`PersonalBrainRegistry`](../backend/src/ai/intelligence/personal-brain/PersonalBrainRegistry.ts) with mail and supplier integration tests |
| Event-driven insight.submit via orchestrator | implemented | [`eventHandlers.ts`](../backend/src/bootstrap/eventHandlers.ts) → `insight.submit` |
| JsonFile vector store + brain export/import | partial | [`JsonFileVectorStoreAdapter`](../backend/src/ai/intelligence/vector-store/adapters/JsonFileVectorStoreAdapter.ts) and brain export/import |
| PersonalBrain episodic memory (short-term buffer + long-term recall) | implemented | [`PersonalBrainMemoryService`](../backend/src/ai/intelligence/personal-brain/memory/PersonalBrainMemoryService.ts) |
| Personal Brain Memory v2 (metadata filter, orchestration, reflection, consolidation job, admin panel) | implemented | Metadata filtering, recall orchestration, consolidation job, and admin memory panel |
| Phase 6 multi-agent specialists (pricing/supplier/inventory/mail/returns), LLM routing, parallel orchestration, Command Bar agent badge | implemented | [`multi-agent/`](../backend/src/ai/intelligence/multi-agent/) specialists (incl. [`ReturnsAgent`](../backend/src/ai/intelligence/multi-agent/agents/ReturnsAgent.ts)) and Command Bar integration |
| RESTOCK_SUGGEST suggestRestock propose tool with approval flow | implemented | [`RESTOCK_SUGGEST`](../backend/src/ai/intelligence/) tool and approval flow |
| NativeGraphOrchestrator + LangGraph adapter behind MULTI_AGENT_GRAPH_ORCHESTRATION | partial | `NativeGraphOrchestrator` + `LangGraphOrchestrator` behind `MULTI_AGENT_GRAPH_ORCHESTRATION` |
| GlobalAgentPattern distillation and opt-in sync (no shared run state) | partial | [`global-knowledge/`](../backend/src/ai/intelligence/global-knowledge/) distillation and opt-in sync |
| Reflection → GlobalKnowledge patch drafts (HITL, no auto-publish) | partial | [`ReflectionDistillationService`](../backend/src/ai/intelligence/global-knowledge/distillation/ReflectionDistillationService.ts) |
| A/B reflection quality experiments with outcome metrics | partial | [`ReflectionExperimentService`](../backend/src/ai/intelligence/personal-brain/reflection/experiments/ReflectionExperimentService.ts) |
| Cross-agent reflection timeline (API + Settings panel) | partial | `GET /api/admin/brain/reflections/timeline` + [`ReflectionTimelinePanel`](../frontend/src/components/settings/ReflectionTimelinePanel.tsx) |
| Event bus | implemented | In-process + optional `EVENT_BUS_URL` forward |
| Approvals & audit (resolve executes actions) | implemented | `/api/approvals` + ApprovalExecutor on resolve; mail approval-execute E2E |
| Activity log / audit trail (GET /api/admin/activity) | partial | `GET /api/admin/activity`; `/timeline` UI; hybrid demo feed |
| Frontend admin UI | implemented | Status badges from `/api/admin/truth-status`; no hardcoded live claims |
| Sentry observability (frontend + backend error monitoring, tracing, business events) | implemented | Frontend `errorReporter` + `businessEvents`; backend [`sentry.ts`](../backend/src/shared/observability/sentry.ts) |
| CI quality gates | implemented | Runtime DoD validation + coverage ≥60%; mandatory E2E in CI |
| Prisma schema / migrations | implemented | `v070_foundation` + `v080_roadmap` + `roadmap_v1` |
| Phase 10 multi-deployment federated sandbox RPC (Kafka, signed requests, local fallback) | partial | [`federated-rpc/`](../backend/src/) adapters, signed request path, and local fallback |
| Phase 10 peer delegation in physical/negotiation/inventory/autonomy modules | partial | Physical, negotiation, inventory, and autonomy delegation modules |
| Phase 11 governed bilateral exchange + Phase 11b-lite merchant Settings UI (contracts, slug propose, packages) | partial | Bilateral exchange backend and merchant Settings UI |
| Phase 11 operator federated deployment registry API + Settings panel | partial | Federated deployment registry API and Settings panel |
| Phase 11 outbox relay leader, row claiming, consumer idempotency, TLS/SASL env | partial | [`event_outbox`](../backend/prisma/migrations/20260531220000_event_outbox/migration.sql) migration and Kafka configuration |
| Storefront Builder (Site* + APIs + codegen + Website UI + LocalEdge/Cloudflare deploy + Hero copy-edit; Birth/publish E2E; not WordPress CMS) | partial | Module + agents + Website admin UI + LocalPreview/LocalDeploy; Birth Gate [`BIRTH_GATE.md`](./BIRTH_GATE.md); locked Birth E2E [`storefront-birth.e2e.test.ts`](../backend/src/modules/storefront-builder/__tests__/storefront-birth.e2e.test.ts); vertical slice E2E [`storefront-publish.e2e.test.ts`](../backend/src/__tests__/storefront-publish.e2e.test.ts) (create→build→approve→public GET). Not “implemented”: no pilot edge deploy; no instant-live marketing claim. Schema: [`storefront-site-plan-schema.md`](./storefront-site-plan-schema.md) |
| Public storefront API (resolve/pages/catalog + cart/checkout; Redis RL + spill fallback; Birth + checkout E2E) | partial | Feature-gated reads + cart/checkout; HTTP tests [`storefront.http.test.ts`](../backend/src/modules/storefront-builder/__tests__/storefront.http.test.ts), cart [`storefront.cart.http.test.ts`](../backend/src/modules/storefront-builder/__tests__/storefront.cart.http.test.ts); live path in Birth/publish E2E; DB checkout E2E [`storefront-checkout.e2e.test.ts`](../backend/src/__tests__/storefront-checkout.e2e.test.ts) |
| Merchant dashboard commerce UI (products/orders/customers/inventory/promotions + payments transactions + website hub/copy-edit; not drag-drop CMS) | partial | P11 pages + integration tests under `frontend/src/features/commerce/` and `frontend/src/features/website/`; IA: [`merchant-dashboard-ia.md`](./merchant-dashboard-ia.md). Not full CMS or pilot-complete polish. |
| Inventory list/low-stock/adjust (dashboard + API; not full WMS) | partial | [`inventory-pricing/`](../backend/src/modules/inventory-pricing/) list/adjust API + low-stock job; [`InventoryPage.tsx`](../frontend/src/pages/InventoryPage.tsx) + integration test; not full WMS |
| Returns & Quality specialist (patterns, supplier quality signals, reduction proposals) | partial | [`ReturnsAgent.ts`](../backend/src/ai/intelligence/multi-agent/agents/ReturnsAgent.ts) + [`returnsTools.ts`](../backend/src/ai/intelligence/multi-agent/agents/returnsTools.ts); [`returnsTools.test.ts`](../backend/src/ai/intelligence/multi-agent/agents/__tests__/returnsTools.test.ts); not full RMA system |
| Marketing & Promotion agent (opportunities, bundles, campaign channels, margin-aware) | partial | [`PromotionAgent.ts`](../backend/src/ai/intelligence/multi-agent/agents/PromotionAgent.ts) + [`promotionTools.ts`](../backend/src/ai/intelligence/multi-agent/agents/promotionTools.ts); [`marketingTools.test.ts`](../backend/src/ai/intelligence/multi-agent/agents/__tests__/marketingTools.test.ts) |
| Lead supervisor: goal subtask planning, result synthesis, HITL gate | partial | [`WorkflowSupervisorAgent.ts`](../backend/src/ai/intelligence/multi-agent/agents/WorkflowSupervisorAgent.ts) + [`supervisorTools.ts`](../backend/src/ai/intelligence/multi-agent/agents/supervisorTools.ts); [`supervisorTools.test.ts`](../backend/src/ai/intelligence/multi-agent/agents/__tests__/supervisorTools.test.ts) |
| Strategic LTM wired into PersonalBrainMemoryService recall (flag PERSONAL_BRAIN_STRATEGIC_MEMORY_ENABLED) | partial | [`StrategicMemoryService.ts`](../backend/src/ai/intelligence/personal-brain/memory/StrategicMemoryService.ts); recall wired in [`PersonalBrainMemoryService`](../backend/src/ai/intelligence/personal-brain/memory/PersonalBrainMemoryService.ts); flag-gated |
| StrategicReflectionJob uses active GoalService goals; skips store when no goals/context (no invented progress) | partial | [`StrategicReflectionJob.ts`](../backend/src/ai/intelligence/personal-brain/reflection/jobs/StrategicReflectionJob.ts); [`StrategicReflectionService.test.ts`](../backend/src/ai/intelligence/personal-brain/reflection/__tests__/StrategicReflectionService.test.ts) |
| KT category opt-out (Hive gate + Settings UI via proactivePrefs.knowledgeTransferCategories) | partial | [`categoryPreferences.ts`](../backend/src/ai/intelligence/knowledge-transfer/categoryPreferences.ts); [`KnowledgeTransferCategoriesSection.tsx`](../frontend/src/components/settings/KnowledgeTransferCategoriesSection.tsx); Hive gate in adapter |
| Wave 3 UX: Goals pursuit intensity/aggressiveness field (backend + frontend + schema) | partial | `pursuitMode` in merchant prefs schema + settings UI; backend goal pursuit wiring |
| Wave 3 UX: Proactive suggestions grouping by agent/goal + confidence visualization | partial | [`ProactiveSuggestionsSection.tsx`](../frontend/src/components/command-center/ProactiveSuggestionsSection.tsx) + [`ProactiveSuggestionCard.tsx`](../frontend/src/components/intelligence/ProactiveSuggestionCard.tsx); grouped feed via [`mergeActivityFeed.ts`](../frontend/src/lib/mergeActivityFeed.ts) |
| Agent pause/priority via autonomyPrefs; live roster activity counts; paused agents blocked in router/runner/proactive | partial | [`agentPause.ts`](../backend/src/shared/settings/agentPause.ts); [`AgentControlsSection.tsx`](../frontend/src/components/command-center/AgentControlsSection.tsx); router/runner/proactive pause checks |
| First-run onboarding with soft redirect guard; onboardingCompleted via overviewPrefs; illustrative quick-wins copy | partial | [`RequireOnboardingComplete.tsx`](../frontend/src/lib/auth/RequireOnboardingComplete.tsx); onboarding flow pages; soft redirect guard |
| Capability hub with labeled demo examples; agent badges aligned to feature-status (no unverified live claims) | partial | [`CapabilitiesPage.tsx`](../frontend/src/pages/CapabilitiesPage.tsx); badges from `feature-status.json` keys; demo examples only |
| Wave 4: Multi-agent retry/backoff, orchestrator fallback, structured error reporting | partial | [`retryConfig.ts`](../backend/src/ai/intelligence/multi-agent/resilience/retryConfig.ts) + [`orchestratorFallback.ts`](../backend/src/ai/intelligence/multi-agent/resilience/orchestratorFallback.ts) + [`errorReporting.ts`](../backend/src/ai/intelligence/multi-agent/resilience/errorReporting.ts); resilience tests |
| Wave 4: Routing cache, LLM call reduction, short-circuit optimizations | partial | [`routingCache.ts`](../backend/src/ai/intelligence/multi-agent/performance/routingCache.ts); LLM routing short-circuit in [`AgentRouterService`](../backend/src/ai/intelligence/multi-agent/AgentRouterService.ts) |
| Wave 4: Integration tests for collaboration handoffs, goal-pursuit scenarios, resilience | partial | [`collaborationHandoffs.integration.test.ts`](../backend/src/ai/intelligence/multi-agent/__tests__/collaborationHandoffs.integration.test.ts), [`goalPursuit.integration.test.ts`](../backend/src/ai/intelligence/multi-agent/__tests__/goalPursuit.integration.test.ts), [`orchestratorFallback.test.ts`](../backend/src/ai/intelligence/multi-agent/resilience/__tests__/orchestratorFallback.test.ts) |
| Wave 7 Docs/DX: multi-agent README, knowledge-transfer, self-hosted install, architecture pointers, roadmap-prompts-status | partial | [`multi-agent/README.md`](../backend/src/ai/intelligence/multi-agent/README.md), [`knowledge-transfer.md`](./knowledge-transfer.md), [`self-hosted-install.md`](./self-hosted-install.md), [`roadmap-prompts-status.md`](./roadmap-prompts-status.md) |
| Wave 5: Channel Sync — pull sync to native catalog/orders, inventory push (Shopify/Woo REST), order-based metrics, Shopify OAuth with encrypted credentials, Settings UI; requires store credentials + FEATURE_CHANNEL_SYNC or tenant toggle | partial | [`channel-sync/`](../backend/src/modules/channel-sync/) module; Shopify/Woo adapters + tests; [`ChannelSyncSection.tsx`](../frontend/src/components/settings/ChannelSyncSection.tsx); encrypted credentials; requires store setup + feature flag |
| Wave 6 Self-Hosted: Install/update scripts, backup/restore runbooks, monitoring dashboard docs (Prometheus/Grafana guide) | partial | [`self-hosted-install.md`](./self-hosted-install.md), [`backup-restore-runbook.md`](./backup-restore-runbook.md), [`monitoring-dashboard-guide.md`](./monitoring-dashboard-guide.md) |
| OIDC SSO (openid-client v6 PKCE); Redis-backed state sessions with in-memory fallback; SPA access-token cookie tradeoff documented | partial | [`oidcService.ts`](../backend/src/shared/auth/oidcService.ts) + [`OidcController.ts`](../backend/src/modules/merchant-auth/api/OidcController.ts); [`sso-oidc-setup.md`](./sso-oidc-setup.md); Redis session store with in-memory fallback |

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

Last updated: 2026-07-28 — P14: Birth + checkout CI e2e evidence locked ([`storefront-birth.e2e.test.ts`](../backend/src/modules/storefront-builder/__tests__/storefront-birth.e2e.test.ts), [`storefront-checkout.e2e.test.ts`](../backend/src/__tests__/storefront-checkout.e2e.test.ts)); status remains **partial** (no pilot edge deploy; no “60s live” claim)

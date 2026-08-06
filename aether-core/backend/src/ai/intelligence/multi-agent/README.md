# Multi-Agent Orchestration

Specialist agents extend the Command Brain via `AgentRegistry` + `AgentOrchestrator` + `SpecialistAgentRunner`.

Wiring entry: `wireMultiAgent.ts` → `registerCommerceTools` + `wireOrchestrationStack`.

## Add a new specialist agent

1. **Define the agent** in `agents/MyAgent.ts` — set `agentKey`, `supportedIntents`, `allowedTools`, `rolePrompt`, `keywordPatterns`, and optional `canDelegateTo`.
2. **Implement tools** — domain tools as `BrainToolExecutor` factories (e.g. `agents/returnsTools.ts`).
3. **Register tools** — wire via `wiring/registerCommerceTools.ts` (commerce) and/or `wiring/wireOrchestrationStack.ts` (orchestration tools such as supervisor/HITL). Reuse existing brain tools when possible.
4. **Add to catalog** — export from `agents/index.ts` and include in `DEFAULT_SPECIALIST_AGENTS`.
5. **Route intents** — map intents in `delegationConfig.ts` (`SPECIALIST_HANDLED_INTENTS`, `resolveDelegationTarget`) and ensure `MULTI_AGENT_ALLOWED_TARGETS` includes the new key (default already lists most specialists).
6. **Collaboration (optional)** — add rules under `collaboration/*.ts` and export them from `collaborationRules.ts` (`DEFAULT_RULES`). Policy resolution stays in `AgentCollaborationPolicy.ts`.
7. **Peer payload scope (optional)** — add `PEER_PAYLOAD_SCOPE` entries in `delegationConfig.ts` for structured `contextPayload` keys.
8. **Peer delegation (optional)** — add targets to `canDelegateTo` and include `delegateToAgent` / `sendAgentMessage` in `allowedTools`.

## Runtime flow

```
Command Bar → AgentRouterService.routePlan
  (rules → LLM plan → prepend → multi-domain/LLM multi → ExecutionModeClassifier)
  → AgentOrchestrator.executeSpecialist / executeSequential / executeParallel
  → MultiAgentResultAggregator (structured + optional LLM synthesis)
  → SpecialistAgentRunner (PersonalBrain agentKey + filtered tools)
  → BrainAgentLoop → HandoffPackage → admin reflection
```

## Agent collaboration

Rule definitions live in `collaboration/*.ts` and are assembled in `collaborationRules.ts`. Resolution (prepend / multi-keyword / priority) stays in `AgentCollaborationPolicy.ts`.

| Domain file | Example rules |
|-------------|----------------|
| `pricingInventoryPromoRules.ts` | `pricing-needs-supplier`, `inventory-to-pricing`, `low-stock-to-promotion`, `promotion-to-pricing`, `marketing-to-inventory` |
| `returnsQualityRules.ts` | `returns-to-supplier`, `returns-to-inventory`, `cross-domain-returns-supplier` |
| `customerChainRules.ts` | `customer-to-pricing`, `customer-to-mail`, `customer-to-inventory-demand` |
| `forecastOutcomesRules.ts` | `forecast-to-inventory`, `outcomes-to-pricing` |
| `catalogNegotiationRules.ts` | `catalog-to-pricing`, `negotiation-to-pricing` |
| `parallelIntelRules.ts` | read-only parallel triples / pairs (supplier ∥ inventory ∥ pricing, …) |

`ExecutionModeClassifier` chooses `parallel` vs `sequential` for multi-keyword plans when all intents are read-only.

## Multi-agent routing

| Method | Returns | Use |
|--------|---------|-----|
| `route()` | Single `RouteDecision` | Legacy single-agent routing |
| `routePlan()` | `ExecutionPlan` | Preferred — sequential, parallel, or single |

`routePlan` cascade:

1. Rule-based collaboration chains (sequential / parallel)
2. `CollaborationPlannerService` (LLM multi-agent plan, if enabled)
3. Single route + prepend collaboration chain
4. Multi-domain keyword detection (≥2 agent keywords, even when intent matches)
5. LLM multi-select routing (`MULTI_AGENT_LLM_ROUTING`) when multi-keyword
6. Single agent fallback

## Result aggregation

`MultiAgentResultAggregator` combines parallel/sequential specialist outputs:

1. **Structured sections** — per-agent summary + status (always)
2. **Conflict detection** — overlapping `pendingActions` on same entity
3. **LLM synthesis** — unified narrative when `MULTI_AGENT_RESULT_SYNTHESIS=true`

Command Bar receives `brain.agentContributions`, `brain.actionConflicts`, and `brain.synthesisSource`.

## LLM collaboration planning (Phase 7a)

`CollaborationPlannerService` returns multi-agent plans via Ollama when enabled (dev default-on; prod requires `MULTI_AGENT_LLM_COLLABORATION_PLANNING=true`). Mutating intents force sequential mode.

## Peer delegation (Phase 7b)

Agents with `canDelegateTo` may call the `delegateToAgent` read tool during `BrainAgentLoop`. Requests go through `AgentPeerBus` → `AgentOrchestrator.chainHandoff` (traceable, tenant-scoped). Mutating peer intents are blocked.

## Agent-to-Agent v1 (structured peer messages)

Runtime peer communication uses **task delegation**, not a free-form chat bus:

```
Agent A → delegateToAgent / sendAgentMessage (tool)
  → AgentPeerBus → UnifiedPeerGuard (depth, canDelegateTo, payload scope)
  → chainHandoff / AgentPeerMesh (direct)
  → Agent B specialist run
  → SSE (agent_handoff, agent_peer_message) + PeerHandoffAuditLog
  → HandoffChainRail (frontend)
```

### Tools

| Tool | Purpose |
|------|---------|
| `delegateToAgent` | Primary LLM tool — intent + query + optional `contextPayload` |
| `sendAgentMessage` | Developer-friendly alias with `messageType` default `request` |

`contextPayload` shape: `{ messageType: intel|request|notify, summary, payload?, correlationId? }`

### Collaboration use cases (v1)

| Flow | Trigger | Path |
|------|---------|------|
| Supplier → Pricing | Price drop intel / `MonitorSupplierUseCase` | `contextPayload.suggestedPricingActions` |
| Inventory → Pricing | Low stock / promotion keywords / `MonitorLowStockUseCase` | `contextPayload.lowStockSkus`, clearance actions |
| Pricing → Inventory | Stock check keywords / `ApplyDynamicPriceUseCase` | `contextPayload.productId`, `changePct` |

New collaboration rules: `low-stock-to-pricing`, `pricing-to-inventory-check`.

### Event-driven peer hooks

| Use case | Flag | Job |
|----------|------|-----|
| Supplier price change → pricing | `MULTI_AGENT_SUPPLIER_PEER=true` | `MonitorSupplierJob` |
| Low stock → pricing | `MULTI_AGENT_INVENTORY_PEER=true` | `MonitorLowStockJob` (`INVENTORY_LOW_STOCK_MONITOR_ENABLED=true`) |

## Parallel execution

`ParallelCoordinator` runs independent specialists via `Promise.all` with per-agent error isolation and stream events (`agent_started`, `agent_completed`):

- `COMPOUND_WORKFLOW` when all sub-goals are read-only
- `routePlan` parallel mode (multi read-only keywords, parallel collaboration rules, or LLM plan)
- Graph `parallel_fork` → `parallel_join` delegates to `ParallelCoordinator`
- Explicit `AgentOrchestrator.executeParallel()`

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `MULTI_AGENT_DELEGATION_ENABLED` | off in prod | Enable specialist routing |
| `MULTI_AGENT_ALLOWED_TARGETS` | `mail,supplier,pricing,inventory,promotion,returns,customer,forecast,approvals,outcomes,negotiation,catalog,autonomy,store_builder,design,copy_seo,store_qa,workflow_supervisor,admin` | Allowed agent keys |
| `MULTI_AGENT_LLM_ROUTING` | `false` | Enable LLM single-agent router |
| `MULTI_AGENT_LLM_ROUTING_MIN_CONFIDENCE` | `0.65` | Min confidence for LLM route |
| `MULTI_AGENT_LLM_COLLABORATION_PLANNING` | on in dev; prod requires `true` | LLM multi-agent collaboration planner |
| `MULTI_AGENT_LLM_PLAN_MIN_CONFIDENCE` | `0.65` | Min confidence for LLM plan |
| `MULTI_AGENT_RESULT_SYNTHESIS` | `false` | LLM synthesis of multi-agent outputs |
| `MULTI_AGENT_PEER_DELEGATION` | `false` | Enable agent-to-agent peer tool |
| `MULTI_AGENT_PEER_MAX_DEPTH` | `2` | Max peer delegation depth |
| `MULTI_AGENT_ASYNC_PEER` | `false` | Fire-and-forget async peer jobs via domain-event outbox |
| `MULTI_AGENT_ASYNC_PEER_POLL_MS` | `2000` | Outbox poll interval hint |
| `MULTI_AGENT_GRAPH_ORCHESTRATION` | `false` | Enable graph orchestrator |
| `MULTI_AGENT_GRAPH_PEER_EDGES` | `false` | Native graph peer edges (CollaborationGraphBuilder) |

## Phase 12 — Run memory, notify peer, promotion agent, supervisor mode, negotiation loop

| Phase | Feature | Key components |
|-------|---------|------------------|
| 12a | Run-scoped blackboard | `RunWorkingMemoryPort`, `readRunMemory` / `writeRunMemory`, Prisma `RunWorkingMemory` |
| 12b | Notify-only async | `AgentPeerNotifyHandler`, `jobMode: notify`, `agent.peer.notified` event |
| 12c | Promotion Agent | `promotion` specialist, `inventory→promotion→pricing` chains, `MULTI_AGENT_PROMOTION_PEER` |
| 12d | Team-lead supervisor | `MULTI_AGENT_SUPERVISOR_MODE`, COMPOUND via `workflow_supervisor`, graph `supervisor` nodes |
| 12e | Multi-turn negotiation | `NegotiationSessionOrchestrator`, `proposeCounterOffer` → `RespondToOfferUseCase`, auto-loop flag |

### Env vars (Phase 12)

| Variable | Default | Purpose |
|----------|---------|---------|
| `MULTI_AGENT_RUN_MEMORY` | off prod | Persist shared run blackboard |
| `MULTI_AGENT_NOTIFY_PEER` | off prod | Fire-and-forget notify without specialist run |
| `MULTI_AGENT_PROMOTION_PEER` | off prod | Route low-stock handoffs to promotion agent |
| `MULTI_AGENT_SUPERVISOR_MODE` | on dev | COMPOUND commands via workflow supervisor |
| `MULTI_AGENT_NEGOTIATION_AUTO_LOOP` | off | Auto re-enter negotiation rounds on `negotiation.updated` |

## Shared Memory v1 (Phase 13)

Run-scoped blackboard per merchant (`tenantId` + `parentRunId`). Agents share business state without explicit peer messages.

### Canonical shared keys (`shared` namespace)

| Key | Writers | Readers |
|-----|---------|---------|
| `priceDrops` | supplier | all agents (pricing reads via cross-read) |
| `lowStockSkus` | inventory | all agents |
| `suggestedPricingActions` | supplier, inventory, promotion | pricing, promotion |
| `recentDecisions` | append-only (notify, unknown payloads) | all agents |
| `agentContributions` | orchestrator (parallel/sequential join) | supervisor, aggregator |
| `businessSnapshot` | orchestrator, bridge | aggregator LLM synthesis |

### Tools

| Tool | Purpose |
|------|---------|
| `readRunMemory` | Read key with read ACL + version |
| `writeRunMemory` | Write with write ACL, schema validation, optional `expectedVersion` |
| `listRunMemory` | List entries in allowed namespaces |
| `appendRunMemory` | Append to array keys (e.g. `recentDecisions`) |

### Components

| Component | Role |
|-----------|------|
| `SharedMemoryBridge` | Normalizes peer/notify/orchestrator writes to canonical keys |
| `CachingRunWorkingMemoryAdapter` | In-process read cache (TTL via env) |
| `PrismaRunWorkingMemoryAdapter` | Source of truth with optimistic `version` column |

### Example flow (supplier → pricing without peer message)

1. Parallel run: supplier calls `writeRunMemory(namespace=shared, key=priceDrops, ...)`
2. Pricing agent starts: `buildPromptBlock` injects shared state; pricing may also `readRunMemory`
3. `MultiAgentResultAggregator` includes `buildSharedSnapshot` in LLM synthesis when enabled

### Env vars (Shared Memory v1)

| Variable | Default | Purpose |
|----------|---------|---------|
| `MULTI_AGENT_RUN_MEMORY` | off prod | Master toggle for shared run memory |
| `MULTI_AGENT_RUN_MEMORY_CACHE_TTL_MS` | `2000` | In-process read cache TTL (0 = disabled) |

## Shared Memory Phase 14 — TTL, Redis, UI, merchant memory, CRDT

| Phase | Feature | Component |
|-------|---------|-----------|
| 14a | TTL / GC | `expiresAt` column, `RunMemoryGcJob`, `runMemoryConfig` per-key TTL |
| 14b | Redis hot cache | `RedisRunMemoryCacheAdapter`, `getRedisClient()` |
| 14c | Command Bar UI | `SharedMemoryRail`, SSE `shared_memory_updated`, REST snapshot |
| 14d | Merchant memory | `MerchantSharedMemory`, `RunMemoryPromoter`, `CompositeSharedMemoryAdapter` |
| 14e | Merge strategies | `mergeStrategies.ts` per canonical key |

### Merchant scope

Cross-session keys: all `shared/*` canonical keys plus selected agent keys (`pricing/marginAnalysis`, `pricing/priceProposals`, `inventory/stockLevels`). Promoted at end of successful multi-agent runs when `MULTI_AGENT_MERCHANT_MEMORY_PROMOTE=true`.

Tools accept optional `scope: 'run' | 'merchant'` (default `run`). Merchant reads injected via `buildMerchantPromptBlock` at specialist run start.

### Env vars (Phase 14)

| Variable | Default | Purpose |
|----------|---------|---------|
| `RUN_MEMORY_GC_ENABLED` | `false` | Background purge of expired rows |
| `RUN_MEMORY_GC_INTERVAL_MS` | `3600000` | GC poll interval |
| `RUN_MEMORY_RUN_TTL_MS` | `86400000` | Default run-scope TTL (24h) |
| `MERCHANT_MEMORY_TTL_MS` | `604800000` | Default merchant-scope TTL (7d) |
| `RUN_MEMORY_MAX_AGE_MS` | `2592000000` | Fallback max age when `expiresAt` null |
| `RUN_MEMORY_REDIS_CACHE` | `false` | Redis read-through cache layer |
| `RUN_MEMORY_REDIS_TTL_SEC` | `30` | Redis entry TTL |
| `MULTI_AGENT_MERCHANT_MEMORY` | off prod | Enable merchant scope reads/writes |
| `MULTI_AGENT_MERCHANT_MEMORY_PROMOTE` | `true` when enabled | Auto-promote at run end |
| `MULTI_AGENT_MERCHANT_MEMORY_DUAL_WRITE` | `false` | Bridge dual-write high-value keys |

## Phase 12 — Catalog & Autonomy agents

| Agent | Key | Intents | Notes |
|-------|-----|---------|-------|
| Product Catalog Agent | `catalog` | `CREATE_PRODUCT`, `PRODUCT_LIST`, `PRODUCT_SEARCH` | list/search/propose-create via approval queue |
| Autonomy Agent | `autonomy` | `AUTONOMY_METRICS`, `AUTONOMY_TRACE`, `DECISION_REVIEW`, `AUTONOMOUS_ROUTE` | Central peer entry for `CreateDecisionUseCase`; respects `autonomyLevel` |

`MULTI_AGENT_AUTONOMY_PEER=true` routes autonomous decisions through the Autonomy Agent (prod opt-in).

## Phase 8 — Async peers, federated advisory, graph edges

- **`delegateToAgentAsync`** — queues `AgentPeerJob`, publishes `agent.peer.requested`, worker runs sync handoff
- **`global-advisory`** — federated anonymized patterns via `FederatedPeerPort` / `AgentPatternSyncService` (no raw cross-tenant data)
- **SSE** — `peer_job_queued`, `peer_job_completed`, `peer_job_failed`, `handoff_chain_update`
- **Frontend** — `HandoffChainRail`, `AgentBadge.chainFrom`, `brain.handoffChain` on result
- **Graph** — `CollaborationGraphBuilder` + `NativeGraphOrchestrator` v2 with explicit node/edge model; `LangGraphOrchestrator.buildStateGraph` stub for future `@langchain/langgraph`


## Current specialists

| Agent | Key | Intents |
|-------|-----|---------|
| Pricing Agent | `pricing` | `PRICE_UPDATE`, `LOW_MARGIN_REPORT`, `PRICING_OPTIMIZE` |
| Supplier Agent | `supplier` | `SUPPLIER_MONITOR`, `SUPPLIER_CREATE`, `SUPPLIER_PRICE_INTEL` |
| Inventory Agent | `inventory` | `INVENTORY_STATUS`, `RESTOCK_SUGGEST` |
| Mail Agent | `mail` | `EMAIL_SUMMARY` |
| Customer Insights Agent | `customer` | `CUSTOMER_SEGMENT`, `CUSTOMER_ORDER_TRENDS`, `CUSTOMER_CHURN_SIGNALS`, `ORDER_STATUS` |
| Forecast Agent | `forecast` | `FORECAST`, `DEMAND_PREDICT`, `FORECAST_SUMMARY` |
| Approvals Agent | `approvals` | `PENDING_APPROVALS`, `APPROVE_CHANGES`, `APPROVAL_SUMMARY` |
| Outcomes Agent | `outcomes` | `OUTCOMES_REPORT`, `OUTCOME_VERIFY`, `ATTRIBUTION_SUMMARY` |
| Negotiation Agent | `negotiation` | `NEGOTIATION_STATUS`, `NEGOTIATION_RESPOND`, `NEGOTIATION_LIST` |
| Marketing & Promotion Agent | `promotion` | `PROMOTION_SUGGEST`, `CLEARANCE_PRICING`, `PROMOTION_LIST`, `MARKETING_OPPORTUNITY`, `CAMPAIGN_SUGGEST`, `BUNDLE_SUGGEST` |
| Returns & Quality Agent | `returns` | `RETURNS_ANALYSIS`, `QUALITY_SIGNALS`, `RETURNS_REDUCE` |
| Product Catalog Agent | `catalog` | `CREATE_PRODUCT`, `PRODUCT_LIST`, `PRODUCT_SEARCH` |
| Autonomy Agent | `autonomy` | `AUTONOMY_METRICS`, `AUTONOMY_TRACE`, `DECISION_REVIEW`, `AUTONOMOUS_ROUTE` |
| Store Builder / Design / CopySEO / Store QA | `store_builder`, `design`, `copy_seo`, `store_qa` | storefront intents |
| Workflow Supervisor (Lead) | `workflow_supervisor` | `COMPOUND_WORKFLOW`, `PLAN_AND_DELEGATE` |

## Returns & Quality Agent

Runtime specialist for retour/kwaliteit workflows (`agents/ReturnsAgent.ts`, tools in `returnsTools.ts`).

| Tool | Kind | Purpose |
|------|------|---------|
| `analyzeReturnPatterns` | read | Retourpercentages / pattern summary |
| `signalSupplierQualityIssues` | read | Leveranciers-kwaliteitssignalen |
| `suggestReturnReduction` | propose | Reductie-suggesties (approval path) |

Collaboration: `returns-to-supplier`, `returns-to-inventory`, `cross-domain-returns-supplier` in `collaboration/returnsQualityRules.ts`. Peer scope keys for `returns → supplier|inventory` include `returnRatePct`, `qualitySignals`, `suggestedActions`.

Status: `returns-quality-agent` in [`feature-status.json`](../../../../../docs/feature-status.json) — **partial** (tools + routing + tests; not a full RMA system).

## Marketing tools (Promotion Agent)

`PromotionAgent` is the Marketing & Promotion specialist. Extra marketing tools (beyond clearance/promo list):

| Tool | Purpose |
|------|---------|
| `detectMarketingOpportunities` | Opportunity scan (`MARKETING_OPPORTUNITY`) |
| `suggestBundle` | Bundle proposals (`BUNDLE_SUGGEST`) |
| `suggestCampaignChannel` | E-mail / social channel suggestions (`CAMPAIGN_SUGGEST`) |
| `suggestPromotion` / `suggestClearancePricing` / `createPromotion` | Promo / clearance path |

Handoffs: `low-stock-to-promotion`, `promotion-to-pricing`, `marketing-to-inventory` (see `pricingInventoryPromoRules.ts`). Can delegate to `pricing`, `inventory`, `mail`, `copy_seo`.

Status: `marketing-promotion-agent` — **partial**.

## Lead Workflow Supervisor — planGoalSubtasks & HITL

`workflow_supervisor` tools (`supervisorTools.ts`, registered in `wireOrchestrationStack.ts`):

| Tool | Kind | Runtime behavior |
|------|------|------------------|
| `planGoalSubtasks` | read | Heuristic (deterministic) goal → ordered `{ agentKey, intent, objective }` subtasks; sets `requiresHitl` for high-impact goals/constraints |
| `synthesizeAgentResults` | read | Combines specialist summaries into a coherent plan string |
| `requestHitlGate` | propose | High-risk proposal; merchant approval before autonomous execution (`executeConfirmed` records gate only) |

Also uses `delegateToAgent` / `delegateToAgentAsync`, run-memory tools. Compound routing still gated by `MULTI_AGENT_SUPERVISOR_MODE`.

Status: `lead-workflow-supervisor` — **partial** (heuristic planner + HITL propose tool; not an LLM planner).

## Dev quick-start

Enable in `.env` (see `.env.example`):

```
COMMAND_BRAIN_STREAMING_ENABLED=true
MULTI_AGENT_DELEGATION_ENABLED=true
MULTI_AGENT_PEER_DELEGATION=true
```

Example commands:

```
"Analyseer klant order trends en stel prijsoptimalisatie voor"
  → sequential [customer → pricing]

"Check leveranciersprijzen en stel prijsaanpassingen voor"
  → sequential [supplier → pricing]

"Geef klant order trends en inventory status"
  → parallel [customer ∥ inventory]

"Voorspel demand en stel prijsoptimalisatie voor"
  → sequential [forecast → pricing]

"Toon pending approvals"
  → single [approvals]

"Attribution uplift en prijsoptimalisatie"
  → sequential [outcomes → pricing]

"Analyseer retourpatronen en leverancierskwaliteit"
  → sequential [returns → supplier]

"Detecteer marketingkansen en toets marge"
  → sequential [promotion → pricing]

"Orkestreer workflow: voorraad, promotie en prijzen"
  → workflow_supervisor (planGoalSubtasks → specialists; HITL if high-impact)
```

### Examples

**Inventory + Pricing (sequential):**
```
"Toon low-stock producten en stel prijsoptimalisatie voor"
  → routePlan: sequential [inventory, pricing]
```

**Inventory + Mail (parallel, read-only):**
```
"Geef inventory status en email samenvatting"
  → routePlan: parallel [inventory, mail]
```

**Peer delegation:**
```
Pricing Agent calls delegateToAgent(inventory, INVENTORY_STATUS, "low stock SKUs")
  → AgentPeerBus → chainHandoff → inventory narrative returned to pricing loop
```

## Frontend

Command Bar shows multiple `AgentBadge`s and execution mode during parallel and sequential streaming. Stream events: `agent_assigned`, `agent_started`, `agent_completed`. Post-result: `CommandResultCard` shows `brain.agents[]`, `AgentContributionsPanel`, and conflict banners when applicable.

### Agents Hub (visibility)

Merchant-facing agent roster and per-agent activity at `/agents` (sidebar: **Agents**).

| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/agents` | Roster: displayName, status, proactiveCount, recentActionCount |
| `GET /api/admin/agents/:agentKey/activity?days=7` | Filtered activity + proactive + explainability |
| `GET /api/admin/activity?agentKey=` | Activity log filter by specialist |

Audit entries for commands and proactive auto-execute include `agentKey` / `agentKeys` in `details` for traceability.

### Strengthening an existing agent (checklist)

When bringing a specialist to production parity:

1. Dedicated domain tools per supported intent
2. `readRunMemory` / `writeRunMemory` + shared canonical keys in `sharedMemorySchema.ts`
3. `PEER_PAYLOAD_SCOPE` entries for `canDelegateTo` targets
4. Proactive trigger in `ProactiveTriggerRegistry` (optional)
5. NL `matchIntent()` rules in `ExecuteNaturalLanguageCommandUseCase`
6. Collaboration rules in `AgentCollaborationPolicy` for cross-agent flows
7. Activity attribution via audit `agentKey` on runs

## Proactive triggers

Proactive merchant suggestions live in `src/ai/intelligence/proactive/` — separate from peer handoffs.

**Add a new proactive trigger:**

1. Create `proactive/triggers/myTrigger.ts` implementing `ProactiveTriggerDefinition`.
2. Register in `ProactiveTriggerRegistry` (default registry or custom instance).
3. For event-driven triggers: publish a `DomainEventType` from a use case and set `eventType` on the trigger.
4. For periodic scans: set `mode: 'periodic'` — evaluated by `ProactiveBrainJob`.

**v1 triggers:** `supplier.price_drop`, `inventory.low_stock`, `pricing.margin_decline`, `general.order_anomaly`, `customer.churn_risk`.

Merchant control: `TenantSettings.proactivePrefs` (enabled, visibility, maxActive, categories, allowAutoExecute).

### v2 capabilities

| Feature | Flag | Module |
|---------|------|--------|
| Cross-trigger dedupe | `PROACTIVE_CROSS_DEDUPE_ENABLED` | `proactive/dedupe/CrossTriggerDedupeService` |
| SSE push (no 30s poll) | `PROACTIVE_SSE_ENABLED` | `ProactiveSuggestionEmitter` + `GET /events/stream` |
| PersonalBrain learning | `PROACTIVE_LEARNING_ENABLED` | `proactive/learning/ProactiveLearningService` |
| Context enrichment | `PROACTIVE_LLM_ENRICHMENT_ENABLED` | `proactive/enrichment/ProactiveEnrichmentService` + job |
| Auto-execute low-risk | `PROACTIVE_AUTO_EXECUTE_ENABLED` + `allowAutoExecute` | `proactive/execution/*` |

**Dedupe:** merges overlapping `inventory.low_stock` + `pricing.margin_decline` into one card; suppresses margin when `supplier.price_drop` is present for the same supplier.

**SSE:** ingest/dismiss/snooze/execute emit `proactive_updated` frames on the admin event stream; frontend invalidates proactive query cache.

**Learning:** dismiss/execute/snooze write `proactive_decision:{triggerId}` to PersonalBrain; ≥3 dismisses → suppress ingest; ≥3 executes → priority boost.

**Auto-execute:** gated by env flag, merchant opt-in, policy, autonomy window, low-risk only, learning preference, and 4h cooldown.

### v3 capabilities

| Feature | Flag | Module |
|---------|------|--------|
| Sidecar proactive count | _(none)_ | `buildDashboardPayload.proactiveCount` + `ProactiveSidecar` |
| Email + inbox notifications | `PROACTIVE_EMAIL_NOTIFICATIONS_ENABLED` | `proactive/notifications/ProactiveNotificationDispatcher` |
| Cross-tenant proactive patterns | `PROACTIVE_GLOBAL_PATTERNS_ENABLED` | `proactive/global/*` via `GlobalAgentPattern` |
| Detection-time orchestration | `PROACTIVE_DETECTION_ORCHESTRATION_ENABLED` | `proactive/orchestration/ProactiveDetectionOrchestrator` |

**Sidecar:** dashboard REST/SSE expose `proactiveCount`; collapsed sidecar shows badge count.

**Notifications:** `notificationPrefs.proactiveSuggestions` controls in-app inbox entries and optional SMTP email (rate-limited).

**Global patterns:** anonymized execute/dismiss/snooze rates per `triggerId` contributed to `GlobalAgentPattern`; inbound hints adjust priority and enrichment copy (KT-gated, k-anonymity).

**Detection orchestration:** async `AgentSupervisorOrchestrator` run after ingest updates title/summary; `PROACTIVE_DETECTION_UNIFY_PEER` skips duplicate monitor peer handoffs.

# Multi-Agent Orchestration

Specialist agents extend the Command Brain via `AgentRegistry` + `AgentOrchestrator` + `SpecialistAgentRunner`.

## Add a new specialist agent

1. **Define the agent** in `agents/MyAgent.ts` — set `agentKey`, `supportedIntents`, `allowedTools`, `rolePrompt`, and optional `canDelegateTo`.
2. **Register tools** — add domain tools via `PersonalBrainToolRegistry.register()` in `createIntelligenceLayer.ts`, or reuse existing brain tools.
3. **Add to catalog** — export from `agents/index.ts` and include in `DEFAULT_SPECIALIST_AGENTS`.
4. **Route intents** — add intent mapping in `delegationConfig.ts` if needed (registry `supportedIntents` is primary).
5. **Collaboration (optional)** — add rules in `AgentCollaborationPolicy.ts` for cross-agent handoffs.
6. **Peer delegation (optional)** — add target to `canDelegateTo` and include `delegateToAgent` in `allowedTools`.

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

Handoff rules live in `AgentCollaborationPolicy.ts`:

| Rule | Trigger | Chain |
|------|---------|-------|
| `pricing-needs-supplier` | `PRICE_UPDATE` / `PRICING_OPTIMIZE` + supplier keywords | supplier prepend |
| `pricing-needs-inventory` | `PRICING_OPTIMIZE` / `LOW_MARGIN_REPORT` + inventory keywords | inventory prepend |
| `supplier-to-pricing` | supplier intent + pricing keywords | supplier → pricing |
| `inventory-to-pricing` | inventory intent + pricing keywords | inventory → pricing |
| `cross-domain-inventory-pricing` | inventory + pricing keywords | inventory → pricing |
| `cross-domain-single` | supplier + pricing keywords | supplier → pricing |
| `parallel-intel-triple` | supplier + inventory + pricing keywords (read-only) | supplier ∥ inventory ∥ pricing |
| `parallel-intel-supplier-pricing` | supplier + pricing keywords (read-only) | supplier ∥ pricing |
| `parallel-intel-inventory-mail` | inventory + mail keywords (read-only) | inventory ∥ mail |
| `parallel-intel-customer-inventory` | customer + inventory keywords (read-only) | customer ∥ inventory |
| `customer-to-pricing` | customer intent + pricing keywords | customer → pricing |
| `customer-to-mail` | customer intent + mail keywords | customer → mail |
| `cross-domain-customer-pricing` | customer + pricing keywords | customer → pricing |
| `cross-domain-customer-mail` | customer + mail keywords | customer → mail |
| `cross-domain-customer-inventory` | customer + inventory keywords | customer → inventory |
| `parallel-intel-forecast-customer` | forecast + customer keywords (read-only) | forecast ∥ customer |
| `forecast-to-inventory` | forecast intent + inventory keywords | forecast → inventory |
| `forecast-to-pricing` | forecast intent + pricing keywords | forecast → pricing |
| `cross-domain-forecast-pricing` | forecast + pricing keywords | forecast → pricing |
| `cross-domain-order-inventory` | order status + inventory keywords | customer → inventory |
| `outcomes-to-pricing` | outcomes intent + pricing keywords | outcomes → pricing |
| `cross-domain-outcomes-pricing` | outcomes + pricing keywords | outcomes → pricing |
| `negotiation-to-pricing` | negotiation intent + pricing keywords | negotiation → pricing |
| `cross-domain-negotiation-pricing` | negotiation + pricing keywords | negotiation → pricing |
| `catalog-to-pricing` | catalog intent + pricing keywords | catalog → pricing |
| `catalog-to-inventory` | CREATE_PRODUCT + inventory keywords | catalog → inventory |
| `cross-domain-catalog-pricing` | catalog + pricing keywords | catalog → pricing |
| `autonomy-to-approvals` | autonomy/decision + approval keywords | autonomy → approvals |

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
| `MULTI_AGENT_ALLOWED_TARGETS` | `mail,supplier,pricing,inventory,customer,forecast,approvals,outcomes,negotiation,catalog,autonomy,admin` | Allowed agent keys |
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
| Workflow Supervisor | `workflow_supervisor` | `COMPOUND_WORKFLOW`, `PLAN_AND_DELEGATE` |

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

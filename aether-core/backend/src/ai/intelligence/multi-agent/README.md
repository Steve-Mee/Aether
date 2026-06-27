# Multi-Agent Orchestration

Specialist agents extend the Command Brain via `AgentRegistry` + `AgentOrchestrator` + `SpecialistAgentRunner`.

## Add a new specialist agent

1. **Define the agent** in `agents/MyAgent.ts` — set `agentKey`, `supportedIntents`, `allowedTools`, `rolePrompt`, and optional `canDelegateTo`.
2. **Register tools** — add domain tools via `PersonalBrainToolRegistry.register()` in `createIntelligenceLayer.ts`, or reuse existing brain tools.
3. **Add to catalog** — export from `agents/index.ts` and include in `DEFAULT_SPECIALIST_AGENTS`.
4. **Route intents** — add intent mapping in `delegationConfig.ts` if needed (registry `supportedIntents` is primary).

## Runtime flow

```
Command Bar → AgentRouterService (intent → keyword → LLM)
  → AgentOrchestrator.route / executeSpecialist / executeParallel
  → SpecialistAgentRunner (PersonalBrain agentKey + filtered tools)
  → BrainAgentLoop → HandoffPackage → admin reflection
```

## LLM routing

Cascade in `AgentRouterService`:

1. Intent match (`AgentRegistry.resolveByIntent`)
2. Keyword match (`keywordPatterns` on agent definitions)
3. LLM fallback when `MULTI_AGENT_LLM_ROUTING=true`, intent is `UNKNOWN`, confidence &lt; 0.6, or ambiguous keyword matches

## Parallel execution

`ParallelCoordinator` runs independent specialists via `Promise.all`. Used for:

- `COMPOUND_WORKFLOW` when all sub-goals are read-only (non-mutating)
- Explicit `AgentOrchestrator.executeParallel()`

Mutating sub-goals run sequentially via `executeSequential`.

## Graph orchestration (Phase 6b+)

`GraphOrchestratorPort` with `NativeGraphOrchestrator` and `LangGraphOrchestrator` adapter. When `MULTI_AGENT_GRAPH_ORCHESTRATION=true`, compound workflows route through `executeGraph` instead of direct parallel/sequential calls.

| Variable | Default | Purpose |
|----------|---------|---------|
| `MULTI_AGENT_GRAPH_ORCHESTRATION` | `false` | Enable graph orchestrator |
| `MULTI_AGENT_GRAPH_BACKEND` | `native` | `native` or `langgraph` |

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `MULTI_AGENT_DELEGATION_ENABLED` | off in prod | Enable specialist routing |
| `MULTI_AGENT_ALLOWED_TARGETS` | `mail,supplier,pricing,inventory,admin` | Allowed agent keys |
| `MULTI_AGENT_LLM_ROUTING` | `false` | Enable LLM agent router |
| `MULTI_AGENT_LLM_ROUTING_MIN_CONFIDENCE` | `0.65` | Min confidence for LLM choice |

## Current specialists

| Agent | Key | Intents |
|-------|-----|---------|
| Pricing Agent | `pricing` | `PRICE_UPDATE`, `LOW_MARGIN_REPORT`, `PRICING_OPTIMIZE` |
| Supplier Agent | `supplier` | `SUPPLIER_MONITOR`, `SUPPLIER_CREATE` |
| Inventory Agent | `inventory` | `INVENTORY_STATUS`, `RESTOCK_SUGGEST` |
| Mail Agent | `mail` | `EMAIL_SUMMARY` |

## Frontend

Command Bar shows `AgentBadge` in `CommandResultCard` and `CommandPalette` (stream + last result) when `brain.specialist` or `brain.agents` is set. Streaming shows badge on `agent_assigned` SSE event.

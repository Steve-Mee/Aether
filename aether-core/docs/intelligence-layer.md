# Intelligence Layer

**Status:** partial (Phase 2 — collective intelligence + RAG)  
**Code:** [`backend/src/ai/intelligence/`](../backend/src/ai/intelligence/)  
**Wiring:** [`compositionRoot.ts`](../backend/src/bootstrap/compositionRoot.ts) via `createIntelligenceLayer()`

## Architecture

```
Command Bar / Mail / Supplier
  → PersonalBrainRegistry.get(tenantId, agentKey)
    → recall → augment LLM → remember
  → KnowledgeContributionService → filtered anonymized metrics → hive-mind
  → GlobalBrain → hive-mind aggregates + GlobalInsight federated
  → GlobalKnowledgeService → curated patches + hive metrics → PersonalBrain indexKnowledge
  → AIOrchestrator tasks: brain.*, insight.submit, knowledge.contribute, knowledge.pull
```

## Bidirectional knowledge loop (v1)

```
PersonalBrain (tenant-isolated)
  → AgentRun / tool outcomes / domain events
  → KnowledgeContributionService
      → ContributionGate (opt-out, receive_only, contribute_only)
      → ContributionSafetyFilter (category/metric allowlist, PII, numeric bounds)
      → HiveMindKnowledgeTransferAdapter → SubmitInsightUseCase (HMAC + ZK + privacy budget)
      → optional CrossTenantSubmitPipeline → GlobalInsight (federated opt-in)
GlobalKnowledgeService.syncForTenant → PersonalBrain indexKnowledge
```

**Outbound (Personal → Global)** — allowed insight types (structured metrics only):

| Category | Example metrics |
|----------|-----------------|
| `pricing` | `auto_apply_rate`, `price_change_success_rate`, `price_elasticity_estimate` |
| `conversion` | `mail_auto_reply_rate`, `conversion_rate` |
| `inventory` | `{tool}_success_rate`, `{tool}_tool_approval_rate` |
| `marketing` | `promo_uplift_rate` |
| `trend` | `agent_run_success_rate`, `seasonal_demand_index` |

**Never shared:** customer names, emails, absolute prices/margins, SKUs, supplier names, narratives, raw vector snippets.

**Governance (`TenantSettings`):**

| Setting | Effect |
|---------|--------|
| `brainKnowledgeTransferEnabled: false` | Opt out of entire loop |
| `brainKnowledgeGovernanceMode: receive_only` | Block outbound contribution |
| `brainKnowledgeGovernanceMode: contribute_only` | Block inbound sync (existing) |
| `brainFederatedContributionEnabled: true` | Include tenant in cross-tenant `GlobalInsight` aggregation |

**Triggers:** successful multi-step agent run (≥2 tools), tool approve/reject, supplier/mail auto-apply events, orchestrator `insight.submit` / `knowledge.contribute`.

**Transparency:** command response may include `brain.knowledgeContributionNotice` when insights were shared.

## Knowledge loop v2 extensions

### Secure aggregation (SecAgg)

When `INTELLIGENCE_SECAGG_ENABLED=true`, federated metrics use pairwise-mask SecAgg instead of plaintext `CrossTenantSubmitPipeline`:

- `SecAggRoundService` — collecting rounds per category:metric
- `pairwiseMask` — Bonawitz-style scalar masks; server never stores raw individual values
- `knowledge.federate` task finalizes expired rounds → DP-noisy `GlobalInsight`

| Variable | Default | Purpose |
|----------|---------|---------|
| `INTELLIGENCE_SECAGG_ENABLED` | `false` | Use SecAgg instead of plaintext federate |
| `SECAGG_MIN_PARTICIPANTS` | `5` | Min tenants per round |
| `SECAGG_ROUND_TIMEOUT_MS` | `300000` | Round collection deadline |
| `SECAGG_DP_EPSILON` | `1.0` | Laplace ε at aggregate write |

### LLM distillation → auto patches

- `LlmDistillationAdapter` — Ollama generalization (`INTELLIGENCE_DISTILLATION_LLM=true`)
- `PatternOccurrenceStore` — per-tenant occurrence counts for auto-promote
- `INTELLIGENCE_GLOBAL_KNOWLEDGE_V4` — auto-publish drafts when governance passes

### Periodic jobs

| Variable | Default | Purpose |
|----------|---------|---------|
| `KNOWLEDGE_CONTRIBUTE_JOB_ENABLED` | `false` | Daily batch `knowledge.contribute` per tenant |
| `KNOWLEDGE_DISTILL_JOB_ENABLED` | `false` | Scheduled `knowledge.distill` |
| `KNOWLEDGE_FEDERATE_JOB_ENABLED` | `false` | Scheduled `knowledge.federate` |
| `KNOWLEDGE_CONTRIBUTE_INTERVAL_MS` | `86400000` | Job interval |
| `KNOWLEDGE_CONTRIBUTE_DEDUP_WINDOW_MS` | `86400000` | Skip duplicate batch submits |

### PII detection stack

Shared module: `backend/src/shared/privacy/`

- `PiiPatternLibrary` — centralized regex (email, phone, IBAN, NL BSN/KVK)
- `CompositePiiDetector` — regex first; optional `OllamaPiiClassifier` when `INTELLIGENCE_PII_NLP=true`

### Merchant contribution dashboard

| Method | Path | Role |
|--------|------|------|
| GET | `/api/admin/brain/contribution-history` | viewer |
| GET | `/api/admin/brain/contribution-summary` | viewer |
| GET | `/api/admin/brain/global-patches/active` | viewer (summary only) |

Settings UI: **Kennisbijdragen** section with 30-day summary + audit table.


## Phase 2 capabilities

| Feature | Implementation |
|---------|----------------|
| Ollama embeddings | `ResilientEmbeddingAdapter` + `INTELLIGENCE_EMBEDDING=ollama` |
| Hive-mind bridge | `HiveMindKnowledgeTransferAdapter` |
| Personal → Global contribution | `KnowledgeContributionService` + `ContributionSafetyFilter` + audit log |
| Global brain | `HiveMindGlobalBrain` + AgentRuntime collective context (KT-gated per tenant) |
| Global → Personal knowledge | `GlobalKnowledgeService` + `StaticGlobalKnowledgeCatalog` + profile-based patch sync |
| Command Bar RAG | `CommandBrainService` + `ContextRetriever` hybrid retrieval |
| Brain agent loop | `BrainAgentLoop` + `PersonalBrainToolRegistry` — read + propose tools |
| Tool execution API | `POST /api/admin/command/tools/execute` + `ExecuteBrainToolUseCase` |
| Brain action modes | `brainActionMode`: always_confirm / confirm_on_uncertain / adaptive |
| Adaptive learning | `BrainAdaptiveLearningService` + `brainAdaptiveLearningEnabled` setting |
| Undo memory rollback | `UndoCommandUseCase` deletes `brainMemoryId` + PRICE_UPDATE price restore |
| LoRA registry | `BrainLoRAAdapter` + `FilesystemLoRAAdapter` + `GET/PUT /api/admin/brain/lora` |
| Mail/Supplier RAG | `ProcessIncomingEmailUseCase`, `MonitorSupplierUseCase` |
| Multi-agent | Orchestrator tasks + agent profiles (`admin`, `mail`, `supplier`) |
| Self-hosted vectors | `JsonFileVectorStoreAdapter` (`INTELLIGENCE_VECTOR_BACKEND=lancedb`) + export/import API |

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `INTELLIGENCE_VECTOR_BACKEND` | `pgvector` | `pgvector`, `memory`, or `lancedb` (JSON file store) |
| `INTELLIGENCE_EMBEDDING` | hash (local) / ollama (docker) | Embedding backend |
| `INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED` | `false` | Enable hive-mind submit/pull (tenant can opt-out via settings) |
| `INTELLIGENCE_AUTO_FEDERATE_ON_CONTRIBUTE` | `false` | Refresh `GlobalInsight` after each successful contribution (federated opt-in tenants) |
| `COMMAND_BRAIN_USE_ORCHESTRATOR` | `false` | Route prepare step via orchestrator `command.brain.prepare` |
| `BRAIN_TOOL_PROPOSAL_TTL_MINUTES` | `15` | Expiry for pending tool proposals |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Ollama embedding model |
| `LANCE_DB_PATH` | `./data/brain-lance` | JSON vector file path when backend is `lancedb` |

Per-tenant overrides (optional): `brainVectorBackend`, `brainKnowledgeTransferEnabled`, `brainKnowledgeGovernanceMode` (`full_loop` / `receive_only` / `contribute_only`), `brainKnowledgeUpdateProfile` (`conservative` / `balanced` / `aggressive`), `brainFederatedContributionEnabled`, `brainLoRAPath`, `brainActionMode`, `brainAdaptiveLearningEnabled` via `GET/PUT /api/admin/settings`.

## Tool catalog (PersonalBrainToolRegistry)

| Tool | Kind | Risk | Description |
|------|------|------|-------------|
| `search_products` | read | low | Product search by keyword |
| `recall_memory` | read | low | PersonalBrain recall |
| `get_collective_insights` | read | low | KT-gated global insights |
| `getProductInfo` | read | low | Detailed product lookup |
| `updatePrice` | propose | medium/high | Price change proposal |
| `syncSupplier` | propose | medium | Supplier monitor/sync proposal |
| `createApproval` | propose | high | Create approval request |
| `createInsight` | propose | low | Save merchant insight |

**Flow:** Command → RAG + parse → (optional defer) → `BrainAgentLoop` calls read/propose tools → `pendingActions` in response → merchant clicks **Uitvoeren** → `POST /api/admin/command/tools/execute`.

**Confirmation modes (`brainActionMode`):**

| Mode | Behavior |
|------|----------|
| `confirm_on_uncertain` | Direct handler execution when confidence ≥ 0.85; else tool proposals |
| `always_confirm` | Mutating handlers skipped; brain always proposes |
| `adaptive` | Like uncertain + learned hints from past approve/reject decisions |

## Admin API

| Method | Path | Role |
|--------|------|------|
| POST | `/api/admin/command/tools/execute` | operator |
| POST | `/api/admin/command/tools/reject` | operator |
| GET | `/api/admin/command/:commandId/agent-run` | viewer — transcript + pending proposals |
| GET | `/api/admin/brain/collective-insights` | viewer |
| GET | `/api/admin/brain/lora` | viewer |
| PUT | `/api/admin/brain/lora` | operator |
| GET | `/api/admin/brain/export` | operator (requires `dataExportEnabled`) |
| POST | `/api/admin/brain/import` | operator |

## Re-embed after embedding switch

```bash
cd backend
INTELLIGENCE_EMBEDDING=ollama npm run brain:reembed
# optional: --tenantId=tenant_default
```

Uses `resolveVectorStore()` for tenant-aware vector backends. After switching embeddings, re-run reembed before relying on semantic recall.

**KT gating:** `AgentRuntime` omits collective/knowledge snippets when `INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED` is not `true` or tenant sets `brainKnowledgeTransferEnabled: false`.

## Global → Personal knowledge transfer (v1)

When KT is enabled, `GlobalKnowledgeService.syncForTenant()` runs at command start:

1. Loads curated patches from `global-knowledge/catalog/default-patches.json`
2. Merges hive-mind metric aggregates as `metric_insight` patches (when hive deps wired)
3. Filters by tenant `brainKnowledgeUpdateProfile`
4. Indexes approved patches into PersonalBrain vector store (`global:{patchId}`)
5. Injects labeled snippets into parser, planner, agent loop, and hybrid retrieval

Command responses may include `brain.globalKnowledge` metadata when patches were applied (no merchant PII).

**Update profiles:**

| Profile | Behavior |
|---------|----------|
| `conservative` | High-priority patterns + metric insights only; no prompt templates |
| `balanced` | Default — curated patterns and rules; low-priority prompt templates excluded |
| `aggressive` | All patch kinds including experimental prompt templates |

**Orchestrator:** `knowledge.pull` returns hive updates plus `syncResult` from `GlobalKnowledgeService`.

## Global knowledge v2–v4 (roadmap implementation)

Enable with env flags:

| Variable | Purpose |
|----------|---------|
| `INTELLIGENCE_GLOBAL_KNOWLEDGE_V2` | DB patch catalog, federated aggregates, distillation |
| `INTELLIGENCE_GLOBAL_KNOWLEDGE_V3` | LoRA + vector distillation patch kinds |
| `INTELLIGENCE_GLOBAL_KNOWLEDGE_V4` | Auto-promote distilled drafts |

**v2:** `GlobalKnowledgePatch` Prisma table, admin CRUD/publish API, `PrismaGlobalKnowledgeCatalog`, federated `GlobalInsight` + `CrossTenantSubmitPipeline`, `KnowledgeDistillationService`, sync log.

**v3:** `LoRAPatchAdapter`, `VectorDistillationAdapter` — patch kinds `lora_trait`, `lora_config`, `vector_distilled`.

**v4:** `DistillationGovernance` auto-promote, `FeedbackLoopMetrics`, experiment outcome recording via `knowledge.experiment.record`.

**Orchestrator tasks:** `knowledge.distill`, `knowledge.federate`, `knowledge.experiment.record`.

**Tenant settings:** `brainFederatedContributionEnabled`, `brainKnowledgeGovernanceMode` (`contribute_only` / `receive_only` / `full_loop`).

**Admin API:** `GET /api/admin/brain/global-knowledge/status`, `GET/POST/PUT /api/admin/brain/global-patches`, publish/retire actions.

## Phase 2 — Brain tool calling extensions

| Feature | Implementation |
|---------|----------------|
| Agent transcript | `AgentTranscript` + `BrainAgentRun` persistence |
| Explicit planning | `BrainAgentPlanner` — plan message in transcript + `plan_ready` SSE |
| Multi-step loop | `BrainAgentLoop` — max 5 steps/segment, 10 total; replan on error |
| Agent run API | `GET /api/admin/command/:commandId/agent-run` |
| Cancel agent run | `POST /api/admin/command/:commandId/agent-run/cancel` |
| Ollama native tools | `OllamaChatAdapter` + `OLLAMA_USE_NATIVE_TOOLS=true` |
| Approval inbox | `BrainToolProposal.approvalId` → `Approval` + `BrainToolApprovalHandler` |
| Adaptive auto-execute | `BrainAutoExecutePolicy` + `brainAdaptiveAutoExecuteEnabled` |
| Tool outcome KT | `BrainToolKnowledgeTransferService` (anonymized metrics) |
| Command SSE | `POST /api/admin/command` with `Accept: text/event-stream` when `COMMAND_BRAIN_STREAMING_ENABLED=true` |

### Phase 2 environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `OLLAMA_USE_NATIVE_TOOLS` | `false` | Use Ollama `/api/chat` tool_calls instead of prompt JSON |
| `COMMAND_BRAIN_STREAMING_ENABLED` | `false` | SSE step events on command POST (recommended `true` in staging) |
| `COMMAND_BRAIN_PLANNING_ENABLED` | `true` | Explicit plan generation before tool loop |

Per-tenant: `brainAdaptiveAutoExecuteEnabled` (subset of adaptive learning; requires `brainActionMode=adaptive`).

### Multi-step agent sequence (v1)

```
Command → AgentRuntime parse → BrainAgentPlanner (plan)
  → BrainAgentLoop (ReAct: tool → observe → repeat)
  → plan_ready + step_progress SSE events
  → medium/high proposals → Approval inbox → resume with tool result
  → completion summary in response.brain.summary
  → persist BrainAgentRun → response (+ optional SSE)
```

## Phase 2b — Brain v2 (reflection, replan, compound, plan memory)

| Feature | Implementation |
|---------|----------------|
| GlobalBrain in planner | `collectiveSnippets` in `BrainAgentPlanner.generatePlan` / `replan` prompts |
| Plan memory | `PlanMemoryService` — `[AGENT_PLAN]` recall via PersonalBrain; `rememberPlan` on successful runs |
| Step reflection | `BrainAgentReflector` — post-tool observe-evaluate; `reflection` transcript + SSE |
| Dynamic replan | `BrainAgentPlanner.replan()` — triggered on tool error or insufficient reflection; `plan_revised` SSE |
| Compound intent | `CompoundCommandParser` + `COMPOUND_WORKFLOW` in AgentRuntime; `subGoals` in planner |
| Summary extensions | `brain.summary.reflections[]`, `planRevisions` |

### Phase 2b environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `COMMAND_BRAIN_PLAN_MEMORY_ENABLED` | `true` | Remember successful plans in PersonalBrain |
| `COMMAND_BRAIN_REFLECTION_ENABLED` | `true` | LLM reflection after each successful tool call |
| `COMMAND_BRAIN_DYNAMIC_REPLAN_ENABLED` | `true` | Structured replan on error or reflection |
| `COMMAND_BRAIN_COMPOUND_ENABLED` | `true` | Backend compound NL command detection |

### Multi-step agent sequence (v2)

```
Command → AgentRuntime (+ compound parse) → BrainAgentPlanner (plan + plan recall + collective)
  → BrainAgentLoop
      → tool → BrainAgentReflector → continue | replan | conclude
      → plan_revised + reflection SSE events
  → PlanMemoryService.rememberPlan (on goalReached)
  → response.brain.summary (+ reflections, planRevisions)
```

## Personal Brain Memory (v1)

Episodic memory for the merchant command brain — short-term session buffer + long-term vector recall.

| Layer | Storage | Purpose |
|-------|---------|---------|
| Short-term | `BrainAgentState.state.shortTermMemory[]` | Last N interactions (ring buffer, default 15) |
| Long-term | `BrainMemory` + pgvector (`memoryType: long_term`) | Important decisions, actions, measurable outcomes |

| Component | Path |
|-----------|------|
| Orchestrator | [`PersonalBrainMemoryService`](../backend/src/ai/intelligence/personal-brain/memory/PersonalBrainMemoryService.ts) |
| Consolidation | [`MemoryConsolidationPolicy`](../backend/src/ai/intelligence/personal-brain/memory/MemoryConsolidationPolicy.ts) — promotes mutating intents / goalReached / uplift |
| Prompt injection | Parse (`CommandParserService`), plan (`BrainAgentPlanner`), agent loop (`BrainAgentLoop`), single-shot (`BrainResponseService`) |
| UX | `response.brain.memoryNotice` — optional Dutch recall hint for the merchant |

### Memory environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `PERSONAL_BRAIN_MEMORY_ENABLED` | `true` | Enable episodic memory layer |
| `PERSONAL_BRAIN_MEMORY_SHORT_TERM_LIMIT` | `15` | Ring buffer size |
| `PERSONAL_BRAIN_MEMORY_LONG_TERM_TTL_DAYS` | `180` | Default expiry for medium/low priority long-term entries |

### Memory flow

```
Command → PersonalBrainMemoryService.recallForCommand → prompt block
  → AgentRuntime / BrainAgentPlanner / BrainAgentLoop
  → ExecuteNaturalLanguageCommandUseCase → recordOutcome (short-term + optional long-term)
  → UndoCommandUseCase → removeByBrainMemoryId
```

## Personal Brain Memory (v2)

Unified orchestration in [`PersonalBrainMemoryService`](../backend/src/ai/intelligence/personal-brain/memory/PersonalBrainMemoryService.ts) over episodic, semantic, plan, adaptive, and conversation session memory.

| Kind | Storage | Recall |
|------|---------|--------|
| `episodic` | `BrainMemory` + pgvector metadata | Yes (decay-scored) |
| `semantic` | `BrainMemory` metadata `memoryType: semantic` | Yes (highest priority) |
| `interaction` | pgvector (undo/TTL) | No |
| `plan` / `adaptive` | Existing bounded services | Via orchestrator merge |

| Component | Path |
|-----------|------|
| Decay scoring | [`MemoryDecayScorer`](../backend/src/ai/intelligence/personal-brain/memory/MemoryDecayScorer.ts) |
| Reflection | [`MemoryReflectionService`](../backend/src/ai/intelligence/personal-brain/memory/MemoryReflectionService.ts) |
| Summarization | [`MemorySummarizationService`](../backend/src/ai/intelligence/personal-brain/memory/MemorySummarizationService.ts) |
| Session resume | [`ConversationSessionStore`](../backend/src/ai/intelligence/personal-brain/memory/ConversationSessionStore.ts) |
| Consolidation job | [`MemoryConsolidationJob`](../backend/src/ai/intelligence/personal-brain/memory/jobs/MemoryConsolidationJob.ts) |
| Admin API | `GET/DELETE /api/admin/brain/memory/*` via [`ManagePersonalBrainMemoryUseCase`](../backend/src/modules/admin-command-bar/application/use-cases/ManagePersonalBrainMemoryUseCase.ts) |
| Metadata SQL filter | [`PrismaPgVectorAdapter`](../backend/src/ai/intelligence/vector-store/adapters/PrismaPgVectorAdapter.ts) + [`metadataFilter`](../backend/src/ai/intelligence/vector-store/metadataFilter.ts) |

### v2 environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `PERSONAL_BRAIN_MEMORY_REFLECTION_ENABLED` | `true` | Backward-compat alias for experience reflection |
| `PERSONAL_BRAIN_MEMORY_SUMMARIZATION_LLM` | `false` | Short-term → semantic fact consolidation |
| `MEMORY_CONSOLIDATION_JOB_ENABLED` | `false` | Weekly prune + summarization batch |
| `MEMORY_CONSOLIDATION_INTERVAL_MS` | `604800000` | Job interval (7 days) |

### v2 recall merge order

1. Semantic facts → 2. **Reflection (boosted)** → 3. Episodic (decay) → 4. Short-term → 5. Plan (top 1) → 6. Adaptive hint (top 1)

API: `response.brain.memoryRecalled[]` includes `kind` per entry. Settings → **Persoonlijk geheugen** panel for operator management.

## Phase 3 — Experience Reflection (v1)

Structured post-run debrief that lets the Personal Brain learn from its own actions.

| Layer | Component | Role |
|-------|-----------|------|
| Runtime (step) | `BrainAgentReflector` | Per-tool observe-evaluate; drives continue / replan / conclude |
| Learning (post-run) | `ExperienceReflectionService` | Structured debrief → long-term `reflection` memory |
| Triggers | `ReflectionTriggerPolicy` | Configurable: multi-step, high-impact, optional failure |
| Recall | `PersonalBrainMemoryService.recallForCommand` | Prioritised reflection block in planner/loop prompts |

### Experience reflection model

After a qualifying run, the brain stores one structured reflection:

- Goal, steps taken, outcome
- What went well / could improve
- Future learnings (actionable)

Storage: vector memory with `memoryType: reflection`, `lessonLearned: true`, optional `reflectionPayload` JSON in metadata.

### Phase 3 environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `PERSONAL_BRAIN_EXPERIENCE_REFLECTION_ENABLED` | `true` | Master switch for post-run experience reflection |
| `PERSONAL_BRAIN_REFLECTION_TRIGGER_MULTI_STEP` | `true` | Reflect after agent loop with ≥ N tools |
| `PERSONAL_BRAIN_REFLECTION_TRIGGER_HIGH_IMPACT` | `true` | Reflect after mutating intents (pricing, compound, …) |
| `PERSONAL_BRAIN_REFLECTION_TRIGGER_FAILURE` | `true` | Also reflect on failed runs |
| `PERSONAL_BRAIN_REFLECTION_MIN_TOOLS` | `2` | Multi-step tool threshold |

Step-level reflection remains controlled by `COMMAND_BRAIN_REFLECTION_ENABLED`.

### Experience reflection flow

```
Command → recall (reflection block if similar past runs)
  → AgentRuntime / BrainAgentLoop (+ step reflection during tools)
  → ReflectionTriggerPolicy.shouldReflect?
  → ExperienceReflectionService.reflectAndStore → memoryType: reflection
  → response.brain.reflectionNotice / reflectionStored
```

### UX fields

| Field | When |
|-------|------|
| `brain.reflectionNotice` | Similar past reflections recalled for this command |
| `brain.reflectionStored` | New experience reflection persisted after run |

## Phase 4 — Reflection learning loop

Extends Phase 3 with adaptive strategy, global contribution, consolidation, and multi-agent handoff.

| Feature | Component |
|---------|-----------|
| Failure learning default | `ReflectionTriggerPolicy` — failure trigger on by default |
| Adaptive hints from reflections | `ReflectionAdaptiveHintService` → `BrainAdaptiveLearningService.getCombinedHint()` |
| Reflection → GlobalBrain | `ReflectionContributionExtractor` → `KnowledgeContributionService.contributeFromReflection()` |
| Reflection → semantic facts | `MemorySummarizationService.consolidateReflections()` |
| Multi-agent handoff | `ReflectionHandoffService` — `mail`/`supplier` → `admin` semantic |

### Phase 4 environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `PERSONAL_BRAIN_REFLECTION_ADAPTIVE_ENABLED` | `true` | Reflection hints in tool proposals |
| `PERSONAL_BRAIN_REFLECTION_ADAPTIVE_MAX_HINTS` | `2` | Max hints per adaptive call |
| `PERSONAL_BRAIN_REFLECTION_CONSOLIDATION_ENABLED` | `true` | Distill old reflections to semantic |
| `PERSONAL_BRAIN_REFLECTION_CONSOLIDATION_MIN_AGE_DAYS` | `14` | Min age before reflection consolidation |
| `PERSONAL_BRAIN_REFLECTION_CONSOLIDATION_MAX_PER_TENANT` | `20` | Max reflections processed per job run |

### Phase 4 flow

```
Run → ExperienceReflection (per agentKey)
  → ReflectionAdaptiveHintService (next proposals)
  → KnowledgeContributionService.contributeFromReflection (anonymized metrics)
  → MemoryConsolidationJob → consolidateReflections → semantic facts
  → ReflectionHandoffService (specialist → admin brain)
```

## Phase 5 — Multi-agent orchestration, distillation, experiments & timeline

| Feature | Component |
|---------|-----------|
| Delegation protocol | `DelegationProtocol` + `AgentSupervisorOrchestrator` — admin ↔ mail/supplier |
| Run delegation metadata | `BrainAgentRun.agentKey`, `parentRunId`, `delegationId`, `delegationMeta` |
| Reflection → patch drafts (HITL) | `ReflectionDistillationService` → `GlobalKnowledgePatchRepository` (draft only) |
| Reflection A/B experiments | `ReflectionExperimentService` + `ReflectionMetricsRecorder` |
| Cross-agent timeline API | `GET /api/admin/brain/reflections/timeline` |
| Timeline UI | `ReflectionTimelinePanel` in Settings |

### Phase 5 environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `MULTI_AGENT_DELEGATION_ENABLED` | off in prod | Enable supervisor delegation |
| `MULTI_AGENT_ALLOWED_TARGETS` | `mail,supplier,admin` | Allowed delegation targets |
| `PERSONAL_BRAIN_REFLECTION_DISTILLATION_ENABLED` | `true` | Reflection → patch draft job |
| `INTELLIGENCE_DISTILLATION_LLM` | off | LLM distillation adapter |

### Phase 5 flow

```
Admin run → AgentSupervisorOrchestrator.delegate (mail/supplier)
  → child BrainAgentRun (agentKey)
  → ExperienceReflection (agentKey)
  → ReflectionHandoffService → ReflectionHandoffLog
  → ReflectionDistillationService → draft GlobalKnowledgePatch (admin publish)
  → ReflectionExperimentService outcomes
  → GET /brain/reflections/timeline → ReflectionTimelinePanel
```

### Phase 5 APIs

| Route | Purpose |
|-------|---------|
| `GET /api/admin/brain/reflections/timeline` | Unified cross-agent reflection timeline |
| `GET/POST /api/admin/brain/reflection-experiments` | CRUD reflection quality experiments |
| `POST /api/admin/brain/reflection-experiments/:id/stop` | Stop experiment |
| `GET /api/admin/brain/reflection-experiments/:id/outcomes` | Aggregated metrics per arm |

## Phase 5b — Specialist Agents (Pricing v1)

Functional multi-agent routing: specialist agents run their own `BrainAgentLoop` with filtered tools and isolated PersonalBrain memory.

| Feature | Component |
|---------|-----------|
| Agent catalog | `AgentRegistry` — `SpecialistAgentDefinition` per agent |
| Orchestration | `AgentOrchestrator` — route, `executeSpecialist`, `chainHandoff` |
| Execution | `SpecialistAgentRunner` — domain context + filtered loop |
| Pricing Agent | `agents/PricingAgent.ts` — `pricing` agentKey |
| Pricing tools | `analyzeMargins`, `suggestOptimalPrice` (read) + `updatePrice` (propose) |
| Command Bar | Pre-response routing in `ExecuteNaturalLanguageCommandUseCase` |

### Specialist routing

| Intent | Agent | Tools (subset) |
|--------|-------|----------------|
| `PRICE_UPDATE`, `LOW_MARGIN_REPORT`, `PRICING_OPTIMIZE` | `pricing` | search, margins, suggest, updatePrice, insight |
| `SUPPLIER_MONITOR`, `SUPPLIER_CREATE` | `supplier` | syncSupplier, search, approvals |

### Cross-agent chain (v1)

When a pricing command mentions supplier/inkoop keywords, `AgentOrchestrator.chainHandoff` runs the supplier agent first and passes results as context to the pricing loop.

### Response metadata

Command responses include `brain.specialist`:

```json
{
  "agentKey": "pricing",
  "delegatedFrom": "admin",
  "specialistRunId": "...",
  "handoffSummary": "..."
}
```

See [`multi-agent/README.md`](../backend/src/ai/intelligence/multi-agent/README.md) for adding new agents.

## Phase 6 — Full specialists, LLM routing, parallel & UI

| Feature | Component |
|---------|-----------|
| Mail / Inventory agents | `MailAgent.ts`, `InventoryAgent.ts` + domain read tools |
| Supplier create tool | `createSupplier` propose tool |
| Handler deduplication | `shouldSkipHandlerForSpecialist` in use case |
| LLM routing | `AgentRouterService` — intent → keyword → LLM cascade |
| Parallel orchestration | `ParallelCoordinator` + `executeParallel` for compound workflows |
| UI agent indicator | `AgentBadge` in `CommandResultCard` + stream `agent_assigned` |

### Agent matrix (Phase 6)

| Agent | Key | Tools (highlights) |
|-------|-----|-------------------|
| pricing | `pricing` | analyzeMargins, suggestOptimalPrice, updatePrice |
| supplier | `supplier` | syncSupplier, createSupplier |
| inventory | `inventory` | getInventoryStatus, listLowStock, suggestRestock |
| mail | `mail` | getEmailSummary |

### Response metadata (extended)

```json
{
  "specialist": { "agentKey": "pricing", "routingSource": "intent", "delegatedFrom": "admin" },
  "agents": [{ "agentKey": "mail" }, { "agentKey": "inventory" }],
  "executionMode": "parallel"
}
```

## Phase 6b+ — RESTOCK, Graph orchestration, Palette UI, Cross-tenant patterns

| Feature | Component |
|---------|-----------|
| RESTOCK_SUGGEST | `suggestRestock` propose tool + `applyRestockUpdates` on `AdminDataPort` |
| Graph orchestration | `GraphOrchestratorPort`, `NativeGraphOrchestrator`, `LangGraphOrchestrator` |
| CommandPalette agent badge | `AgentBadge` during stream + in last result footer |
| Cross-tenant agent patterns | `GlobalAgentPattern` + `AgentPatternDistillationService` (anonymized metrics only) |

### Env vars (Phase 6b+)

| Variable | Default | Purpose |
|----------|---------|---------|
| `MULTI_AGENT_GRAPH_ORCHESTRATION` | `false` | Enable graph orchestrator for compound workflows |
| `MULTI_AGENT_GRAPH_BACKEND` | `native` | `native` or `langgraph` (v1 delegates to native) |
| `brainCrossTenantAgentPatternsEnabled` | `false` | Per-tenant setting — opt-in pattern contribution |

### Inventory RESTOCK flow

`suggestRestock` → `BrainToolProposal` → inbox `brain.suggestRestock` → `executeConfirmed` → `applyRestockUpdates`.

### Cross-tenant agent state (v1)

**Not** shared transcripts or checkpoints. Only anonymized execution patterns (success rates, routing hints) via `GlobalAgentPattern`, gated by k-anonymity and tenant opt-in.


## LoRA manifest (metadata-only v1)

Place at `{storagePath}/manifest.json`:

```json
{
  "adapterId": "merchant-style-v1",
  "version": "1.0.0",
  "traits": ["formal", "nl"]
}
```

## Deployment tiers

- **SaaS:** pgvector + shared Ollama
- **Hybrid:** dedicated schema per tenant; optional `brainVectorBackend` per tenant
- **Self-hosted:** `INTELLIGENCE_VECTOR_BACKEND=lancedb` uses portable JSON file store (not native `@lancedb/lancedb` v1) + export/import

### Staging checklist

1. Use `pgvector/pgvector:pg15` (see `docker-compose.yml`)
2. Copy [`aether-core/.env.staging.example`](../.env.staging.example) → `.env.staging` (no secrets in repo)
3. Run migrations before brain features:
   ```bash
   cd backend
   npx prisma migrate deploy
   npm run brain:verify-schema
   ```
4. After switching embedding backend: `npm run brain:reembed`

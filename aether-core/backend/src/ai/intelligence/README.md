# AETHER Intelligence Layer

Cross-cutting brain infrastructure for per-merchant personal intelligence and future collective knowledge.

## Concepts

- **PersonalBrain** — isolated vector memory, agent state, and LoRA context per `tenantId`
- **GlobalBrain** — placeholder for federated collective intelligence (SaaS tier)
- **KnowledgeTransfer** — anonymized insight exchange; bridges to `zero-knowledge-hive-mind` later
- **AgentRuntime** — command orchestration: recall → parse → remember (no business tool execution)
- **VectorStorePort** — swappable backend (`pgvector`, in-memory, future LanceDB/Pinecone)

## Tenant isolation

Every vector query and agent state read/write requires an explicit `tenantId`. Never use `tenant_default` in persistence adapters.

## Wiring

Dependencies are composed in `bootstrap/compositionRoot.ts` via `createIntelligenceLayer()`.

See [`aether-core/docs/intelligence-layer.md`](../../../../docs/intelligence-layer.md) for architecture and deployment tiers.

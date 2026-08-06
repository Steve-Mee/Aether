# Knowledge Transfer (runtime)

**Status:** partial  
**Code:** [`backend/src/ai/intelligence/knowledge-transfer/`](../backend/src/ai/intelligence/knowledge-transfer/)  
**Architecture overview:** [`intelligence-layer.md`](./intelligence-layer.md) (bidirectional knowledge loop)

This doc describes **what ships today** — not vision claims about full LoRA federation or automatic cross-tenant model sharing.

## Loop (outbound → hive → inbound)

```
PersonalBrain / agent outcomes
  → KnowledgeContributionService
      → ContributionGate (tenant KT off / receive_only / contribute_only)
      → Category preferences (per-category opt-out)
      → ContributionSafetyFilter (allowlist + PII + bounds)
      → HiveMindKnowledgeTransferAdapter → hive SubmitInsight (HMAC + privacy controls)
GlobalKnowledgeService.syncForTenant → PersonalBrain indexKnowledge
```

Master env gate: `INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED=true`. Per-tenant: `brainKnowledgeTransferEnabled`, `brainKnowledgeGovernanceMode`.

## Anonymization (what is shared)

Outbound insights are **structured metrics only** (`category` + `metric` + numeric `value` + optional `sampleSize`).

| Allowed categories | Example metrics |
|--------------------|-----------------|
| `pricing` | `auto_apply_rate`, `price_change_success_rate`, … |
| `conversion` | `mail_auto_reply_rate`, `conversion_rate` |
| `inventory` | tool success / approval rates |
| `marketing` | `promo_uplift_rate` |
| `trend` | `agent_run_success_rate`, seasonal indices |

**Never shared:** customer names/emails, absolute prices/margins, SKUs, supplier names, free-text narratives, raw vector snippets, transcripts.

Safety stack:

| Component | Role |
|-----------|------|
| `contributionTaxonomy.ts` | Category + metric allowlist, numeric bounds |
| `ContributionSafetyFilter` | Rejects invalid category/metric/bounds; regex PII scan |
| `shared/privacy/` | `PiiPatternLibrary`, optional `OllamaPiiClassifier` when `INTELLIGENCE_PII_NLP=true` |
| Hive / SecAgg | Optional secure aggregation when `INTELLIGENCE_SECAGG_ENABLED=true` |

Transparency: command responses may include `brain.knowledgeContributionNotice` when insights were shared.

## Category opt-out

Tenant-wide off is not the only control. Merchants can disable **individual categories**.

| API / module | Behavior |
|--------------|----------|
| `categoryPreferences.ts` | `isKnowledgeTransferEnabledForCategory(tenantId, category)` |
| Storage | `TenantSettings.proactivePrefs.knowledgeTransferCategories` — `{ pricing?, conversion?, trend?, inventory?, marketing? }` |
| Defaults | Categories default **enabled** unless explicitly `false` |
| Adapter | `HiveMindKnowledgeTransferAdapter` skips opted-out categories on submit and pull |

Feature-status: `knowledge-transfer-category-optout` — **partial** (runtime gate + tests; merchant Settings UI for category toggles may still be thin).

## LoRA honesty

LoRA in AETHER today is a **metadata / registry** layer, not trained weight distribution across tenants.

| Piece | Runtime truth |
|-------|----------------|
| `LoRAAdapterPort` / `FilesystemLoRAAdapter` | Loads `manifest.json` traits + Prisma `BrainLoRAAdapter` rows; injects `loraAdapterId` / `traits` into PersonalBrain context |
| `InMemoryLoRAAdapter` | Test/placeholder registry |
| Admin API | `GET/PUT /api/admin/brain/lora` — register path + traits |
| Global knowledge v3 flags | `lora_trait` / `lora_config` **patch kinds** exist behind `INTELLIGENCE_GLOBAL_KNOWLEDGE_V3` — curated metadata patches, not automatic PEFT weight sync |
| Cross-tenant LoRA weights | **Not implemented** — do not claim shared adapters or automatic fine-tune shipping |

Honest claim: “merchant can register LoRA adapter metadata and traits for local inference context.”  
Dishonest claim: “hive distributes trained LoRA weights to all tenants.”

## Related docs

- [`intelligence-layer.md`](./intelligence-layer.md) — full phase history, env tables, APIs  
- [`multi-agent/README.md`](../backend/src/ai/intelligence/multi-agent/README.md) — specialists that may contribute metrics  
- [`feature-status.json`](./feature-status.json) — `intelligence-layer`, `hive-mind`, `knowledge-transfer-category-optout`

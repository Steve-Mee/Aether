---
name: brain-architecture
description: >
  Forceert correcte architectuur rond PersonalBrain, GlobalBrain en KnowledgeTransfer.
  Zorgt voor juiste scheiding van concerns, data-isolatie en modulariteit.
---

# Brain Architecture Skill (v1.0)

**Doel**: Zorgt dat de architectuur van AETHER’s intelligentie laag correct en modulair blijft.

**Wanneer gebruiken**: Bij elke wijziging aan het brein, agents, memory of data flow.

---

## Kernregels

1. **PersonalBrain** is strikt geïsoleerd per `tenantId`.
2. **GlobalBrain** mag nooit ruwe merchantdata bevatten.
3. **KnowledgeTransfer** is de enige gecontroleerde brug tussen Personal en Global.
4. Vector memory (pgvector) hoort bij het PersonalBrain.
5. LoRA adapters en agent state zijn tenant-isolated.
6. Nieuwe lagen of services moeten duidelijke bounded contexts hebben.

---

## Anti-Patterns

- Data leakage tussen merchants
- GlobalBrain die individuele merchantdata bevat
- Te strakke koppeling tussen AgentRuntime en Core
- Nieuwe features die direct in de PersonalBrain laag worden gebouwd zonder bounded context

---

*Versie 1.0 — AETHER Edition*

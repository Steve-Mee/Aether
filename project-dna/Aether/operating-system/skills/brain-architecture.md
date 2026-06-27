---
name: brain-architecture
description: >
  Forceert correcte en toekomstbestendige architectuur rond PersonalBrain, GlobalBrain
  en KnowledgeTransfer. Zorgt voor juiste scheiding van concerns, data-isolatie,
  modulariteit en lange-termijn evolueerbaarheid.
---

# Brain Architecture Skill (v2.0)

**Doel**: Zorgt dat de architectuur van AETHER’s intelligentie laag correct, modulair en toekomstbestendig blijft.

**Wanneer gebruiken**: Bij elke wijziging aan het brein, agents, memory, data flow of orchestration laag.

---

## Kernregels

1. **PersonalBrain is strikt geïsoleerd per `tenantId`**
   - Geen data sharing tussen merchants.
   - Vector memory, agent state en LoRA adapters zijn tenant-isolated.

2. **GlobalBrain bevat nooit ruwe merchantdata**
   - Alleen geanonimiseerde, geaggregeerde patronen (via differential privacy of ZK-proofs).

3. **KnowledgeTransfer is de enige gecontroleerde brug**
   - Alle communicatie tussen PersonalBrain en GlobalBrain loopt via deze laag.

4. **Duidelijke bounded contexts**
   - PersonalBrain, GlobalBrain, KnowledgeTransfer, Merchant Agents en Core moeten helder gescheiden blijven.

5. **Lange-termijn evolueerbaarheid**
   - Nieuwe componenten moeten onafhankelijk kunnen evolueren zonder de rest van het systeem te breken.

---

## Anti-Patterns

- Data leakage tussen merchants
- GlobalBrain die individuele merchantdata bevat
- Te strakke koppeling tussen AgentRuntime en Core
- Nieuwe features die direct in de PersonalBrain laag worden gebouwd zonder bounded context
- Het negeren van tenant-isolation bij nieuwe functionaliteit

---

## Slimme Logica

- Bij wijzigingen aan `PersonalBrain`, `GlobalBrain` of `KnowledgeTransfer` → altijd `aether-principles-guard` activeren.
- Bij introductie van nieuwe data flows → expliciet controleren op tenant isolation.
- Bij architectuurwijzigingen → toetsen tegen lange-termijn evolueerbaarheid.

---

*Versie 2.0 — Sterker gefocust op modulariteit en toekomstbestendigheid (juni 2026)*
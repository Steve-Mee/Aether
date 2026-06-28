---
name: aether-principles-guard
description: >
  Handhaaft de kernprincipes van AETHER bij alle architectuur- en codewijzigingen.
  Zorgt voor consistentie met PersonalBrain, Local AI First, privacy, modulariteit
  en Merchant Success First.
---

# AETHER Principles Guard (v1.0)

**Doel**: Zorgt dat alle ontwikkeling in lijn blijft met de fundamentele principes van AETHER.

**Primaire bron**: `project-dna/aether/principles.md` + `project-dna/aether/AGENTS.md`

---

## Kernprincipes (Nooit Breken)

1. **PersonalBrain First** — Iedere merchant heeft een geïsoleerd, privé brein.
2. **Local AI First** — Gevoelige operaties draaien bij voorkeur lokaal (Ollama/vLLM).
3. **Privacy & Data Ownership** — Merchant data blijft eigendom van de merchant. Geen onnodige cloud calls.
4. **Modulariteit & Bounded Contexts** — Duidelijke scheiding tussen PersonalBrain, GlobalBrain, Merchant Agents en Core.
5. **Autonomie met Controle** — Agents mogen veel autonoom doen, maar high-impact acties vereisen human approval.
6. **Merchant Success First** — Iedere feature moet aantoonbaar waarde toevoegen voor de merchant.
7. **Intellectual Honesty** — Alleen features claimen die écht werken met tests en evidence.

---

## Slimme Logica

- Bij wijzigingen aan `PersonalBrain`, `AgentRuntime`, `KnowledgeTransfer` of privacy-gerelateerde code → **hoge prioriteit**.
- Bij introductie van nieuwe cloud LLM calls zonder opt-in → waarschuwen of blokkeren.
- Bij nieuwe agent logica → check of human approval gates aanwezig zijn waar nodig.

---

*Versie 1.0 — AETHER Edition*

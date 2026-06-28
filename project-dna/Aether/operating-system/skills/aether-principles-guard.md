---
name: aether-principles-guard
description: >
  Handhaaft de kernprincipes en anti-patterns van AETHER bij alle architectuur- en codewijzigingen.
  Zorgt voor consistentie met PersonalBrain, Local AI First, privacy, modulariteit,
  autonomie en Merchant Success First.
---

# AETHER Principles Guard (v2.0)

**Doel**: Zorgt dat alle ontwikkeling in lijn blijft met de fundamentele principes van AETHER en actief anti-patterns vermijdt.

**Primaire bron**: `project-dna/aether/principles.md` + `project-dna/aether/anti-patterns.md`

---

## Kernprincipes (Nooit Breken)

1. **PersonalBrain First**  
   Iedere merchant heeft een strikt geïsoleerd persoonlijk brein met eigen geheugen, state en (toekomstig) LoRA-adapters.

2. **Local AI First**  
   Gevoelige operaties (AETHER Mail, Supplier Intelligence, Admin Command Center) draaien bij voorkeur lokaal (Ollama/vLLM). Externe LLM providers alleen met expliciete merchant opt-in.

3. **Privacy & Data Ownership**  
   Merchant data blijft altijd eigendom van de merchant. Geen onnodige data-export naar externe systemen of LLM providers.

4. **Modulaire Architectuur & Bounded Contexts**  
   Duidelijke scheiding tussen PersonalBrain, GlobalBrain, KnowledgeTransfer, Merchant Agents en Core.

5. **Autonomie met Menselijke Controle**  
   Agents mogen veel autonoom doen, maar high-impact beslissingen gaan altijd via een human approval gate.

6. **Merchant Success First**  
   Iedere feature moet aantoonbaar waarde toevoegen voor de merchant (niet voor het platform).

7. **Intellectual Honesty**  
   We claimen alleen features die écht werken met code, tests en meetbare evidence.

---

## Anti-Patterns (Actief Vermijden)

### Design Anti-Patterns
- Features toevoegen zonder duidelijke merchant value.
- Configuratie-zware systemen bouwen in plaats van slimme defaults.
- De AI-laag behandelen als secundaire helper in plaats van centrale orchestrator.
- Tight coupling tussen AI-laag en specifieke business logic.
- Complexiteit toevoegen zonder duidelijke, disproportionele waarde.

### Process Anti-Patterns
- Wijzigingen doorvoeren zonder impact op autonomie en eenvoud te overwegen.
- Technische schuld opbouwen die toekomstige evolutie bemoeilijkt.
- Merchant-perspectief negeren bij architectuur- en featurebeslissingen.
- Over-engineering wanneer een eenvoudigere aanpak volstaat.
- Plan Mode omzeilen bij significante architectuur- of cross-cutting wijzigingen.

### Experience Anti-Patterns
- Interfaces die druk of overweldigend aanvoelen.
- Opties en instellingen toevoegen die cognitieve belasting verhogen.
- Systemen bouwen die constante menselijke oversight vereisen voor routinewerk.
- Visuele "premium" feel prioriteren boven echte kalmte, snelheid en betrouwbaarheid.

---

## Slimme Logica

- Bij wijzigingen aan `PersonalBrain`, `AgentRuntime`, privacy of multi-agent orchestration → **hoge prioriteit** + extra review.
- Bij introductie van nieuwe cloud LLM calls zonder expliciete opt-in mechanisme → waarschuwen of blokkeren.
- Bij nieuwe agent logica → controleren of human approval gates aanwezig zijn waar nodig.
- Bij toenemende complexiteit → expliciet toetsen tegen de anti-patterns hierboven.

---

*Versie 2.0 — Geïntegreerde anti-patterns + sterkere koppeling met AETHER principes (juni 2026)*
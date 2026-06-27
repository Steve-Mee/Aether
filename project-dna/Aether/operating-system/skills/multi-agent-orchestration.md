---
name: multi-agent-orchestration
description: >
  Definieert duidelijke patronen voor multi-agent systemen binnen AETHER:
  orchestration, handoff, state management, tool calling en human-in-the-loop.
---

# Multi-Agent Orchestration Skill (v2.0)

**Doel**: Zorgt voor consistente, robuuste en traceerbare multi-agent architectuur in AETHER.

**Wanneer gebruiken**: Bij het bouwen of aanpassen van agents, orchestration logic of agent workflows.

---

## Kernpatronen

| Patroon                    | Doel                                              | Wanneer gebruiken                  |
|---------------------------|---------------------------------------------------|------------------------------------|
| **Supervisor Pattern**    | Eén supervisor stuurt sub-agents aan              | Complexere workflows               |
| **Handoff Protocol**      | Duidelijke overdracht van context en state        | Altijd bij agent-overdracht        |
| **Human-in-the-Loop**     | High-impact beslissingen via approval queue       | High-risk acties                   |
| **Tool Registry**         | Gecentraliseerde registratie van tools            | Bij nieuwe tools of agents         |
| **State Isolation**       | Elke agent run heeft traceerbare, geïsoleerde state | Altijd                             |

---

## Regels

- Iedere agent moet een duidelijke rol en verantwoordelijkheid hebben.
- Context passing tussen agents moet expliciet en minimaal zijn.
- Alle agent interacties moeten logbaar, debugbaar en replayable zijn.
- High-impact acties gaan altijd via een approval gate.
- Agents moeten graceful degradation en fallback gedrag hebben.

---

## Anti-Patterns

- Ongecontroleerde context sharing tussen agents
- Agents die direct elkaars interne state muteren
- Ontbrekende human approval bij high-risk acties
- Ontraceerbare agent beslissingen

---

*Versie 2.0 — Duidelijkere patronen en sterkere traceerbaarheid (juni 2026)*
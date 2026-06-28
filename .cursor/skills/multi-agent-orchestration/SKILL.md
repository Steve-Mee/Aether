---
name: multi-agent-orchestration
description: >
  Definieert patronen voor multi-agent systemen binnen AETHER: orchestration,
  handoff, state management, tool calling en human-in-the-loop.
---

# Multi-Agent Orchestration Skill (v1.0)

**Doel**: Zorgt voor consistente en robuuste multi-agent architectuur in AETHER.

**Wanneer gebruiken**: Bij het bouwen of aanpassen van agents, orchestration logic of agent workflows.

---

## Kernpatronen

- **Supervisor Pattern**: Eén supervisor agent die sub-agents aanstuurt.
- **Handoff Protocol**: Duidelijke overdracht van context en state tussen agents.
- **Human-in-the-Loop**: High-impact beslissingen gaan via approval queue.
- **Tool Registry**: Gecentraliseerde registratie van tools per agent type.
- **State Isolation**: Elke agent run heeft een duidelijke, traceerbare state.

---

## Regels

- Iedere agent moet een duidelijke rol en verantwoordelijkheid hebben.
- Context passing tussen agents moet expliciet en minimaal zijn.
- Alle agent interacties moeten logbaar en debugbaar zijn.

---

*Versie 1.0 — AETHER Edition*

---
name: merchant-agent-patterns
description: >
  Definieert patronen voor Autonomous Merchant Agents: AETHER Mail, Supplier Intelligence,
  Admin Command Center en algemene agent workflows.
---

# Merchant Agent Patterns Skill (v1.0)

**Primaire bron**: `project-dna/Aether/operating-system/skills/merchant-agent-patterns.md`

**Doel**: Zorgt voor consistente patronen bij het bouwen van autonome merchant agents.

**Wanneer gebruiken**: Bij ontwikkeling van Mail Agent, Supplier Agent, Pricing Agent, etc.

---

## Kernpatronen

- **Classification Agent** → Classificeert input (email, command, etc.)
- **Action Agent** → Voert low-risk acties autonoom uit
- **Proposal Agent** → Genereert voorstellen voor high-impact acties
- **Approval Gate** → Human approval voor high-risk acties
- **Context Injection** → Verrijkt agent context met relevante order/supplier data

---

## Regels

- Iedere agent moet een duidelijke risk-classificatie hebben (Low / Medium / High).
- High-risk acties gaan altijd via een approval queue.
- Agents moeten traceerbaar zijn (wie, wat, waarom, wanneer).

---

*Versie 1.0 — AETHER Edition*

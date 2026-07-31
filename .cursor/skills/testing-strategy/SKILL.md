---
name: testing-strategy
description: >
  Definieert een sterke teststrategie voor AETHER, met speciale aandacht voor
  agentic systemen, state management, tool calling en multi-agent workflows.
---

# Testing Strategy Skill (v1.0)

**Primaire bron**: `project-dna/Aether/operating-system/skills/testing-strategy.md`

**Doel**: Zorgt voor hoge testbaarheid en betrouwbaarheid van AETHER's complexe systemen.

**Wanneer gebruiken**: Bij elke nieuwe functionaliteit of refactor.

---

## Aanbevolen Test Piramide voor AETHER

- **Unit Tests**: Pure functies, agents zonder side effects
- **Integration Tests**: Agent + Tool + Database interacties
- **Agent Behavior Tests**: Scenario-based testing van agent workflows
- **E2E Tests**: Belangrijke merchant journeys (Mail → Action, Supplier sync, etc.)
- **Property-based / Simulation Tests**: Voor multi-agent en predictive systemen

---

## Specifieke Regels

- Iedere agent moet testbaar zijn in isolatie.
- Tool calling moet gemockt kunnen worden.
- State transitions van agents moeten getest worden.
- Privacy-gerelateerde logica heeft extra test coverage nodig.

---

*Versie 1.0 — AETHER Edition*

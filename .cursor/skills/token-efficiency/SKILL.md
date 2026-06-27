---
name: token-efficiency
description: >
  Handhaaft token-efficiënte workflows voor AETHER. Zorgt voor juiste taakclassificatie,
  Plan Mode, todo_write discipline, modelkeuze en context management.
  Deze skill is leidend voor alle development agents.
---

# Token Efficiency Skill (v1.0 - AETHER)

**Doel**: Zorgt dat AI-agents altijd de meest token-efficiënte en effectieve workflow volgen bij het bouwen van AETHER.

**Primaire bron**: `project-dna/aether/AGENTS.md`

---

## Taakclassificatie (Verplicht als eerste stap)

| Klasse              | Criteria                                      | Modus                    | Model-keuze          | Strategie                     |
|---------------------|-----------------------------------------------|--------------------------|----------------------|-------------------------------|
| **Simple**          | < 3 bestanden, pure edit/refactor             | Direct                   | Goedkoop model       | Direct uitvoeren              |
| **Medium**          | 3-6 bestanden, duidelijke scope               | **Plan Mode**            | Snel model           | Plan → uitvoering             |
| **Complex**         | Nieuwe laag, multi-agent, architectuur        | **Plan Mode + todo**     | Premium model        | Plan + todo + bevestiging     |
| **High-Impact**     | Core brain, privacy, autonomous agents        | **Plan Mode + todo**     | **Alleen Premium**   | Altijd Plan + human review    |

**Zeg altijd**: "Ik classificeer deze taak als **[Klasse]**. Strategie: ..."

---

## Verplichte Workflow

1. Classificeer de taak hardop.
2. Start in **Plan Mode** bij Medium/Complex/High-Impact.
3. Gebruik `todo_write` bij 3+ stappen of High-Impact werk.
4. **Nieuwe chat = nieuwe bounded context**.
5. Na elke sub-taak: type checking + relevante tests.
6. Rapporteer geschat vs werkelijk token-verbruik bij Complex/High-Impact taken.

---

*Versie 1.0 — AETHER Edition*
